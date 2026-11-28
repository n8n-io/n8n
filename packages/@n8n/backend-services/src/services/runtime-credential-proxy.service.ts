import { Service } from '@n8n/di';
import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	IExecutionContext,
	IRunExecutionData,
} from 'n8n-workflow';

export interface RuntimeCredentialProvider {
	getRuntimeCredential(
		runExecutionData: IRunExecutionData,
		alias: string,
	): Promise<IDataObject[string] | undefined>;

	/**
	 * Data that a run-time stub credential receives from the request.
	 * Throws when the rule is gone, when the request gave no value, or when it gave different values.
	 */
	getRuntimeCredentialData(
		executionContext: IExecutionContext | undefined,
		credentialId: string,
		credentialType: string,
	): Promise<ICredentialDataDecryptedObject>;

	/** Every string value of the execution with the alias of its rule. Empty when there is none. */
	getRuntimeCredentialValues(
		runExecutionData: IRunExecutionData,
	): Promise<Array<{ alias: string; value: string }>>;

	/** The alias of the rule behind a stub credential, or `undefined` when the rule is gone. */
	getRuleAliasForStub(credentialId: string): string | undefined;

	/** True when the rule behind a stub credential applies to the trigger node type. */
	hasCredentialRuleForTrigger(credentialId: string, triggerNodeType: string): boolean;

	/** Hosts that the rule behind a stub credential allows. `undefined` means no restriction. */
	getAllowedDomainsForStub(credentialId: string): string | undefined;
}

@Service()
export class RuntimeCredentialProxyService implements RuntimeCredentialProvider {
	private provider: RuntimeCredentialProvider | null = null;

	registerProvider(provider: RuntimeCredentialProvider): void {
		this.provider = provider;
	}

	async getRuntimeCredential(
		runExecutionData: IRunExecutionData,
		alias: string,
	): Promise<IDataObject[string] | undefined> {
		if (this.provider) {
			return await this.provider.getRuntimeCredential(runExecutionData, alias);
		}
		return undefined;
	}

	async getRuntimeCredentialData(
		executionContext: IExecutionContext | undefined,
		credentialId: string,
		credentialType: string,
	): Promise<ICredentialDataDecryptedObject> {
		if (!this.provider) {
			throw new Error('Run-time credentials are not enabled on this instance');
		}
		return await this.provider.getRuntimeCredentialData(
			executionContext,
			credentialId,
			credentialType,
		);
	}

	async getRuntimeCredentialValues(
		runExecutionData: IRunExecutionData,
	): Promise<Array<{ alias: string; value: string }>> {
		return (await this.provider?.getRuntimeCredentialValues(runExecutionData)) ?? [];
	}

	getRuleAliasForStub(credentialId: string): string | undefined {
		return this.provider?.getRuleAliasForStub(credentialId);
	}

	hasCredentialRuleForTrigger(credentialId: string, triggerNodeType: string): boolean {
		return this.provider?.hasCredentialRuleForTrigger(credentialId, triggerNodeType) ?? false;
	}

	getAllowedDomainsForStub(credentialId: string): string | undefined {
		return this.provider?.getAllowedDomainsForStub(credentialId);
	}
}
