import type { ScimTransferTarget } from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
	['year', 365 * 24 * 60 * 60],
	['month', 30 * 24 * 60 * 60],
	['week', 7 * 24 * 60 * 60],
	['day', 24 * 60 * 60],
	['hour', 60 * 60],
	['minute', 60],
];

/**
 * "3 minutes ago", "yesterday", "just now". Used in row descriptions, where
 * only text fits. Anything under a minute reads as "just now".
 */
export function formatTimeAgo(iso: string, now: number = Date.now(), locale?: string): string {
	const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
	const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

	for (const [unit, unitSeconds] of RELATIVE_UNITS) {
		if (Math.abs(seconds) >= unitSeconds) {
			return formatter.format(Math.round(seconds / unitSeconds), unit);
		}
	}

	return formatter.format(0, 'second');
}

/** "Jun 12, 2026" */
export function formatDate(iso: string, locale?: string): string {
	return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(iso));
}

/** Full name of a person, or the email when both names are empty. */
export function formatPersonName(
	person: { firstName: string | null; lastName: string | null; email?: string | null },
	fallback = '',
): string {
	const name = [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
	return name || person.email || fallback;
}

/** The i18n key of a global role label, or null for a custom role. */
export function roleLabelKey(roleSlug: string): BaseTextKey | null {
	switch (roleSlug) {
		case 'global:owner':
			return 'auth.roles.owner';
		case 'global:admin':
			return 'auth.roles.admin';
		case 'global:member':
			return 'auth.roles.member';
		case 'global:chatUser':
			return 'auth.roles.chatUser';
		default:
			return null;
	}
}

/** `person` or `project` for a stored transfer target, or null when the project is gone. */
export function transferTargetType(target: ScimTransferTarget | null): 'person' | 'project' | null {
	return target?.kind ?? null;
}
