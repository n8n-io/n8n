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
import { mapStores } from 'pinia';
import mixins from 'vue-typed-mixins';
import { useWorkflowsStore } from '../stores/workflows';
import { useCredentialsStore } from '../stores/credentials';
import EventTree from '@/components/SettingsLogStreaming/EventTreeSelection.vue';
import EventDestinationSettingsCard from '@/components/SettingsLogStreaming/EventDestinationSettingsCard.vue';
import { useEventTreeStore } from '../stores/eventTreeStore';
import {
	AbstractMessageEventBusDestination,
	MessageEventBusDestinationSyslog,
	MessageEventBusDestinationWebhook,
	MessageEventBusDestinationTypeNames } from '../components/SettingsLogStreaming/types';
import { useUIStore } from '../stores/ui';
import { WEBHOOK_LOGSTREAM_SETTINGS_MODAL_KEY, SYSLOG_LOGSTREAM_SETTINGS_MODAL_KEY } from '../constants';
import Vue from 'vue';
import { destinationToFakeINodeUi } from '../components/SettingsLogStreaming/Helpers';
import { restApi } from '../mixins/restApi';

export default mixins(
	restApi,
).extend({
	name: 'SettingsLogStreamingView',
	props: {},
	data() {
		return {
			eventBus: new Vue(),
			destinations: Array<AbstractMessageEventBusDestination>,
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
			this.eventTreeStore.clearEventLevels();
			this.eventTreeStore.clearDestinationItemTrees();
			this.workflowsStore.removeAllNodes({setStateDirty: true, removePinData: true});
			const backendConstantsData = await this.restApi().makeRestApiRequest('get', '/eventbus/constants');
			if ('eventNames' in backendConstantsData && Array.isArray(backendConstantsData['eventNames'])) {
				backendConstantsData['eventNames'].forEach(e=>this.eventTreeStore.addEventName(e));
			}
			if ('eventLevels' in backendConstantsData && Array.isArray(backendConstantsData['eventLevels'])) {
				backendConstantsData['eventLevels'].forEach(e=>this.eventTreeStore.addEventLevel(e));
			}
			const destinationData: AbstractMessageEventBusDestination[] = await this.restApi().makeRestApiRequest('get', '/eventbus/destination');
			if (destinationData) {
				for (const destination of destinationData) {
					let nodeWithDefaults;
					switch (destination.__type) {
						case MessageEventBusDestinationTypeNames.webhook:
							nodeWithDefaults = Object.assign(new MessageEventBusDestinationWebhook(), destination);
							break;
						case MessageEventBusDestinationTypeNames.syslog:
							nodeWithDefaults = Object.assign(new MessageEventBusDestinationSyslog(), destination);
							break;
						default:
						nodeWithDefaults = Object.assign(new MessageEventBusDestinationWebhook(), destination);
					}
					this.workflowsStore.addNode(destinationToFakeINodeUi(nodeWithDefaults));
					this.eventTreeStore.addDestination(destination);
				}
			}
			this.$forceUpdate();
		},
		addDestinationSyslog() {
			const newDestination = new MessageEventBusDestinationSyslog();
			this.eventTreeStore.addDestination(newDestination);
			this.uiStore.openModalWithData({ name: WEBHOOK_LOGSTREAM_SETTINGS_MODAL_KEY, data: { destination: newDestination, isNew: true, eventBus: this.eventBus } });
		},
		addDestinationWebhook() {
			const newDestination = new MessageEventBusDestinationWebhook();
			this.eventTreeStore.addDestination(newDestination);
			this.uiStore.openModalWithData({ name: SYSLOG_LOGSTREAM_SETTINGS_MODAL_KEY, data: { destination: newDestination, isNew: true, eventBus: this.eventBus } });
		},
		async onRemove(destinationId: string) {
			await this.restApi().makeRestApiRequest('DELETE', `/eventbus/destination?id=${destinationId}`);
			this.eventTreeStore.removeDestination(destinationId);
			const foundNode = this.workflowsStore.getNodeByName(destinationId);
			if (foundNode) {
				this.workflowsStore.removeNode(foundNode);
			}
		},
		async onEdit(destinationId: string) {
			const destination = this.eventTreeStore.getDestination(destinationId);
			if (destination) {
				switch(destination.__type) {
					case MessageEventBusDestinationTypeNames.syslog:
						this.uiStore.openModalWithData({ name: SYSLOG_LOGSTREAM_SETTINGS_MODAL_KEY, data: { destination, isNew: false, eventBus: this.eventBus } });
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

.item {
  cursor: pointer;
}

ul {
  padding-left: 1em;
  line-height: 1.5em;
  list-style-type: dot;
	margin-bottom: 0;
}

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
.sectionHeader {
	margin-bottom: var(--spacing-s);
}

.buttonInRow {
	margin-right: 1em;
}
</style>
