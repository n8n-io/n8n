import type { BaseTextKey } from '@n8n/i18n';
import { useI18n } from '@n8n/i18n';

import type { ConflictReason, Decision, DecisionKind } from './branchSync.types';

const i18n = useI18n();

// Matches N8nBadge's theme prop.
type BadgeTheme = 'default' | 'success' | 'warning' | 'danger' | 'primary' | 'secondary';

// Modeled on sourceControl.utils.ts getStatusTheme/getStatusText; tolerant of
// unknown kinds (decision vocabularies are engine-owned).

const KIND_THEMES: Record<DecisionKind, BadgeTheme> = {
	converged: 'success',
	'apply-to-live': 'success',
	outgoing: 'primary',
	'keep-live-override': 'warning',
	'reset-to-head': 'warning',
	conflict: 'danger',
	deferred: 'warning',
	skipped: 'default',
};

export function getDecisionTheme(kind: DecisionKind): BadgeTheme {
	return KIND_THEMES[kind] ?? 'default';
}

export function getDecisionLabel(kind: DecisionKind): string {
	return i18n.baseText(`branchSync.kind.${kind}` as BaseTextKey);
}

export function getConflictReasonLabel(reason: ConflictReason): string {
	return i18n.baseText(`branchSync.reason.${reason}` as BaseTextKey);
}

export function getDecisionDisplayName(decision: Decision): string {
	return decision.name ?? decision.path;
}

/** `workflows/abc.json` → `workflow`; used as a secondary label. */
export function getResourceKind(path: string): string {
	const dir = path.split('/')[0];
	return dir.endsWith('s') ? dir.slice(0, -1) : dir;
}

export const shortSha = (sha: string | null | undefined) => (sha ? sha.slice(0, 12) : '—');

/** The one combination whose 'head' resolution destroys live work (D007). */
export function isDestructiveChoice(decision: Decision, choice: 'head' | 'live'): boolean {
	return decision.reason === 'git-deleted-live-modified' && choice === 'head';
}
