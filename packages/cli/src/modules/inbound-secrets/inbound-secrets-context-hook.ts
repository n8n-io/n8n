import {
	ContextEstablishmentHook,
	ContextEstablishmentOptions,
	ContextEstablishmentResult,
	HookDescription,
	IContextEstablishmentHook,
} from '@n8n/decorators';

import { InboundSecretsService } from './inbound-secrets.service';

@ContextEstablishmentHook({
	isGlobal: true,
})
export class InboundSecretContextHook implements IContextEstablishmentHook {
	constructor(private readonly inboundSecretsService: InboundSecretsService) {}

	hookDescription: HookDescription = {
		name: 'InboundSecretContextHook',
	};

	isApplicableToTriggerNode(_nodeType: string): boolean {
		// This hook is never visible in the UI.
		return false;
	}

	async execute(options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
		const items = options.triggerItems ?? [];
		const clearedItems = this.inboundSecretsService.strip(items, options.triggerNode.type);
		return {
			triggerItems: clearedItems,
		};
	}
}
