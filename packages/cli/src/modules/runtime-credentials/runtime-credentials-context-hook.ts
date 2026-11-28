import {
	ContextEstablishmentHook,
	ContextEstablishmentOptions,
	ContextEstablishmentResult,
	HookDescription,
	IContextEstablishmentHook,
} from '@n8n/decorators';

import { RuntimeCredentialsService, stripMarker } from './runtime-credentials.service';

const MARKER_PREFIX = stripMarker('').slice(0, -1);

const isMarker = (value: unknown) => typeof value === 'string' && value.startsWith(MARKER_PREFIX);

/**
 * Phase 1: copies the matched request values into the encrypted execution context.
 *
 * It works on a copy and leaves the trigger items as they are. Hooks that the trigger node
 * configures (for example the bearer token extractor) run next and still read the real
 * values. `RuntimeCredentialsFinalizeHook` clears the values after they ran.
 */
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
		const copy = (options.triggerItems ?? []).map((item) => ({
			...item,
			json: structuredClone(item.json),
		}));
		const { artifactsByAlias } = this.runtimeCredentialsService.strip(
			copy,
			options.triggerNode.type,
		);

		// A partial run can start from a node whose input the finalize hook already cleared.
		// The marker is not a request value, so it must not become an artifact.
		const artifacts: typeof artifactsByAlias = {};
		for (const [alias, values] of Object.entries(artifactsByAlias)) {
			const kept = Array.isArray(values) ? values.filter((value) => !isMarker(value)) : values;
			if (Array.isArray(kept) && kept.length === 0) continue;
			artifacts[alias] = kept;
		}

		if (Object.keys(artifacts).length === 0) return {};

		return {
			contextUpdate: {
				secureArtifacts: {
					version: 1,
					artifacts,
				},
			},
		};
	}
}

/**
 * Phase 3: clears the matched request values from the trigger items, and leaves the marker.
 *
 * It runs after the hooks that the trigger node configures, because those hooks read the same
 * values first. It overwrites whatever they left in place, for example a masked header.
 */
@ContextEstablishmentHook({
	alwaysExecute: false,
	runAfterNodeHooks: true,
})
export class RuntimeCredentialsFinalizeHook implements IContextEstablishmentHook {
	constructor(private readonly runtimeCredentialsService: RuntimeCredentialsService) {}

	hookDescription: HookDescription = {
		name: 'RuntimeCredentialsFinalizeHook',
	};

	isApplicableToTriggerNode(_nodeType: string): boolean {
		// This hook is never visible in the UI.
		return false;
	}

	async execute(options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
		const { triggerItems } = this.runtimeCredentialsService.strip(
			options.triggerItems ?? [],
			options.triggerNode.type,
		);

		return { triggerItems };
	}
}
