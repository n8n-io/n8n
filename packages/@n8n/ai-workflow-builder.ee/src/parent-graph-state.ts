import type { BaseMessage } from '@langchain/core/messages';
import { Annotation, messagesStateReducer } from '@langchain/langgraph';

import type { IntrospectionEvent } from './tools/introspect.tool';
import type { CoordinationLogEntry } from './types/coordination';
import type { DiscoveryContext } from './types/discovery-types';
import type { PlanDecision, PlanOutput } from './types/planning';
import type { WorkflowMetadata } from './types/tools';
import type { SimpleWorkflow, WorkflowOperation } from './types/workflow';
import { appendArrayReducer, cachedTemplatesReducer } from './utils/state-reducers';
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
		reducer: messagesStateReducer,
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

	// Discovery context to pass to other agents
	discoveryContext: Annotation<DiscoveryContext | null>({
		reducer: (x, y) => y ?? x,
		default: () => null,
	}),

	// Workflow operations collected from subgraphs (hybrid approach)
	workflowOperations: Annotation<WorkflowOperation[]>({
		reducer: (x, y) => x.concat(y),
		default: () => [],
	}),

	// Coordination log for tracking subgraph completion (deterministic routing)
	coordinationLog: Annotation<CoordinationLogEntry[]>({
		reducer: (x, y) => x.concat(y),
		default: () => [],
	}),

	// For conversation compaction - stores summarized history
	previousSummary: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
	}),

	// Template IDs fetched from workflow examples for telemetry
	templateIds: Annotation<number[]>({
		reducer: appendArrayReducer,
		default: () => [],
	}),

	// Cached workflow templates from template API
	// Shared across subgraphs to reduce API calls
	cachedTemplates: Annotation<WorkflowMetadata[]>({
		reducer: cachedTemplatesReducer,
		default: () => [],
	}),

	// Plan Mode: Current plan (set by planner, consumed by builder)
	planOutput: Annotation<PlanOutput | null>({
		reducer: (x, y) => (y === undefined ? x : y),
		default: () => null,
	}),

	// Plan Mode: Request mode ('build' for direct build, 'plan' for planning first)
	mode: Annotation<'build' | 'plan'>({
		reducer: (x, y) => y ?? x,
		default: () => 'build',
	}),

	// Plan Mode: Last plan decision after interrupt resume
	planDecision: Annotation<PlanDecision | null>({
		reducer: (x, y) => (y === undefined ? x : y),
		default: () => null,
	}),

	// Plan Mode: User feedback after a "modify" decision (for plan revision)
	planFeedback: Annotation<string | null>({
		reducer: (x, y) => (y === undefined ? x : y),
		default: () => null,
	}),

	// Plan Mode: Previous plan to revise after a "modify" decision
	planPrevious: Annotation<PlanOutput | null>({
		reducer: (x, y) => (y === undefined ? x : y),
		default: () => null,
	}),

	// Introspection events collected from all subgraphs
	// Used for evaluation and analysis of agent behavior
	introspectionEvents: Annotation<IntrospectionEvent[]>({
		reducer: (x, y) => x.concat(y),
		default: () => [],
	}),

	sdkSessionId: Annotation<string | undefined>({
		reducer: (x, y) => y ?? x,
		default: () => undefined,
	}),
});
