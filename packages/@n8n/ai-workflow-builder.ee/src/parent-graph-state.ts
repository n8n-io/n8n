import type { BaseMessage } from '@langchain/core/messages';
import { Annotation } from '@langchain/langgraph';

import type { CoordinationLogEntry } from './types/coordination';
import type { DiscoveryContext } from './types/discovery-types';
import type { NodeConfigurationsMap } from './types/tools';
import type { SimpleWorkflow, WorkflowOperation } from './types/workflow';
import { appendArrayReducer, nodeConfigurationsReducer } from './utils/state-reducers';
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

	// Template IDs fetched from workflow examples for telemetry
	templateIds: Annotation<number[]>({
		reducer: appendArrayReducer,
		default: () => [],
	}),

	// Node configurations collected from workflow examples
	// Used to provide example parameter configurations when calling tools
	nodeConfigurations: Annotation<NodeConfigurationsMap>({
		reducer: nodeConfigurationsReducer,
		default: () => ({}),
	}),
});
