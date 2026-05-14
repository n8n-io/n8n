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
		const descriptionPaths = this.resolveDescriptionPaths(options);

		const { triggerItems, artifactsByItem } = this.inboundSecretsService.strip(
			items,
			options.triggerNode.type,
			descriptionPaths,
		);

		const hasArtifacts = artifactsByItem.some((m) => Object.keys(m).length > 0);
		if (!hasArtifacts) {
			return { triggerItems };
		}

		return {
			triggerItems,
			contextUpdate: {
				secureArtifacts: {
					version: 1,
					artifacts: {
						[options.triggerNode.name]: artifactsByItem,
					},
				},
			},
		};
	}

	private resolveDescriptionPaths(options: ContextEstablishmentOptions): string[] {
		// Fail open on unknown node type so admin rules still apply.
		try {
			const description = options.workflow.nodeTypes.getByNameAndVersion(
				options.triggerNode.type,
				options.triggerNode.typeVersion,
			).description;
			return description.sensitiveOutputFields ?? [];
		} catch {
			return [];
		}
	}
}
