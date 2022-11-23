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
					v-for="(destination, index) in eventTreeStore.destinations" :key="destination.id"
					:span="10"
					:offset="index % 2 == 0 ? 0 : 2"
				>
					<event-destination-settings-card
						:destination="destination"
						@remove="onRemove(destination.id)"
						@edit="onEdit(destination.id)"
					/>
				</el-col>
			</el-row>
		</template>
	</div>
</template>


<script lang="ts">
import { mapStores } from 'pinia';
import mixins from 'vue-typed-mixins';
import { restApi } from '@/components/mixins/restApi';
import { useWorkflowsStore } from '../stores/workflows';
import EventTree from '@/components/SettingsLogStreaming/EventTreeSelection.vue';
import EventDestinationSettingsCard from '@/components/SettingsLogStreaming/EventDestinationSettingsCard.vue';
// import EventDestinationSettingsSyslog from '@/components/SettingsLogStreaming/EventDestinationSettingsSyslog.vue';
// import EventDestinationSettingsWebhook from '@/components/SettingsLogStreaming/EventDestinationSettingsWebhook.vue';
import { EventNamesTreeCollection, useEventTreeStore } from '../stores/eventTreeStore';
import {
	AbstractMessageEventBusDestination,
	MessageEventBusDestinationSyslog,
	MessageEventBusDestinationWebhook,
	MessageEventBusDestinationTypeNames } from '../components/SettingsLogStreaming/types';
import { useUIStore } from '../stores/ui';
import { WEBHOOK_LOGSTREAM_SETTINGS_MODAL_KEY, SYSLOG_LOGSTREAM_SETTINGS_MODAL_KEY } from '../constants';

export default mixins(
	restApi,
).extend({
	name: 'SettingsLogStreamingView',
	props: {},
	data() {
		return {
			hasAnyChanges: false,
			isOpen: false,
			treeData: {} as EventNamesTreeCollection,
			item: {} as EventNamesTreeCollection,
			// destinations: [] as AbstractMessageEventBusDestination[],
			destinationTypeNames: MessageEventBusDestinationTypeNames,
		};
	},
	mounted() {
		this.getDestinationDataFromREST();
	},
	components: {
		EventTree,
		EventDestinationSettingsCard,
		// EventDestinationSettingsSyslog,
		// EventDestinationSettingsWebhook,
	},
	computed: {
		...mapStores(
			useEventTreeStore,
			useWorkflowsStore,
			useUIStore,
		),
	},
	methods: {
		async getDestinationDataFromREST(destinationId?: string): Promise<any> {
			const backendConstants = await this.restApi().makeRestApiRequest('get', '/eventbus/constants');
			this.eventTreeStore.clearEventNames();
			if ('eventNames' in backendConstants && Array.isArray(backendConstants['eventNames'])) {
				backendConstants['eventNames'].forEach(e=>this.eventTreeStore.addEventName(e));
			}
			this.eventTreeStore.clearEventLevels();
			if ('eventLevels' in backendConstants && Array.isArray(backendConstants['eventLevels'])) {
				backendConstants['eventLevels'].forEach(e=>this.eventTreeStore.addEventLevel(e));
			}
			const destinationData: AbstractMessageEventBusDestination[] = await this.restApi().makeRestApiRequest('get', '/eventbus/destination');
			this.eventTreeStore.clearDestinationItemTrees();
			if (destinationData) {
				// this.destinations = destinationData;
				this.eventTreeStore.destinations = destinationData;
				for (const destination of this.eventTreeStore.destinations) {
					this.eventTreeStore.setSelectionAndBuildItems(destination);
				}
			}
		},
		openWebhookSettingsModal(destination: MessageEventBusDestinationWebhook | null) {
			if (destination === null)
			{
				destination = new MessageEventBusDestinationWebhook();
				this.eventTreeStore.setSelectionAndBuildItems(destination);
			}
			console.log(destination.id);
			console.log(destination.__type);
			// this.uiStore.setModalData(WEBHOOK_LOGSTREAM_SETTINGS_MODAL_KEY, destination);
			this.uiStore.openModalWithData({ name: WEBHOOK_LOGSTREAM_SETTINGS_MODAL_KEY, data: { destination } });
		},
		addDestinationSyslog() {
			const newDestination = new MessageEventBusDestinationSyslog();
			this.addDestination(newDestination);
			this.uiStore.openModalWithData({ name: WEBHOOK_LOGSTREAM_SETTINGS_MODAL_KEY, data: { destination: newDestination, isNew: true  } });
		},
		addDestinationWebhook() {
			const newDestination = new MessageEventBusDestinationWebhook();
			this.addDestination(newDestination);
			this.uiStore.openModalWithData({ name: SYSLOG_LOGSTREAM_SETTINGS_MODAL_KEY, data: { destination: newDestination, isNew: true } });
		},
		addDestination(newDestination: AbstractMessageEventBusDestination) {
			this.eventTreeStore.setSelectionAndBuildItems(newDestination);
			this.eventTreeStore.addDestination(newDestination);
		},
		async onRemove(destinationId: string) {
			await this.restApi().makeRestApiRequest('DELETE', `/eventbus/destination?id=${destinationId}`);
			// const index = this.destinations.findIndex(e => e.id === destinationId);
			// if (index > -1) {
			// 	this.destinations.sremoveDestinationTree
			// }
			this.eventTreeStore.removeDestination(destinationId);
		},
		async onEdit(destinationId: string) {
			const destination = this.eventTreeStore.getDestination(destinationId);
			if (destination) {
				switch(destination.__type) {
					case MessageEventBusDestinationTypeNames.syslog:
						// this.openWebhookSettingsModal(destination as MessageEventBusDestinationWebhook);
						this.uiStore.openModalWithData({ name: SYSLOG_LOGSTREAM_SETTINGS_MODAL_KEY, data: { destination } });
						break;
					case MessageEventBusDestinationTypeNames.webhook:
					// this.openWebhookSettingsModal(destination as MessageEventBusDestinationWebhook);
						this.uiStore.openModalWithData({ name: WEBHOOK_LOGSTREAM_SETTINGS_MODAL_KEY, data: { destination } });
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
