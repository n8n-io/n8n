import { SECRET_VALUE_PATTERNS } from '../scrub-secrets';

/**
 * PII categories the detection vocabulary knows about. A category may be
 * declared here before a pattern exists for it — see {@link PII_PATTERNS}.
 */
export type PiiDetectionType =
	| 'email'
	| 'phone'
	| 'credit-card'
	| 'ssn-us'
	| 'iban'
	| 'crypto-wallet'
	| 'ip'
	| 'mac'
	| 'url';

/**
 * A category attached to every redaction match so callers can log *what kind*
 * of sensitive content was removed without ever handling the value itself.
 * `'secret'` covers credential/token patterns; the rest mirror
 * {@link PiiDetectionType}.
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

export type PiiPatternTable = Readonly<Record<PiiDetectionType, RedactionPattern | undefined>>;

/** Compile a global regex once, adding the `g` flag if the source omits it. */
function globalRegex(source: string, flags = ''): RegExp {
	return new RegExp(source, flags.includes('g') ? flags : `${flags}g`);
}

/**
 * Secret/credential patterns, sourced from {@link SECRET_VALUE_PATTERNS} so
 * there is a single place that defines what a credential looks like.
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
 * Confidence gate for phone candidates, encoding the **E.164** standard: a
 * leading `+`, a non-zero country code, and 7–15 digits total. Runs on the
 * digit/`+`-only normalized form (separators stripped).
 */
function passesE164(candidate: string): boolean {
	return /^\+[1-9]\d{6,14}$/.test(candidate.replace(/[^\d+]/g, ''));
}

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

export function base58Decode(input: string): Uint8Array | undefined {
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

/**
 * Ethereum (`0x`+40 hex) or Bitcoin bech32 (`bc1`/`tb1`) — both distinctive
 * enough to accept on shape alone.
 */
function isDistinctiveWalletShape(match: string): boolean {
	if (/^0x[0-9a-fA-F]{40}$/.test(match)) return true;
	return /^(?:bc1|tb1)[023456789acdefghjklmnpqrstuvwxyz]{11,71}$/.test(match);
}

/**
 * Default legacy-address gate: a Base58Check payload decodes to exactly 25
 * bytes (1 version + 20 hash + 4 checksum). Verifying the checksum itself needs
 * SHA-256, which has no synchronous cross-platform primitive — Node callers
 * inject the stricter check via `createPiiPatterns`. Erring toward redaction is
 * the safe direction: an unvalidated Base58 blob of that length is far more
 * likely to be a credential than prose.
 */
function isLegacyWalletShape(match: string): boolean {
	return base58Decode(match)?.length === 25;
}

/** Ethereum, Bitcoin bech32, or a legacy Base58 address of plausible length. */
export function isCryptoWalletShape(match: string): boolean {
	return isDistinctiveWalletShape(match) || isLegacyWalletShape(match);
}

/**
 * Conservative, high-confidence PII patterns. Phone detection is best-effort:
 * only well-structured (E.164) formats are matched. New {@link PiiDetectionType}
 * categories slot in here; a category may map to `undefined` to declare it
 * before a pattern exists, in which case it is excluded from detection.
 *
 * `overrides` swaps individual entries — used by `@n8n/agents` to layer its
 * Node-only Base58Check validator onto `crypto-wallet`.
 */
export function createPiiPatterns(
	overrides: Partial<Record<PiiDetectionType, RedactionPattern>> = {},
): PiiPatternTable {
	/* eslint-disable @typescript-eslint/naming-convention -- category ids are the
	   public `PiiDetectionType` vocabulary, which is kebab-case */
	return {
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
			regex: /\+\d(?:[\s().-]*\d){6,14}\b/g,
			validate: passesE164,
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
			validate: isCryptoWalletShape,
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
		...overrides,
	};
	/* eslint-enable @typescript-eslint/naming-convention */
}

/** IPv4 with octets ≤ 255, or a colon-delimited IPv6 (shape already constrained by the regex). */
function isIpAddress(match: string): boolean {
	if (match.includes(':')) return true;
	const octets = match.split('.');
	return octets.length === 4 && octets.every((o) => /^\d{1,3}$/.test(o) && Number(o) <= 255);
}

/** Browser-safe default table. Node callers layer stricter validators on top. */
export const PII_PATTERNS = createPiiPatterns();

/**
 * PII categories that actually have a detection pattern today — the source of
 * truth for what redaction can detect. Any {@link PiiDetectionType} mapped to
 * `undefined` in the table (declared but not yet implemented) is excluded here.
 */
export const SUPPORTED_PII_CATEGORIES: PiiDetectionType[] = (
	Object.keys(PII_PATTERNS) as PiiDetectionType[]
).filter((type) => PII_PATTERNS[type] !== undefined);

/** Resolve the active pattern set for the given options. */
export function resolvePatterns(
	opts: {
		secrets: boolean;
		detect: readonly PiiDetectionType[];
	},
	piiPatterns: PiiPatternTable = PII_PATTERNS,
): RedactionPattern[] {
	const patterns: RedactionPattern[] = [];
	if (opts.secrets) patterns.push(...SECRET_PATTERNS);
	for (const type of opts.detect) {
		const pattern = piiPatterns[type];
		if (pattern) patterns.push(pattern);
	}
	return patterns;
}
