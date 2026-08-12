import type { ProjectRepository, User } from '@n8n/db';
import {
	NodeConnectionTypes,
	NodeVersionNotFoundError,
	type IConnections,
	type INode,
	type INodeParameters,
	type INodeTypeDescription,
} from 'n8n-workflow';
import z from 'zod';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { NodeTypes } from '@/node-types';
import { HTTP_NODE_TYPES } from '@/services/ai-gateway-eligibility';
import type { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';
import { ANALYZE_WORKFLOW_COMPATIBILITY_TOOL_NAME } from './constants';
import {
	buildProjectCredentialClassifier,
	computeActiveCredentialTypes,
	type CredentialClassification,
} from './credential-validation';

const MAX_NODES = 100;
const MAX_SERIALIZED_BYTES = 1024 * 1024;
const MAX_PROPOSALS = 20;

const OPENAI_CHAT_MODEL_NODE = '@n8n/n8n-nodes-langchain.lmChatOpenAi';

const CHAT_MODEL_REPLACEMENTS = [
	{
		type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
		credentialType: 'anthropicApi',
		displayName: 'Anthropic Chat Model',
	},
	{
		type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
		credentialType: 'googlePalmApi',
		displayName: 'Google Gemini Chat Model',
	},
] as const;

const inputSchema = {
	workflow: z
		.record(z.string(), z.unknown())
		.describe('An n8n workflow JSON object. Pass the object itself, not a URL or JSON string.'),
	projectId: z
		.string()
		.optional()
		.describe(
			'Target project ID. Resolve a user-named project with search_projects first. Omit only to use the caller personal project.',
		),
} satisfies z.ZodRawShape;

const requirementSchema = z.object({
	key: z.string(),
	label: z.string(),
	kind: z.enum(['resource_choice', 'parameter_value']),
});

const credentialSummarySchema = z.object({
	id: z.string(),
	name: z.string(),
	type: z.string(),
});

const proposalSchema = z.object({
	id: z.string(),
	kind: z.enum(['assign_credential', 'replace_chat_model']),
	recommended: z.boolean(),
	message: z.string(),
	credential: credentialSummarySchema.optional(),
	replacement: z
		.object({
			type: z.string(),
			typeVersion: z.number(),
		})
		.optional(),
	preserves: z.array(z.string()),
	changes: z.array(z.string()),
	drops: z.array(z.string()),
	requires: z.array(requirementSchema),
});

const issueSchema = z.object({
	id: z.string(),
	status: z.enum(['repairable', 'blocked']),
	node: z.object({
		name: z.string(),
		type: z.string(),
		typeVersion: z.number(),
	}),
	problem: z.enum([
		'node_unavailable',
		'node_version_unavailable',
		'credential_missing',
		'credential_not_usable_in_project',
		'unsupported_configuration',
	]),
	message: z.string(),
	setupHint: z.string().optional(),
	proposals: z.array(proposalSchema),
});

const outputSchema = {
	status: z.enum(['compatible', 'needs_input', 'has_blockers']).optional(),
	targetProject: z
		.object({
			id: z.string(),
			name: z.string(),
			type: z.enum(['personal', 'team']),
		})
		.optional(),
	summary: z
		.object({
			compatible: z.number().int().nonnegative(),
			repairable: z.number().int().nonnegative(),
			blocked: z.number().int().nonnegative(),
			warnings: z.number().int().nonnegative(),
		})
		.optional(),
	issues: z.array(issueSchema).optional(),
	warnings: z.array(z.string()).optional(),
	error: z.string().optional(),
} satisfies z.ZodRawShape;

type UsableCredential = { id: string; name: string; type: string };
type RepairProposal = z.infer<typeof proposalSchema>;
type CompatibilityIssue = z.infer<typeof issueSchema>;

const isNodeParameters = (value: unknown): value is INodeParameters =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const isConnections = (value: unknown): value is IConnections =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const workflowNodeSchema = z
	.object({
		id: z.string().optional(),
		name: z.string().min(1),
		type: z.string().min(1),
		typeVersion: z.number().positive(),
		position: z.tuple([z.number(), z.number()]).optional(),
		parameters: z.custom<INodeParameters>(isNodeParameters),
		credentials: z
			.record(
				z.string(),
				z
					.object({
						id: z.string().nullable().optional(),
						name: z.string().optional(),
					})
					.passthrough(),
			)
			.optional(),
		disabled: z.boolean().optional(),
	})
	.passthrough();

const workflowSchema = z
	.object({
		name: z.string().optional(),
		nodes: z.array(workflowNodeSchema),
		connections: z.custom<IConnections>(isConnections),
		settings: z.record(z.string(), z.unknown()).optional(),
	})
	.passthrough();

type ParsedNode = z.infer<typeof workflowNodeSchema>;

function toNode(node: ParsedNode): INode {
	const credentials = node.credentials
		? Object.fromEntries(
				Object.entries(node.credentials).map(([type, credential]) => [
					type,
					{ id: credential.id ?? null, name: credential.name ?? '' },
				]),
			)
		: undefined;

	return {
		id: node.id ?? node.name,
		name: node.name,
		type: node.type,
		typeVersion: node.typeVersion,
		position: node.position ?? [0, 0],
		parameters: node.parameters,
		...(credentials ? { credentials } : {}),
		...(node.disabled !== undefined ? { disabled: node.disabled } : {}),
	};
}

function issueId(node: INode, problem: CompatibilityIssue['problem'], suffix?: string): string {
	return ['issue', node.name, problem, suffix].filter(Boolean).join(':');
}

function proposalId(node: INode, kind: RepairProposal['kind'], suffix: string): string {
	return ['repair', node.name, kind, suffix].join(':');
}

function nodeSummary(node: INode) {
	return { name: node.name, type: node.type, typeVersion: node.typeVersion };
}

function installedVersion(description: INodeTypeDescription, fallback: number): number {
	if (typeof description.defaultVersion === 'number') return description.defaultVersion;
	if (typeof description.version === 'number') return description.version;
	if (Array.isArray(description.version)) {
		const versions = description.version.filter(
			(version): version is number => typeof version === 'number',
		);
		if (versions.length > 0) return Math.max(...versions);
	}
	return fallback;
}

function hasOnlyPortableChatModelParameters(parameters: INodeParameters): boolean {
	const allowedKeys = new Set(['model', 'modelName', 'options']);
	for (const [key, value] of Object.entries(parameters)) {
		if (!allowedKeys.has(key)) return false;
		if (key === 'options' && typeof value === 'object' && value !== null) {
			if (Object.keys(value).length > 0) return false;
		} else if (key === 'options' && value !== undefined && value !== null) {
			return false;
		}
	}
	return true;
}

function hasStandardLanguageModelConnection(node: INode, connections: IConnections): boolean {
	const nodeConnections = connections[node.name];
	if (!nodeConnections) return false;

	const connectionTypes = Object.keys(nodeConnections);
	if (connectionTypes.length !== 1 || connectionTypes[0] !== NodeConnectionTypes.AiLanguageModel) {
		return false;
	}

	const outputs = nodeConnections[NodeConnectionTypes.AiLanguageModel];
	if (!Array.isArray(outputs)) return false;
	const destinations = outputs.flat().filter((connection) => connection !== null);
	return (
		destinations.length > 0 &&
		destinations.every((connection) => connection.type === NodeConnectionTypes.AiLanguageModel)
	);
}

function credentialProblem(
	classification: CredentialClassification,
	expectedType: string,
): CompatibilityIssue['problem'] | null {
	if (classification.status === 'not-found') return 'credential_missing';
	if (classification.status === 'cross-project') {
		return 'credential_not_usable_in_project';
	}
	return classification.type === expectedType ? null : 'credential_missing';
}

function exactCredentialProposals(
	node: INode,
	credentialType: string,
	candidates: UsableCredential[],
): RepairProposal[] {
	const orderedCandidates = [...candidates].sort((a, b) => a.id.localeCompare(b.id));
	const recommended = orderedCandidates.length === 1;

	return orderedCandidates.map((credential) => ({
		id: proposalId(node, 'assign_credential', credential.id),
		kind: 'assign_credential',
		recommended,
		message: `Assign credential "${credential.name}" to ${node.name}.`,
		credential,
		preserves: ['node type', 'operation', 'parameters', 'expressions', 'connections'],
		changes: [`credential for ${credentialType}`],
		drops: [],
		requires: [],
	}));
}

function chatReplacementProposals(
	node: INode,
	connections: IConnections,
	credentialsByType: Map<string, UsableCredential[]>,
	nodeTypes: NodeTypes,
): { proposals: RepairProposal[]; unsupportedConfiguration: boolean } {
	if (node.type !== OPENAI_CHAT_MODEL_NODE) {
		return { proposals: [], unsupportedConfiguration: false };
	}
	if (
		!hasOnlyPortableChatModelParameters(node.parameters) ||
		!hasStandardLanguageModelConnection(node, connections)
	) {
		return { proposals: [], unsupportedConfiguration: true };
	}

	const proposals: RepairProposal[] = [];
	for (const replacement of CHAT_MODEL_REPLACEMENTS) {
		let description: INodeTypeDescription;
		try {
			description = nodeTypes.getByNameAndVersion(replacement.type).description;
		} catch {
			continue;
		}
		if (!description.credentials?.some(({ name }) => name === replacement.credentialType)) {
			continue;
		}

		const candidates = [...(credentialsByType.get(replacement.credentialType) ?? [])].sort((a, b) =>
			a.id.localeCompare(b.id),
		);
		for (const credential of candidates) {
			proposals.push({
				id: proposalId(node, 'replace_chat_model', `${replacement.type}:${credential.id}`),
				kind: 'replace_chat_model',
				recommended: false,
				message: `Replace ${node.name} with ${replacement.displayName} using "${credential.name}".`,
				credential,
				replacement: {
					type: replacement.type,
					typeVersion: installedVersion(description, 1),
				},
				preserves: ['chat-model role', 'node name', 'canvas position', 'AI model connection'],
				changes: ['model provider', 'model selection', 'model outputs may differ'],
				drops: ['source provider model selection'],
				requires: [
					{
						key: 'model',
						label: `Model for ${replacement.displayName}`,
						kind: 'resource_choice',
					},
				],
			});
		}
	}

	if (proposals.length === 1) proposals[0].recommended = true;
	return { proposals, unsupportedConfiguration: false };
}

function formatReportText(report: {
	status: 'compatible' | 'needs_input' | 'has_blockers';
	targetProject: { name: string };
	summary: { compatible: number; repairable: number; blocked: number; warnings: number };
	issues: CompatibilityIssue[];
}): string {
	const { summary } = report;
	const lines = [
		`Compatibility check for project "${report.targetProject.name}": ${summary.compatible} compatible, ${summary.repairable} repairable, ${summary.blocked} blocked, ${summary.warnings} warnings.`,
	];
	for (const issue of report.issues) lines.push(`- ${issue.node.name}: ${issue.message}`);
	return lines.join('\n');
}

export const createAnalyzeWorkflowCompatibilityTool = (
	user: User,
	projectRepository: ProjectRepository,
	credentialsService: CredentialsService,
	nodeTypes: NodeTypes,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: ANALYZE_WORKFLOW_COMPATIBILITY_TOOL_NAME,
	config: {
		description:
			'Analyze workflow JSON against the installed node types and credentials usable in a target project before importing it. Read-only: returns exact credential repairs, narrowly supported OpenAI chat-model replacements, and honest blockers. Call this before create_workflow_from_code when installing a template. Propose only repairs returned by this tool.',
		inputSchema,
		outputSchema,
		annotations: {
			title: 'Analyze Workflow Compatibility',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ workflow, projectId }) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: ANALYZE_WORKFLOW_COMPATIBILITY_TOOL_NAME,
			parameters: { hasProjectId: projectId !== undefined },
		};

		const fail = (message: string) => {
			telemetryPayload.results = { success: false, error: message };
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
			const output = { error: message };
			return {
				content: [{ type: 'text' as const, text: JSON.stringify(output) }],
				structuredContent: output,
				isError: true,
			};
		};

		try {
			const serialized = JSON.stringify(workflow);
			if (Buffer.byteLength(serialized, 'utf8') > MAX_SERIALIZED_BYTES) {
				return fail('Workflow exceeds the 1 MB compatibility-analysis limit.');
			}

			const parsed = workflowSchema.safeParse(workflow);
			if (!parsed.success) {
				const firstIssue = parsed.error.issues[0];
				return fail(
					`Invalid workflow JSON${firstIssue ? ` at ${firstIssue.path.join('.') || 'workflow'}: ${firstIssue.message}` : ''}.`,
				);
			}
			if (parsed.data.nodes.length > MAX_NODES) {
				return fail(`Workflow has more than the ${MAX_NODES}-node compatibility-analysis limit.`);
			}

			const targetProject = projectId
				? (await projectRepository.getAccessibleProjects(user.id)).find(
						(project) => project.id === projectId,
					)
				: await projectRepository.getPersonalProjectForUserOrFail(user.id);
			if (!targetProject) {
				return fail(
					`Project with id "${projectId}" was not found or is not accessible. Use search_projects to resolve an accessible project.`,
				);
			}

			const usableCredentials = await credentialsService.getCredentialsAUserCanUseInAWorkflow(
				user,
				{
					projectId: targetProject.id,
				},
			);
			const credentialCandidates: UsableCredential[] = usableCredentials.map(
				({ id, name, type }) => ({ id, name, type }),
			);
			const credentialsByType = new Map<string, UsableCredential[]>();
			for (const credential of credentialCandidates) {
				const candidates = credentialsByType.get(credential.type) ?? [];
				candidates.push(credential);
				credentialsByType.set(credential.type, candidates);
			}
			const classifyCredential = await buildProjectCredentialClassifier(
				user,
				{ projectId: targetProject.id },
				credentialsService,
				credentialCandidates,
			);

			const issues: CompatibilityIssue[] = [];
			const warnings: string[] = [];
			let compatible = 0;

			for (const parsedNode of parsed.data.nodes) {
				const node = toNode(parsedNode);
				const nodeIssues: CompatibilityIssue[] = [];
				let description: INodeTypeDescription | undefined;
				try {
					description = nodeTypes.getByNameAndVersion(node.type, node.typeVersion).description;
				} catch (error) {
					const versionUnavailable = error instanceof NodeVersionNotFoundError;
					const problem = versionUnavailable ? 'node_version_unavailable' : 'node_unavailable';
					const message = versionUnavailable
						? `${node.name} requires unavailable version ${node.typeVersion} of ${node.type}.`
						: `${node.name} uses node type ${node.type}, which is not installed.`;
					nodeIssues.push({
						id: issueId(node, problem),
						status: 'blocked',
						node: nodeSummary(node),
						problem,
						message,
						setupHint: versionUnavailable
							? 'Install a version of n8n that supports this node version or revise the node manually.'
							: 'Install the node package or replace this node manually.',
						proposals: [],
					});
				}

				if (nodeIssues.length === 0 && description !== undefined) {
					const activeCredentialTypes = computeActiveCredentialTypes(node, nodeTypes);
					if (activeCredentialTypes === null) {
						nodeIssues.push({
							id: issueId(node, 'unsupported_configuration'),
							status: 'blocked',
							node: nodeSummary(node),
							problem: 'unsupported_configuration',
							message: `${node.name} selects its credential type dynamically, so compatibility cannot be determined safely.`,
							setupHint: 'Review and configure this node manually after import.',
							proposals: [],
						});
					} else {
						for (const credentialType of activeCredentialTypes) {
							const reference = node.credentials?.[credentialType];
							let problem: CompatibilityIssue['problem'] | null = 'credential_missing';
							if (reference?.id) {
								problem = credentialProblem(await classifyCredential(reference.id), credentialType);
							}
							if (problem === null) continue;

							const isDeclaredCredential =
								description.credentials?.some(({ name }) => name === credentialType) ?? false;
							const candidates = credentialsByType.get(credentialType) ?? [];
							const proposals =
								isDeclaredCredential && !HTTP_NODE_TYPES.has(node.type)
									? exactCredentialProposals(node, credentialType, candidates)
									: [];

							let finalProblem = problem;
							let finalProposals = proposals;
							if (finalProposals.length === 0) {
								const replacements = chatReplacementProposals(
									node,
									parsed.data.connections,
									credentialsByType,
									nodeTypes,
								);
								finalProposals = replacements.proposals;
								if (replacements.unsupportedConfiguration) {
									finalProblem = 'unsupported_configuration';
								}
							}

							const status = finalProposals.length > 0 ? 'repairable' : 'blocked';
							const message =
								finalProblem === 'credential_not_usable_in_project'
									? `${node.name} references a ${credentialType} credential that cannot be used in this project.`
									: finalProblem === 'unsupported_configuration'
										? `${node.name} uses provider-specific or non-standard chat-model configuration that the POC cannot translate safely.`
										: `${node.name} has no usable ${credentialType} credential in this project.`;
							nodeIssues.push({
								id: issueId(node, finalProblem, credentialType),
								status,
								node: nodeSummary(node),
								problem: finalProblem,
								message,
								...(status === 'blocked'
									? {
											setupHint: `Connect a ${credentialType} credential to this project or configure the node manually after import.`,
										}
									: {}),
								proposals: finalProposals,
							});
						}
					}
				}

				if (node.disabled && nodeIssues.length > 0) {
					for (const issue of nodeIssues) {
						warnings.push(`Disabled node ${node.name}: ${issue.message}`);
					}
				} else if (nodeIssues.length > 0) {
					issues.push(...nodeIssues);
				} else {
					compatible++;
				}
			}

			if (parsed.data.settings?.errorWorkflow) {
				warnings.push(
					'The template references an instance-specific error workflow. Verify or clear settings.errorWorkflow before activation.',
				);
			}

			const proposalCount = issues.reduce((count, issue) => count + issue.proposals.length, 0);
			if (proposalCount > MAX_PROPOSALS) {
				return fail(
					`Compatibility analysis produced more than the ${MAX_PROPOSALS}-proposal limit. Narrow the target project credentials or simplify the template.`,
				);
			}

			const repairable = issues.filter(({ status }) => status === 'repairable').length;
			const blocked = issues.filter(({ status }) => status === 'blocked').length;
			const status: 'compatible' | 'needs_input' | 'has_blockers' =
				blocked > 0 ? 'has_blockers' : repairable > 0 ? 'needs_input' : 'compatible';
			const report = {
				status,
				targetProject: {
					id: targetProject.id,
					name: targetProject.name,
					type: targetProject.type,
				},
				summary: { compatible, repairable, blocked, warnings: warnings.length },
				issues,
				...(warnings.length > 0 ? { warnings } : {}),
			};

			telemetryPayload.results = {
				success: true,
				data: { nodeCount: parsed.data.nodes.length, repairable, blocked },
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: formatReportText(report) }],
				structuredContent: report,
			};
		} catch (error) {
			return fail(error instanceof Error ? error.message : String(error));
		}
	},
});
