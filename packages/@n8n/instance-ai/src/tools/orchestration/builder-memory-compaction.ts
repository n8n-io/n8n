import { randomUUID } from 'node:crypto';

import type { WorkflowBuildOutcome } from '../../workflow-loop';

const BUILDER_MEMORY_SUMMARY_TYPE = 'builder-memory-summary';

interface BuilderMemoryBinding {
	resource: string;
	thread: string;
}

interface BuilderMemoryStorageProvider {
	getStore(storeName: string): unknown;
}

interface BuilderMemoryCompactionContext {
	storage: BuilderMemoryStorageProvider;
	threadId: string;
	runId: string;
	messageGroupId?: string;
}

interface BuilderMemoryCompactionInput {
	context: BuilderMemoryCompactionContext;
	binding: BuilderMemoryBinding;
	sessionId?: string;
	workflowId?: string;
	workItemId: string;
	sourceFilePath: string;
	nodeSummaries?: Array<{ name: string; type: string }>;
	triggerNodes?: Array<{ nodeName: string; nodeType: string }>;
	mockedNodeNames?: string[];
	mockedCredentialTypes?: string[];
	mockedCredentialsByNode?: Record<string, string[]>;
	verification?: WorkflowBuildOutcome['verification'];
	lastRequestedChange: string;
	finalBuilderResult: string;
}

export interface BuilderMemoryCompactionResult {
	compacted: boolean;
	skippedReason?: string;
	rawMessageCount: number;
	compactedMessageCount: number;
	rawTokenEstimate: number;
	compactedTokenEstimate: number;
}

interface BuilderMemoryMessage {
	id: string;
	role: string;
	threadId: string;
	resourceId: string;
	createdAt: Date;
	type?: string;
	content: unknown;
}

interface BuilderMemoryListResult {
	messages: BuilderMemoryMessage[];
	total?: number;
	page?: number;
	perPage?: number | false;
	hasMore?: boolean;
}

interface BuilderMemoryStore {
	listMessages: (args: {
		threadId: string;
		resourceId: string;
		perPage: false;
		orderBy: { field: 'createdAt'; direction: 'ASC' };
	}) => Promise<BuilderMemoryListResult>;
	saveMessages: (args: { messages: BuilderMemoryMessage[] }) => Promise<unknown>;
	deleteMessages: (messageIds: string[]) => Promise<unknown>;
}

function estimateTokens(value: string): number {
	return Math.ceil(value.length / 4);
}

function stringifyForTokens(value: unknown): string {
	if (typeof value === 'string') return value;
	try {
		return JSON.stringify(value) ?? String(value);
	} catch {
		return String(value);
	}
}

function hasBuilderMemoryStore(value: unknown): value is BuilderMemoryStore {
	if (!value || typeof value !== 'object') return false;
	const candidate = value as Record<string, unknown>;
	return (
		typeof candidate.listMessages === 'function' &&
		typeof candidate.saveMessages === 'function' &&
		typeof candidate.deleteMessages === 'function'
	);
}

async function getBuilderMemoryStore(
	storage: BuilderMemoryStorageProvider,
): Promise<BuilderMemoryStore | undefined> {
	const store = await storage.getStore('memory');
	return hasBuilderMemoryStore(store) ? store : undefined;
}

function formatList(label: string, values: string[] | undefined): string {
	if (!values?.length) return `${label}: none`;
	return `${label}: ${values.join(', ')}`;
}

function buildSummaryContent(input: BuilderMemoryCompactionInput): string {
	const lines = [
		'<builder-memory-summary>',
		`Workflow ID: ${input.workflowId ?? 'unknown'}`,
		`Work item ID: ${input.workItemId}`,
		`Source file path: ${input.sourceFilePath}`,
		'',
		'<last-requested-change>',
		input.lastRequestedChange,
		'</last-requested-change>',
		'',
		'<workflow-nodes>',
	];

	if (input.nodeSummaries?.length) {
		for (const node of input.nodeSummaries) {
			lines.push(`- ${node.name}: ${node.type}`);
		}
	} else {
		lines.push('- unknown');
	}

	lines.push(
		'</workflow-nodes>',
		'',
		'<trigger-nodes>',
		...(input.triggerNodes?.length
			? input.triggerNodes.map((node) => `- ${node.nodeName}: ${node.nodeType}`)
			: ['- none recorded']),
		'</trigger-nodes>',
		'',
		'<mocked-credentials>',
		formatList('Mocked nodes', input.mockedNodeNames),
		formatList('Mocked credential types', input.mockedCredentialTypes),
	);

	if (input.mockedCredentialsByNode && Object.keys(input.mockedCredentialsByNode).length > 0) {
		lines.push('Mocked credentials by node:');
		for (const [nodeName, credentialTypes] of Object.entries(input.mockedCredentialsByNode)) {
			lines.push(`- ${nodeName}: ${credentialTypes.join(', ')}`);
		}
	} else {
		lines.push('Mocked credentials by node: none');
	}

	lines.push('</mocked-credentials>', '', '<verification-state>');
	if (input.verification?.attempted) {
		lines.push(
			'Attempted: true',
			`Success: ${input.verification.success}`,
			`Execution ID: ${input.verification.executionId ?? 'unknown'}`,
			`Status: ${input.verification.status ?? 'unknown'}`,
			`Failure signature: ${input.verification.failureSignature ?? 'none'}`,
			formatList('Nodes executed', input.verification.evidence?.nodesExecuted),
			`Error message: ${input.verification.evidence?.errorMessage ?? 'none'}`,
		);
	} else {
		lines.push('Attempted: false');
	}

	lines.push(
		'</verification-state>',
		'',
		'<final-builder-result>',
		input.finalBuilderResult,
		'</final-builder-result>',
		'</builder-memory-summary>',
	);

	return lines.join('\n');
}

function buildSummaryMessage(
	input: BuilderMemoryCompactionInput,
	content: string,
): BuilderMemoryMessage {
	return {
		id: `${BUILDER_MEMORY_SUMMARY_TYPE}-${randomUUID()}`,
		role: 'assistant',
		type: BUILDER_MEMORY_SUMMARY_TYPE,
		threadId: input.binding.thread,
		resourceId: input.binding.resource,
		createdAt: new Date(),
		content: {
			format: 2,
			parts: [{ type: 'text', text: content }],
			content,
			metadata: {
				instanceAiBuilderMemorySummary: true,
				workflowId: input.workflowId,
				workItemId: input.workItemId,
				sourceFilePath: input.sourceFilePath,
			},
		},
	};
}

export async function compactBuilderMemoryThread(
	input: BuilderMemoryCompactionInput,
): Promise<BuilderMemoryCompactionResult> {
	let store: BuilderMemoryStore | undefined;
	try {
		store = await getBuilderMemoryStore(input.context.storage);
	} catch {
		return {
			compacted: false,
			skippedReason: 'store_unavailable',
			rawMessageCount: 0,
			compactedMessageCount: 0,
			rawTokenEstimate: 0,
			compactedTokenEstimate: 0,
		};
	}

	if (!store) {
		return {
			compacted: false,
			skippedReason: 'mutation_methods_unavailable',
			rawMessageCount: 0,
			compactedMessageCount: 0,
			rawTokenEstimate: 0,
			compactedTokenEstimate: 0,
		};
	}

	const loaded = await store.listMessages({
		threadId: input.binding.thread,
		resourceId: input.binding.resource,
		perPage: false,
		orderBy: { field: 'createdAt', direction: 'ASC' },
	});
	const rawTokenEstimate = loaded.messages.reduce(
		(total, message) => total + estimateTokens(stringifyForTokens(message.content)),
		0,
	);
	const summary = buildSummaryContent(input);
	const compactedTokenEstimate = estimateTokens(summary);

	const oldMessageIds = loaded.messages.map((message) => message.id);
	const summaryMessage = buildSummaryMessage(input, summary);
	await store.saveMessages({ messages: [summaryMessage] });
	await store.deleteMessages(oldMessageIds);

	return {
		compacted: true,
		rawMessageCount: loaded.messages.length,
		compactedMessageCount: 1,
		rawTokenEstimate,
		compactedTokenEstimate,
	};
}
