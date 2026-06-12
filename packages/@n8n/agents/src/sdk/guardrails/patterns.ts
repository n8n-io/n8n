import { SECRET_VALUE_PATTERNS } from '@n8n/utils';

import type { PiiDetectionType } from '../../types';

/**
 * A category attached to every redaction match so callers can log *what kind*
 * of sensitive content was removed without ever handling the value itself.
 * `'secret'` covers credential/token patterns; the rest mirror the SDK's
 * {@link PiiDetectionType} vocabulary.
 */
export type RedactionCategory = 'secret' | PiiDetectionType;

export interface RedactionPattern {
	readonly category: RedactionCategory;
	/**
	 * Precompiled regex matching the sensitive value. Always global — the
	 * redactor relies on `g` both for replace-all and for the `exec` scan loop.
	 * Compiled once at module load; callers reset `lastIndex` before reuse.
	 */
	readonly regex: RegExp;
	/**
	 * Optional gate: a candidate match is only redacted when this returns
	 * `true`. Used to suppress false positives (e.g. Luhn check for cards).
	 */
	readonly validate?: (match: string) => boolean;
}

/** Compile a global regex once, adding the `g` flag if the source omits it. */
function globalRegex(source: string, flags = ''): RegExp {
	return new RegExp(source, flags.includes('g') ? flags : `${flags}g`);
}

/**
 * Secret/credential patterns, sourced from `@n8n/utils` so there is a single
 * place that defines what a credential looks like across the codebase.
 */
const SECRET_PATTERNS: readonly RedactionPattern[] = SECRET_VALUE_PATTERNS.map((re) => ({
	category: 'secret',
	regex: globalRegex(re.source, re.flags),
}));

/** Luhn checksum — used to keep credit-card redaction from firing on any long digit run. */
export function passesLuhn(candidate: string): boolean {
	const digits = candidate.replace(/\D/g, '');
	if (digits.length < 13 || digits.length > 19) return false;

	let sum = 0;
	let double = false;
	for (let i = digits.length - 1; i >= 0; i--) {
		let digit = digits.charCodeAt(i) - 48;
		if (double) {
			digit *= 2;
			if (digit > 9) digit -= 9;
		}
		sum += digit;
		double = !double;
	}
	return sum % 10 === 0;
}

/**
 * Conservative, high-confidence PII patterns. Phone numbers and physical
 * addresses are intentionally omitted — they are too false-positive-prone for
 * free-form agent prose. New {@link PiiDetectionType} categories slot in here.
 */
const PII_PATTERNS: Readonly<Record<PiiDetectionType, RedactionPattern | undefined>> = {
	email: {
		category: 'email',
		regex: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
	},
	'credit-card': {
		category: 'credit-card',
		// 13-19 digits, optionally grouped by single spaces or dashes.
		regex: /\b\d(?:[ -]?\d){12,18}\b/g,
		validate: passesLuhn,
	},
	'ssn-us': {
		category: 'ssn-us',
		// US Social Security Number, dashed form only (123-45-6789). Bare 9-digit
		// runs are intentionally not matched (too false-positive-prone). Per-country
		// national IDs each get their own `ssn-<cc>` category (e.g. a future `ssn-uk`).
		regex: /\b\d{3}-\d{2}-\d{4}\b/g,
	},
	// Deferred — too noisy for prose; declared so the type stays exhaustive.
	phone: undefined,
	address: undefined,
};

/**
 * PII categories that actually have a detection pattern today. `phone` and
 * `address` are part of {@link PiiDetectionType} but not yet implemented, so
 * they are excluded here — callers should treat this as the source of truth
 * for what redaction can detect.
 */
export const SUPPORTED_PII_CATEGORIES: PiiDetectionType[] = (
	Object.keys(PII_PATTERNS) as PiiDetectionType[]
).filter((type) => PII_PATTERNS[type] !== undefined);

/** Resolve the active pattern set for the given options. */
export function resolvePatterns(opts: {
	secrets: boolean;
	detect: readonly PiiDetectionType[];
}): RedactionPattern[] {
	const patterns: RedactionPattern[] = [];
	if (opts.secrets) patterns.push(...SECRET_PATTERNS);
	for (const type of opts.detect) {
		const pattern = PII_PATTERNS[type];
		if (pattern) patterns.push(pattern);
	}
	return patterns;
}
