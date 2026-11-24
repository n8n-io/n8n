import type { I18nClass } from '@n8n/i18n';
import { h, type VNode } from 'vue';

import type { AppliedResult, PromotedResult } from './promotions.types';

type PromoteOutcome = Pick<PromotedResult, 'git' | 'review' | 'warnings'>;
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

/** How many confirmed dependencies a Promote left out. Empty when it left out none. */
export function notIncludedNote(
	i18n: I18nClass,
	{ missingDependencies }: Pick<PromotedResult, 'missingDependencies'>,
): string {
	const count = missingDependencies.length;
	return count > 0
		? i18n.baseText('promotions.result.notIncluded', {
				adjustToNumber: count,
				interpolate: { count: String(count) },
			})
		: '';
}

/** Toast body for a selection promote. A link or a warning keeps the toast open. */
export function promoteSuccessToast(
	result: PromoteOutcome,
	text: {
		pushed: string;
		viewMergeRequest: string;
		reviewNotRecorded: string;
		/** Empty when the Promote left out no dependency. */
		notIncluded: string;
	},
): { message: string | VNode; duration?: 0 } {
	const warnings = result.warnings ?? [];
	const mergeRequestUrl = httpUrl(result.review?.webUrl);
	if (!mergeRequestUrl && warnings.length === 0) {
		return { message: [text.pushed, text.notIncluded].filter(Boolean).join(' ') };
	}

	const summary = mergeRequestUrl
		? externalLink(mergeRequestUrl, text.viewMergeRequest)
		: text.pushed;
	return {
		message: h('div', [
			h('div', [summary]),
			...(text.notIncluded ? [h('div', text.notIncluded)] : []),
			...warnings.map((warning) => h('div', warningNodes(warning, text.reviewNotRecorded))),
		]),
		duration: 0,
	};
}

const warningNodes = (warning: PromoteWarning, reviewNotRecorded: string) =>
	warningSegments(warning, reviewNotRecorded).map((segment) =>
		segment.kind === 'link' ? externalLink(segment.url, segment.url) : segment.text,
	);

/**
 * Appends how many folders an Apply created, how many workflows and folders it moved within their
 * projects, and how many folders it renamed, so prod does not change without notice. Moved
 * workflows are part of the updated count.
 */
export function withFolderNotes(
	i18n: I18nClass,
	message: string,
	{ workflows, folders }: AppliedResult['counts'],
): string {
	const folderCount = (count: number) =>
		i18n.baseText('promotions.applied.moved.folders', {
			adjustToNumber: count,
			interpolate: { count: String(count) },
		});
	const notes = message ? [message] : [];
	if (folders.created > 0) {
		notes.push(
			i18n.baseText('promotions.applied.created', {
				interpolate: { folders: folderCount(folders.created) },
			}),
		);
	}
	if (workflows.moved + folders.moved > 0) {
		notes.push(
			i18n.baseText('promotions.applied.moved', {
				interpolate: {
					workflows: i18n.baseText('promotions.applied.moved.workflows', {
						adjustToNumber: workflows.moved,
						interpolate: { count: String(workflows.moved) },
					}),
					folders: folderCount(folders.moved),
				},
			}),
		);
	}
	if (folders.renamed > 0) {
		notes.push(
			i18n.baseText('promotions.applied.renamed', {
				interpolate: { folders: folderCount(folders.renamed) },
			}),
		);
	}
	return notes.join(' ');
}

/** How many confirmed dependencies are still missing after an Apply. Empty when none is. */
export function stillMissingNote(
	i18n: I18nClass,
	{ missingDependencies }: Pick<AppliedResult, 'missingDependencies'>,
): string {
	const count = missingDependencies.length;
	return count > 0
		? i18n.baseText('promotions.applied.stillMissing', {
				adjustToNumber: count,
				interpolate: { count: String(count) },
			})
		: '';
}
