import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

const validOptions = ['notSupported', 'memory', 'manually'] as const;
export type AuthenticationChatOption = 'none' | 'basicAuth' | 'n8nUserAuth';
export type LoadPreviousSessionChatOption = (typeof validOptions)[number];

function isValidLoadPreviousSessionOption(value: unknown): value is LoadPreviousSessionChatOption {
	return typeof value === 'string' && (validOptions as readonly string[]).includes(value);
}

export function assertValidLoadPreviousSessionOption(
	value: string | undefined,
	node: INode,
): asserts value is LoadPreviousSessionChatOption | undefined {
	if (value && !isValidLoadPreviousSessionOption(value)) {
		throw new NodeOperationError(node, `Invalid loadPreviousSession option: ${value}`);
	}
}
