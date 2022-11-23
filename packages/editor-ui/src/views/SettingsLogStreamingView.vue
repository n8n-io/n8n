<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<n8n-heading size="2xlarge">{{ $locale.baseText('settings.logstreaming') }}</n8n-heading>
			<strong>Experimental</strong>
		</div>
		<div>
			<el-button class="button" :class="$style.buttonInRow" type="success" icon="plus" @click="openWebhookSettingsModal">
				Modal
				</el-button>
			<el-button class="button" :class="$style.buttonInRow" type="success" icon="plus" @click="addDestinationSyslog">
				Syslog Server
			</el-button>
			<el-button class="button" :class="$style.buttonInRow" type="success" icon="plus" @click="addDestinationWebhook">
				Webhook Endpoint
			</el-button>
		</div>
		<div v-for="(destination) in destinations" :key="destination.id">
			<event-destination-settings-syslog
				v-if="destination.__type === destinationTypeNames.syslog"
				:destination="destination"
				@remove="onRemove"
			>
			</event-destination-settings-syslog>
			<event-destination-settings-webhook
				v-if="destination.__type === destinationTypeNames.webhook"
				:destination="destination"
				@remove="onRemove"
			>
			</event-destination-settings-webhook>
		</div>
	</div>
</template>


<script lang="ts">
import { mapStores } from 'pinia';
import mixins from 'vue-typed-mixins';
import { restApi } from '@/components/mixins/restApi';
import { useWorkflowsStore } from '../stores/workflows';
import EventTree, { EventNamesTreeCollection } from '@/components/SettingsLogStreaming/EventTreeSelection.vue';
import EventDestinationSettingsSyslog from '@/components/SettingsLogStreaming/EventDestinationSettingsSyslog.vue';
import EventDestinationSettingsWebhook from '@/components/SettingsLogStreaming/EventDestinationSettingsWebhook.vue';
import { useEventTreeStore } from '../stores/eventTreeStore';
import {
	AbstractMessageEventBusDestination,
	MessageEventBusDestinationSyslog,
	MessageEventBusDestinationWebhook,
	MessageEventBusDestinationTypeNames } from '../components/SettingsLogStreaming/types';
import { useUIStore } from '../stores/ui';
import { WEBHOOK_LOGSTREAM_SETTINGS_MODAL_KEY } from '../constants';

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
			destinations: [] as AbstractMessageEventBusDestination[],
			destinationTypeNames: MessageEventBusDestinationTypeNames,
		};
	},
	mounted() {
		this.getDestinationDataFromREST();
	},
	components: {
		EventTree,
		EventDestinationSettingsSyslog,
		EventDestinationSettingsWebhook,
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
			this.eventTreeStore.clearDestinations();
			if (destinationData) {
				this.destinations = destinationData;
				for (const destination of this.destinations) {
					this.eventTreeStore.setSelectionAndBuildItems(destination);
				}
			}
		},
		// openWebhookSettingsModal() {
		// 	this.uiStore.openModal(WEBHOOK_LOGSTREAM_SETTINGS_MODAL_KEY);
		// },
		addDestinationSyslog() {
			this.addDestination(new MessageEventBusDestinationSyslog());
		},
		addDestinationWebhook() {
			this.addDestination(new MessageEventBusDestinationWebhook());
		},
		addDestination(newDestination: AbstractMessageEventBusDestination) {
			this.eventTreeStore.setSelectionAndBuildItems(newDestination);
			this.destinations.push(newDestination);
		},
		async onRemove(id: string) {
			await this.restApi().makeRestApiRequest('DELETE', `/eventbus/destination?id=${id}`);
			const index = this.destinations.findIndex(e => e.id === id);
			if (index > -1) {
				this.destinations.splice(index, 1);
			}
			this.eventTreeStore.removeDestination(id);
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
