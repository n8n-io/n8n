import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { CredentialsService } from '@/credentials/credentials.service';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { Service } from '@n8n/di';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowService } from '@/workflows/workflow.service';

/**
 * Bridges the cloud agent's tool-call arguments to n8n's internal services
 * with per-call RBAC enforced via the passed `User`. The cloud agent never
 * touches n8n services directly — it asks for an action, the adapter
 * decides if the user is allowed and what to return.
 *
 * Reads (workflows.list/get, credentials.list/get, nodes.search/get-type-
 * definition) are wired through. Writes (workflows.create/deploy) are
 * stubbed in this commit and return a TODO marker so the agent surfaces
 * a clear "not yet implemented" to the user. They land in a follow-up.
 */
@Service()
export class CloudAgentAdapter {
	constructor(
		private readonly logger: Logger,
		private readonly workflowService: WorkflowService,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly credentialsService: CredentialsService,
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
	) {}

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

			case 'create':
			case 'deploy':
				return {
					output: {
						_notImplemented: true,
						message: `workflows.${args.action} is not yet wired on the n8n side. Phase B follow-up.`,
					},
					isError: true,
				};

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
				const q = args.query.toLowerCase();
				const limit = args.limit ?? 10;
				const matches: Array<{ type: string; name: string; displayName: string }> = [];

				for (const [type, loaded] of Object.entries(this.loadNodesAndCredentials.loadedNodes)) {
					if (matches.length >= limit) break;
					const description = (loaded as { description?: { name?: string; displayName?: string } })
						.description;
					const displayName = description?.displayName ?? '';
					const name = description?.name ?? type;
					if (
						displayName.toLowerCase().includes(q) ||
						type.toLowerCase().includes(q) ||
						name.toLowerCase().includes(q)
					) {
						matches.push({ type, name, displayName });
					}
				}
				return { output: { matches }, isError: false };
			}

			case 'get-type-definition': {
				if (!args.nodeType) return this.argError('nodes.get-type-definition requires nodeType');
				const loaded = this.loadNodesAndCredentials.loadedNodes[args.nodeType];
				if (!loaded) {
					return {
						output: { error: `Unknown node type: ${args.nodeType}` },
						isError: true,
					};
				}
				const description = (loaded as { description?: unknown }).description;
				return { output: description ?? loaded, isError: false };
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
	action: 'list' | 'get' | 'create' | 'deploy';
	id?: string;
	active?: boolean;
	name?: string;
	nodes?: unknown;
	connections?: unknown;
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
