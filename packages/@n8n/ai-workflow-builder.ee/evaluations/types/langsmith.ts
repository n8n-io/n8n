import type { BaseMessage } from '@langchain/core/messages';

import type { SimpleWorkflow } from '../../src/types/workflow';

// Define strict interfaces
export interface UsageMetadata {
	input_tokens: number;
	output_tokens: number;
	cache_read_input_tokens: number;
	cache_creation_input_tokens: number;
}

export interface MessageWithMetadata extends BaseMessage {
	response_metadata: {
		usage?: Partial<UsageMetadata>;
	};
}

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

// Type guards - no coercion, just validation
export function isMessageWithMetadata(message: BaseMessage): message is MessageWithMetadata {
	return (
		message.response_metadata !== undefined &&
		message.response_metadata !== null &&
		typeof message.response_metadata === 'object'
	);
}

export function hasUsageMetadata(metadata: { usage?: unknown }): metadata is {
	usage: Partial<UsageMetadata>;
} {
	if (!metadata.usage || typeof metadata.usage !== 'object') {
		return false;
	}

	const usage = metadata.usage as Record<string, unknown>;

	// Validate each field is either undefined or a number
	const validFields = [
		'input_tokens',
		'output_tokens',
		'cache_read_input_tokens',
		'cache_creation_input_tokens',
	];

	return validFields.every(
		(field) => usage[field] === undefined || typeof usage[field] === 'number',
	);
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

	const obj = values as Record<string, unknown>;
	return Array.isArray(obj.messages) && isSimpleWorkflow(obj.workflowJSON);
}

// Safe extraction without coercion
export function safeExtractUsage(messages: BaseMessage[]): UsageMetadata {
	const defaultUsage: UsageMetadata = {
		input_tokens: 0,
		output_tokens: 0,
		cache_read_input_tokens: 0,
		cache_creation_input_tokens: 0,
	};

	return messages.reduce((acc, message) => {
		if (!isMessageWithMetadata(message)) return acc;
		if (!hasUsageMetadata(message.response_metadata)) return acc;

		const usage = message.response_metadata.usage;

		return {
			input_tokens: acc.input_tokens + (usage.input_tokens ?? 0),
			output_tokens: acc.output_tokens + (usage.output_tokens ?? 0),
			cache_read_input_tokens: acc.cache_read_input_tokens + (usage.cache_read_input_tokens ?? 0),
			cache_creation_input_tokens:
				acc.cache_creation_input_tokens + (usage.cache_creation_input_tokens ?? 0),
		};
	}, defaultUsage);
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

	// @ts-expect-error Testing custom types
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	const content = message.content ?? message.kwargs?.content;

	if (typeof content === 'string') {
		return content;
	}

	if (Array.isArray(content)) {
		// Extract text from complex content
		const textContent = content
			.filter((item) => typeof item === 'object' && item.type === 'text')
			.map((item) => (item as { text: string }).text)
			.join('\n');

		if (textContent) {
			return textContent;
		}
	}

	throw new Error('Message content must be a string or contain text content');
}
