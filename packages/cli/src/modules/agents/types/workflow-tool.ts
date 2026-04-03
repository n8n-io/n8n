import type { BuiltTool } from '@n8n/agents';
import type { z } from 'zod';

export interface WorkflowToolOptions {
	/** Override the auto-generated tool name */
	name?: string;
	/** Override the auto-generated description */
	description?: string;
	/** Override the auto-inferred input schema */
	input?: z.ZodObject<z.ZodRawShape>;
	/** Override the output schema */
	output?: z.ZodObject<z.ZodRawShape>;
	/** Return all node outputs instead of just the last node */
	allOutputs?: boolean;
}

export interface WorkflowToolDescriptor {
	readonly __workflowTool: true;
	readonly workflowName: string;
	readonly options?: WorkflowToolOptions;
}

/**
 * Marker tool for attaching n8n workflows as agent tools.
 *
 * Injected into the agent sandbox at compile time so user code can write:
 * ```typescript
 * import { Agent, WorkflowTool } from '@n8n/agents';
 *
 * export default new Agent('my-agent')
 *   .tool(new WorkflowTool('Send Welcome Email'))
 *   .tool(new WorkflowTool('Generate Report', { description: 'Creates PDF reports' }));
 * ```
 *
 * The compile step detects these markers in the tools list and replaces them
 * with fully-configured tools backed by actual workflow execution.
 */
export class WorkflowTool {
	readonly __workflowTool = true as const;

	readonly workflowName: string;

	readonly options?: WorkflowToolOptions;

	constructor(workflowName: string, options?: WorkflowToolOptions) {
		this.workflowName = workflowName;
		this.options = options;
	}

	/** Produce a marker BuiltTool. Resolved at compile time by the platform. */
	build(): BuiltTool {
		return {
			name: this.options?.name ?? this.workflowName,
			description: this.options?.description ?? `Execute the "${this.workflowName}" workflow`,
			__workflowTool: true,
			workflowName: this.workflowName,
			options: this.options,
		} as unknown as BuiltTool;
	}
}
