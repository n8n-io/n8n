import type { PromotePackageResultDto } from '@n8n/api-types';
import { h, type VNode } from 'vue';

type PromoteOutcome = Pick<PromotePackageResultDto, 'git' | 'review' | 'warnings'>;
type PromoteWarning = NonNullable<PromoteOutcome['warnings']>[number];

export type WarningSegment = { kind: 'text'; text: string } | { kind: 'link'; url: string };

/** Returns the URL when it uses http or https. */
export function httpUrl(value: string | undefined): string | undefined {
	if (!value) return undefined;
	try {
		const url = new URL(value);
		return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : undefined;
	} catch {
		return undefined;
	}
}

/** Renders the translated sentence when the warning has a safe link. */
export function warningSegments(
	warning: PromoteWarning,
	reviewNotRecorded: string,
): WarningSegment[] {
	const url = httpUrl(warning.linkUrl);
	if (!url) return [{ kind: 'text', text: warning.message }];
	const [before, after = ''] = reviewNotRecorded.split('%%url%%');
	return [
		...(before ? [{ kind: 'text' as const, text: before }] : []),
		{ kind: 'link', url },
		...(after ? [{ kind: 'text' as const, text: after }] : []),
	];
}

const externalLink = (href: string, label: string) =>
	h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, label);

/** Toast body for a selection promote. A link or a warning keeps the toast open. */
export function promoteSuccessToast(
	result: PromoteOutcome,
	text: { pushed: string; viewMergeRequest: string; reviewNotRecorded: string },
): { message: string | VNode; duration?: 0 } {
	const warnings = result.warnings ?? [];
	const mergeRequestUrl = httpUrl(result.review?.webUrl);
	if (!mergeRequestUrl && warnings.length === 0) return { message: text.pushed };

	const summary = mergeRequestUrl
		? externalLink(mergeRequestUrl, text.viewMergeRequest)
		: text.pushed;
	return {
		message: h('div', [
			h('div', [summary]),
			...warnings.map((warning) => h('div', warningNodes(warning, text.reviewNotRecorded))),
		]),
		duration: 0,
	};
}

const warningNodes = (warning: PromoteWarning, reviewNotRecorded: string) =>
	warningSegments(warning, reviewNotRecorded).map((segment) =>
		segment.kind === 'link' ? externalLink(segment.url, segment.url) : segment.text,
	);
