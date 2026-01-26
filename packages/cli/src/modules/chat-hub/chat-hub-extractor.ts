import { AuthService } from '@/auth/auth.service';
import { Logger } from '@n8n/backend-common';
import { AuthenticatedRequest } from '@n8n/db';
import {
	ContextEstablishmentHook,
	ContextEstablishmentOptions,
	ContextEstablishmentResult,
	HookDescription,
	IContextEstablishmentHook,
} from '@n8n/decorators';
import { Container } from '@n8n/di';
import { Cipher } from 'n8n-core';
import { ensureError, jsonParse } from 'n8n-workflow';
import { z } from 'zod';

const EncryptedMetadataSchema = z.object({
	encryptedMetadata: z.string(),
});

const ChatHubAuthenticationMetadataSchema = z.object({
	authToken: z.string(),
	browserId: z.string().optional(),
	method: z.string(),
	endpoint: z.string(),
});

export type ChatHubAuthenticationMetadata = z.output<typeof ChatHubAuthenticationMetadataSchema>;
export const CHATHUB_EXTRACTOR_NAME = 'ChatHubExtractor';

export function extractAuthenticationMetadata(
	req: AuthenticatedRequest,
): ChatHubAuthenticationMetadata {
	const authService = Container.get(AuthService);

	const authToken = authService.getCookieToken(req);
	if (!authToken) {
		throw new Error('No authentication token found');
	}

	return {
		authToken,
		browserId: authService.getBrowserId(req),
		method: authService.getMethod(req),
		endpoint: authService.getEndpoint(req),
	};
}

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
			throw new Error('No trigger items found, skipping ChatHubExtractor hook.');
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
									browserId: chatHubInformation.data.browserId,
									method: chatHubInformation.data.method,
									endpoint: chatHubInformation.data.endpoint,
								},
							},
						},
					};
				} else {
					this.logger.warn('Invalid format for encryptedMetadata in chathub extractor', {
						errors: chatHubInformation.error.errors,
					});
				}
			} catch (error) {
				this.logger.error('Failed to decrypt/parse encrypted chat metadata', {
					error: ensureError(error),
				});
			}
		} else {
			this.logger.warn('No encryptedMetadata found in trigger item for ChatHubExtractor.');
		}
		throw new Error('No valid Chat Hub authentication metadata could be extracted.');
	}
}
