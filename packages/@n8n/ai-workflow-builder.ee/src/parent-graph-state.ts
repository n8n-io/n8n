import type { BaseMessage } from '@langchain/core/messages';
import { Annotation } from '@langchain/langgraph';
import type { INodeTypeDescription } from 'n8n-workflow';
import type { SimpleWorkflow } from './types/workflow';
import type { ChatPayload } from './workflow-builder-agent';

/**
 * Parent Graph State
 *
 * Minimal state that coordinates between subgraphs.
 * Each subgraph has its own isolated state.
 */
export const ParentGraphState = Annotation.Root({
	// Shared: User's conversation history (for responder)
	messages: Annotation<BaseMessage[]>({
		reducer: (x, y) => x.concat(y),
		default: () => [],
	}),

	// Shared: Current workflow being built
	workflowJSON: Annotation<SimpleWorkflow>({
		reducer: (x, y) => y ?? x,
		default: () => ({ nodes: [], connections: {}, name: '' }),
	}),

	// Input: Workflow context (execution data)
	workflowContext: Annotation<ChatPayload['workflowContext'] | undefined>({
		reducer: (x, y) => y ?? x,
	}),

	// Routing: Next phase to execute
	nextPhase: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
	}),

	// Routing: Instructions from supervisor for next agent
	supervisorInstructions: Annotation<string | null>({
		reducer: (x, y) => y ?? x,
		default: () => null,
	}),

	// Output: Final response to user
	finalResponse: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
	}),

	// Discovery results to pass to builder (structured)
	discoveryResults: Annotation<{
		nodesFound: Array<{ nodeType: INodeTypeDescription; reasoning: string }>;
		relevantContext: Array<{ context: string; relevancy?: string }>;
		summary: string;
	} | null>({
		reducer: (x, y) => y ?? x,
		default: () => null,
	}),
});
