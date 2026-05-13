import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { readFile } from 'fs/promises';
import { InstanceSettings } from 'n8n-core';
import type { INodeTypeDescription } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';
import path from 'path';

import { CredentialsService } from '@/credentials/credentials.service';
import { WorkflowCreationService } from '@/workflows/workflow-creation.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowService } from '@/workflows/workflow.service';

/**
 * Bridges the cloud agent's tool-call arguments to n8n's internal services
 * with per-call RBAC enforced via the passed `User`. The cloud agent never
 * touches n8n services directly — it asks for an action, the adapter
 * decides if the user is allowed and what to return.
 */
@Service()
export class CloudAgentAdapter {
	private nodesCache: {
		promise: Promise<INodeTypeDescription[]>;
		expiresAt: number;
	} | null = null;

	private readonly NODES_CACHE_TTL_MS = 5 * 60 * 1000;

	constructor(
		private readonly logger: Logger,
		private readonly workflowService: WorkflowService,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowCreationService: WorkflowCreationService,
		private readonly credentialsService: CredentialsService,
		private readonly instanceSettings: InstanceSettings,
	) {}

	/**
	 * Returns the full set of node-type descriptions. Reads from the static
	 * JSON cache `${staticCacheDir}/types/nodes.json` that FrontendService
	 * writes at startup, and caches the promise in memory for 5 minutes.
	 *
	 * Why not `loadNodesAndCredentials.loadedNodes`: that map is populated
	 * lazily as nodes are instantiated, so on a fresh n8n it is nearly empty
	 * and node search/details return no results.
	 */
	private async getNodeDescriptions(): Promise<INodeTypeDescription[]> {
		if (this.nodesCache && Date.now() < this.nodesCache.expiresAt) {
			return await this.nodesCache.promise;
		}
		const filePath = path.join(this.instanceSettings.staticCacheDir, 'types/nodes.json');
		const promise = readFile(filePath, 'utf-8').then((json) =>
			jsonParse<INodeTypeDescription[]>(json),
		);
		this.nodesCache = { promise, expiresAt: Date.now() + this.NODES_CACHE_TTL_MS };
		promise.catch(() => {
			this.nodesCache = null;
		});
		return await promise;
	}

	async dispatchWorkflows(args: WorkflowsArgs, user: User): Promise<DispatchResult> {
		switch (args.action) {
			case 'list': {
				try {
					const { workflows } = await this.workflowService.getMany(user, {
						take: typeof args.active === 'boolean' ? 100 : 50,
					});
					return {
						output: {
							workflows: workflows.map((wf) => ({
								id: wf.id,
								name: wf.name,
								active: 'active' in wf ? wf.active : undefined,
								isArchived: 'isArchived' in wf ? wf.isArchived : undefined,
							})),
						},
						isError: false,
					};
				} catch (err) {
					return this.toError(err);
				}
			}

			case 'get': {
				if (!args.id) return this.argError('workflows.get requires id');
				try {
					const workflow = await this.workflowFinderService.findWorkflowForUser(args.id, user, [
						'workflow:read',
					]);
					if (!workflow) {
						return {
							output: { error: `Workflow ${args.id} not found or not accessible` },
							isError: true,
						};
					}
					return {
						output: {
							id: workflow.id,
							name: workflow.name,
							active: workflow.active,
							nodes: workflow.nodes,
							connections: workflow.connections,
							settings: workflow.settings,
						},
						isError: false,
					};
				} catch (err) {
					return this.toError(err);
				}
			}

			case 'create': {
				if (!args.name) return this.argError('workflows.create requires name');
				if (!Array.isArray(args.nodes))
					return this.argError('workflows.create requires nodes array');
				try {
					const entity = new WorkflowEntity();
					entity.name = args.name;
					// The agent already produced these via `tsx workflow.ts > workflow.json`
					// in the cloud sandbox using @n8n/workflow-sdk, so the shapes match
					// n8n's INode[] / IConnections expectations.
					entity.nodes = args.nodes as unknown as WorkflowEntity['nodes'];
					entity.connections = (args.connections as unknown as WorkflowEntity['connections']) ?? {};
					entity.active = false;
					entity.settings = (args.settings as unknown as WorkflowEntity['settings']) ?? undefined;

					const saved = await this.workflowCreationService.createWorkflow(user, entity, {});
					return {
						output: {
							id: saved.id,
							name: saved.name,
							active: saved.active,
						},
						isError: false,
					};
				} catch (err) {
					return this.toError(err);
				}
			}

			case 'deploy': {
				if (!args.id) return this.argError('workflows.deploy requires id');
				try {
					const activated = await this.workflowService.activateWorkflow(user, args.id);
					return {
						output: { id: activated.id, active: activated.active },
						isError: false,
					};
				} catch (err) {
					return this.toError(err);
				}
			}

			case 'update': {
				if (!args.id) return this.argError('workflows.update requires id');
				try {
					const update = new WorkflowEntity();
					if (args.name) update.name = args.name;
					if (Array.isArray(args.nodes)) {
						update.nodes = args.nodes as unknown as WorkflowEntity['nodes'];
					}
					if (args.connections !== undefined) {
						update.connections = args.connections as unknown as WorkflowEntity['connections'];
					}
					if (args.settings !== undefined) {
						update.settings = args.settings as unknown as WorkflowEntity['settings'];
					}
					const updated = await this.workflowService.update(user, update, args.id, {});
					return {
						output: { id: updated.id, name: updated.name, active: updated.active },
						isError: false,
					};
				} catch (err) {
					return this.toError(err);
				}
			}

			default:
				return this.argError(`Unknown workflows action: ${(args as { action: string }).action}`);
		}
	}

	async dispatchCredentials(args: CredentialsArgs, user: User): Promise<DispatchResult> {
		switch (args.action) {
			case 'list': {
				try {
					const credentials = await this.credentialsService.getMany(user, {
						listQueryOptions: args.type ? { filter: { type: args.type } } : undefined,
					});
					return {
						output: {
							credentials: credentials.map((c) => ({
								id: c.id,
								name: c.name,
								type: c.type,
							})),
						},
						isError: false,
					};
				} catch (err) {
					return this.toError(err);
				}
			}

			case 'get': {
				if (!args.id) return this.argError('credentials.get requires id');
				try {
					// CredentialsService.getMany supports filtering by id via listQueryOptions
					const credentials = await this.credentialsService.getMany(user, {
						listQueryOptions: { filter: { id: args.id } },
					});
					const cred = credentials[0];
					if (!cred) {
						return {
							output: { error: `Credential ${args.id} not found or not accessible` },
							isError: true,
						};
					}
					return {
						output: { id: cred.id, name: cred.name, type: cred.type },
						isError: false,
					};
				} catch (err) {
					return this.toError(err);
				}
			}

			default:
				return this.argError(`Unknown credentials action: ${(args as { action: string }).action}`);
		}
	}

	async dispatchNodes(args: NodesArgs): Promise<DispatchResult> {
		switch (args.action) {
			case 'search': {
				if (!args.query) return this.argError('nodes.search requires query');
				try {
					const nodes = await this.getNodeDescriptions();
					const q = args.query.toLowerCase();
					const limit = args.limit ?? 10;
					const matches: Array<{
						type: string;
						displayName: string;
						description: string;
					}> = [];
					for (const node of nodes) {
						if (matches.length >= limit) break;
						const description = node.description ?? '';
						if (
							node.displayName?.toLowerCase().includes(q) ||
							node.name?.toLowerCase().includes(q) ||
							description.toLowerCase().includes(q)
						) {
							matches.push({
								type: node.name,
								displayName: node.displayName,
								description,
							});
						}
					}
					return { output: { matches }, isError: false };
				} catch (err) {
					return this.toError(err);
				}
			}

			case 'get-type-definition': {
				if (!args.nodeType) return this.argError('nodes.get-type-definition requires nodeType');
				try {
					const nodes = await this.getNodeDescriptions();
					const wanted = args.nodeType;
					const version = args.nodeVersion;
					let match: INodeTypeDescription | undefined;
					if (version !== undefined) {
						match = nodes.find((n) => {
							if (n.name !== wanted) return false;
							return Array.isArray(n.version) ? n.version.includes(version) : n.version === version;
						});
					}
					if (!match) match = nodes.find((n) => n.name === wanted);
					if (!match) {
						return {
							output: { error: `Unknown node type: ${wanted}` },
							isError: true,
						};
					}
					return { output: match, isError: false };
				} catch (err) {
					return this.toError(err);
				}
			}

			default:
				return this.argError(`Unknown nodes action: ${(args as { action: string }).action}`);
		}
	}

	private toError(err: unknown): DispatchResult {
		const message = err instanceof Error ? err.message : String(err);
		this.logger.scoped('cloud-agent').warn(`Adapter call failed: ${message}`);
		return { output: { error: message }, isError: true };
	}

	private argError(message: string): DispatchResult {
		return { output: { error: message }, isError: true };
	}
}

export interface DispatchResult {
	output: unknown;
	isError: boolean;
}

interface WorkflowsArgs {
	action: 'list' | 'get' | 'create' | 'deploy' | 'update';
	id?: string;
	active?: boolean;
	name?: string;
	nodes?: unknown;
	connections?: unknown;
	settings?: unknown;
}

interface CredentialsArgs {
	action: 'list' | 'get';
	id?: string;
	type?: string;
}

interface NodesArgs {
	action: 'search' | 'get-type-definition';
	query?: string;
	limit?: number;
	nodeType?: string;
	nodeVersion?: number;
}
