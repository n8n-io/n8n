import { Logger } from '@n8n/backend-common';
import {
	ContextEstablishmentHook,
	ContextEstablishmentOptions,
	ContextEstablishmentResult,
	HookDescription,
	IContextEstablishmentHook,
} from '@n8n/decorators';

@ContextEstablishmentHook()
export class ChatHubExtractor implements IContextEstablishmentHook {
	constructor(private readonly logger: Logger) {}

	hookDescription: HookDescription = {
		name: 'ChatHubExtractor',
		displayName: 'Chat Hub Extractor',
		options: [],
	};

	isApplicableToTriggerNode(_nodeType: string): boolean {
		return false;
	}

	async execute(options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
		if (!options.triggerItems || options.triggerItems.length === 0) {
			this.logger.debug('No trigger items found, skipping ChatHubExtractor hook.');
			return {};
		}
		const [triggerItem] = options.triggerItems;
		const cookie = triggerItem.json['cookie'];
		if (cookie && typeof cookie === 'string') {
			delete triggerItem.json.cookie;

			return {
				triggerItems: options.triggerItems,
				contextUpdate: {
					credentials: {
						version: 1,
						identity: cookie,
						metadata: { source: 'chat-hub-injected' },
					},
				},
			};
		}
		return {};
	}
}
