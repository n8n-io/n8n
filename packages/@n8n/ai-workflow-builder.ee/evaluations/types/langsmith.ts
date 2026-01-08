import type { BaseMessage } from '@langchain/core/messages';

import { cleanContextTags } from '@/utils/stream-processor';

import type { SimpleWorkflow } from '../../src/types/workflow';

export interface WorkflowOutput {
	workflow?: unknown;
	prompt?: unknown;
	usage?: unknown;
}

export interface WorkflowStateValues {
	messages: BaseMessage[];
	workflowJSON: SimpleWorkflow;
	[key: string]: unknown;
}

export function isValidPrompt(value: unknown): value is string {
	return typeof value === 'string' && value.length > 0;
}

export function isSimpleWorkflow(value: unknown): value is SimpleWorkflow {
	if (!value || typeof value !== 'object') return false;

	const obj = value as Record<string, unknown>;
	return (
		Array.isArray(obj.nodes) && obj.connections !== undefined && typeof obj.connections === 'object'
	);
}

export function isWorkflowStateValues(values: unknown): values is WorkflowStateValues {
	if (!values || typeof values !== 'object') return false;
	if (!('messages' in values) || !('workflowJSON' in values)) return false;

	return Array.isArray(values.messages) && isSimpleWorkflow(values.workflowJSON);
}

// Helper to format violations for display
export function formatViolations(violations: Array<{ type: string; description: string }>): string {
	if (violations.length === 0) {
		return 'All checks passed';
	}
	return `Found ${violations.length} violation(s): ${violations
		.map((v) => `${v.type} - ${v.description}`)
		.join('; ')}`;
}

// Generate a unique run ID
export function generateRunId(): string {
	return `eval-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// Validate and extract message content
export function extractMessageContent(message: BaseMessage | undefined): string {
	if (!message) {
		throw new Error('No message provided');
	}

	// @ts-expect-error We need to extract content from kwargs as that's how Langsmith messages are structured
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	const content = message.content ?? message.kwargs?.content;

	if (typeof content === 'string') {
		return cleanContextTags(content);
	}

	if (Array.isArray(content)) {
		// Extract text from complex content
		const textContent = content
			.filter((item) => item?.type === 'text')
			.map((item) => (item as { text: string }).text)
			.map(cleanContextTags)
			.join('\n');

		if (textContent) {
			return textContent;
		}
	}

	throw new Error('Message content must be a string or contain text content');
}
