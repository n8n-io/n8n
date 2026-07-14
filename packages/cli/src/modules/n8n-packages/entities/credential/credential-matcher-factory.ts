import { Service } from '@n8n/di';

import { BadRequestError } from '@/errors/response-errors/bad-request.error.js';

import type { CredentialMatcher } from './credential-matcher.js';
import { IdBasedCredentialMatcher } from './id-based-credential-matcher.js';
import { NameAndTypeCredentialMatcher } from './name-and-type-credential-matcher.js';
import { TypeOnlyCredentialMatcher } from './type-only-credential-matcher.js';
import type { CredentialMatchingMode } from '../../n8n-packages.types.js';

@Service()
export class CredentialMatcherFactory {
	private readonly matchers: Record<CredentialMatchingMode, CredentialMatcher>;

	constructor(
		idBasedMatcher: IdBasedCredentialMatcher,
		nameAndTypeMatcher: NameAndTypeCredentialMatcher,
		typeOnlyMatcher: TypeOnlyCredentialMatcher,
	) {
		/* eslint-disable @typescript-eslint/naming-convention -- API credential matching mode keys */
		this.matchers = {
			'id-only': idBasedMatcher,
			'name-and-type': nameAndTypeMatcher,
			'type-only': typeOnlyMatcher,
		};
		/* eslint-enable @typescript-eslint/naming-convention */
	}

	getMatcher(mode: CredentialMatchingMode): CredentialMatcher {
		const matcher = this.matchers[mode];
		if (!matcher) {
			throw new BadRequestError(`Unsupported credential matching mode: ${mode as string}`);
		}
		return matcher;
	}
}
