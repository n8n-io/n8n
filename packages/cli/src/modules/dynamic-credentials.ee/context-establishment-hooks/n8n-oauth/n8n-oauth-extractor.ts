import { Logger } from '@n8n/backend-common';
import {
	ContextEstablishmentHook,
	ContextEstablishmentOptions,
	ContextEstablishmentResult,
	HookDescription,
	IContextEstablishmentHook,
} from '@n8n/decorators';
import { Cipher } from 'n8n-core';
import { EncryptedMetadataSchema, N8NOAuth2ExtractorMetadataSchema } from './metadata';
import { ensureError, jsonParse } from 'n8n-workflow';

export const N8N_OAUTH_EXTRACTOR_NAME = 'N8nOAuthExtractor';

@ContextEstablishmentHook()
export class N8NOAuth2Extractor implements IContextEstablishmentHook {
	constructor(
		private readonly logger: Logger,
		private readonly cipher: Cipher,
	) {
		this.logger = this.logger.scoped('dynamic-credentials');
	}

	hookDescription: HookDescription = {
		name: N8N_OAUTH_EXTRACTOR_NAME,
		displayName: 'N8N OAuth2 Extractor',
		options: [],
	};

	isApplicableToTriggerNode(_nodeType: string): boolean {
		// This extractor is not showing up in any UI for selection, it can only be used
		// when referenced directly
		return false;
	}

	async execute(options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
		if (!options.triggerItems || options.triggerItems.length === 0) {
			this.logger.debug('No trigger items found, skipping n8n OAuth extractor hook.');
			throw new Error('No trigger items found, skipping n8n OAuth extractor hook.');
		}
		const [triggerItem] = options.triggerItems;

		const encryptedMetadataResult = EncryptedMetadataSchema.safeParse(triggerItem);

		// Always delete encryptedMetadata from the item
		delete triggerItem.encryptedMetadata;

		if (encryptedMetadataResult.success) {
			try {
				const decrypted = await this.cipher.decryptV2(
					encryptedMetadataResult.data.encryptedMetadata,
				);
				const parsed = jsonParse(decrypted);
				const n8nOAuthInformation = N8NOAuth2ExtractorMetadataSchema.safeParse(parsed);
				if (n8nOAuthInformation.success) {
					return {
						triggerItems: options.triggerItems,
						contextUpdate: {
							credentials: {
								version: 1,
								identity: n8nOAuthInformation.data.authToken,
								metadata: {
									source: 'n8n-oauth',
									resource: n8nOAuthInformation.data.resource,
								},
							},
						},
					};
				} else {
					this.logger.warn('Invalid format for encryptedMetadata in n8n OAuth extractor', {
						errors: n8nOAuthInformation.error.errors,
					});
				}
			} catch (error) {
				this.logger.error('Failed to decrypt/parse encrypted n8n OAuth metadata', {
					error: ensureError(error),
				});
			}
		} else {
			this.logger.warn('No encryptedMetadata found in trigger item for n8n OAuth extractor.');
		}
		throw new Error('No valid n8n OAuth authentication metadata could be extracted.');
	}
}
