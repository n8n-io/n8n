import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';
import type { IConnections, INode, IWorkflowSettings } from 'n8n-workflow';
import { computed } from 'vue';

import { EngineV2Module } from '../engine-v2.module';
import { engineV2Check, type EngineCompatibilityReason } from '../engineV2Check';

/** Getters for the open workflow. The shell owns the document store, so it passes them in. */
export interface EngineV2CompatibilityWorkflowSource {
	nodes: () => INode[];
	connections: () => IConnections;
	/** The settings the gate reads on every call. A read-only view works. */
	settings: () => Pick<IWorkflowSettings, 'engineType'> | undefined;
	/** A copy of the settings for the check. Read only when the gate is open. */
	settingsSnapshot: () => IWorkflowSettings;
}

/**
 * The engine v2 compatibility of the open workflow. Everything reports "compatible" unless the
 * `engine-v2` module is active and the workflow runs on engine v2.
 */
export function useEngineV2Compatibility(workflow: EngineV2CompatibilityWorkflowSource) {
	const settingsStore = useSettingsStore();

	const isActive = computed(
		() =>
			settingsStore.isModuleActive(EngineV2Module.id) && workflow.settings()?.engineType === 'v2',
	);

	const reasons = computed((): EngineCompatibilityReason[] => {
		if (!isActive.value) return [];

		return engineV2Check.checkWorkflow({
			nodes: workflow.nodes(),
			connections: workflow.connections(),
			settings: workflow.settingsSnapshot(),
		}).reasons;
	});

	const blockingReasons = computed(() =>
		reasons.value.filter((reason) => reason.severity === 'blocking'),
	);

	/** Reads only the gate and the node-type answer, so a node creator row never runs the check. */
	function isNodeTypeIncompatible(nodeTypeName: string): boolean {
		// Not `isActive.value && …`: before the settings load, `isModuleActive` returns `undefined`.
		if (!isActive.value) return false;
		return !engineV2Check.isNodeTypeSupported(nodeTypeName);
	}

	return { reasons, blockingReasons, isNodeTypeIncompatible };
}

/** Why engine v2 blocks publishing. The publish tooltip and the publish toast use it. */
export function describeEngineV2Block(): string {
	return useI18n().baseText('engineV2Compatibility.publishBlocked');
}
