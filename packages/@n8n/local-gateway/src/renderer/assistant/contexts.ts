/*
 * Context→suggestion-chip mapping for the composer, plus the mapping from the
 * locally-detected context (`DetectedContext`, produced in the main process) to
 * the `AssistantContext` the pill renders.
 *
 * `ASSISTANT_CONTEXTS` remains as manual-override options in the switch menu;
 * the *active* context is the real detected one (see `assistantContextFromDetected`).
 */
import type { IconName } from '@n8n/design-system';

import type { DetectedContext } from '../../shared/types';

export type AssistantContextKind = 'browser' | 'finder' | 'pdf' | 'other';

export interface AssistantContext {
	key: string;
	label: string;
	icon: IconName;
	kind: AssistantContextKind;
}

export interface SuggestionChip {
	label: string;
	icon: IconName;
}

/**
 * Context-dependent suggestion chips.
 * Icon substitutions vs the prototype (names missing from the DS icon set):
 * - `bookmark` → `star` (Save to my reading list)
 * - `calendar-days` → `calendar` (Plan my week)
 */
const CHIPS_BY_KIND: Record<AssistantContextKind, SuggestionChip[]> = {
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
	pdf: [
		{ label: 'Summarise this PDF', icon: 'file-text' },
		{ label: 'Pull out the tables', icon: 'table' },
		{ label: 'Extract the action items', icon: 'list-checks' },
		{ label: 'Translate it', icon: 'languages' },
	],
	other: [
		{ label: 'Set up a daily summary', icon: 'mail' },
		{ label: 'Remind me about my day', icon: 'calendar' },
		{ label: 'Catch me up on Slack', icon: 'message-square' },
		{ label: 'Plan my week', icon: 'calendar' },
	],
};

/** Max suggestion chips shown (matches the prototype's cap). */
export const MAX_SUGGESTION_CHIPS = 6;

export function suggestionChipsFor(kind: AssistantContextKind): SuggestionChip[] {
	return CHIPS_BY_KIND[kind].slice(0, MAX_SUGGESTION_CHIPS);
}

/** Stable key for the live, detected context option. */
export const ACTIVE_CONTEXT_KEY = 'active';

const ICON_BY_KIND: Record<AssistantContextKind, IconName> = {
	browser: 'globe',
	finder: 'folder',
	pdf: 'file-text',
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
		key: ACTIVE_CONTEXT_KEY,
		label: detectedLabel(detected),
		icon: ICON_BY_KIND[detected.kind],
		kind: detected.kind,
	};
}
