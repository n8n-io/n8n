import {
	publicApiCredentialResponseSchema,
	type PublicApiCredentialResponse,
} from '@n8n/api-types';
import type { ICredentialsDb } from '@n8n/db';
import { UnexpectedError } from 'n8n-workflow';

export function toPublicApiCredentialResponse(
	credential: Pick<
		ICredentialsDb,
		'id' | 'name' | 'type' | 'isManaged' | 'isGlobal' | 'isResolvable' | 'createdAt' | 'updatedAt'
	> & {
		resolvableAllowFallback?: boolean;
		resolverId?: string | null;
	},
): PublicApiCredentialResponse {
	const parsed = publicApiCredentialResponseSchema.safeParse({
		...credential,
		resolvableAllowFallback: credential.resolvableAllowFallback ?? false,
		resolverId: credential.resolverId ?? null,
	});

	if (!parsed.success) {
		throw new UnexpectedError('Failed to parse credential response', {
			cause: parsed.error,
		});
	}

	return parsed.data;
}
