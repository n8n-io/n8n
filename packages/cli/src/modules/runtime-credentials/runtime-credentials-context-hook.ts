import {
	ContextEstablishmentHook,
	ContextEstablishmentOptions,
	ContextEstablishmentResult,
	HookDescription,
	IContextEstablishmentHook,
} from '@n8n/decorators';

import { RuntimeCredentialsService } from './runtime-credentials.service';

@ContextEstablishmentHook({
	alwaysExecute: true,
})
export class RuntimeCredentialsContextHook implements IContextEstablishmentHook {
	constructor(private readonly runtimeCredentialsService: RuntimeCredentialsService) {}

	hookDescription: HookDescription = {
		name: 'RuntimeCredentialsContextHook',
	};

	isApplicableToTriggerNode(_nodeType: string): boolean {
		// This hook is never visible in the UI.
		return false;
	}

	async execute(options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
		const { triggerItems, artifactsByAlias } = this.runtimeCredentialsService.strip(
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
