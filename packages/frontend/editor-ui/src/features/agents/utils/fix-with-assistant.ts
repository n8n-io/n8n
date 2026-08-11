import type { I18nClass } from '@n8n/i18n';
import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';

import { EXTENDED_PROMPT_MAX_LENGTH } from '@/features/ai/shared/constants';
import type { AgentFixWithAssistantFailure } from '../types';

export const MAX_FIX_WITH_ASSISTANT_DRAFT_LENGTH = Math.min(16_000, EXTENDED_PROMPT_MAX_LENGTH);

const MAX_ERROR_LENGTH = 4_000;
const MAX_ERROR_DETAILS_TOTAL_LENGTH = 10_000;
const MAX_METADATA_VALUE_LENGTH = 160;
const MAX_TOOL_CALLS_PER_ERROR = 8;
const UNTRUSTED_DATA_CLOSE_TAG_PATTERN = /<\/untrusted_data/gi;
const CURRENT_DATE_TIME_TAG_PATTERN = /<(\/?current-date-time)/gi;
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

function truncate(value: string, maxLength: number, suffix: string): string {
	if (value.length <= maxLength) return value;
	const contentLength = Math.max(0, maxLength - suffix.length);
	return `${value.slice(0, contentLength).trimEnd()}${suffix}`;
}

function sanitizeDiagnosticText(value: string): string {
	return value
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(INVISIBLE_UNICODE_PATTERN, '')
		.replace(UNTRUSTED_DATA_CLOSE_TAG_PATTERN, '&lt;/untrusted_data')
		.replace(CURRENT_DATE_TIME_TAG_PATTERN, '&lt;$1');
}

function inlineText(value: string): string {
	return truncate(
		sanitizeDiagnosticText(value).replaceAll(/\s+/g, ' ').trim(),
		MAX_METADATA_VALUE_LENGTH,
		'…',
	);
}

function inlineCode(value: string): string {
	const normalized = truncate(
		sanitizeDiagnosticText(value).replaceAll(/\s+/g, ' ').trim(),
		MAX_METADATA_VALUE_LENGTH,
		'…',
	).replaceAll('`', "'");
	return `\`${normalized}\``;
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
		const error = sanitizeDiagnosticText(scrubSecretsInText(failure.error.trim()));
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

function formatError(error: string, maxLength: number, truncatedSuffix: string): string {
	return truncate(error.replaceAll('\r\n', '\n'), maxLength, truncatedSuffix)
		.split('\n')
		.map((line) => `  ${line}`)
		.join('\n');
}

function wrapDiagnosticSections(sections: string[], fallback: string): string {
	const content = sections.length > 0 ? sections.join('\n\n') : fallback;
	return ['<untrusted_data source="agent-preview-tool-errors">', content, '</untrusted_data>']
		.join('\n')
		.split('\n')
		.map((line) => `    ${line}`)
		.join('\n');
}

function buildToolCallLines(
	failure: AgentFixWithAssistantFailure,
	i18n: FixWithAssistantI18n,
): string[] {
	const startedAt = formatTimestamp(failure.startedAt);
	const endedAt = formatTimestamp(failure.endedAt);
	const duration =
		failure.startedAt !== undefined &&
		failure.endedAt !== undefined &&
		Number.isFinite(failure.startedAt) &&
		Number.isFinite(failure.endedAt) &&
		failure.endedAt >= failure.startedAt
			? failure.endedAt - failure.startedAt
			: undefined;

	return [
		`- ${i18n.baseText('agents.builder.preview.fixWithAssistantPrompt.tool')}: ${inlineText(failure.toolDisplayName || failure.toolName)}`,
		`  - ${i18n.baseText('agents.builder.preview.fixWithAssistantPrompt.toolName')}: ${inlineCode(failure.toolName)}`,
		`  - ${i18n.baseText('agents.builder.preview.fixWithAssistantPrompt.toolCallId')}: ${inlineCode(failure.toolCallId)}`,
		...(startedAt
			? [
					`  - ${i18n.baseText('agents.builder.preview.fixWithAssistantPrompt.started')}: ${inlineCode(startedAt)}`,
				]
			: []),
		...(endedAt
			? [
					`  - ${i18n.baseText('agents.builder.preview.fixWithAssistantPrompt.finished')}: ${inlineCode(endedAt)}`,
				]
			: []),
		...(duration !== undefined
			? [
					`  - ${i18n.baseText('agents.builder.preview.fixWithAssistantPrompt.duration')}: ${inlineCode(`${duration} ms`)}`,
				]
			: []),
	];
}

function buildFailureSection(
	group: FailureGroup,
	index: number,
	maxErrorLength: number,
	truncatedSuffix: string,
	i18n: FixWithAssistantI18n,
): string {
	const displayedFailures = group.failures.slice(0, MAX_TOOL_CALLS_PER_ERROR);
	const omittedToolCallCount = group.failures.length - displayedFailures.length;
	const toolCalls = displayedFailures.flatMap((failure) => buildToolCallLines(failure, i18n));

	return [
		`${i18n.baseText('agents.builder.preview.fixWithAssistantPrompt.error')} ${index + 1}`,
		...toolCalls,
		...(omittedToolCallCount > 0
			? [
					'',
					i18n.baseText('agents.builder.preview.fixWithAssistantPrompt.toolCallsOmitted', {
						interpolate: { count: String(omittedToolCallCount) },
					}),
				]
			: []),
		'',
		`${i18n.baseText('agents.builder.preview.fixWithAssistantPrompt.errorMessage')}:`,
		formatError(group.error, maxErrorLength, truncatedSuffix),
	].join('\n');
}

export function buildAgentFixWithAssistantPrompt(
	context: AgentFixWithAssistantPromptContext,
	i18n: FixWithAssistantI18n,
): string {
	const groups = groupFailures(context.failures);
	const truncatedSuffix = i18n.baseText(
		'agents.builder.preview.fixWithAssistantPrompt.valueTruncated',
	);
	const maxErrorLength = Math.min(
		MAX_ERROR_LENGTH,
		Math.max(250, Math.floor(MAX_ERROR_DETAILS_TOTAL_LENGTH / Math.max(groups.length, 1))),
	);

	const contextLines = [
		...(context.agentName
			? [
					`- ${i18n.baseText('agents.builder.preview.fixWithAssistantPrompt.agent')}: ${inlineText(context.agentName)}`,
				]
			: []),
		`- ${i18n.baseText('agents.builder.preview.fixWithAssistantPrompt.agentId')}: ${inlineCode(context.agentId)}`,
		`- ${i18n.baseText('agents.builder.preview.fixWithAssistantPrompt.projectId')}: ${inlineCode(context.projectId)}`,
		...(context.sessionTitle
			? [
					`- ${i18n.baseText('agents.builder.preview.fixWithAssistantPrompt.session')}: ${inlineText(context.sessionTitle)}`,
				]
			: []),
		...(context.sessionNumber !== undefined
			? [
					`- ${i18n.baseText('agents.builder.preview.fixWithAssistantPrompt.sessionNumber')}: ${context.sessionNumber}`,
				]
			: []),
		`- ${i18n.baseText('agents.builder.preview.fixWithAssistantPrompt.sessionId')}: ${inlineCode(context.threadId)}`,
		`- ${i18n.baseText('agents.builder.preview.fixWithAssistantPrompt.executionId')}: ${inlineCode(context.executionId)}`,
	];

	const prefix = [
		i18n.baseText('agents.builder.preview.fixWithAssistantPrompt.instruction'),
		'',
		`## ${i18n.baseText('agents.builder.preview.fixWithAssistantPrompt.context')}`,
		...contextLines,
		'',
		`## ${i18n.baseText('agents.builder.preview.fixWithAssistantPrompt.failedToolCalls')}`,
		'',
		i18n.baseText('agents.builder.preview.fixWithAssistantPrompt.untrustedNotice'),
	].join('\n');
	const footer = i18n.baseText('agents.builder.preview.fixWithAssistantPrompt.inspectSession');
	const failureSections: string[] = [];
	let omittedErrorCount = 0;

	for (const [index, group] of groups.entries()) {
		const section = buildFailureSection(group, index, maxErrorLength, truncatedSuffix, i18n);
		const remainingErrorCount = groups.length - index - 1;
		const remainingNotice =
			remainingErrorCount > 0
				? i18n.baseText('agents.builder.preview.fixWithAssistantPrompt.errorsOmitted', {
						interpolate: { count: String(remainingErrorCount) },
					})
				: undefined;
		const candidateDiagnostics = wrapDiagnosticSections(
			[...failureSections, section, ...(remainingNotice ? [remainingNotice] : [])],
			i18n.baseText('agents.builder.preview.fixWithAssistantPrompt.errorDetailsUnavailable'),
		);
		const candidate = [prefix, candidateDiagnostics, footer].join('\n\n');

		if (candidate.length > MAX_FIX_WITH_ASSISTANT_DRAFT_LENGTH) {
			omittedErrorCount = groups.length - index;
			break;
		}
		failureSections.push(section);
	}

	const omittedNotice =
		omittedErrorCount > 0
			? i18n.baseText('agents.builder.preview.fixWithAssistantPrompt.errorsOmitted', {
					interpolate: { count: String(omittedErrorCount) },
				})
			: undefined;
	const diagnostics = wrapDiagnosticSections(
		[...failureSections, ...(omittedNotice ? [omittedNotice] : [])],
		i18n.baseText('agents.builder.preview.fixWithAssistantPrompt.errorDetailsUnavailable'),
	);
	return [prefix, diagnostics, footer].join('\n\n');
}
