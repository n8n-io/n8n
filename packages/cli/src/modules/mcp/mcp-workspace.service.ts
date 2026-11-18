import { createScopedWorkspace, type Workspace } from '@n8n/agents';
import { getWorkspaceRoot } from '@n8n/agents/sandbox';
import { Logger, ModuleRegistry } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { createHash } from 'node:crypto';
import { UserError } from '@n8n/errors';
import type { InstanceAiContext } from '@n8n/instance-ai';

/** A key names one workspace of a user. The n8n Assistant passes its thread id. */
const WORKSPACE_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export const DEFAULT_WORKSPACE_KEY = 'default';

export interface OpenedWorkspace {
	workspaceKey: string;
	/** The absolute root inside the sandbox; paths in tool calls are relative to it. */
	root: string;
	/** Scoped to the root, so a path cannot leave the workspace. */
	workspace: Workspace;
	/** The Assistant context the compiler and the workspace setup read services from. */
	context: InstanceAiContext;
}

/**
 * PoC: the Assistant's build sandbox, reached through MCP tools. A workspace
 * belongs to one user and one key: the sandbox identity is derived from both,
 * so another user cannot address it and the same key reattaches to the same
 * remote sandbox from any main. The sandbox lifecycle (settings, cache,
 * expiry, reclamation) stays with the Assistant's sandbox service.
 */
@Service()
export class McpWorkspaceService {
	constructor(
		private readonly logger: Logger,
		private readonly moduleRegistry: ModuleRegistry,
	) {}

	/** Whether this instance can give the caller a workspace at all. */
	async isAvailable(user: User): Promise<boolean> {
		if (!this.moduleRegistry.isActive('instance-ai')) return false;
		try {
			const { service } = await this.resolve();
			const config = await service.getSandboxService().resolveSandboxConfig(user);
			return config.enabled;
		} catch (error) {
			this.logger.debug('Instance MCP workspace unavailable', {
				error: error instanceof Error ? error.message : String(error),
			});
			return false;
		}
	}

	/** Creates or reattaches the workspace of `(user, key)`, set up for workflow builds. */
	async open(user: User, key: string | undefined): Promise<OpenedWorkspace> {
		const workspaceKey = key?.trim() || DEFAULT_WORKSPACE_KEY;
		if (!WORKSPACE_KEY_PATTERN.test(workspaceKey)) {
			throw new UserError(
				'A workspace key is 1 to 64 letters, digits, dots, underscores or dashes, and starts with a letter or digit.',
			);
		}
		const { service, adapter } = await this.resolve();
		const context = adapter.createContext(user, {});
		const entry = await service
			.getSandboxService()
			.getOrCreateWorkspace(mcpWorkspaceThreadId(user.id, workspaceKey), user, context);
		if (!entry) {
			throw new UserError('The build sandbox is not enabled on this instance.');
		}
		const root = await getWorkspaceRoot(entry.workspace);
		const workspace = createScopedWorkspace(entry.workspace, root);
		context.workspace = workspace;
		context.workspaceRoot = root;
		return { workspaceKey, root, workspace, context };
	}

	/** Lazy, as every reach of this module into `instance-ai` is: it keeps boot light. */
	private async resolve() {
		const { InstanceAiService } = await import('@/modules/instance-ai/instance-ai.service.js');
		const { InstanceAiAdapterService } = await import(
			'@/modules/instance-ai/instance-ai.adapter.service.js'
		);
		return {
			service: Container.get(InstanceAiService),
			adapter: Container.get(InstanceAiAdapterService),
		};
	}
}

/**
 * The sandbox service keys entries by "thread id". A workspace of an MCP caller
 * is keyed by user and key instead, hashed so the derived sandbox name stays
 * short enough for every provider (Daytona names are cut at 63 characters, and
 * a cut name must not merge two users' workspaces).
 */
export function mcpWorkspaceThreadId(userId: string, workspaceKey: string): string {
	const digest = createHash('sha256').update(`${userId}\0${workspaceKey}`).digest('hex');
	return `mcp-${digest.slice(0, 24)}`;
}
