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
					<div :class="$style.destinationInfo">
						<InlineNameEdit
							:model-value="headerLabel"
							:subtitle="!isTypeAbstract ? $locale.baseText(typeLabelName) : 'Select type'"
							:readonly="isTypeAbstract"
							type="Credential"
							data-test-id="subtitle-showing-type"
							@update:model-value="onLabelChange"
						/>
					</div>
					<div :class="$style.destinationActions">
						<n8n-button
							v-if="nodeParameters && hasOnceBeenSaved && unchanged"
							:icon="testMessageSent ? (testMessageResult ? 'check' : 'exclamation-triangle') : ''"
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
							<n8n-icon-button
								v-if="nodeParameters && hasOnceBeenSaved"
								:title="$locale.baseText('settings.log-streaming.delete')"
								icon="trash"
								type="tertiary"
								:disabled="isSaving"
								:loading="isDeleting"
								data-test-id="destination-delete-button"
								@click="removeThis"
							/>
							<SaveButton
								:saved="unchanged && hasOnceBeenSaved"
								:disabled="isTypeAbstract || unchanged"
								:saving-label="$locale.baseText('settings.log-streaming.saving')"
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
					<n8n-input-label
						:class="$style.typeSelector"
						:label="$locale.baseText('settings.log-streaming.selecttype')"
						:tooltip-text="$locale.baseText('settings.log-streaming.selecttypehint')"
						:bold="false"
						size="medium"
						:underline="false"
					>
						<n8n-select
							ref="typeSelectRef"
							:model-value="typeSelectValue"
							:placeholder="typeSelectPlaceholder"
							data-test-id="select-destination-type"
							name="name"
							@update:model-value="onTypeSelectInput"
						>
							<n8n-option
								v-for="option in typeSelectOptions || []"
								:key="option.value"
								:value="option.value"
								:label="$locale.baseText(option.label)"
							/>
						</n8n-select>
						<div class="mt-m text-right">
							<n8n-button
								size="large"
								data-test-id="select-destination-button"
								:disabled="!typeSelectValue"
								@click="onContinueAddClicked"
							>
								{{ $locale.baseText(`settings.log-streaming.continue`) }}
							</n8n-button>
						</div>
					</n8n-input-label>
				</template>
				<template v-else>
					<div :class="$style.sidebar">
						<n8n-menu mode="tabs" :items="sidebarItems" @select="onTabSelect"></n8n-menu>
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
							<n8n-input-label
								class="mb-m mt-m"
								:label="$locale.baseText('settings.log-streaming.tab.events.title')"
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

<script lang="ts">
import { get, set, unset } from 'lodash-es';
import { mapStores } from 'pinia';
import { useLogStreamingStore } from '@/stores/logStreaming.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import ParameterInputList from '@/components/ParameterInputList.vue';
import type { IMenuItem, INodeUi, IUpdateInformation } from '@/Interface';
import type {
	IDataObject,
	INodeCredentials,
	NodeParameterValue,
	MessageEventBusDestinationOptions,
} from 'n8n-workflow';
import {
	deepCopy,
	defaultMessageEventBusDestinationOptions,
	defaultMessageEventBusDestinationWebhookOptions,
	MessageEventBusDestinationTypeNames,
	defaultMessageEventBusDestinationSyslogOptions,
	defaultMessageEventBusDestinationSentryOptions,
} from 'n8n-workflow';
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import { LOG_STREAM_MODAL_KEY, MODAL_CONFIRM } from '@/constants';
import Modal from '@/components/Modal.vue';
import { useMessage } from '@/composables/useMessage';
import { useUIStore } from '@/stores/ui.store';
import { hasPermission } from '@/utils/rbac/permissions';
import { destinationToFakeINodeUi } from '@/components/SettingsLogStreaming/Helpers.ee';
import {
	webhookModalDescription,
	sentryModalDescription,
	syslogModalDescription,
} from './descriptions.ee';
import type { BaseTextKey } from '@/plugins/i18n';
import InlineNameEdit from '@/components/InlineNameEdit.vue';
import SaveButton from '@/components/SaveButton.vue';
import EventSelection from '@/components/SettingsLogStreaming/EventSelection.ee.vue';
import type { EventBus } from 'n8n-design-system';
import { createEventBus } from 'n8n-design-system/utils';
import { useTelemetry } from '@/composables/useTelemetry';
import { useRootStore } from '@/stores/n8nRoot.store';

export default defineComponent({
	name: 'EventDestinationSettingsModal',
	components: {
		Modal,
		ParameterInputList,
		InlineNameEdit,
		SaveButton,
		EventSelection,
	},
	props: {
		modalName: String,
		destination: {
			type: Object,
			default: () => deepCopy(defaultMessageEventBusDestinationOptions),
		},
		isNew: Boolean,
		eventBus: {
			type: Object as PropType<EventBus>,
		},
	},
	setup() {
		return {
			...useMessage(),
		};
	},
	data() {
		return {
			unchanged: !this.isNew,
			activeTab: 'settings',
			hasOnceBeenSaved: !this.isNew,
			isSaving: false,
			isDeleting: false,
			loading: false,
			showRemoveConfirm: false,
			typeSelectValue: '',
			typeSelectPlaceholder: 'Destination Type',
			nodeParameters: deepCopy(defaultMessageEventBusDestinationOptions),
			webhookDescription: webhookModalDescription,
			sentryDescription: sentryModalDescription,
			syslogDescription: syslogModalDescription,
			modalBus: createEventBus(),
			headerLabel: this.destination.label,
			testMessageSent: false,
			testMessageResult: false,
			LOG_STREAM_MODAL_KEY,
		};
	},
	computed: {
		...mapStores(useUIStore, useLogStreamingStore, useNDVStore, useWorkflowsStore),
		typeSelectOptions(): Array<{ value: string; label: BaseTextKey }> {
			const options: Array<{ value: string; label: BaseTextKey }> = [];
			for (const t of Object.values(MessageEventBusDestinationTypeNames)) {
				if (t === MessageEventBusDestinationTypeNames.abstract) {
					continue;
				}
				options.push({
					value: t,
					label: `settings.log-streaming.${t}` as BaseTextKey,
				});
			}
			return options;
		},
		isTypeAbstract(): boolean {
			return this.nodeParameters.__type === MessageEventBusDestinationTypeNames.abstract;
		},
		isTypeWebhook(): boolean {
			return this.nodeParameters.__type === MessageEventBusDestinationTypeNames.webhook;
		},
		isTypeSyslog(): boolean {
			return this.nodeParameters.__type === MessageEventBusDestinationTypeNames.syslog;
		},
		isTypeSentry(): boolean {
			return this.nodeParameters.__type === MessageEventBusDestinationTypeNames.sentry;
		},
		node(): INodeUi {
			return destinationToFakeINodeUi(this.nodeParameters);
		},
		typeLabelName(): BaseTextKey {
			return `settings.log-streaming.${this.nodeParameters.__type}` as BaseTextKey;
		},
		sidebarItems(): IMenuItem[] {
			const items: IMenuItem[] = [
				{
					id: 'settings',
					label: this.$locale.baseText('settings.log-streaming.tab.settings'),
					position: 'top',
				},
			];
			if (!this.isTypeAbstract) {
				items.push({
					id: 'events',
					label: this.$locale.baseText('settings.log-streaming.tab.events'),
					position: 'top',
				});
			}
			return items;
		},
		canManageLogStreaming(): boolean {
			return hasPermission(['rbac'], { rbac: { scope: 'logStreaming:manage' } });
		},
	},
	mounted() {
		this.setupNode(
			Object.assign(deepCopy(defaultMessageEventBusDestinationOptions), this.destination),
		);
		this.workflowsStore.$onAction(
			({
				name, // name of the action
				args, // array of parameters passed to the action
			}) => {
				if (name === 'updateNodeProperties') {
					for (const arg of args) {
						if (arg.name === this.destination.id) {
							if ('credentials' in arg.properties) {
								this.unchanged = false;
								this.nodeParameters.credentials = arg.properties.credentials as INodeCredentials;
							}
						}
					}
				}
			},
		);
	},
	methods: {
		onInput() {
			this.unchanged = false;
			this.testMessageSent = false;
		},
		onTabSelect(tab: string) {
			this.activeTab = tab;
		},
		onLabelChange(value: string) {
			this.onInput();
			this.headerLabel = value;
			this.nodeParameters.label = value;
		},
		setupNode(options: MessageEventBusDestinationOptions) {
			this.workflowsStore.removeNode(this.node);
			this.ndvStore.activeNodeName = options.id ?? 'thisshouldnothappen';
			this.workflowsStore.addNode(destinationToFakeINodeUi(options));
			this.nodeParameters = options;
			this.logStreamingStore.items[this.destination.id].destination = options;
		},
		onTypeSelectInput(destinationType: MessageEventBusDestinationTypeNames) {
			this.typeSelectValue = destinationType;
		},
		async onContinueAddClicked() {
			let newDestination;
			switch (this.typeSelectValue) {
				case MessageEventBusDestinationTypeNames.syslog:
					newDestination = Object.assign(deepCopy(defaultMessageEventBusDestinationSyslogOptions), {
						id: this.destination.id,
					});
					break;
				case MessageEventBusDestinationTypeNames.sentry:
					newDestination = Object.assign(deepCopy(defaultMessageEventBusDestinationSentryOptions), {
						id: this.destination.id,
					});
					break;
				case MessageEventBusDestinationTypeNames.webhook:
					newDestination = Object.assign(
						deepCopy(defaultMessageEventBusDestinationWebhookOptions),
						{ id: this.destination.id },
					);
					break;
			}

			if (newDestination) {
				this.headerLabel = newDestination?.label ?? this.headerLabel;
				this.setupNode(newDestination);
			}
		},
		valueChanged(parameterData: IUpdateInformation) {
			this.unchanged = false;
			this.testMessageSent = false;
			const newValue: NodeParameterValue = parameterData.value as string | number;
			const parameterPath = parameterData.name?.startsWith('parameters.')
				? parameterData.name.split('.').slice(1).join('.')
				: parameterData.name || '';

			const nodeParameters = deepCopy(this.nodeParameters);

			// Check if the path is supposed to change an array and if so get
			// the needed data like path and index
			const parameterPathArray = parameterPath.match(/(.*)\[(\d+)\]$/);

			// Apply the new value
			if (parameterData.value === undefined && parameterPathArray !== null) {
				// Delete array item
				const path = parameterPathArray[1] as keyof MessageEventBusDestinationOptions;
				const index = parameterPathArray[2];
				const data = get(nodeParameters, path);

				if (Array.isArray(data)) {
					data.splice(parseInt(index, 10), 1);
					nodeParameters[path] = data as never;
				}
			} else {
				if (newValue === undefined) {
					unset(nodeParameters, parameterPath);
				} else {
					set(nodeParameters, parameterPath, newValue);
				}
			}

			this.nodeParameters = deepCopy(nodeParameters);
			this.workflowsStore.updateNodeProperties({
				name: this.node.name,
				properties: { parameters: this.nodeParameters as unknown as IDataObject, position: [0, 0] },
			});
			if (this.hasOnceBeenSaved) {
				this.logStreamingStore.updateDestination(this.nodeParameters);
			}
		},
		async sendTestEvent() {
			this.testMessageResult = await this.logStreamingStore.sendTestMessage(this.nodeParameters);
			this.testMessageSent = true;
		},
		async removeThis() {
			const deleteConfirmed = await this.confirm(
				this.$locale.baseText('settings.log-streaming.destinationDelete.message', {
					interpolate: { destinationName: this.destination.label },
				}),
				this.$locale.baseText('settings.log-streaming.destinationDelete.headline'),
				{
					type: 'warning',
					confirmButtonText: this.$locale.baseText(
						'settings.log-streaming.destinationDelete.confirmButtonText',
					),
					cancelButtonText: this.$locale.baseText(
						'settings.log-streaming.destinationDelete.cancelButtonText',
					),
				},
			);

			if (deleteConfirmed !== MODAL_CONFIRM) {
				return;
			} else {
				this.eventBus.emit('remove', this.destination.id);
				this.uiStore.closeModal(LOG_STREAM_MODAL_KEY);
				this.uiStore.stateIsDirty = false;
			}
		},
		onModalClose() {
			if (!this.hasOnceBeenSaved) {
				this.workflowsStore.removeNode(this.node);
				this.logStreamingStore.removeDestination(this.nodeParameters.id!);
			}
			this.ndvStore.activeNodeName = null;
			this.eventBus.emit('closing', this.destination.id);
			this.uiStore.stateIsDirty = false;
		},
		async saveDestination() {
			if (this.unchanged || !this.destination.id) {
				return;
			}
			const saveResult = await this.logStreamingStore.saveDestination(this.nodeParameters);
			if (saveResult) {
				this.hasOnceBeenSaved = true;
				this.testMessageSent = false;
				this.unchanged = true;
				this.eventBus.emit('destinationWasSaved', this.destination.id);
				this.uiStore.stateIsDirty = false;

				const destinationType = (this.nodeParameters.__type ?? 'unknown')
					.replace('$$MessageEventBusDestination', '')
					.toLowerCase();

				const isComplete = () => {
					if (this.isTypeWebhook) {
						return this.destination.host !== '';
					} else if (this.isTypeSentry) {
						return this.destination.dsn !== '';
					} else if (this.isTypeSyslog) {
						return (
							this.destination.host !== '' &&
							this.destination.port !== undefined &&
							this.destination.protocol !== '' &&
							this.destination.facility !== undefined &&
							this.destination.app_name !== ''
						);
					}
					return false;
				};

				useTelemetry().track('User updated log streaming destination', {
					instance_id: useRootStore().instanceId,
					destination_type: destinationType,
					is_complete: isComplete(),
					is_active: this.destination.enabled,
				});
			}
		},
	},
});
</script>

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
		color: var(--color-text-dark) !important;
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
	margin-right: var(--spacing-l);
	flex-grow: 1;

	ul {
		padding: 0 !important;
	}
}

.cardTitle {
	font-size: 14px;
	font-weight: bold;
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
	display: flex;
	align-items: center;
	flex-direction: row;
	flex-grow: 1;
	margin-bottom: var(--spacing-l);
}

.destinationActions {
	display: flex;
	flex-direction: row;
	align-items: center;
	margin-right: var(--spacing-xl);
	margin-bottom: var(--spacing-l);

	> * {
		margin-left: var(--spacing-2xs);
	}
}
</style>
