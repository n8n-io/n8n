import { Logger } from '@n8n/backend-common';
import { CredentialsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from '@n8n/errors';
import { Credentials } from 'n8n-core';

import { CredentialTypes } from '@/credential-types';

import {
	type CredentialRule,
	RuntimeCredentialsService,
	runtimeStubId,
} from './runtime-credentials.service';

/**
 * Creates one stub credential per run-time input rule that names a `credentialType`.
 *
 * The stub is what a builder picks in a node. It holds placeholder data only. The request
 * supplies the real value for each execution (see `RuntimeCredentialsAccessService`). Nobody
 * creates a stub by hand.
 *
 * Runs on every main at startup. The insert is idempotent, so no leader gate is needed. A
 * rule that is removed leaves its stub in place, because workflows still reference it. Such a
 * workflow fails with a clear error and cannot be published until a rule exists again.
 */
@Service()
export class RuntimeCredentialStubSeeder {
	constructor(
		private readonly logger: Logger,
		private readonly rulesService: RuntimeCredentialsService,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly credentialTypes: CredentialTypes,
	) {}

	async seed(): Promise<void> {
		for (const [alias, rule] of this.rulesService.getCredentialRules()) {
			await this.seedRule(alias, rule);
		}
	}

	/** Creates the stub for one rule when it is missing. Returns false when the credential type is unknown. */
	async seedRule(alias: string, rule: CredentialRule): Promise<boolean> {
		if (!this.credentialTypes.recognizes(rule.credentialType)) {
			this.logger.warn(
				`Run-time input rule "${alias}" names unknown credential type "${rule.credentialType}". No stub credential was created.`,
			);
			return false;
		}

		const id = runtimeStubId(alias);
		const name = `Request value: ${alias}`;
		const credentials = new Credentials({ id, name }, rule.credentialType);
		await credentials.setData({});

		const { data } = credentials.getDataToSave();
		if (data === undefined) throw new UnexpectedError('The stub credential has no data');

		const inserted = await this.credentialsRepository.insertRuntimeStubIfMissing({
			id,
			name,
			type: rule.credentialType,
			data,
		});

		if (inserted) this.logger.info(`Created stub credential for run-time input rule "${alias}"`);
		return true;
	}
}
