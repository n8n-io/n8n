import {
	JSONRPCMessageSchema,
	ListToolsRequestSchema,
	CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

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

	static isToolCall(body: string): boolean {
		const message = this.parse(body);
		if (!message) return false;
		return (
			'method' in message &&
			'id' in message &&
			message.method === CallToolRequestSchema.shape.method.value
		);
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

	static extractToolCallInfo(body: string): McpToolCallInfo | undefined {
		const message = this.parse(body);
		if (!message) return undefined;

		if (
			'method' in message &&
			'params' in message &&
			message.method === CallToolRequestSchema.shape.method.value
		) {
			const params = message.params;
			if (
				typeof params === 'object' &&
				params !== null &&
				'name' in params &&
				typeof params.name === 'string' &&
				'arguments' in params &&
				typeof params.arguments === 'object' &&
				params.arguments !== null
			) {
				return {
					toolName: params.name,
					arguments: params.arguments as Record<string, unknown>,
				};
			}
		}
		return undefined;
	}
}
