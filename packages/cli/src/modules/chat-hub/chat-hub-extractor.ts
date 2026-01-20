import { Logger } from '@n8n/backend-common';
import {
	ContextEstablishmentHook,
	ContextEstablishmentOptions,
	ContextEstablishmentResult,
	HookDescription,
	IContextEstablishmentHook,
} from '@n8n/decorators';
import { Cipher } from 'n8n-core';
import { ensureError, jsonParse } from 'n8n-workflow';
import { z } from 'zod';

const EncryptedMetadataSchema = z.object({
	encryptedMetadata: z.string(),
});

const ChatHubAuthenticationMetadataSchema = z.object({
	authToken: z.string(),
	browserId: z.string().optional(),
});

export type ChatHubAuthenticationMetadata = z.output<typeof ChatHubAuthenticationMetadataSchema>;
export const CHATHUB_EXTRACTOR_NAME = 'ChatHubExtractor';

@ContextEstablishmentHook()
export class ChatHubExtractor implements IContextEstablishmentHook {
	constructor(
		private readonly logger: Logger,
		private readonly cipher: Cipher,
	) {}

	hookDescription: HookDescription = {
		name: CHATHUB_EXTRACTOR_NAME,
		displayName: 'Chat Hub Extractor',
		options: [],
	};

	isApplicableToTriggerNode(_nodeType: string): boolean {
		// This extractor is not showing up in any UI for selection, it can only be used
		// when referenced directly
		return false;
	}

	async execute(options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
		if (!options.triggerItems || options.triggerItems.length === 0) {
			this.logger.debug('No trigger items found, skipping ChatHubExtractor hook.');
			return {};
		}
		const [triggerItem] = options.triggerItems;

		const encryptedMetadataResult = EncryptedMetadataSchema.safeParse(triggerItem);

		// Always delete encryptedMetadata from the item
		delete triggerItem.encryptedMetadata;

		if (encryptedMetadataResult.success) {
			try {
				const decrypted = this.cipher.decrypt(encryptedMetadataResult.data.encryptedMetadata);
				const parsed = jsonParse(decrypted);
				const chatHubInformation = ChatHubAuthenticationMetadataSchema.safeParse(parsed);
				if (chatHubInformation.success) {
					return {
						triggerItems: options.triggerItems,
						contextUpdate: {
							credentials: {
								version: 1,
								identity: chatHubInformation.data.authToken,
								metadata: {
									source: 'chat-hub-injected',
									browserId: chatHubInformation.data.browserId ?? null,
								},
							},
						},
					};
				} else {
					this.logger.warn('Invalid format for encryptedMetadata in chathub extractor');
				}
			} catch (error) {
				this.logger.error('Failed to decrypt/parse encrypted chat metadata', {
					error: ensureError(error),
				});
			}
		}
		return {};
	}
}
