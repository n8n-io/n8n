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

	// The packaged app can materialize more than one copy of n8n-core,
	// so `instanceof` misses toolkits built by another copy of n8n-core
	static [Symbol.hasInstance](value: unknown): value is StructuredToolkit {
		return (
			typeof value === 'object' &&
			value !== null &&
			Array.isArray((value as { tools?: unknown }).tools) &&
			typeof (value as { getTools?: unknown }).getTools === 'function'
		);
	}
}

/**
 * The expected response type for nodes with AiTool output connections.
 * Can be a single tool or a toolkit containing multiple tools.
 */
export type SupplyDataToolResponse = DynamicStructuredTool | StructuredToolkit;
