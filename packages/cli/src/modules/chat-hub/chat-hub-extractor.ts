import { Logger } from '@n8n/backend-common';
import {
	ContextEstablishmentHook,
	ContextEstablishmentOptions,
	ContextEstablishmentResult,
	HookDescription,
	IContextEstablishmentHook,
} from '@n8n/decorators';
import { z } from 'zod';

const ChatHubTriggerItemSchema = z.object({
	authToken: z.string(),
	browserId: z.string().optional(),
});

export type ChatHubTriggerItem = z.output<typeof ChatHubTriggerItemSchema>;

@ContextEstablishmentHook()
export class ChatHubExtractor implements IContextEstablishmentHook {
	constructor(private readonly logger: Logger) {}

	hookDescription: HookDescription = {
		name: 'ChatHubExtractor',
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

		const chatHubInformation = ChatHubTriggerItemSchema.safeParse(triggerItem.json);

		// Always delete the authToken and browserId from the item
		delete triggerItem.json.authToken;
		delete triggerItem.json.browserId;

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
		}
		return {};
	}
}
