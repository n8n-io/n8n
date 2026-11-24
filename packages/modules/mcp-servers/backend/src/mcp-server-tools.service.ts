import {
	MCP_SERVER_TOOL_DESCRIPTION_MAX_LENGTH,
	mcpServerSchema,
	type McpServerToolBrokenReason,
	type McpServerToolCandidate,
	type McpServerToolResponse,
	type McpServerWorkflowUnavailableReason,
	type UpdateMcpServerToolDto,
} from '@n8n/api-types';
import { EventService } from '@n8n/backend-services';
import { Service } from '@n8n/di';
import { BadRequestError, ConflictError, NotFoundError } from '@n8n/errors';

import type { McpServerActor } from './mcp-server-events';
import type { McpServerTool } from './mcp-server-tool.entity';
import { McpServerToolRepository, type NewWorkflowTool } from './mcp-server-tool.repository';
import type { McpServer } from './mcp-server.entity';
import { McpServerRepository } from './mcp-server.repository';
import { toToolName, uniqueToolName } from './tools/tool-name';
import { WorkflowToolPort, type WorkflowToolRefusal } from './tools/workflow-tool-port';

/** `null` for `not_found`: a workflow that the project does not own is no candidate. */
const UNAVAILABLE_REASONS: Record<WorkflowToolRefusal, McpServerWorkflowUnavailableReason | null> =
	{
		not_found: null,
		not_published: 'not_published',
		no_supported_trigger: 'missing_trigger',
		incompatible_nodes: 'incompatible_nodes',
		not_callable: 'caller_policy',
	};

/** A workflow that the project no longer owns, or that is archived, counts as deleted. */
function toBrokenReason(refusal: WorkflowToolRefusal): McpServerToolBrokenReason {
	return UNAVAILABLE_REASONS[refusal] ?? 'deleted';
}

function isId(value: string): boolean {
	return mcpServerSchema.shape.id.safeParse(value).success;
}

function toToolResponse(
	tool: McpServerTool,
	brokenReason: McpServerToolBrokenReason | null,
): McpServerToolResponse {
	return {
		id: tool.id,
		serverId: tool.serverId,
		kind: tool.kind,
		targetId: tool.targetId,
		toolName: tool.toolName,
		description: tool.description,
		draftSource: tool.draftSource,
		position: tool.position,
		brokenReason,
		createdAt: tool.createdAt.toISOString(),
		updatedAt: tool.updatedAt.toISOString(),
	};
}

/** The tools of a server: the workflow picker, add, edit, and remove. */
@Service()
export class McpServerToolsService {
	constructor(
		private readonly servers: McpServerRepository,
		private readonly tools: McpServerToolRepository,
		private readonly workflows: WorkflowToolPort,
		private readonly events: EventService,
	) {}

	/** The tools of a server, in their order. Each tool says if it is broken, and why. */
	async listTools(projectId: string, serverId: string): Promise<McpServerToolResponse[]> {
		const server = await this.findServer(projectId, serverId);
		const tools = await this.tools.listByServer(server.id);
		return await Promise.all(
			tools.map(async (tool) => toToolResponse(tool, await this.brokenReason(projectId, tool))),
		);
	}

	/** Every workflow of the project, with the reason when it cannot be a tool of this server. */
	async listCandidates(projectId: string, serverId: string): Promise<McpServerToolCandidate[]> {
		const server = await this.findServer(projectId, serverId);
		const [workflows, tools] = await Promise.all([
			this.workflows.list(projectId),
			this.tools.listByServer(server.id),
		]);
		const added = new Set(tools.map((tool) => tool.targetId));

		const candidates = workflows.flatMap(({ workflowId, name, description, check }) => {
			const unavailable = check.callable ? null : UNAVAILABLE_REASONS[check.reason];
			if (!check.callable && !unavailable) return [];
			const reason = added.has(workflowId) ? ('already_added' as const) : unavailable;
			return [{ workflowId, name, description, reason }];
		});
		return candidates.sort((a, b) => a.name.localeCompare(b.name));
	}

	/**
	 * Saves one tool for each workflow, with the workflow name and description as the default
	 * text. If one workflow cannot be a tool, nothing is saved.
	 */
	async addWorkflowTools(
		projectId: string,
		serverId: string,
		workflowIds: string[],
		actor: McpServerActor,
	): Promise<McpServerToolResponse[]> {
		const server = await this.findServer(projectId, serverId);
		const existing = await this.tools.listByServer(server.id);
		const added = new Set(existing.map((tool) => tool.targetId));
		const taken = new Set(existing.map((tool) => tool.toolName));

		const newTools: NewWorkflowTool[] = [];
		for (const workflowId of new Set(workflowIds)) {
			if (added.has(workflowId)) {
				throw new ConflictError(`The server already has the workflow "${workflowId}" as a tool.`);
			}
			const described = await this.workflows.describe(projectId, workflowId);
			if (!described.callable) {
				const reason = UNAVAILABLE_REASONS[described.reason];
				throw new BadRequestError(
					reason
						? `The workflow "${workflowId}" cannot be a tool: ${reason}.`
						: `The project has no workflow "${workflowId}".`,
				);
			}
			const toolName = uniqueToolName(toToolName(described.name), taken);
			taken.add(toolName);
			newTools.push({
				workflowId,
				toolName,
				description: (described.description ?? '')
					.trim()
					.slice(0, MCP_SERVER_TOOL_DESCRIPTION_MAX_LENGTH),
			});
		}

		const saved = await this.tools.addWorkflowTools(server.id, newTools);
		for (const tool of saved) {
			this.events.emit('mcp-server-tool-added', {
				...actor,
				serverId: server.id,
				toolKind: tool.kind,
				isAiDraft: false,
			});
		}
		return saved.map((tool) => toToolResponse(tool, null));
	}

	/** An edit by the builder marks the text as `edited`, so the analysis of AI drafts sees it. */
	async updateTool(
		projectId: string,
		serverId: string,
		toolId: string,
		changes: UpdateMcpServerToolDto,
	): Promise<McpServerToolResponse> {
		const tool = await this.findTool(projectId, serverId, toolId);
		const hasChanges = changes.toolName !== undefined || changes.description !== undefined;
		const updated = hasChanges
			? await this.tools.updateInServer(tool.serverId, tool.id, {
					...changes,
					draftSource: 'edited',
				})
			: tool;
		if (!updated) throw new NotFoundError('Tool not found');
		return toToolResponse(updated, await this.brokenReason(projectId, updated));
	}

	async removeTool(projectId: string, serverId: string, toolId: string): Promise<void> {
		const tool = await this.findTool(projectId, serverId, toolId);
		await this.tools.deleteInServer(tool.serverId, tool.id);
	}

	private async findServer(projectId: string, serverId: string): Promise<McpServer> {
		const server = isId(serverId) ? await this.servers.findInProject(projectId, serverId) : null;
		if (!server) throw new NotFoundError('MCP server not found');
		return server;
	}

	private async findTool(
		projectId: string,
		serverId: string,
		toolId: string,
	): Promise<McpServerTool> {
		const server = await this.findServer(projectId, serverId);
		const tool = isId(toolId) ? await this.tools.findInServer(server.id, toolId) : null;
		if (!tool) throw new NotFoundError('Tool not found');
		return tool;
	}

	/** `targetId` has no foreign key, so n8n finds out at read time if the workflow still fits. */
	private async brokenReason(
		projectId: string,
		tool: McpServerTool,
	): Promise<McpServerToolBrokenReason | null> {
		if (tool.kind !== 'workflow' || !tool.targetId) return null;
		const check = await this.workflows.check(projectId, tool.targetId);
		return check.callable ? null : toBrokenReason(check.reason);
	}
}
