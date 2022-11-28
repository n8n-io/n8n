<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<n8n-heading size="2xlarge">{{ $locale.baseText('settings.logstreaming') }}</n8n-heading>
			<strong>Experimental</strong>
		</div>
		<div>
			<el-button class="button" :class="$style.buttonInRow" type="success" icon="plus" @click="addDestinationSyslog">
				Syslog Server
			</el-button>
			<el-button class="button" :class="$style.buttonInRow" type="success" icon="plus" @click="addDestinationWebhook">
				Webhook Endpoint
			</el-button>
			<el-button class="button" :class="$style.buttonInRow" type="success" icon="plus" @click="addDestinationSentry">
				Sentry Endpoint
			</el-button>
		</div>
		<template>
			<el-row>
				<el-col
					v-for="(value, propertyName, index) in eventTreeStore.items" :key="propertyName"
					:span="10"
					:offset="index % 2 == 0 ? 0 : 2"
				>
					<event-destination-settings-card
						:destination="value.destination"
						:eventBus="eventBus"
						@remove="onRemove(value.destination.id)"
						@edit="onEdit(value.destination.id)"
					/>
				</el-col>
			</el-row>
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
import { useEventTreeStore } from '../stores/eventTreeStore';
import { useUIStore } from '../stores/ui';
import { WEBHOOK_LOGSTREAM_SETTINGS_MODAL_KEY, SYSLOG_LOGSTREAM_SETTINGS_MODAL_KEY, SENTRY_LOGSTREAM_SETTINGS_MODAL_KEY } from '../constants';
import Vue from 'vue';
import { destinationToFakeINodeUi } from '../components/SettingsLogStreaming/Helpers';
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
		};
	},
	async mounted() {
		// Prepare credentialsStore so modals can pick up credentials
		await this.credentialsStore.fetchCredentialTypes(false);
		const result = await this.credentialsStore.fetchAllCredentials();

		// fetch Destination data from the backend
		await this.getDestinationDataFromREST();

		// since we are not really integrated into the hooks, we listen to the store and refresh the destinations
		this.eventTreeStore.$onAction(({name, after})=>{
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
	},
	components: {
		EventTree,
		EventDestinationSettingsCard,
	},
	computed: {
		...mapStores(
			useEventTreeStore,
			useWorkflowsStore,
			useUIStore,
			useCredentialsStore,
		),
	},
	methods: {
		async getDestinationDataFromREST(): Promise<any> {
			this.eventTreeStore.clearEventNames();
			this.eventTreeStore.clearDestinationItemTrees();
			this.workflowsStore.removeAllNodes({setStateDirty: true, removePinData: true});
			const backendConstantsData = await this.restApi().makeRestApiRequest('get', '/eventbus/eventnames');
			if ('eventnames' in backendConstantsData && Array.isArray(backendConstantsData['eventnames'])) {
				backendConstantsData['eventnames'].forEach(e=>this.eventTreeStore.addEventName(e));
			}
			const destinationData: MessageEventBusDestinationOptions[] = await this.restApi().makeRestApiRequest('get', '/eventbus/destination');
			if (destinationData) {
				for (const destination of destinationData) {
					let nodeWithDefaults;
					switch (destination.__type) {
						case MessageEventBusDestinationTypeNames.syslog:
							nodeWithDefaults = Object.assign(deepCopy(defaultMessageEventBusDestinationSyslogOptions), destination);
							break;
						case MessageEventBusDestinationTypeNames.sentry:
							nodeWithDefaults = Object.assign(deepCopy(defaultMessageEventBusDestinationSentryOptions), destination);
							break;
						case MessageEventBusDestinationTypeNames.webhook:
							default:
							nodeWithDefaults = Object.assign(deepCopy(defaultMessageEventBusDestinationWebhookOptions), destination);
					}
					this.workflowsStore.addNode(destinationToFakeINodeUi(nodeWithDefaults));
					this.eventTreeStore.addDestination(destination);
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
				this.eventTreeStore.addDestination(newDestination);
				this.workflowsStore.addNode(destinationToFakeINodeUi(newDestination));
				this.uiStore.openModalWithData({ name: modalKey, data: { newDestination, isNew: false, eventBus: this.eventBus } });
			}
		},
		async onRemove(destinationId?: string) {
			if (!destinationId) return;
			await this.restApi().makeRestApiRequest('DELETE', `/eventbus/destination?id=${destinationId}`);
			this.eventTreeStore.removeDestination(destinationId);
			const foundNode = this.workflowsStore.getNodeByName(destinationId);
			if (foundNode) {
				this.workflowsStore.removeNode(foundNode);
			}
		},
		async onEdit(destinationId?: string) {
			if (!destinationId) return;
			const destination = this.eventTreeStore.getDestination(destinationId);
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
}
</style>
