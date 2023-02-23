import { ref, Ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { useUsersStore } from '@/stores/users';
import { useRootStore } from '@/stores/n8nRootStore';
import { useSettingsStore } from '@/stores/settings';
import { FeatureFlags, INodeTypeDescription, IRun } from 'n8n-workflow';
import { EXPERIMENTS_TO_TRACK } from '@/constants';
import { useTelemetryStore } from './telemetry';
import { runExternalHook } from '@/mixins/externalHooks';
import { useWebhooksStore } from '@/stores/webhooks';
import { INodeUi } from '@/Interface';
import { useWorkflowsStore } from '@/stores/workflows';
import { useNodeTypesStore } from '@/stores/nodeTypes';

export const usePostHogStore = defineStore('posthog', () => {
	const usersStore = useUsersStore();
	const settingsStore = useSettingsStore();
	const telemetryStore = useTelemetryStore();
	const rootStore = useRootStore();
	const nodeTypesStore = useNodeTypesStore();
	const webhookstore = useWebhooksStore();
	const workflowsStore = useWorkflowsStore();

	const featureFlags: Ref<FeatureFlags | null> = ref(null);
	const initialized: Ref<boolean> = ref(false);
	const trackedDemoExp: Ref<FeatureFlags> = ref({});

	const reset = () => {
		window.posthog?.reset?.();
		featureFlags.value = null;
		trackedDemoExp.value = {};
	};

	const getVariant = (experiment: keyof FeatureFlags): FeatureFlags[keyof FeatureFlags] => {
		return featureFlags.value?.[experiment];
	};

	const isVariantEnabled = (experiment: string, variant: string) => {
		return getVariant(experiment) === variant;
	};

	const identify = () => {
		const instanceId = rootStore.instanceId;
		const user = usersStore.currentUser;
		const traits: Record<string, string | number> = { instance_id: instanceId };

		if (user && typeof user.createdAt === 'string') {
			traits.created_at_timestamp = new Date(user.createdAt).getTime();
		}

		// For PostHog, main ID _cannot_ be `undefined` as done for RudderStack.
		const id = user ? `${instanceId}#${user.id}` : instanceId;
		window.posthog?.identify?.(id, traits);
	};

	const init = (evaluatedFeatureFlags?: FeatureFlags) => {
		if (!window.posthog) {
			return;
		}

		const config = settingsStore.settings.posthog;
		if (!config.enabled) {
			return;
		}

		const userId = usersStore.currentUserId;
		if (!userId) {
			return;
		}

		const instanceId = rootStore.instanceId;
		const distinctId = `${instanceId}#${userId}`;

		const options: Parameters<typeof window.posthog.init>[1] = {
			api_host: config.apiHost,
			autocapture: config.autocapture,
			disable_session_recording: config.disableSessionRecording,
			debug: config.debug,
		};

		if (evaluatedFeatureFlags) {
			featureFlags.value = evaluatedFeatureFlags;
			options.bootstrap = {
				distinctId,
				featureFlags: evaluatedFeatureFlags,
			};
		}

		window.posthog?.init(config.apiKey, options);

		identify();

		initialized.value = true;
	};

	const trackSuccessfulWorkflowExecution = (runData: IRun) => {
		// Prepare data for tracking events that need to be sent only ones
		const dataNodeTypes: Set<string> = new Set<string>();
		const multipleOutputNodes: Set<string> = new Set<string>();
		let hasManualTrigger = false;
		let hasScheduleTrigger = false;
		for (const nodeName of Object.keys(runData.data.resultData.runData)) {
			const nodeRunData = runData.data.resultData.runData[nodeName];
			const node = workflowsStore.getNodeByName(nodeName);
			const nodeTypeName = node ? node.type : 'unknown';
			if (nodeRunData[0].data && nodeRunData[0].data.main.some((out) => out && out?.length > 1)) {
				multipleOutputNodes.add(nodeTypeName);
			}
			if (node && !node.disabled) {
				const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
				if (isDataNodeType(nodeType)) {
					dataNodeTypes.add(nodeTypeName);
				}
				if (isManualTriggerNode(nodeType)) {
					hasManualTrigger = true;
				}
				if (isScheduleTriggerNode(nodeType)) {
					hasScheduleTrigger = true;
				}
			}
		}
		if (multipleOutputNodes.size > 0) {
			runExternalHook('nodeView.userExecutedMultiOutputNode', webhookstore, {
				nodeTypes: Array.from(multipleOutputNodes),
			});
		}
		if (dataNodeTypes.size > 0) {
			runExternalHook('nodeView.userExecutedDataNode', webhookstore, {
				nodeTypes: Array.from(dataNodeTypes),
			});
		}
		if (hasManualTrigger) {
			runExternalHook('nodeView.userExecutedTriggerNode', webhookstore, { type: 'manual' });
		}
		if (hasScheduleTrigger) {
			runExternalHook('nodeView.userExecutedTriggerNode', webhookstore, { type: 'manual' });
		}
	};

	const trackSuccessfulNodeExecution = (node: INodeUi) => {
		if (!node) {
			return;
		}
		const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
		trackNodeExecution(nodeType);
	};

	const trackNodeExecution = (nodeType: INodeTypeDescription | null) => {
		if (!nodeType) {
			return;
		}
		if (isDataNodeType(nodeType)) {
			runExternalHook('nodeView.userExecutedDataNode', webhookstore, {
				nodeTypes: [nodeType.name],
			});
		}
		if (isManualTriggerNode(nodeType)) {
			runExternalHook('nodeView.userExecutedTriggerNode', webhookstore, { type: 'manual' });
		}
		if (isScheduleTriggerNode(nodeType)) {
			runExternalHook('nodeView.userExecutedTriggerNode', webhookstore, { type: 'schedule' });
		}
	};

	const isManualTriggerNode = (nodeType: INodeTypeDescription | null) => {
		return nodeType && nodeType.name === 'n8n-nodes-base.manualTrigger';
	};

	const isScheduleTriggerNode = (nodeType: INodeTypeDescription | null) => {
		return nodeType && nodeType.name === 'n8n-nodes-base.scheduleTrigger';
	};

	const isDataNodeType = (nodeType: INodeTypeDescription | null) => {
		if (!nodeType) {
			return;
		}
		const includeCoreNodes = [
			'n8n-nodes-base.httpRequest',
			'n8n-nodes-base.code',
			'n8n-nodes-base.set',
			'n8n-nodes-base.webhook',
		];
		return !nodeTypesStore.isCoreNodeType(nodeType) || includeCoreNodes.includes(nodeType.name);
	};

	const trackExperiment = (name: string) => {
		const curr = featureFlags.value;
		const prev = trackedDemoExp.value;

		if (!curr || curr[name] === undefined) {
			return;
		}

		if (curr[name] === prev[name]) {
			return;
		}

		if (window.location.pathname.startsWith('/templates/')) {
			return;
		}

		const variant = curr[name];
		telemetryStore.track('User is part of experiment', {
			name,
			variant,
		});

		trackedDemoExp.value[name] = variant;
		runExternalHook('posthog.featureFlagsUpdated', webhookstore, {
			name,
			variant,
		});
	};

	watch(
		() => featureFlags.value,
		() => {
			setTimeout(() => {
				EXPERIMENTS_TO_TRACK.forEach(trackExperiment);
			}, 0);
		},
	);

	return {
		init,
		isVariantEnabled,
		getVariant,
		reset,
		trackSuccessfulWorkflowExecution,
		trackSuccessfulNodeExecution,
	};
});
