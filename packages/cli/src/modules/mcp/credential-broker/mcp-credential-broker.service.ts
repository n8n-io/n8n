import type { BuiltTool } from '@n8n/agents';
import type { McpCredentialUseMode } from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import { CredentialsFinderService } from '@n8n/backend-services';
import { CredentialsRepository, type CredentialsEntity, type User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { UserError } from '@n8n/errors';
import {
	isExpression,
	resolveNodeAnnotations,
	type IDataObject,
	type INodeParameters,
	type INodeTypeDescription,
	type NodeOperationAnnotations,
} from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { findUsableMcpCredential } from '@/modules/mcp-registry/mcp-credential-access';
import { ExecuteNodeService, type ExecuteNodeResult } from '@/node-execution';
import { NodeTypes } from '@/node-types';
import { ProjectService } from '@/services/project.service.ee';

import { McpSettingsService } from '../mcp.settings.service';
import {
	getNodeRefusalReason,
	isCandidateNodeName,
	isGenericCredentialType,
	nodeDeclaresCredential,
} from './node-allowlist';

/** `read` runs only operations that are known to read. `write` runs every allowed operation. */
export type BrokerAccess = 'read' | 'write';

export interface BrokerNodeSummary {
	type: string;
	displayName: string;
	version: number;
}

export interface BrokerMcpServerSummary {
	slug: string;
	title: string;
	description?: string;
	tools: Array<{ name: string; readOnly: boolean }>;
}

export interface BrokerConnection {
	credentialId: string;
	name: string;
	type: string;
	/** Nodes that can run with this credential. Empty for an MCP server credential. */
	nodes: BrokerNodeSummary[];
	/** MCP servers this credential connects to. Empty for a service credential. */
	mcpServers: BrokerMcpServerSummary[];
}

export interface BrokerCredentialListItem {
	id: string;
	name: string;
	type: string;
	availableInMCP: boolean;
	canUpdate: boolean;
	homeProject: { id: string; name: string; type: string } | null;
	nodeCount: number;
	mcpServerCount: number;
}

export interface RunNodeRequest {
	credentialId: string;
	nodeType: string;
	nodeVersion?: number;
	parameters: INodeParameters;
	input?: Array<{ json: IDataObject }>;
	timeoutMs?: number;
}

export interface RunNodeResult {
	result: ExecuteNodeResult;
	annotations: NodeOperationAnnotations;
}

export interface BrokerMcpTool {
	name: string;
	description: string;
	inputSchema: unknown;
	readOnly: boolean;
}

interface RegistryServerMatch {
	slug: string;
	title: string;
	description?: string;
	tools: Array<{ name: string; readOnly: boolean }>;
}

const REQUIRED_PROJECT_SCOPES = ['workflow:create', 'workflow:execute'] as const;

function containsExpression(value: unknown): boolean {
	if (typeof value === 'string') return isExpression(value);
	if (Array.isArray(value)) return value.some(containsExpression);
	if (value !== null && typeof value === 'object') {
		return Object.values(value).some(containsExpression);
	}
	return false;
}

function latestVersion(description: INodeTypeDescription): number {
	const { version } = description;
	return Array.isArray(version) ? Math.max(...version) : version;
}

/**
 * Lets MCP clients use stored credentials without receiving them. n8n runs a
 * node, or forwards a tool call to a connected MCP server, and returns only
 * the result.
 *
 * Every entry point applies the same gates in this order: the instance mode,
 * the caller's access to the credential, the per-credential `availableInMCP`
 * flag, and the limits on what the credential may be paired with.
 */
@Service()
export class McpCredentialBrokerService {
	private readonly nodesByCredentialType = new Map<string, BrokerNodeSummary[]>();

	constructor(
		private readonly mcpSettingsService: McpSettingsService,
		private readonly credentialsService: CredentialsService,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
		private readonly nodeTypes: NodeTypes,
		private readonly executeNodeService: ExecuteNodeService,
		private readonly projectService: ProjectService,
		private readonly moduleRegistry: ModuleRegistry,
	) {}

	async getMode(): Promise<McpCredentialUseMode> {
		return await this.mcpSettingsService.getCredentialUseMode();
	}

	// ---------------------------------------------------------------------
	// Eligibility
	// ---------------------------------------------------------------------

	/**
	 * Node names that declare the credential type and pass the checks that need
	 * no node code. Loading every node to answer "which types are eligible" is
	 * too slow, so the full check runs later, for the types that are in use.
	 */
	private getCandidateNodeNames(credentialType: string): string[] {
		if (isGenericCredentialType(credentialType)) return [];
		const supported =
			this.loadNodesAndCredentials.knownCredentials[credentialType]?.supportedNodes ?? [];
		return supported.filter(isCandidateNodeName);
	}

	/** Nodes that may run with a credential of the given type. */
	getNodesForCredentialType(credentialType: string): BrokerNodeSummary[] {
		const cached = this.nodesByCredentialType.get(credentialType);
		if (cached) return cached;

		const nodes: BrokerNodeSummary[] = [];
		for (const name of this.getCandidateNodeNames(credentialType)) {
			let description: INodeTypeDescription;
			try {
				description = this.nodeTypes.getByNameAndVersion(name).description;
			} catch {
				continue;
			}
			// The node reports its short name. The checks need the full one.
			if (getNodeRefusalReason({ ...description, name }) !== null) continue;
			if (!nodeDeclaresCredential(description, credentialType)) continue;
			nodes.push({
				type: name,
				displayName: description.displayName,
				version: latestVersion(description),
			});
		}

		this.nodesByCredentialType.set(credentialType, nodes);
		return nodes;
	}

	private async getRegistryServersByCredentialType(): Promise<Map<string, RegistryServerMatch[]>> {
		const byType = new Map<string, RegistryServerMatch[]>();
		if (!this.moduleRegistry.isActive('mcp-registry')) return byType;

		const [{ McpRegistryService }, { resolveMcpRegistryConnection }] = await Promise.all([
			import('@/modules/mcp-registry/registry/mcp-registry.service.js'),
			import('@/modules/mcp-registry/mcp-registry-connection.js'),
		]);

		const servers = await Container.get(McpRegistryService).getAll();
		for (const server of servers) {
			const connection = resolveMcpRegistryConnection(server);
			if (!connection) continue;
			const match: RegistryServerMatch = {
				slug: server.slug,
				title: server.title ?? server.name ?? server.slug,
				...(server.description ? { description: server.description } : {}),
				tools: server.tools.map((tool) => ({
					name: tool.name,
					readOnly: tool.annotations?.readOnlyHint === true,
				})),
			};
			for (const { credentialType } of connection.credentialBindings) {
				// Gateway credits have no stored credential, so there is nothing to opt in.
				if (credentialType.endsWith('McpAiGatewayApi')) continue;
				const matches = byType.get(credentialType) ?? [];
				matches.push(match);
				byType.set(credentialType, matches);
			}
		}
		return byType;
	}

	/** Credential types that can be made available in MCP. */
	async getEligibleCredentialTypes(): Promise<string[]> {
		const registryTypes = await this.getRegistryServersByCredentialType();
		const nodeTypes = Object.keys(this.loadNodesAndCredentials.knownCredentials).filter(
			(type) => this.getCandidateNodeNames(type).length > 0,
		);
		return [...new Set([...nodeTypes, ...registryTypes.keys()])]
			.filter((type) => !isGenericCredentialType(type))
			.sort();
	}

	// ---------------------------------------------------------------------
	// Settings UI
	// ---------------------------------------------------------------------

	/** Credentials the user can see whose type can be made available in MCP. */
	async listCredentials(user: User): Promise<BrokerCredentialListItem[]> {
		const registryTypes = await this.getRegistryServersByCredentialType();
		const credentials = await this.credentialsService.getMany(user, {
			includeScopes: true,
			includeData: false,
			includeGlobal: true,
		});

		const items: BrokerCredentialListItem[] = [];
		for (const credential of credentials) {
			const nodeCount = this.getNodesForCredentialType(credential.type).length;
			const mcpServerCount = registryTypes.get(credential.type)?.length ?? 0;
			if (nodeCount === 0 && mcpServerCount === 0) continue;

			const enriched = credential as CredentialsEntity & {
				scopes?: string[];
				homeProject?: { id: string; name: string; type: string } | null;
			};
			items.push({
				id: credential.id,
				name: credential.name,
				type: credential.type,
				availableInMCP: credential.availableInMCP,
				canUpdate: enriched.scopes?.includes('credential:update') ?? false,
				homeProject: enriched.homeProject
					? {
							id: enriched.homeProject.id,
							name: enriched.homeProject.name,
							type: enriched.homeProject.type,
						}
					: null,
				nodeCount,
				mcpServerCount,
			});
		}
		return items;
	}

	async setAvailability(
		user: User,
		credentialIds: string[],
		availableInMCP: boolean,
	): Promise<{ updatedIds: string[] }> {
		const eligibleTypes = availableInMCP ? new Set(await this.getEligibleCredentialTypes()) : null;

		for (const credentialId of credentialIds) {
			const credential = await this.credentialsFinderService.findCredentialForUser(
				credentialId,
				user,
				['credential:update'],
			);
			if (!credential) {
				throw new UserError('You cannot change MCP access for one of these credentials.');
			}
			if (credential.isManaged) {
				throw new UserError(`"${credential.name}" is managed by n8n and cannot be used in MCP.`);
			}
			if (eligibleTypes && !eligibleTypes.has(credential.type)) {
				throw new UserError(
					`"${credential.name}" cannot be used in MCP because no service node or MCP server accepts it.`,
				);
			}
		}

		await this.credentialsRepository.setAvailableInMCP(credentialIds, availableInMCP);
		return { updatedIds: credentialIds };
	}

	// ---------------------------------------------------------------------
	// MCP tools
	// ---------------------------------------------------------------------

	async listConnections(user: User): Promise<BrokerConnection[]> {
		const registryTypes = await this.getRegistryServersByCredentialType();
		const credentials = await this.credentialsService.getMany(user, {
			includeData: false,
			includeGlobal: true,
		});

		const connections: BrokerConnection[] = [];
		for (const credential of credentials) {
			if (!credential.availableInMCP) continue;
			const usable = await findUsableMcpCredential(
				this.credentialsFinderService,
				credential.id,
				user,
			);
			if (!usable) continue;

			const nodes = this.getNodesForCredentialType(credential.type);
			const mcpServers = registryTypes.get(credential.type) ?? [];
			if (nodes.length === 0 && mcpServers.length === 0) continue;

			connections.push({
				credentialId: credential.id,
				name: credential.name,
				type: credential.type,
				nodes,
				mcpServers,
			});
		}
		return connections;
	}

	async runNode(user: User, request: RunNodeRequest, access: BrokerAccess): Promise<RunNodeResult> {
		await this.assertModeAllows(access);
		const credential = await this.getBrokeredCredential(user, request.credentialId);

		const nodeType = this.resolveNodeType(request.nodeType, request.nodeVersion);
		const { description } = nodeType;
		// The registry reports a node under its full name. The description holds the short one.
		const fullDescription = { ...description, name: request.nodeType };
		const refusal = getNodeRefusalReason(fullDescription);
		if (refusal) throw new UserError(refusal);

		if (
			isGenericCredentialType(credential.type) ||
			!nodeDeclaresCredential(description, credential.type)
		) {
			throw new UserError(
				`The node "${request.nodeType}" does not accept the credential "${credential.name}" (${credential.type}). Call list_connections to see the nodes that this credential works with.`,
			);
		}

		if (containsExpression(request.parameters)) {
			throw new UserError(
				'Expressions are not allowed in node parameters. Send literal values only.',
			);
		}

		const version = request.nodeVersion ?? latestVersion(description);
		const annotations = resolveNodeAnnotations(description, {
			parameters: request.parameters,
			typeVersion: version,
		});
		if (access === 'read' && annotations.effect !== 'read') {
			throw new UserError(
				'This operation is not known to be read-only. Use run_node_write if it is available.',
			);
		}

		const projectId = await this.resolveProjectId(user, credential);
		const result = await this.executeNodeService.run(user, {
			type: request.nodeType,
			version,
			config: {
				parameters: request.parameters,
				credentials: { [credential.type]: { id: credential.id, name: credential.name } },
			},
			input: request.input,
			timeoutMs: request.timeoutMs,
			projectId,
		});

		return { result, annotations };
	}

	async listMcpServerTools(
		user: User,
		credentialId: string,
	): Promise<{ server: { slug: string; title: string }; tools: BrokerMcpTool[] }> {
		await this.assertModeAllows('read');
		const credential = await this.getBrokeredCredential(user, credentialId);
		const server = await this.getRegistryServerFor(credential);

		const tools = await this.withRegistryClient(user, server.slug, credential.id, async (built) =>
			built.map((tool) => this.toBrokerTool(tool, server)),
		);
		return { server: { slug: server.slug, title: server.title }, tools };
	}

	async callMcpServerTool(
		user: User,
		request: { credentialId: string; toolName: string; arguments?: Record<string, unknown> },
		access: BrokerAccess,
	): Promise<unknown> {
		await this.assertModeAllows(access);
		const credential = await this.getBrokeredCredential(user, request.credentialId);
		const server = await this.getRegistryServerFor(credential);

		return await this.withRegistryClient(user, server.slug, credential.id, async (built) => {
			const tool = built.find((candidate) => this.remoteName(candidate) === request.toolName);
			if (!tool) {
				throw new UserError(
					`The MCP server "${server.title}" has no tool named "${request.toolName}". Call list_mcp_server_tools to see its tools.`,
				);
			}
			if (access === 'read' && !this.toBrokerTool(tool, server).readOnly) {
				throw new UserError(
					'This tool is not known to be read-only. Use call_mcp_server_tool_write if it is available.',
				);
			}
			if (!tool.handler) throw new UserError(`The tool "${request.toolName}" cannot be called.`);
			return await tool.handler(request.arguments ?? {}, { toolName: tool.name });
		});
	}

	// ---------------------------------------------------------------------
	// Gates
	// ---------------------------------------------------------------------

	private async assertModeAllows(access: BrokerAccess) {
		const mode = await this.getMode();
		if (mode === 'blocked') {
			throw new UserError('An admin has blocked the use of credentials through MCP.');
		}
		if (access === 'write' && mode !== 'readWrite') {
			throw new UserError('An admin allows only read operations with credentials through MCP.');
		}
	}

	/** The caller can use the credential and its owner made it available in MCP. */
	private async getBrokeredCredential(
		user: User,
		credentialId: string,
	): Promise<CredentialsEntity> {
		const credential = await findUsableMcpCredential(
			this.credentialsFinderService,
			credentialId,
			user,
		);
		// One message for both cases, so a caller cannot probe for credentials.
		if (!credential || !credential.availableInMCP) {
			throw new UserError(
				'Credential not found or not available in MCP. Call list_connections to see the credentials that you can use.',
			);
		}
		return credential;
	}

	private resolveNodeType(type: string, version?: number) {
		try {
			return this.nodeTypes.getByNameAndVersion(type, version);
		} catch {
			throw new UserError(`Unknown node type "${type}"${version ? ` (version ${version})` : ''}.`);
		}
	}

	/**
	 * The run needs a project that can reach the credential. Prefer the project
	 * that owns it, then the caller's personal project.
	 */
	private async resolveProjectId(user: User, credential: CredentialsEntity): Promise<string> {
		const ownerProjectId = credential.shared?.find(
			(share) => share.role === 'credential:owner',
		)?.projectId;
		const personalProject = await this.projectService.getPersonalProject(user);

		const candidates = [ownerProjectId, personalProject?.id].filter(
			(id): id is string => typeof id === 'string',
		);
		for (const projectId of candidates) {
			const project = await this.projectService.getProjectWithScope(user, projectId, [
				...REQUIRED_PROJECT_SCOPES,
			]);
			if (project) return projectId;
		}
		throw new UserError(
			'You need permission to create and execute workflows in a project that can use this credential.',
		);
	}

	private async getRegistryServerFor(credential: CredentialsEntity): Promise<RegistryServerMatch> {
		const servers = (await this.getRegistryServersByCredentialType()).get(credential.type);
		const server = servers?.[0];
		if (!server) {
			throw new UserError(
				`The credential "${credential.name}" does not connect to an MCP server. Use run_node_read or run_node_write for service credentials.`,
			);
		}
		return server;
	}

	private async withRegistryClient<T>(
		user: User,
		slug: string,
		credentialId: string,
		fn: (tools: BuiltTool[]) => Promise<T>,
	): Promise<T> {
		const { McpConnectionDiscoveryService } = await import(
			'@/modules/mcp-registry/mcp-connection-discovery.service.js'
		);
		return await Container.get(McpConnectionDiscoveryService).withClient(
			user,
			{ slug, credentialId },
			async (client) => {
				const tools = await client.listTools();
				const [failure] = client.getConnectionFailures();
				if (failure) {
					throw new UserError(
						'n8n could not connect to the MCP server. Check that the credential is still authorized.',
					);
				}
				return await fn(tools);
			},
		);
	}

	private remoteName(tool: BuiltTool): string {
		return tool.mcpToolName ?? tool.name;
	}

	/** The catalogue is curated by n8n, so its hint wins over the server's own. */
	private toBrokerTool(tool: BuiltTool, server: RegistryServerMatch): BrokerMcpTool {
		const name = this.remoteName(tool);
		const catalogued = server.tools.find((candidate) => candidate.name === name);
		return {
			name,
			description: tool.description,
			inputSchema: tool.inputSchema,
			readOnly: catalogued ? catalogued.readOnly : tool.mcpAnnotations?.readOnlyHint === true,
		};
	}
}
