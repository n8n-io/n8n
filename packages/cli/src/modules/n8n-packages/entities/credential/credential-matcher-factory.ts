import { Container } from '@n8n/di';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import type { CredentialMatcher, CredentialMatcherContext } from './credential-matcher';
import type { CredentialResolution, WorkflowCredentialRequirement } from './credential.types';
import { IdBasedCredentialMatcher } from './id-based-credential-matcher';
import type { CredentialMatchingMode } from '../../n8n-packages.types';

export function createCredentialMatcher(mode: CredentialMatchingMode): CredentialMatcher {
	if (!(mode in credentialMatcherByMode)) {
		throw new BadRequestError(`Unsupported credential matching mode: ${mode as string}`);
	}

	const MatcherClass = credentialMatcherByMode[mode as CredentialMatcherMode];
	return Container.get(MatcherClass);
}

export async function applyCredentialMatching(
	mode: CredentialMatchingMode,
	requirements: WorkflowCredentialRequirement[] | undefined,
	context: CredentialMatcherContext,
): Promise<CredentialResolution> {
	return await createCredentialMatcher(mode).match(requirements, context);
}

/* eslint-disable @typescript-eslint/naming-convention -- API credential matching mode keys */
const credentialMatcherByMode = {
	'id-only': IdBasedCredentialMatcher,
} as const;
/* eslint-enable @typescript-eslint/naming-convention */

type CredentialMatcherMode = keyof typeof credentialMatcherByMode;
