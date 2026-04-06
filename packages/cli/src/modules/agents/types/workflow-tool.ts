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
	readonly workflowName: string;
	readonly options?: WorkflowToolOptions;
}

/**
 * Marker tool for attaching n8n workflows as agent tools.
 *
 * Exposed as the virtual `@n8n/agents-utils` package in the agent sandbox so
 * user code can write:
 * ```typescript
 * import { Agent } from '@n8n/agents';
 * import { WorkflowTool } from '@n8n/agents-utils';
 *
 * export default new Agent('my-agent')
 *   .tool(new WorkflowTool('Send Welcome Email'))
 *   .tool(new WorkflowTool('Generate Report', { description: 'Creates PDF reports' }));
 * ```
 *
 * The compile step detects these markers via `tool.metadata.workflowTool` and
 * replaces them with fully-configured tools backed by actual workflow execution.
 */
export class WorkflowTool {
	readonly workflowName: string;

	readonly options?: WorkflowToolOptions;

	constructor(workflowName: string, options?: WorkflowToolOptions) {
		this.workflowName = workflowName;
		this.options = options;
	}

	/** Produce a marker BuiltTool. Resolved at runtime by the platform via tool.metadata. */
	build(): BuiltTool {
		return {
			name: this.options?.name ?? this.workflowName,
			description: this.options?.description ?? `Execute the "${this.workflowName}" workflow`,
			editable: false,
			metadata: {
				workflowTool: true,
				workflowName: this.workflowName,
				options: this.options,
			},
		};
	}
}
