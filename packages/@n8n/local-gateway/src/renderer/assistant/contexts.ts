/*
 * Mapping from the locally-detected context (`DetectedContext`, produced in the
 * main process) to the `AssistantContext` the pill renders, plus the suggestion
 * chips and icons. For the `file` kind, icons and chips are chosen by the
 * `fileType` category (pdf/image/markdown/text) rather than the kind.
 */
import type { IconName } from '@n8n/design-system';

import type { DetectedContext } from '../../shared/types';

export type AssistantContextKind = 'browser' | 'finder' | 'file' | 'calendar' | 'email' | 'other';

/** Readable file categories — mirrors `FileType` in `@n8n/computer-use`. */
export type FileType = 'pdf' | 'image' | 'markdown' | 'text';

export interface AssistantContext {
	key: string;
	label: string;
	icon: IconName;
	kind: AssistantContextKind;
	/** Set when `kind === 'file'`; drives the icon and chips. */
	fileType?: FileType;
}

export interface SuggestionChip {
	label: string;
	icon: IconName;
}

/**
 * Context-dependent suggestion chips, keyed by kind for non-file contexts.
 * Icon substitutions vs the prototype (names missing from the DS icon set):
 * - `bookmark` → `star` (Save to my reading list)
 * - `calendar-days` → `calendar` (Plan my week)
 */
const CHIPS_BY_KIND: Record<Exclude<AssistantContextKind, 'file'>, SuggestionChip[]> = {
	browser: [
		{ label: 'Summarise this page', icon: 'text' },
		{ label: 'Save to my reading list', icon: 'star' },
		{ label: "Tell me when it's updated", icon: 'bell' },
		{ label: 'Email me the key points', icon: 'mail' },
		{ label: 'Find related reading', icon: 'search' },
	],
	finder: [
		{ label: 'Organise this folder', icon: 'folder' },
		{ label: 'Rename these files', icon: 'pencil' },
		{ label: 'Find duplicates', icon: 'copy' },
		{ label: 'Back these up', icon: 'hard-drive' },
	],
	calendar: [
		{ label: 'Summarise my day', icon: 'text' },
		{ label: "What's next on my calendar", icon: 'calendar' },
		{ label: 'Find a free slot', icon: 'search' },
		{ label: 'Remind me before my next meeting', icon: 'bell' },
	],
	email: [
		{ label: 'Summarise my inbox', icon: 'mail' },
		{ label: 'Draft a reply', icon: 'pencil' },
		{ label: 'Find important emails', icon: 'search' },
		{ label: 'Catch me up', icon: 'list-checks' },
	],
	other: [
		{ label: 'Set up a daily summary', icon: 'mail' },
		{ label: 'Remind me about my day', icon: 'calendar' },
		{ label: 'Catch me up on Slack', icon: 'message-square' },
		{ label: 'Plan my week', icon: 'calendar' },
	],
};

/** Suggestion chips for the `file` kind, keyed by the readable file category. */
const CHIPS_BY_FILE_TYPE: Record<FileType, SuggestionChip[]> = {
	pdf: [
		{ label: 'Summarise this PDF', icon: 'file-text' },
		{ label: 'Pull out the tables', icon: 'table' },
		{ label: 'Extract the action items', icon: 'list-checks' },
		{ label: 'Translate it', icon: 'languages' },
	],
	image: [
		{ label: 'Describe this image', icon: 'image' },
		{ label: 'Extract the text', icon: 'text' },
		{ label: 'Summarise it', icon: 'list-checks' },
	],
	markdown: [
		{ label: 'Summarise this file', icon: 'file-text' },
		{ label: 'Extract the action items', icon: 'list-checks' },
		{ label: 'Tidy up the formatting', icon: 'pencil' },
		{ label: 'Translate it', icon: 'languages' },
	],
	text: [
		{ label: 'Summarise this file', icon: 'file-text' },
		{ label: 'Extract the key points', icon: 'list-checks' },
		{ label: 'Pull out the tables', icon: 'table' },
		{ label: 'Translate it', icon: 'languages' },
	],
};

/** Max suggestion chips shown (matches the prototype's cap). */
export const MAX_SUGGESTION_CHIPS = 6;

export function suggestionChipsFor(
	kind: AssistantContextKind,
	fileType?: FileType,
): SuggestionChip[] {
	const chips = kind === 'file' ? CHIPS_BY_FILE_TYPE[fileType ?? 'text'] : CHIPS_BY_KIND[kind];
	return chips.slice(0, MAX_SUGGESTION_CHIPS);
}

/** Stable key for the live, detected context option. */
export const ACTIVE_CONTEXT_KEY = 'active';

// Every `file` uses the same generic file icon — the fileType only tailors the
// suggestion chips, not the icon.
const ICON_BY_KIND: Record<AssistantContextKind, IconName> = {
	browser: 'globe',
	finder: 'folder',
	file: 'file-text',
	calendar: 'calendar',
	email: 'mail',
	other: 'monitor',
};

/** A short human label for what was detected: the window title, then the URL host, then the app. */
function detectedLabel(detected: DetectedContext): string {
	if (detected.windowTitle) return detected.windowTitle;
	if (detected.url) {
		try {
			return new URL(detected.url).hostname;
		} catch {
			return detected.url;
		}
	}
	if (detected.path) return detected.path.split('/').filter(Boolean).pop() ?? detected.path;
	return detected.app ?? 'Your screen';
}

/** Map the main-process `DetectedContext` to the `AssistantContext` the pill renders. */
export function assistantContextFromDetected(detected: DetectedContext): AssistantContext {
	return {
		// Key by window id so the picker can list several windows distinctly; fall
		// back to app name, then the sentinel for an empty/synthetic context.
		key: detected.id ?? detected.app ?? ACTIVE_CONTEXT_KEY,
		label: detectedLabel(detected),
		icon: ICON_BY_KIND[detected.kind],
		kind: detected.kind,
		fileType: detected.fileType,
	};
}
