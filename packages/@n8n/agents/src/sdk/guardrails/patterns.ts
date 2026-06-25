import { SECRET_VALUE_PATTERNS } from '@n8n/utils';
import { createHash } from 'node:crypto';
import { z, type ZodType } from 'zod';

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
 * Adapt a Zod schema into a {@link RedactionPattern} `validate` gate: the
 * pattern's regex *locates* a candidate substring in free-form text (Zod cannot
 * scan prose), then the schema *confirms* it before redaction. Lets a rule
 * express its confidence check declaratively — including a `z.string().regex(…)`
 * — instead of as ad-hoc code (cf. {@link passesLuhn}). An optional `normalize`
 * step runs on the located substring before validation (e.g. stripping the
 * separators a regex tolerated so the schema sees a canonical value).
 */
export function zodGuard(
	schema: ZodType,
	normalize?: (match: string) => string,
): (match: string) => boolean {
	return (match) => schema.safeParse(normalize ? normalize(match) : match).success;
}

/**
 * Confidence gate for phone candidates, encoding the **E.164** standard: a
 * leading `+`, a non-zero country code, and 7–15 digits total. This mirrors
 * Zod 4's `z.e164()`; expressed here as a classic-Zod regex because the repo is
 * on Zod 3.25, where `e164()` isn't exposed on the default `zod` import.
 * Validation runs on the digit/`+`-only normalized form (separators stripped).
 */
const PHONE_SCHEMA = z.string().regex(/^\+[1-9]\d{6,14}$/);

/**
 * IBAN mod-97 checksum (ISO 13616): drop spaces, move the first 4 chars to the
 * end, map letters A–Z → 10–35, and confirm the big-integer value mod 97 === 1.
 */
export function passesIbanChecksum(candidate: string): boolean {
	const compact = candidate.replace(/\s/g, '').toUpperCase();
	if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(compact)) return false;

	const rearranged = compact.slice(4) + compact.slice(0, 4);
	let remainder = 0;
	for (let i = 0; i < rearranged.length; i++) {
		const code = rearranged.charCodeAt(i);
		const value = code >= 65 ? code - 55 : code - 48; // 'A'→10 … 'Z'→35, '0'→0 … '9'→9
		remainder = value > 9 ? (remainder * 100 + value) % 97 : (remainder * 10 + value) % 97;
	}
	return remainder === 1;
}

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Decode(input: string): Uint8Array | undefined {
	const bytes: number[] = [];
	for (let i = 0; i < input.length; i++) {
		let carry = BASE58_ALPHABET.indexOf(input[i]);
		if (carry === -1) return undefined;
		for (let j = 0; j < bytes.length; j++) {
			carry += bytes[j] * 58;
			bytes[j] = carry & 0xff;
			carry >>= 8;
		}
		while (carry > 0) {
			bytes.push(carry & 0xff);
			carry >>= 8;
		}
	}
	for (let i = 0; i < input.length && input[i] === '1'; i++) bytes.push(0);
	return Uint8Array.from(bytes.reverse());
}

/** Bitcoin Base58Check: the trailing 4 bytes are the SHA-256d checksum of the payload. */
function passesBase58Check(candidate: string): boolean {
	const decoded = base58Decode(candidate);
	if (!decoded || decoded.length < 5) return false;
	const payload = decoded.subarray(0, decoded.length - 4);
	const checksum = decoded.subarray(decoded.length - 4);
	const hash = createHash('sha256').update(createHash('sha256').update(payload).digest()).digest();
	for (let i = 0; i < 4; i++) if (hash[i] !== checksum[i]) return false;
	return true;
}

/** Ethereum (`0x`+40 hex), Bitcoin bech32 (`bc1`/`tb1`), or Bitcoin Base58Check address. */
function isCryptoWallet(match: string): boolean {
	if (/^0x[0-9a-fA-F]{40}$/.test(match)) return true; // ETH — `0x`+40 hex is distinctive
	if (/^(?:bc1|tb1)[023456789acdefghjklmnpqrstuvwxyz]{11,71}$/.test(match)) return true; // bech32
	return passesBase58Check(match); // legacy P2PKH/P2SH — checksum-gated
}

/** IPv4 with octets ≤ 255, or a colon-delimited IPv6 (shape already constrained by the regex). */
function isIpAddress(match: string): boolean {
	if (match.includes(':')) return true;
	const octets = match.split('.');
	return octets.length === 4 && octets.every((o) => /^\d{1,3}$/.test(o) && Number(o) <= 255);
}

/**
 * Conservative, high-confidence PII patterns. Phone detection is best-effort:
 * only well-structured (E.164) formats are matched. New {@link PiiDetectionType}
 * categories slot in here; a category may map to `undefined` to declare it
 * before a pattern exists, in which case it is excluded from detection.
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
	phone: {
		category: 'phone',
		// Best-effort, E.164 only: a leading `+` then 7–15 digits, tolerating
		// the spaces/parens/dots/dashes people write between groups
		// (e.g. `+1 (555) 123-4567`). Requiring the `+` keeps false positives
		// low — bare digit runs (IDs, dates, NANP without `+`) are not matched.
		// `zodGuard` normalizes to the digit/`+`-only form, then validates E.164.
		regex: /\+\d(?:[\s().-]*\d){6,14}\b/g,
		validate: zodGuard(PHONE_SCHEMA, (match) => match.replace(/[^\d+]/g, '')),
	},
	iban: {
		category: 'iban',
		// Two forms: the compact (un-spaced) IBAN is matched case-insensitively so
		// lower/mixed-case IBANs are caught — with no internal spaces it can't bleed
		// into a following word. The spaced, group-of-4 form is matched upper-case
		// only: spaced IBANs are written upper-case by convention, and that keeps the
		// greedy body from swallowing following lower-case prose (which would fail the
		// checksum and suppress redaction, since the engine doesn't retry sub-matches).
		// `passesIbanChecksum` upper-cases, strips spaces, and verifies mod-97.
		regex: /\b[A-Za-z]{2}\d{2}[A-Za-z0-9]{11,30}\b|\b[A-Z]{2}\d{2}(?: [A-Z0-9]{1,4}){2,8}\b/g,
		validate: passesIbanChecksum,
	},
	'crypto-wallet': {
		category: 'crypto-wallet',
		// Ethereum `0x…40hex`, Bitcoin bech32 `bc1…`/`tb1…`, or Bitcoin Base58Check.
		regex:
			/\b(?:0x[0-9a-fA-F]{40}|(?:bc1|tb1)[023456789acdefghjklmnpqrstuvwxyz]{11,71}|[13][1-9A-HJ-NP-Za-km-z]{25,34})\b/g,
		validate: isCryptoWallet,
	},
	// `mac` is declared before `ip`: a MAC is colon-delimited hex and would also
	// match the IPv6 branch, so matching it as `mac` first keeps the category right.
	mac: {
		category: 'mac',
		regex: /\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/g,
	},
	ip: {
		category: 'ip',
		// IPv4 (octets validated) or IPv6 (full and `::`-compressed forms).
		regex:
			/\b(?:\d{1,3}\.){3}\d{1,3}\b|\b(?:[A-Fa-f0-9]{1,4}:){2,7}[A-Fa-f0-9]{1,4}\b|\b(?:[A-Fa-f0-9]{1,4}:){1,7}:(?:[A-Fa-f0-9]{1,4})?\b/g,
		validate: isIpAddress,
	},
	url: {
		category: 'url',
		// Whole http(s) URL. Stops at whitespace and common trailing delimiters.
		regex: /\bhttps?:\/\/[^\s<>"')\]}]+/g,
	},
};

/**
 * PII categories that actually have a detection pattern today — the source of
 * truth for what redaction can detect. Any {@link PiiDetectionType} mapped to
 * `undefined` in {@link PII_PATTERNS} (declared but not yet implemented) is
 * excluded here.
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
