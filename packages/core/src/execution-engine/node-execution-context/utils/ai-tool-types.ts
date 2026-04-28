import {
	type DynamicStructuredTool,
	type StructuredToolInterface,
	BaseToolkit,
} from '@langchain/core/tools';

/**
 * A Toolkit that contains only DynamicStructuredTool instances.
 * This is the canonical toolkit class for AI tool nodes that return multiple tools.
 * Use this instead of extending Toolkit directly.
 */
export class StructuredToolkit extends BaseToolkit {
	constructor(public tools: DynamicStructuredTool[]) {
		super();
	}

	getTools(): StructuredToolInterface[] {
		return this.tools;
	}
}

/**
 * The expected response type for nodes with AiTool output connections.
 * Can be a single tool or a toolkit containing multiple tools.
 */
export type SupplyDataToolResponse = DynamicStructuredTool | StructuredToolkit;
