import type { ToolsInput } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { nanoid } from 'nanoid';

import { delegateInputSchema, delegateOutputSchema, type DelegateInput } from './delegate.schemas';
import { truncateLabel } from './display-utils';
import { registerWithMastra } from '../../agent/register-with-mastra';
import { createSubAgent, SUB_AGENT_PROTOCOL } from '../../agent/sub-agent-factory';
import { createSubAgentMemory, subAgentResourceId } from '../../memory/sub-agent-memory';
import { MEMORY_ENABLED_ROLES } from '../../memory/sub-agent-memory-templates';
import { formatPreviousAttempts } from '../../storage/iteration-log';
import { consumeStreamWithHitl } from '../../stream/consume-with-hitl';
import type { OrchestrationContext } from '../../types';

const FORBIDDEN_TOOL_NAMES = new Set([
	'plan',
	'ask-plan-questions',
	'create-plan',
	'update-plan',
	'approve-plan',
	'request-plan-approval',
	'update-phase-status',
	'block-phase-with-question',
	'delegate',
]);

const FALLBACK_MAX_STEPS = 10;

const WORKFLOW_BUILD_TOOL_NAMES = new Set(['build-workflow', 'patch-workflow']);
const WORKFLOW_BUILD_PATTERNS = [
	/\bworkflow builder\b/i,
	/\bbuild(?:ing)? (?:an? |the )?workflow\b/i,
	/\bcreate(?:ing)? (?:an? |the )?workflow\b/i,
	/\bmodify(?:ing)? (?:an? |the )?workflow\b/i,
	/\bupdate(?:ing)? (?:an? |the )?workflow\b/i,
	/\bpatch(?:ing)? (?:an? |the )?workflow\b/i,
	/\bfix(?:ing)? (?:an? |the )?workflow\b/i,
	/\badd(?:ing)? .* node\b/i,
	/\bremove(?:ing)? .* node\b/i,
	/\brewire\b/i,
];

function generateAgentId(): string {
	return `agent-${nanoid(6)}`;
}

function isWorkflowBuildDelegation(input: DelegateInput): boolean {
	if (input.tools.some((name) => WORKFLOW_BUILD_TOOL_NAMES.has(name))) {
		return true;
	}

	return [input.role, input.instructions, input.briefing].some((text) =>
		WORKFLOW_BUILD_PATTERNS.some((pattern) => pattern.test(text)),
	);
}

export function createDelegateTool(context: OrchestrationContext) {
	return createTool({
		id: 'delegate',
		description:
			'Spawn a focused sub-agent to handle a specific subtask. Specify the ' +
			'role, a task-specific system prompt, the tool subset needed, and a ' +
			'detailed briefing. The sub-agent executes independently and returns ' +
			'a synthesized result. Use for complex multi-step operations that ' +
			'benefit from a clean context window.',
		inputSchema: delegateInputSchema,
		outputSchema: delegateOutputSchema,
		execute: async (input) => {
			if (input.tools.length === 0) {
				return { result: 'Delegation failed: "tools" must contain at least one tool name' };
			}

			// 1. Validate tools — check both domain tools and MCP tools
			const errors: string[] = [];
			const validTools: ToolsInput = {};
			const availableMcpTools = context.mcpTools ?? {};

			for (const name of input.tools) {
				if (FORBIDDEN_TOOL_NAMES.has(name)) {
					errors.push(`"${name}" is an orchestration tool and cannot be delegated`);
				} else if (name in context.domainTools) {
					validTools[name] = context.domainTools[name];
				} else if (name in availableMcpTools) {
					validTools[name] = availableMcpTools[name];
				} else {
					errors.push(`"${name}" is not a registered domain tool`);
				}
			}

			if (errors.length > 0) {
				return { result: `Delegation failed: ${errors.join('; ')}` };
			}

			if (isWorkflowBuildDelegation(input)) {
				return {
					result:
						'Delegation failed: workflow building or structural workflow edits must use build-workflow-with-agent, not delegate.',
				};
			}

			const subAgentId = generateAgentId();

			// 2. Publish agent-spawned
			context.eventBus.publish(context.threadId, {
				type: 'agent-spawned',
				runId: context.runId,
				agentId: subAgentId,
				payload: {
					parentId: context.orchestratorAgentId,
					role: input.role,
					tools: input.tools,
					kind: 'delegate',
					subtitle: truncateLabel(input.briefing),
					goal: input.briefing,
				},
			});

			try {
				// 3. Create Mastra Memory for this role (if memory-enabled)
				const memory = MEMORY_ENABLED_ROLES.has(input.role)
					? createSubAgentMemory(context.storage, input.role)
					: undefined;

				// 4. Create sub-agent
				const subAgent = createSubAgent({
					agentId: subAgentId,
					role: input.role,
					instructions: input.instructions,
					tools: validTools,
					modelId: context.modelId,
					memory,
				});

				registerWithMastra(subAgentId, subAgent, context.storage);

				// 4. Build briefing message — protocol reminder at the end (strongest position)
				const artifacts = input.artifacts
					? `\n\nArtifacts: ${JSON.stringify(input.artifacts)}`
					: '';

				// Inject iteration history so retries are informed by previous attempts
				let iterationContext = '';
				if (context.iterationLog) {
					const taskKey = `delegate:${input.role}`;
					try {
						const entries = await context.iterationLog.getForTask(context.threadId, taskKey);
						iterationContext = formatPreviousAttempts(entries);
					} catch {
						// Non-fatal — iteration log is best-effort
					}
				}

				const briefingMessage = `${input.briefing}${artifacts}${iterationContext ? `\n\n${iterationContext}` : ''}\n\nRemember: ${SUB_AGENT_PROTOCOL}`;

				// 5. Stream sub-agent with HITL support
				const memoryOpts = memory
					? { resource: subAgentResourceId(context.userId, input.role), thread: subAgentId }
					: undefined;
				const stream = await subAgent.stream(briefingMessage, {
					maxSteps: context.subAgentMaxSteps ?? FALLBACK_MAX_STEPS,
					abortSignal: context.abortSignal,
					providerOptions: {
						anthropic: { cacheControl: { type: 'ephemeral' } },
					},
					...(memoryOpts ? { memory: memoryOpts } : {}),
				});

				const result = await consumeStreamWithHitl({
					agent: subAgent,
					stream: stream as {
						runId?: string;
						fullStream: AsyncIterable<unknown>;
						text: Promise<string>;
					},
					runId: context.runId,
					agentId: subAgentId,
					eventBus: context.eventBus,
					threadId: context.threadId,
					abortSignal: context.abortSignal,
					waitForConfirmation: context.waitForConfirmation,
				});

				const resultText = await result.text;

				// 7. Publish agent-completed
				context.eventBus.publish(context.threadId, {
					type: 'agent-completed',
					runId: context.runId,
					agentId: subAgentId,
					payload: {
						role: input.role,
						result: resultText,
					},
				});

				return { result: resultText };
			} catch (error) {
				// 8. Publish agent-completed with error
				const errorMessage = error instanceof Error ? error.message : String(error);

				context.eventBus.publish(context.threadId, {
					type: 'agent-completed',
					runId: context.runId,
					agentId: subAgentId,
					payload: {
						role: input.role,
						result: '',
						error: errorMessage,
					},
				});

				return { result: `Sub-agent error: ${errorMessage}` };
			}
		},
	});
}
