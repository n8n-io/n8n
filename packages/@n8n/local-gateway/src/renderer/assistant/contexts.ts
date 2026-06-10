/*
 * Demo contexts + context→suggestion-chip mapping for the composer.
 *
 * These are demo/mock constants (the prototype's `qj` / `Qj`), kept as TS
 * rather than i18n. The "active context" is purely a demo affordance — in the
 * real app it would reflect what the user is actually looking at.
 */
import type { IconName } from '@n8n/design-system';

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

export const ASSISTANT_CONTEXTS: readonly AssistantContext[] = [
	{ key: 'atlantic', label: 'The Atlantic', icon: 'globe', kind: 'browser' },
	{ key: 'youtube', label: 'YouTube video', icon: 'globe', kind: 'browser' },
	{ key: 'downloads', label: 'Downloads folder', icon: 'folder', kind: 'finder' },
	{ key: 'report', label: 'Q2 Report.pdf', icon: 'file-text', kind: 'pdf' },
	{ key: 'desktop', label: 'Desktop', icon: 'monitor', kind: 'other' },
];

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
