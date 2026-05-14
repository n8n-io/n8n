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
		const { triggerItems, artifactsByItem } = this.inboundSecretsService.strip(
			options.triggerItems ?? [],
			options.triggerNode.type,
			this.resolveDescriptionPaths(options),
		);

		if (!artifactsByItem.some((m) => Object.keys(m).length > 0)) return { triggerItems };

		return {
			triggerItems,
			contextUpdate: {
				secureArtifacts: {
					version: 1,
					artifacts: { [options.triggerNode.name]: artifactsByItem },
				},
			},
		};
	}

	// Fail open on unknown node type so admin rules still apply.
	private resolveDescriptionPaths(options: ContextEstablishmentOptions): string[] {
		try {
			return (
				options.workflow.nodeTypes.getByNameAndVersion(
					options.triggerNode.type,
					options.triggerNode.typeVersion,
				).description.sensitiveOutputFields ?? []
			);
		} catch {
			return [];
		}
	}
}
