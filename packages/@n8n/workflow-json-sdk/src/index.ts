import type { WorkflowFEMeta } from 'n8n-workflow';
import { Workflow } from './workflow';

export * from './connections';
export * from './nodes';
export * from './types';
export * from './workflow';
export * from './utils';

/**
 * Workflow JSON SDK for n8n
 *
 * A Zod-like API for constructing n8n workflows programmatically
 */
export function workflow(options?: { name?: string; meta?: WorkflowFEMeta }): Workflow {
	return new Workflow(options);
}
