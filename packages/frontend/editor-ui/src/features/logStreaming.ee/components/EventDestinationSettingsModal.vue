<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from 'vue';
import get from 'lodash/get';
import set from 'lodash/set';
import unset from 'lodash/unset';

import type {
	NodeParameterValue,
	MessageEventBusDestinationOptions,
	INodeParameters,
	NodeParameterValueType,
	MessageEventBusDestinationSentryOptions,
	MessageEventBusDestinationSyslogOptions,
	MessageEventBusDestinationWebhookOptions,
} from 'n8n-workflow';
import {
	deepCopy,
	messageEventBusDestinationTypeNames,
	defaultMessageEventBusDestinationOptions,
	defaultMessageEventBusDestinationWebhookOptions,
	MessageEventBusDestinationTypeNames,
	defaultMessageEventBusDestinationSyslogOptions,
	defaultMessageEventBusDestinationSentryOptions,
} from 'n8n-workflow';
import type { EventBus } from '@n8n/utils/event-bus';
import { createEventBus } from '@n8n/utils/event-bus';

import { useLogStreamingStore } from '../logStreaming.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import ParameterInputList from '@/components/ParameterInputList.vue';
import type { IMenuItem, IUpdateInformation, ModalKey } from '@/Interface';
import { LOG_STREAM_MODAL_KEY, MODAL_CONFIRM } from '@/constants';
import Modal from '@/components/Modal.vue';
import { useI18n } from '@n8n/i18n';
import { useMessage } from '@/composables/useMessage';
import { useUIStore } from '@/stores/ui.store';
import { hasPermission } from '@/utils/rbac/permissions';
import { destinationToFakeINodeUi } from '../logStreaming.utils';
import type { BaseTextKey } from '@n8n/i18n';
import SaveButton from '@/components/SaveButton.vue';
import EventSelection from './EventSelection.vue';
import { useTelemetry } from '@/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';

import {
	webhookModalDescription,
	sentryModalDescription,
	syslogModalDescription,
} from '../logStreaming.constants';
import { useElementSize } from '@vueuse/core';

import {
	N8nButton,
	N8nIconButton,
	N8nInlineTextEdit,
	N8nInputLabel,
	N8nMenuItem,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import {
	injectWorkflowState,
	type WorkflowStateBusEvents,
	workflowStateEventBus,
} from '@/composables/useWorkflowState';

defineOptions({ name: 'EventDestinationSettingsModal' });

const props = withDefaults(
	defineProps<{
		modalName: ModalKey;
		destination?: MessageEventBusDestinationOptions;
		isNew?: boolean;
		eventBus?: EventBus;
	}>(),
	{
		destination: () => deepCopy(defaultMessageEventBusDestinationOptions),
		isNew: false,
	},
);
const { modalName, destination, isNew, eventBus } = props;

const i18n = useI18n();
const { confirm } = useMessage();
const telemetry = useTelemetry();
const logStreamingStore = useLogStreamingStore();
const ndvStore = useNDVStore();
const workflowsStore = useWorkflowsStore();
const workflowState = injectWorkflowState();
const uiStore = useUIStore();

const unchanged = ref(!isNew);
const activeTab = ref('settings');
const hasOnceBeenSaved = ref(!isNew);
const isSaving = ref(false);
const isDeleting = ref(false);
const loading = ref(false);
const typeSelectValue = ref('');
const typeSelectPlaceholder = ref('Destination Type');
const nodeParameters = ref(deepCopy(defaultMessageEventBusDestinationOptions) as INodeParameters);
const webhookDescription = ref(webhookModalDescription);
const sentryDescription = ref(sentryModalDescription);
const syslogDescription = ref(syslogModalDescription);
const modalBus = ref(createEventBus());
const headerLabel = ref(destination.label!);
const testMessageSent = ref(false);
const testMessageResult = ref(false);

const typeSelectOptions = computed(() => {
	const options: Array<{ value: string; label: BaseTextKey }> = [];
	for (const t of messageEventBusDestinationTypeNames) {
		if (t === MessageEventBusDestinationTypeNames.abstract) {
			continue;
		}
		options.push({
			value: t,
			label: `settings.log-streaming.${t}` as BaseTextKey,
		});
	}
	return options;
});

const isTypeAbstract = computed(
	() => nodeParameters.value.__type === MessageEventBusDestinationTypeNames.abstract,
);

const isTypeWebhook = computed(
	() => nodeParameters.value.__type === MessageEventBusDestinationTypeNames.webhook,
);

const isTypeSyslog = computed(
	() => nodeParameters.value.__type === MessageEventBusDestinationTypeNames.syslog,
);

const isTypeSentry = computed(
	() => nodeParameters.value.__type === MessageEventBusDestinationTypeNames.sentry,
);

const node = computed(() => destinationToFakeINodeUi(nodeParameters.value));

const typeLabelName = computed(
	() => `settings.log-streaming.${nodeParameters.value.__type}` as BaseTextKey,
);

const sidebarItems = computed(() => {
	const items: IMenuItem[] = [
		{
			id: 'settings',
			label: i18n.baseText('settings.log-streaming.tab.settings'),
			position: 'top',
		},
	];
	if (!isTypeAbstract.value) {
		items.push({
			id: 'events',
			label: i18n.baseText('settings.log-streaming.tab.events'),
			position: 'top',
		});
	}
	return items;
});

const canManageLogStreaming = computed(() =>
	hasPermission(['rbac'], { rbac: { scope: 'logStreaming:manage' } }),
);

function onUpdateNodeProperties(event: WorkflowStateBusEvents['updateNodeProperties']) {
	const updateInformation = event[1];
	if (updateInformation.name === destination.id) {
		if ('credentials' in updateInformation.properties) {
			unchanged.value = false;
			nodeParameters.value.credentials = updateInformation.properties
				.credentials as NodeParameterValueType;
		}
	}
}

onMounted(() => {
	setupNode(Object.assign(deepCopy(defaultMessageEventBusDestinationOptions), destination));
	workflowStateEventBus.on('updateNodeProperties', onUpdateNodeProperties);
});

onUnmounted(() => workflowStateEventBus.off('updateNodeProperties', onUpdateNodeProperties));

function onInput() {
	unchanged.value = false;
	testMessageSent.value = false;
}

function onTabSelect(tab: string) {
	activeTab.value = tab;
}

function onLabelChange(value: string) {
	onInput();
	headerLabel.value = value;
	nodeParameters.value.label = value;
}

function setupNode(options: MessageEventBusDestinationOptions) {
	workflowsStore.removeNode(node.value);
	ndvStore.setActiveNodeName(options.id ?? 'thisshouldnothappen', 'other');
	workflowsStore.addNode(destinationToFakeINodeUi(options));
	nodeParameters.value = options as INodeParameters;
	logStreamingStore.items[destination.id!].destination = options;
}

function onTypeSelectInput(destinationType: MessageEventBusDestinationTypeNames) {
	typeSelectValue.value = destinationType;
}

async function onContinueAddClicked() {
	let newDestination;
	switch (typeSelectValue.value) {
		case MessageEventBusDestinationTypeNames.syslog:
			newDestination = Object.assign(deepCopy(defaultMessageEventBusDestinationSyslogOptions), {
				id: destination.id,
			});
			break;
		case MessageEventBusDestinationTypeNames.sentry:
			newDestination = Object.assign(deepCopy(defaultMessageEventBusDestinationSentryOptions), {
				id: destination.id,
			});
			break;
		case MessageEventBusDestinationTypeNames.webhook:
			newDestination = Object.assign(deepCopy(defaultMessageEventBusDestinationWebhookOptions), {
				id: destination.id,
			});
			break;
	}

	if (newDestination) {
		headerLabel.value = newDestination?.label ?? headerLabel.value;
		setupNode(newDestination);
	}
}

function valueChanged(parameterData: IUpdateInformation) {
	unchanged.value = false;
	testMessageSent.value = false;
	const newValue: NodeParameterValue = parameterData.value as string | number;
	const parameterPath = parameterData.name?.startsWith('parameters.')
		? parameterData.name.split('.').slice(1).join('.')
		: parameterData.name || '';

	const nodeParametersCopy = deepCopy(nodeParameters.value);

	if (parameterData.value === undefined && parameterPath.match(/(.*)\[(\d+)\]$/)) {
		const path = parameterPath.match(
			/(.*)\[(\d+)\]$/,
		)?.[1] as keyof MessageEventBusDestinationOptions;
		const index = parseInt(parameterPath.match(/(.*)\[(\d+)\]$/)?.[2] ?? '0', 10);
		const data = get(nodeParametersCopy, path);

		if (Array.isArray(data)) {
			data.splice(index, 1);
			nodeParametersCopy[path] = data as never;
		}
	} else {
		if (newValue === undefined) {
			unset(nodeParametersCopy, parameterPath);
		} else {
			set(nodeParametersCopy, parameterPath, newValue);
		}
	}

	nodeParameters.value = deepCopy(nodeParametersCopy);
	workflowState.updateNodeProperties({
		name: node.value.name,
		properties: { parameters: nodeParameters.value, position: [0, 0] },
	});
	if (hasOnceBeenSaved.value) {
		logStreamingStore.updateDestination(nodeParameters.value);
	}
}

async function sendTestEvent() {
	testMessageResult.value = await logStreamingStore.sendTestMessage(nodeParameters.value);
	testMessageSent.value = true;
}

async function removeThis() {
	const deleteConfirmed = await confirm(
		i18n.baseText('settings.log-streaming.destinationDelete.message', {
			interpolate: { destinationName: destination.label! },
		}),
		i18n.baseText('settings.log-streaming.destinationDelete.headline'),
		{
			type: 'warning',
			confirmButtonText: i18n.baseText(
				'settings.log-streaming.destinationDelete.confirmButtonText',
			),
			cancelButtonText: i18n.baseText('settings.log-streaming.destinationDelete.cancelButtonText'),
		},
	);

	if (deleteConfirmed !== MODAL_CONFIRM) {
		return;
	} else {
		callEventBus('remove', destination.id);
		uiStore.closeModal(LOG_STREAM_MODAL_KEY);
		uiStore.stateIsDirty = false;
	}
}

function onModalClose() {
	if (!hasOnceBeenSaved.value) {
		workflowsStore.removeNode(node.value);
		if (nodeParameters.value.id && typeof nodeParameters.value.id !== 'object') {
			logStreamingStore.removeDestination(nodeParameters.value.id.toString());
		}
	}
	ndvStore.unsetActiveNodeName();
	callEventBus('closing', destination.id);
	uiStore.stateIsDirty = false;
}

async function saveDestination() {
	if (unchanged.value || !destination.id) {
		return;
	}
	const saveResult = await logStreamingStore.saveDestination(nodeParameters.value);
	if (saveResult) {
		hasOnceBeenSaved.value = true;
		testMessageSent.value = false;
		unchanged.value = true;
		callEventBus('destinationWasSaved', destination.id);
		uiStore.stateIsDirty = false;

		const destinationType = (
			nodeParameters.value.__type && typeof nodeParameters.value.__type !== 'object'
				? `${nodeParameters.value.__type}`
				: 'unknown'
		)
			.replace('$MessageEventBusDestination', '')
			.toLowerCase();

		const isComplete = () => {
			if (isTypeWebhook.value) {
				const webhookDestination = destination as MessageEventBusDestinationWebhookOptions;
				return webhookDestination.url !== '';
			} else if (isTypeSentry.value) {
				const sentryDestination = destination as MessageEventBusDestinationSentryOptions;
				return sentryDestination.dsn !== '';
			} else if (isTypeSyslog.value) {
				const syslogDestination = destination as MessageEventBusDestinationSyslogOptions;
				return (
					syslogDestination.host !== '' &&
					syslogDestination.port !== undefined &&
					// @ts-expect-error TODO: fix this typing
					syslogDestination.protocol !== '' &&
					syslogDestination.facility !== undefined &&
					syslogDestination.app_name !== ''
				);
			}
			return false;
		};

		telemetry.track('User updated log streaming destination', {
			instance_id: useRootStore().instanceId,
			destination_type: destinationType,
			is_complete: isComplete(),
			is_active: destination.enabled,
		});
	}
}

function callEventBus(event: string, data: unknown) {
	if (eventBus) {
		eventBus.emit(event, data);
	}
}

const defNameRef = useTemplateRef('defNameRef');
const { width } = useElementSize(defNameRef);
</script>

<template>
	<Modal
		:name="modalName"
		:event-bus="modalBus"
		:before-close="onModalClose"
		:scrollable="true"
		:center="true"
		:loading="loading"
		:min-width="isTypeAbstract ? '460px' : '70%'"
		:max-width="isTypeAbstract ? '460px' : '70%'"
		:min-height="isTypeAbstract ? '160px' : '650px'"
		:max-height="isTypeAbstract ? '300px' : '650px'"
		data-test-id="destination-modal"
	>
		<template #header>
			<template v-if="isTypeAbstract">
				<div :class="$style.headerCreate">
					<span>Add new destination</span>
				</div>
			</template>
			<template v-else>
				<div :class="$style.header">
					<div ref="defNameRef" :class="$style.destinationInfo">
						<N8nInlineTextEdit
							:max-width="width - 10"
							data-test-id="subtitle-showing-type"
							:model-value="headerLabel"
							:readonly="isTypeAbstract"
							@update:model-value="onLabelChange"
						/>
						<N8nText size="small" tag="p" color="text-light">{{
							!isTypeAbstract ? i18n.baseText(typeLabelName) : 'Select type'
						}}</N8nText>
					</div>
					<div :class="$style.destinationActions">
						<N8nButton
							v-if="nodeParameters && hasOnceBeenSaved && unchanged"
							:icon="testMessageSent ? (testMessageResult ? 'check' : 'triangle-alert') : undefined"
							:title="
								testMessageSent && testMessageResult
									? 'Event sent and returned OK'
									: 'Event returned with error'
							"
							type="tertiary"
							label="Send Test-Event"
							:disabled="!hasOnceBeenSaved || !unchanged"
							data-test-id="destination-test-button"
							@click="sendTestEvent"
						/>
						<template v-if="canManageLogStreaming">
							<N8nIconButton
								v-if="nodeParameters && hasOnceBeenSaved"
								:title="i18n.baseText('settings.log-streaming.delete')"
								icon="trash-2"
								type="tertiary"
								:disabled="isSaving"
								:loading="isDeleting"
								data-test-id="destination-delete-button"
								@click="removeThis"
							/>
							<SaveButton
								:saved="unchanged && hasOnceBeenSaved"
								:disabled="isTypeAbstract || unchanged"
								:saving-label="i18n.baseText('settings.log-streaming.saving')"
								data-test-id="destination-save-button"
								@click="saveDestination"
							/>
						</template>
					</div>
				</div>
				<hr />
			</template>
		</template>
		<template #content>
			<div :class="$style.container">
				<template v-if="isTypeAbstract">
					<N8nInputLabel
						:class="$style.typeSelector"
						:label="i18n.baseText('settings.log-streaming.selecttype')"
						:tooltip-text="i18n.baseText('settings.log-streaming.selecttypehint')"
						:bold="false"
						size="medium"
						:underline="false"
					>
						<N8nSelect
							ref="typeSelectRef"
							:model-value="typeSelectValue"
							:placeholder="typeSelectPlaceholder"
							data-test-id="select-destination-type"
							name="name"
							@update:model-value="onTypeSelectInput"
						>
							<N8nOption
								v-for="option in typeSelectOptions || []"
								:key="option.value"
								:value="option.value"
								:label="i18n.baseText(option.label)"
							/>
						</N8nSelect>
						<div class="mt-m text-right">
							<N8nButton
								size="large"
								data-test-id="select-destination-button"
								:disabled="!typeSelectValue"
								@click="onContinueAddClicked"
							>
								{{ i18n.baseText(`settings.log-streaming.continue`) }}
							</N8nButton>
						</div>
					</N8nInputLabel>
				</template>
				<template v-else>
					<div :class="$style.sidebar">
						<N8nMenuItem
							v-for="item in sidebarItems"
							:key="item.id"
							:item="item"
							:active="activeTab === item.id"
							@click="() => onTabSelect(item.id)"
						/>
					</div>
					<div v-if="activeTab === 'settings'" ref="content" :class="$style.mainContent">
						<template v-if="isTypeWebhook">
							<ParameterInputList
								:parameters="webhookDescription"
								:hide-delete="true"
								:node-values="nodeParameters"
								:is-read-only="!canManageLogStreaming"
								path=""
								@value-changed="valueChanged"
							/>
						</template>
						<template v-else-if="isTypeSyslog">
							<ParameterInputList
								:parameters="syslogDescription"
								:hide-delete="true"
								:node-values="nodeParameters"
								:is-read-only="!canManageLogStreaming"
								path=""
								@value-changed="valueChanged"
							/>
						</template>
						<template v-else-if="isTypeSentry">
							<ParameterInputList
								:parameters="sentryDescription"
								:hide-delete="true"
								:node-values="nodeParameters"
								:is-read-only="!canManageLogStreaming"
								path=""
								@value-changed="valueChanged"
							/>
						</template>
					</div>
					<div v-if="activeTab === 'events'" :class="$style.mainContent">
						<div class="">
							<N8nInputLabel
								class="mb-m mt-m"
								:label="i18n.baseText('settings.log-streaming.tab.events.title')"
								:bold="true"
								size="medium"
								:underline="false"
							/>
							<EventSelection
								:destination-id="destination.id"
								:readonly="!canManageLogStreaming"
								@input="onInput"
								@change="valueChanged"
							/>
						</div>
					</div>
				</template>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.labelMargins {
	margin-bottom: 1em;
	margin-top: 1em;
}
.typeSelector {
	width: 100%;
	margin-bottom: 1em;
	margin-top: 1em;
}

.sidebarSwitches {
	margin-left: 1.5em;
	margin-bottom: 0.5em;
	span {
		color: var(--color--text--shade-1) !important;
	}
}

.tabbar {
	margin-bottom: 1em;
}

.mainContent {
	flex: 1;
	overflow: auto;
	padding-left: 1em;
	padding-right: 1em;
	padding-bottom: 2em;
}

.sidebar {
	padding-top: 1em;
	max-width: 170px;
	min-width: 170px;
	margin-right: var(--spacing--lg);
	flex-grow: 1;

	ul {
		padding: 0 !important;
	}
}

.cardTitle {
	font-size: 14px;
	font-weight: var(--font-weight--bold);
}

.header {
	display: flex;
	min-height: 61px;
}

.headerCreate {
	display: flex;
	font-size: 20px;
}

.container {
	display: flex;
	height: 100%;
}

.destinationInfo {
	flex-grow: 1;
	display: flex;
	width: 100%;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin-bottom: var(--spacing--lg);
}

.destinationActions {
	display: flex;
	flex-direction: row;
	align-items: center;
	margin-right: var(--spacing--xl);
	margin-bottom: var(--spacing--lg);

	> * {
		margin-left: var(--spacing--2xs);
	}
}
</style>
