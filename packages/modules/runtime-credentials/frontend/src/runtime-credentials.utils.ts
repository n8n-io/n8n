import type { RuntimeCredentialTransform } from './runtime-credentials.api';

export type TransformKind = 'none' | 'bearer' | 'field';

export function parseTransform(transform?: RuntimeCredentialTransform): {
	kind: TransformKind;
	fieldName: string;
} {
	if (transform === 'bearer') return { kind: 'bearer', fieldName: '' };
	if (transform?.startsWith('field:')) {
		return { kind: 'field', fieldName: transform.slice('field:'.length) };
	}
	return { kind: 'none', fieldName: '' };
}

export function buildTransform(
	kind: TransformKind,
	fieldName: string,
): RuntimeCredentialTransform | undefined {
	if (kind === 'bearer') return 'bearer';
	if (kind === 'field') return `field:${fieldName.trim()}`;
	return undefined;
}

export function getHttpStatus(error: unknown): number | undefined {
	if (typeof error === 'object' && error !== null && 'httpStatusCode' in error) {
		const status = error.httpStatusCode;
		return typeof status === 'number' ? status : undefined;
	}
	return undefined;
}

const INVALID_HOST_CHARACTERS = /[/:@\\\s]/;

/** Splits a comma separated host list. Drops empty entries. */
export function parseAllowedDomains(value: string | null | undefined): string[] {
	return (value ?? '')
		.split(',')
		.map((entry) => entry.trim())
		.filter((entry) => entry !== '');
}

/** Returns the first entry that is not a bare host, or `undefined` when all entries are valid. */
export function findInvalidAllowedDomain(value: string): string | undefined {
	return parseAllowedDomains(value).find((entry) => INVALID_HOST_CHARACTERS.test(entry));
}

/** Empty string means no restriction. */
export function normalizeAllowedDomains(value: string): string {
	return parseAllowedDomains(value).join(', ');
}
