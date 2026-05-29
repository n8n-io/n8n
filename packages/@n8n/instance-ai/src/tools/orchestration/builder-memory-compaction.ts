import type { AgentDbMessage, BuiltMemory } from '@n8n/agents';
import { randomUUID } from 'node:crypto';

import type { WorkflowBuildOutcome } from '../../workflow-loop';

const BUILDER_MEMORY_SUMMARY_TYPE = 'builder-memory-summary';

interface BuilderMemoryBinding {
	resource: string;
	thread: string;
}

interface BuilderMemoryCompactionContext {
	memory?: BuiltMemory;
	messageGroupId?: string;
}

interface BuilderMemoryCompactionInput {
	context: BuilderMemoryCompactionContext;
	binding: BuilderMemoryBinding;
	sessionId?: string;
	compactMessagesCreatedAtOrAfter?: Date;
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

function stringifyMessageForTokens(message: AgentDbMessage): string {
	return stringifyForTokens('content' in message ? message.content : message.data);
}

function getMessageCreatedAtMs(message: AgentDbMessage): number {
	return message.createdAt instanceof Date
		? message.createdAt.getTime()
		: new Date(message.createdAt).getTime();
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

function buildSummaryMessage(input: BuilderMemoryCompactionInput, content: string): AgentDbMessage {
	return {
		id: `${BUILDER_MEMORY_SUMMARY_TYPE}-${randomUUID()}`,
		createdAt: new Date(),
		role: 'assistant',
		type: 'llm',
		content: [
			{
				type: 'text',
				text: content,
				providerMetadata: {
					instanceAi: {
						messageType: BUILDER_MEMORY_SUMMARY_TYPE,
						sessionId: input.sessionId,
						messageGroupId: input.context.messageGroupId,
					},
				},
			},
		],
		providerOptions: {
			instanceAi: {
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
	const { memory } = input.context;
	if (!memory) {
		return {
			compacted: false,
			skippedReason: 'store_unavailable',
			rawMessageCount: 0,
			compactedMessageCount: 0,
			rawTokenEstimate: 0,
			compactedTokenEstimate: 0,
		};
	}

	const messages = await memory.getMessages(input.binding.thread);
	const compactAfterMs = input.compactMessagesCreatedAtOrAfter?.getTime();
	const messagesToCompact =
		compactAfterMs === undefined
			? messages
			: messages.filter((message) => getMessageCreatedAtMs(message) >= compactAfterMs);
	const rawTokenEstimate = messagesToCompact.reduce(
		(total, message) => total + estimateTokens(stringifyMessageForTokens(message)),
		0,
	);
	const summary = buildSummaryContent(input);
	const compactedTokenEstimate = estimateTokens(summary);

	const oldMessageIds = messagesToCompact.map((message) => message.id);
	const summaryMessage = buildSummaryMessage(input, summary);
	await memory.saveThread({ id: input.binding.thread, resourceId: input.binding.resource });
	await memory.saveMessages({
		threadId: input.binding.thread,
		resourceId: input.binding.resource,
		messages: [summaryMessage],
	});
	await memory.deleteMessages(oldMessageIds);

	return {
		compacted: true,
		rawMessageCount: messagesToCompact.length,
		compactedMessageCount: 1,
		rawTokenEstimate,
		compactedTokenEstimate,
	};
}
