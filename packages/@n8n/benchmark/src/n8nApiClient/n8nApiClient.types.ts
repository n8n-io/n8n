import type { IWorkflowBase } from 'n8n-workflow';
/**
 * n8n workflow. This is a simplified version of the actual workflow object.
 */
export type Workflow = Pick<IWorkflowBase, 'id' | 'name' | 'nodes' | 'connections'>;
