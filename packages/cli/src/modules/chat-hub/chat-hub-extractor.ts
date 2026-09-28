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
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { type ICredentialContext, jsonParse } from 'n8n-workflow';
import { z } from 'zod';

import { AuthService } from '@/auth/auth.service';
import { ExecutingUserIdentifierProxy } from '@/credentials/executing-user-identifier-proxy';

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
		private readonly executingUserIdentifierProxy: ExecutingUserIdentifierProxy,
	) {
		this.logger = this.logger.scoped('chat-hub');
	}

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
				const decrypted = await this.cipher.decryptV2(
					encryptedMetadataResult.data.encryptedMetadata,
				);
				const parsed = jsonParse(decrypted);
				const chatHubInformation = ChatHubAuthenticationMetadataSchema.safeParse(parsed);
				if (chatHubInformation.success) {
					const credentials: ICredentialContext = {
						version: 1,
						identity: chatHubInformation.data.authToken,
						metadata: {
							source: 'chat-hub-injected',
							browserId: chatHubInformation.data.browserId,
							method: chatHubInformation.data.method,
							endpoint: chatHubInformation.data.endpoint,
						},
					};

					const contextUpdate: ContextEstablishmentResult['contextUpdate'] = { credentials };

					// The private-credential flag is set by the global
					// DynamicCredentialsContextHook, which runs before node extractors like
					// this one. The chat-hub identity is only available here, so attribute
					// the run's owner now — a run that fails before the credential resolves
					// still grants the initiating user access to their own data.
					if (options.context?.usesDynamicCredentials) {
						const executedByUserId = await this.executingUserIdentifierProxy.identify(credentials);
						if (executedByUserId) contextUpdate.executedByUserId = executedByUserId;
					}

					return {
						triggerItems: options.triggerItems,
						contextUpdate,
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
