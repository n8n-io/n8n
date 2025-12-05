import type { ToolResult } from '../types.js';

export abstract class BaseTool {
	abstract name: string;

	abstract execute(input: Record<string, unknown>): Promise<ToolResult>;
}

export class ToolError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ToolError';
	}
}
