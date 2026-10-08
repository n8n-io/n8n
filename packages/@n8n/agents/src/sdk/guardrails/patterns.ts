import {
	base58Decode,
	createPiiPatterns,
	PII_PATTERNS as BROWSER_PII_PATTERNS,
	resolvePatterns as resolvePatternsWith,
	type PiiPatternTable,
	type RedactionPattern,
} from '@n8n/utils/redaction/pii-patterns';
import { createHash } from 'node:crypto';

import type { PiiDetectionType } from '../../types';

export type { RedactionCategory, RedactionPattern } from '@n8n/utils/redaction/pii-patterns';
export {
	passesLuhn,
	passesIbanChecksum,
	SUPPORTED_PII_CATEGORIES,
} from '@n8n/utils/redaction/pii-patterns';

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

/**
 * Ethereum (`0x`+40 hex), Bitcoin bech32 (`bc1`/`tb1`), or a checksum-verified
 * legacy Base58Check address. Stricter than the shared `isCryptoWalletShape`
 * in `@n8n/utils`, which can only length-check the legacy form — SHA-256 has
 * no synchronous browser primitive.
 */
function isCryptoWallet(match: string): boolean {
	if (/^0x[0-9a-fA-F]{40}$/.test(match)) return true; // ETH — `0x`+40 hex is distinctive
	if (/^(?:bc1|tb1)[023456789acdefghjklmnpqrstuvwxyz]{11,71}$/.test(match)) return true; // bech32
	return passesBase58Check(match); // legacy P2PKH/P2SH — checksum-gated
}

const WALLET_PATTERN = BROWSER_PII_PATTERNS['crypto-wallet'] as RedactionPattern;

/** Detection table for Node callers: the shared set, checksum-gated wallets. */
export const PII_PATTERNS: PiiPatternTable = createPiiPatterns({
	'crypto-wallet': { ...WALLET_PATTERN, validate: isCryptoWallet },
});

/** Resolve the active pattern set for the given options. */
export function resolvePatterns(opts: {
	secrets: boolean;
	detect: readonly PiiDetectionType[];
}): RedactionPattern[] {
	return resolvePatternsWith(opts, PII_PATTERNS);
}
