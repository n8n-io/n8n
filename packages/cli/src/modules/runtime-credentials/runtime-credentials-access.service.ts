import { Service } from '@n8n/di';
import { UserError } from '@n8n/errors';
import { Cipher } from 'n8n-core';
import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	IExecutionContext,
	IRunExecutionData,
} from 'n8n-workflow';
import { toSecureArtifacts } from 'n8n-workflow';

import { RuntimeCredentialProvider } from '@n8n/backend-services';

import { RuntimeCredentialsService } from './runtime-credentials.service';
import type { CredentialTransform } from './runtime-credentials.schemas';

const MISSING_VALUE_MESSAGE =
	'This credential gets its value from the incoming request. Run the workflow through its trigger.';

@Service()
export class RuntimeCredentialsAccessService implements RuntimeCredentialProvider {
	constructor(
		private readonly cipher: Cipher,
		private readonly runtimeCredentialsService: RuntimeCredentialsService,
	) {}

	async getRuntimeCredential(
		runExecutionData: IRunExecutionData,
		alias: string,
	): Promise<IDataObject[string] | undefined> {
		const secureArtifacts = runExecutionData.executionData?.runtimeData?.secureArtifacts;

		if (typeof secureArtifacts === 'string') {
			const decryptedSecureArtifacts = await this.cipher.decryptV2(secureArtifacts);
			const parsedSecureArtifacts = toSecureArtifacts(decryptedSecureArtifacts);

			return parsedSecureArtifacts.artifacts[alias];
		}
		return undefined;
	}

	async getRuntimeCredentialValues(
		runExecutionData: IRunExecutionData,
	): Promise<Array<{ alias: string; value: string }>> {
		const secureArtifacts = runExecutionData.executionData?.runtimeData?.secureArtifacts;
		if (typeof secureArtifacts !== 'string') return [];

		const { artifacts } = toSecureArtifacts(await this.cipher.decryptV2(secureArtifacts));
		return Object.entries(artifacts).flatMap(([alias, stored]) =>
			collectStrings(stored).map((value) => ({ alias, value })),
		);
	}

	getRuleAliasForStub(credentialId: string): string | undefined {
		return this.runtimeCredentialsService.getRuleForStub(credentialId)?.alias;
	}

	hasCredentialRuleForTrigger(credentialId: string, triggerNodeType: string): boolean {
		return this.runtimeCredentialsService.stubRuleAppliesToTrigger(credentialId, triggerNodeType);
	}

	getAllowedDomainsForStub(credentialId: string): string | undefined {
		return this.runtimeCredentialsService.getRuleForStub(credentialId)?.rule.allowedDomains;
	}

	/**
	 * Builds the data that a run-time stub credential receives from the request.
	 * Throws when the rule is gone, when no value arrived, or when the items gave different
	 * values. Error messages name the rule and the path. They never contain values.
	 */
	async getRuntimeCredentialData(
		executionContext: IExecutionContext | undefined,
		credentialId: string,
		credentialType: string,
	): Promise<ICredentialDataDecryptedObject> {
		const entry = this.runtimeCredentialsService.getRuleForStub(credentialId);
		if (!entry || entry.rule.credentialType !== credentialType) {
			throw new UserError(
				'No run-time input rule is configured for this credential. Ask an instance admin to add one.',
			);
		}
		const { alias, rule } = entry;

		const encrypted = executionContext?.secureArtifacts;
		if (typeof encrypted !== 'string') throw new UserError(MISSING_VALUE_MESSAGE);

		const { artifacts } = toSecureArtifacts(await this.cipher.decryptV2(encrypted));
		const values = new Set(collectStrings(artifacts[alias]));

		if (values.size === 0) throw new UserError(MISSING_VALUE_MESSAGE);

		if (values.size > 1) {
			throw new UserError(
				`The request gave different values for rule "${alias}" (${rule.path}). Send one value.`,
			);
		}

		const [value] = values;
		return applyTransform(value, rule.transform ?? 'bearer');
	}
}

/** One rule can match several items, and a match can be an array. Collect every string leaf. */
function collectStrings(value: unknown): string[] {
	if (typeof value === 'string') return [value];
	if (Array.isArray(value)) return value.flatMap((entry: unknown) => collectStrings(entry));
	return [];
}

function applyTransform(
	value: string,
	transform: CredentialTransform,
): ICredentialDataDecryptedObject {
	if (transform === 'bearer') {
		return { oauthTokenData: { access_token: value.replace(/^Bearer\s+/i, '') } };
	}
	return { [transform.slice('field:'.length)]: value };
}
