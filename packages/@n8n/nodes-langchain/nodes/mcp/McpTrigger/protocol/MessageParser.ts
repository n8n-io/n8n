import {
	JSONRPCMessageSchema,
	ListToolsRequestSchema,
	CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { CallToolRequest, JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

import type { McpToolCallInfo } from './types';

export class MessageParser {
	static parse(body: string): JSONRPCMessage | undefined {
		try {
			const message: unknown = JSON.parse(body);
			return JSONRPCMessageSchema.parse(message);
		} catch {
			return undefined;
		}
	}

	/**
	 * The tool call a message requests, if it is a `tools/call` request the MCP
	 * server will accept. Validated against the same schema the SDK applies
	 * before invoking our handler, so a parsed call is guaranteed to reach it.
	 */
	static parseToolCall(message: JSONRPCMessage | undefined): CallToolRequest | undefined {
		if (!message || !('id' in message)) return undefined;
		const result = CallToolRequestSchema.safeParse(message);
		return result.success ? result.data : undefined;
	}

	static toolCallInfo(request: CallToolRequest): McpToolCallInfo | undefined {
		const { name, arguments: toolArguments } = request.params;
		return toolArguments ? { toolName: name, arguments: toolArguments } : undefined;
	}

	static isToolCall(body: string): boolean {
		return this.parseToolCall(this.parse(body)) !== undefined;
	}

	static isListToolsRequest(body: string): boolean {
		const message = this.parse(body);
		if (!message) return false;
		return (
			'method' in message &&
			'id' in message &&
			message.method === ListToolsRequestSchema.shape.method.value
		);
	}

	static getRequestId(message: unknown): string | undefined {
		try {
			const parsed = JSONRPCMessageSchema.parse(message);
			return 'id' in parsed ? String(parsed.id) : undefined;
		} catch {
			return undefined;
		}
	}
}
