import type { I18nClass } from '@n8n/i18n';
import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';

import { EXTENDED_PROMPT_MAX_LENGTH } from '@/features/ai/shared/constants';
import type { AgentFixWithAssistantFailure } from '../types';

export const MAX_FIX_WITH_ASSISTANT_DRAFT_LENGTH = Math.min(16_000, EXTENDED_PROMPT_MAX_LENGTH);

const MAX_ERROR_LENGTH = 4_000;
const MAX_ERROR_DETAILS_TOTAL_LENGTH = 10_000;
const MAX_METADATA_VALUE_LENGTH = 160;
const MAX_TOOL_CALLS_PER_ERROR = 8;
const DIAGNOSTICS_TEMPLATE_SENTINEL = '__N8N_FIX_WITH_ASSISTANT_DIAGNOSTICS__';
const UNTRUSTED_DATA_CLOSE_TAG_PATTERN = /<\/untrusted_data/gi;
const SERVICE_CONTEXT_TAG_PATTERN = /<(\/?(?:current-date-time|project-context))/gi;
const INVISIBLE_UNICODE_PATTERN =
	// eslint-disable-next-line no-misleading-character-class
	/[\u200B-\u200F\u2028-\u202F\u2060-\u2064\u2066-\u206F\uFEFF\uFFF9-\uFFFB\u00AD\u034F\u061C\u180E\u{E0001}\u{E0020}-\u{E007F}]/gu;

type FixWithAssistantI18n = Pick<I18nClass, 'baseText'>;

export interface AgentFixWithAssistantPromptContext {
	projectId: string;
	agentId: string;
	agentName?: string;
	threadId: string;
	sessionTitle?: string;
	sessionNumber?: number;
	executionId: string;
	failures: AgentFixWithAssistantFailure[];
}

interface FailureGroup {
	error: string;
	failures: AgentFixWithAssistantFailure[];
}

interface DiagnosticContext {
	projectId: string;
	agentId: string;
	agentName?: string;
	sessionId: string;
	sessionTitle?: string;
	sessionNumber?: number;
	executionId: string;
}

interface ToolCallDiagnostic {
	toolDisplayName: string;
	toolName: string;
	toolCallId: string;
	startedAt?: string;
	endedAt?: string;
	durationMs?: number;
}

interface FailureDiagnostic {
	error: string;
	errorTruncated?: true;
	toolCalls: ToolCallDiagnostic[];
	omittedToolCallCount?: number;
}

interface DiagnosticPayload {
	context: DiagnosticContext;
	failures: FailureDiagnostic[];
	omittedErrorCount?: number;
	errorDetailsUnavailable?: true;
}

function truncate(value: string, maxLength: number, suffix: string) {
	if (value.length <= maxLength) return { value, truncated: false };
	const contentLength = Math.max(0, maxLength - suffix.length);
	return {
		value: `${value.slice(0, contentLength).trimEnd()}${suffix}`,
		truncated: true,
	};
}

function sanitizeDiagnosticText(value: string): string {
	return value
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(INVISIBLE_UNICODE_PATTERN, '')
		.replace(UNTRUSTED_DATA_CLOSE_TAG_PATTERN, '&lt;/untrusted_data')
		.replace(SERVICE_CONTEXT_TAG_PATTERN, '&lt;$1');
}

function metadataValue(value: string): string {
	const normalized = sanitizeDiagnosticText(value).replaceAll(/\s+/g, ' ').trim();
	return truncate(normalized, MAX_METADATA_VALUE_LENGTH, '…').value;
}

function formatTimestamp(timestamp: number | undefined): string | undefined {
	if (timestamp === undefined || !Number.isFinite(timestamp)) return undefined;
	const date = new Date(timestamp);
	if (Number.isNaN(date.getTime())) return undefined;
	return date.toISOString();
}

function groupFailures(failures: AgentFixWithAssistantFailure[]): FailureGroup[] {
	const byError = new Map<string, FailureGroup>();
	for (const failure of failures) {
		const error = scrubSecretsInText(sanitizeDiagnosticText(failure.error.trim()));
		if (!error) continue;

		const group = byError.get(error);
		if (group) {
			if (
				!failure.toolCallId ||
				!group.failures.some(({ toolCallId }) => toolCallId === failure.toolCallId)
			) {
				group.failures.push(failure);
			}
		} else {
			byError.set(error, { error, failures: [failure] });
		}
	}
	return [...byError.values()];
}

function buildToolCallDiagnostic(failure: AgentFixWithAssistantFailure): ToolCallDiagnostic {
	const startedAt = formatTimestamp(failure.startedAt);
	const endedAt = formatTimestamp(failure.endedAt);
	const durationMs =
		failure.startedAt !== undefined &&
		failure.endedAt !== undefined &&
		Number.isFinite(failure.startedAt) &&
		Number.isFinite(failure.endedAt) &&
		failure.endedAt >= failure.startedAt
			? failure.endedAt - failure.startedAt
			: undefined;

	return {
		toolDisplayName: metadataValue(failure.toolDisplayName || failure.toolName),
		toolName: metadataValue(failure.toolName),
		toolCallId: metadataValue(failure.toolCallId),
		...(startedAt ? { startedAt } : {}),
		...(endedAt ? { endedAt } : {}),
		...(durationMs !== undefined ? { durationMs } : {}),
	};
}

function buildFailureDiagnostic(group: FailureGroup, maxErrorLength: number): FailureDiagnostic {
	const displayedFailures = group.failures.slice(0, MAX_TOOL_CALLS_PER_ERROR);
	const omittedToolCallCount = group.failures.length - displayedFailures.length;
	const error = truncate(group.error.replaceAll('\r\n', '\n'), maxErrorLength, '…');
	const diagnostic: FailureDiagnostic = {
		error: error.value,
		toolCalls: displayedFailures.map(buildToolCallDiagnostic),
	};
	if (error.truncated) diagnostic.errorTruncated = true;
	if (omittedToolCallCount > 0) diagnostic.omittedToolCallCount = omittedToolCallCount;
	return diagnostic;
}

function buildDiagnosticContext(context: AgentFixWithAssistantPromptContext): DiagnosticContext {
	return {
		projectId: metadataValue(context.projectId),
		agentId: metadataValue(context.agentId),
		...(context.agentName ? { agentName: metadataValue(context.agentName) } : {}),
		sessionId: metadataValue(context.threadId),
		...(context.sessionTitle ? { sessionTitle: metadataValue(context.sessionTitle) } : {}),
		...(context.sessionNumber !== undefined ? { sessionNumber: context.sessionNumber } : {}),
		executionId: metadataValue(context.executionId),
	};
}

function buildDiagnosticPayload(
	context: DiagnosticContext,
	failures: FailureDiagnostic[],
	omittedErrorCount: number,
	allErrorDetailsUnavailable: boolean,
): DiagnosticPayload {
	return {
		context,
		failures,
		...(omittedErrorCount > 0 ? { omittedErrorCount } : {}),
		...(allErrorDetailsUnavailable ? { errorDetailsUnavailable: true } : {}),
	};
}

function renderPrompt(payload: DiagnosticPayload, i18n: FixWithAssistantI18n): string {
	const diagnostics = [
		'<untrusted_data source="agent-preview-tool-errors">',
		JSON.stringify(payload, null, 2),
		'</untrusted_data>',
	].join('\n');
	const template = i18n.baseText('agents.builder.preview.fixWithAssistantPrompt.template', {
		interpolate: { diagnostics: DIAGNOSTICS_TEMPLATE_SENTINEL },
	});
	return template.replaceAll(DIAGNOSTICS_TEMPLATE_SENTINEL, () => diagnostics);
}

export function buildAgentFixWithAssistantPrompt(
	context: AgentFixWithAssistantPromptContext,
	i18n: FixWithAssistantI18n,
): string {
	const groups = groupFailures(context.failures);
	const maxErrorLength = Math.min(
		MAX_ERROR_LENGTH,
		Math.max(250, Math.floor(MAX_ERROR_DETAILS_TOTAL_LENGTH / Math.max(groups.length, 1))),
	);
	const diagnosticContext = buildDiagnosticContext(context);
	const failureDiagnostics: FailureDiagnostic[] = [];
	let omittedErrorCount = 0;

	for (const [index, group] of groups.entries()) {
		const failure = buildFailureDiagnostic(group, maxErrorLength);
		const remainingErrorCount = groups.length - index - 1;
		const candidate = buildDiagnosticPayload(
			diagnosticContext,
			[...failureDiagnostics, failure],
			remainingErrorCount,
			false,
		);

		if (renderPrompt(candidate, i18n).length > MAX_FIX_WITH_ASSISTANT_DRAFT_LENGTH) {
			omittedErrorCount = groups.length - index;
			break;
		}
		failureDiagnostics.push(failure);
	}

	return renderPrompt(
		buildDiagnosticPayload(
			diagnosticContext,
			failureDiagnostics,
			omittedErrorCount,
			groups.length === 0,
		),
		i18n,
	);
}
