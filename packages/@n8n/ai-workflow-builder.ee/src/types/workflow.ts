import type { IWorkflowBase, INode, IConnections } from 'n8n-workflow';

/**
 * Simplified workflow representation containing only nodes and connections
 */
export type SimpleWorkflow = Pick<IWorkflowBase, 'name' | 'nodes' | 'connections'>;

/**
 * Workflow operation types that can be applied to the workflow state
 */
export type WorkflowOperation =
	| { type: 'clear' }
	| { type: 'removeNode'; nodeIds: string[] }
	| { type: 'addNodes'; nodes: INode[] }
	| { type: 'updateNode'; nodeId: string; updates: Partial<INode> }
	| { type: 'setConnections'; connections: IConnections }
	| { type: 'mergeConnections'; connections: IConnections }
	| { type: 'setName'; name: string };
