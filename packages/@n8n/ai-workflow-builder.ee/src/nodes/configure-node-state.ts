/**
 * ConfigureNode Worker State
 *
 * State annotation for parallel configuration workers.
 * Each worker receives isolated state via Send() and returns
 * workflowOperations that merge back to parent state.
 */

import { Annotation } from '@langchain/langgraph';
import type { INode, INodeTypeDescription } from 'n8n-workflow';

import type { DiscoveryContext } from '../types/discovery-types';
import type { WorkflowOperation, SimpleWorkflow } from '../types/workflow';
import type { ChatPayload } from '../workflow-builder-agent';

/**
 * State for a single configuration worker.
 * Receives node info and context, outputs operations.
 */
export const ConfigureNodeState = Annotation.Root({
	// Input: Node to configure
	node: Annotation<INode>({
		reducer: (x, y) => y ?? x,
	}),

	// Input: Node type definition
	nodeType: Annotation<INodeTypeDescription>({
		reducer: (x, y) => y ?? x,
	}),

	// Input: User's original request
	userRequest: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
	}),

	// Input: Discovery context with node info
	discoveryContext: Annotation<DiscoveryContext | null>({
		reducer: (x, y) => y ?? x,
		default: () => null,
	}),

	// Input: Current workflow (for context)
	workflow: Annotation<SimpleWorkflow>({
		reducer: (x, y) => y ?? x,
		default: () => ({ nodes: [], connections: {}, name: '' }),
	}),

	// Input: Execution context (sample data)
	workflowContext: Annotation<ChatPayload['workflowContext'] | undefined>({
		reducer: (x, y) => y ?? x,
	}),

	// Input: Instance URL for webhooks
	instanceUrl: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
	}),

	// Output: Operations to apply (merges back to parent)
	workflowOperations: Annotation<WorkflowOperation[]>({
		reducer: (x, y) => [...(x ?? []), ...(y ?? [])],
		default: () => [],
	}),
});

export type ConfigureNodeStateType = typeof ConfigureNodeState.State;
