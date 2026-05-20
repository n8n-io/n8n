import {
	ContextEstablishmentHook,
	ContextEstablishmentOptions,
	ContextEstablishmentResult,
	HookDescription,
	IContextEstablishmentHook,
} from '@n8n/decorators';

import { InboundSecretsService } from './inbound-secrets.service';

@ContextEstablishmentHook({
	alwaysExecute: true,
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
		const { triggerItems, artifactsByAlias } = this.inboundSecretsService.strip(
			options.triggerItems ?? [],
			options.triggerNode.type,
		);

		if (Object.keys(artifactsByAlias).length === 0) return { triggerItems };

		return {
			triggerItems,
			contextUpdate: {
				secureArtifacts: {
					version: 1,
					artifacts: artifactsByAlias,
				},
			},
		};
	}
}
