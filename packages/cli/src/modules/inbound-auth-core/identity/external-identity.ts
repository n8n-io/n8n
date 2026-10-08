import type { Logger } from '@n8n/backend-common';
import type { ClaimMapping, ExternalIdentity, Result } from '@n8n/inbound-auth';
import { Expression } from 'n8n-workflow';

function readClaim(
	claims: Readonly<Record<string, unknown>>,
	source: string,
	logger: Logger,
): unknown {
	if (!source.startsWith('=')) {
		return Object.hasOwn(claims, source) ? claims[source] : undefined;
	}
	const expression = source.slice(1);
	try {
		const value = Expression.resolveWithoutWorkflow(expression, {
			$claims: claims,
		});
		const usable = typeof value === 'string' ? value.trim() !== '' : Array.isArray(value);
		if (!usable) logger.debug('Claim mapping expression yielded no usable value', { source });
		return value;
	} catch (error) {
		logger.debug('Claim mapping expression failed', { source, error });
		return undefined;
	}
}

function nonEmptyString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

function toScopes(value: unknown): string[] {
	const parts =
		typeof value === 'string'
			? value.split(/\s+/).map((scope) => scope.trim())
			: Array.isArray(value) && value.every((v) => typeof v === 'string' && v.trim() !== '')
				? value
				: [];
	return [...new Set(parts.filter((scope) => scope !== ''))];
}

function toVerified(value: unknown): boolean | undefined {
	if (value === true || value === 'true') return true;
	if (value === false || value === 'false') return false;
	return undefined;
}

function toAuthTime(value: unknown): Date | undefined {
	const seconds =
		typeof value === 'number'
			? value
			: typeof value === 'string' && value.trim() !== ''
				? Number(value)
				: NaN;

	if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
	// A large finite value overflows the Date range and yields an Invalid Date.
	const date = new Date(seconds * 1000);
	return Number.isNaN(date.getTime()) ? undefined : date;
}

export function translateClaims(
	claims: Readonly<Record<string, unknown>>,
	mapping: ClaimMapping,
	logger: Logger,
): Result<ExternalIdentity> {
	const subject = nonEmptyString(
		Object.hasOwn(claims, mapping.subject) ? claims[mapping.subject] : undefined,
	);
	if (subject === undefined) {
		return {
			ok: false,
			reason: 'unknown-subject',
		};
	}

	const read = (source: string) => readClaim(claims, source, logger);
	const email = nonEmptyString(read(mapping.email))?.toLowerCase();

	const acr = nonEmptyString(claims['acr']);
	const amr = Array.isArray(claims['amr'])
		? claims['amr'].filter((v): v is string => typeof v === 'string')
		: undefined;
	const authTime = toAuthTime(claims['auth_time']);

	const assurance = acr || amr || authTime ? { acr, amr, authTime } : undefined;

	return {
		ok: true,
		value: {
			subject,
			email,
			emailVerified: toVerified(read(mapping.emailVerified)),
			displayName: nonEmptyString(read(mapping.displayName)),
			clientId: nonEmptyString(read(mapping.clientId)),
			scopes: toScopes(read(mapping.scopes)),
			assurance,
			raw: claims,
		},
	};
}
