<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<n8n-heading size="2xlarge">{{ $locale.baseText('settings.logstreaming') }}</n8n-heading>
			<strong>Development Fake License&nbsp;</strong>
			<el-switch
				v-model="fakeLicense"
				size="large"
				/>
		</div>

		<template v-if="isLicensed">
			<div v-if="$locale.baseText('settings.logstreaming.infoText')" class="mb-l">
				<n8n-info-tip theme="info" type="note">
					<template>
						<span v-html="$locale.baseText('settings.logstreaming.infoText')"></span>
					</template>
				</n8n-info-tip>
			</div>
			<n8n-card class="mb-4xs" :class="$style.card">
				<n8n-input-label :label="$locale.baseText('settings.logstreaming.addDestination')">
					<el-row :gutter="10">
						<el-col>
							<el-button class="button" :class="$style.buttonInRow" type="success" icon="plus" @click="addDestinationSyslog">
								Syslog
							</el-button>

							<el-button class="button" :class="$style.buttonInRow" type="success" icon="plus" @click="addDestinationWebhook">
								Webhook
							</el-button>

							<el-button class="button" :class="$style.buttonInRow" type="success" icon="plus" @click="addDestinationSentry">
								Sentry
							</el-button>
						</el-col>
					</el-row>
				</n8n-input-label>
			</n8n-card>
			<n8n-card class="mb-4xs" :class="$style.card">
				<n8n-input-label :label="$locale.baseText('settings.logstreaming.destinations')">
				<el-row :gutter="10">
					<el-col
						v-for="(value, propertyName, index) in logStreamingStore.items" :key="propertyName"
						:xoffset="index % 2 == 0 ? 0 : 2"
						:xs="24" :sm="24" :md="12" :lg="12" :xl="12"
					>
						<event-destination-settings-card
							:destination="value.destination"
							:eventBus="eventBus"
							@remove="onRemove(value.destination.id)"
							@edit="onEdit(value.destination.id)"
						/>
					</el-col>
				</el-row>
			</n8n-input-label>
			</n8n-card>
		</template>
		<template v-else>
			<div v-if="$locale.baseText('settings.logstreaming.infoText')" class="mb-l">
				<n8n-info-tip theme="info" type="note">
					<template>
						<span v-html="$locale.baseText('settings.logstreaming.infoText')"></span>
					</template>
				</n8n-info-tip>
			</div>
			<div :class="$style.actionBoxContainer">
				<n8n-action-box
					:description="$locale.baseText('fakeDoor.settings.logging.actionBox.description')"
					:buttonText="$locale.baseText('fakeDoor.actionBox.button.label')"
				>
					<template #heading>
						<span v-html="$locale.baseText('fakeDoor.settings.logging.actionBox.title')"/>
					</template>
				</n8n-action-box>
			</div>
		</template>
	</div>
</template>


<script lang="ts">
import {v4 as uuid} from 'uuid';
import { mapStores } from 'pinia';
import mixins from 'vue-typed-mixins';
import { useWorkflowsStore } from '../stores/workflows';
import { useCredentialsStore } from '../stores/credentials';
import EventTree from '@/components/SettingsLogStreaming/EventTreeSelection.vue';
import EventDestinationSettingsCard from '@/components/SettingsLogStreaming/EventDestinationSettingsCard.vue';
import { useLogStreamingStore } from '../stores/logStreamingStore';
import { useSettingsStore } from '../stores/settings';
import { useUIStore } from '../stores/ui';
import {
	WEBHOOK_LOGSTREAM_SETTINGS_MODAL_KEY,
	SYSLOG_LOGSTREAM_SETTINGS_MODAL_KEY,
	SENTRY_LOGSTREAM_SETTINGS_MODAL_KEY,
EnterpriseEditionFeature,
} from '../constants';
import Vue from 'vue';
import { restApi } from '../mixins/restApi';
import { deepCopy, defaultMessageEventBusDestinationSentryOptions, defaultMessageEventBusDestinationSyslogOptions, defaultMessageEventBusDestinationWebhookOptions, MessageEventBusDestinationOptions, MessageEventBusDestinationTypeNames } from 'n8n-workflow';

export default mixins(
	restApi,
).extend({
	name: 'SettingsLogStreamingView',
	props: {},
	data() {
		return {
			eventBus: new Vue(),
			destinations: Array<MessageEventBusDestinationOptions>,
			fakeLicense: false,
		};
	},
	async mounted() {
		// Prepare credentialsStore so modals can pick up credentials
		await this.credentialsStore.fetchCredentialTypes(false);
		const result = await this.credentialsStore.fetchAllCredentials();
		this.uiStore.nodeViewInitialized = false;

		// fetch Destination data from the backend
		await this.getDestinationDataFromREST();

		// since we are not really integrated into the hooks, we listen to the store and refresh the destinations
		this.logStreamingStore.$onAction(({name, after})=>{
			if (name==='removeDestination') {
				after(async () => {
					await this.getDestinationDataFromREST();
    		});
			}
		});

		// refresh when a modal closes
		this.eventBus.$on('destinationWasUpdated', async () => {
			await this.getDestinationDataFromREST();
		});
		// listen to remove emission
		this.eventBus.$on('remove', async (destinationId: string) => {
			await this.onRemove(destinationId);
		});
		// listen to modal closing and remove nodes from store
		this.eventBus.$on('closing', async (destinationId: string) => {
			this.workflowsStore.removeAllNodes({setStateDirty: false, removePinData: true});
			this.uiStore.stateIsDirty = false;
		});
	},
	components: {
		EventTree,
		EventDestinationSettingsCard,
	},
	computed: {
		...mapStores(
			useSettingsStore,
			useLogStreamingStore,
			useWorkflowsStore,
			useUIStore,
			useCredentialsStore,
		),
		isLicensed(): boolean {
			return this.settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.LogStreaming) || this.fakeLicense;
		},
	},
	methods: {
		async getDestinationDataFromREST(): Promise<any> {
			this.logStreamingStore.clearEventNames();
			this.logStreamingStore.clearDestinationItemTrees();
			// this.workflowsStore.removeAllNodes({setStateDirty: false, removePinData: true});
			const eventNamesData = await this.restApi().makeRestApiRequest('get', '/eventbus/eventnames');
			if (eventNamesData) {
				for (const eventName of eventNamesData) {
					this.logStreamingStore.addEventName(eventName);
				}
			}
			const destinationData: MessageEventBusDestinationOptions[] = await this.restApi().makeRestApiRequest('get', '/eventbus/destination');
			if (destinationData) {
				for (const destination of destinationData) {
					this.logStreamingStore.addDestination(destination);
				}
			}
			this.$forceUpdate();
		},
		async addDestinationSyslog() {
			await this.onAdd(MessageEventBusDestinationTypeNames.syslog, SYSLOG_LOGSTREAM_SETTINGS_MODAL_KEY);
		},
		async addDestinationWebhook() {
			await this.onAdd(MessageEventBusDestinationTypeNames.webhook, WEBHOOK_LOGSTREAM_SETTINGS_MODAL_KEY);
		},
		async addDestinationSentry() {
			await this.onAdd(MessageEventBusDestinationTypeNames.sentry, SENTRY_LOGSTREAM_SETTINGS_MODAL_KEY);
		},
		async onAdd(destinationType: MessageEventBusDestinationTypeNames, modalKey: string) {
			let newDestination;
			switch(destinationType) {
					case MessageEventBusDestinationTypeNames.syslog:
						newDestination = deepCopy(defaultMessageEventBusDestinationSyslogOptions);
						break;
					case MessageEventBusDestinationTypeNames.sentry:
						newDestination = deepCopy(defaultMessageEventBusDestinationSentryOptions);
						break;
					case MessageEventBusDestinationTypeNames.webhook:
						newDestination = deepCopy(defaultMessageEventBusDestinationWebhookOptions);
						break;
			}
			if (newDestination) {
				newDestination.id = uuid();
				this.logStreamingStore.addDestination(newDestination);
				this.uiStore.openModalWithData({ name: modalKey, data: { destination: newDestination, isNew: false, eventBus: this.eventBus } });
			}
		},
		async onRemove(destinationId?: string) {
			if (!destinationId) return;
			await this.restApi().makeRestApiRequest('DELETE', `/eventbus/destination?id=${destinationId}`);
			this.logStreamingStore.removeDestination(destinationId);
			const foundNode = this.workflowsStore.getNodeByName(destinationId);
			if (foundNode) {
				this.workflowsStore.removeNode(foundNode);
			}
		},
		async onEdit(destinationId?: string) {
			if (!destinationId) return;
			const destination = this.logStreamingStore.getDestination(destinationId);
			if (destination) {
				switch(destination.__type) {
					case MessageEventBusDestinationTypeNames.syslog:
						this.uiStore.openModalWithData({ name: SYSLOG_LOGSTREAM_SETTINGS_MODAL_KEY, data: { destination, isNew: false, eventBus: this.eventBus } });
						break;
					case MessageEventBusDestinationTypeNames.sentry:
						this.uiStore.openModalWithData({ name: SENTRY_LOGSTREAM_SETTINGS_MODAL_KEY, data: { destination, isNew: false, eventBus: this.eventBus } });
						break;
					case MessageEventBusDestinationTypeNames.webhook:
						this.uiStore.openModalWithData({ name: WEBHOOK_LOGSTREAM_SETTINGS_MODAL_KEY, data: { destination, isNew: false, eventBus: this.eventBus } });
						break;
				}
			}
		},
	},
});
</script>

<style lang="scss" module>
.container {
	> * {
		margin-bottom: var(--spacing-2xl);
	}
	padding-bottom: 100px;
}

.card {
	margin-bottom: 2em!important;
}

.header {
	display: flex;
	align-items: center;
	white-space: nowrap;

	*:first-child {
		flex-grow: 1;
	}
}

.buttonInRow {
	margin-right: 1em;
	margin-top: .5em;
	margin-bottom: .5em;
}
</style>
