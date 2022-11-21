<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<n8n-heading size="2xlarge">{{ $locale.baseText('settings.logstreaming') }}</n8n-heading>
			<strong>Experimental</strong>
		</div>
		<div v-for="(destination) in destinations" :key="destination.id">
			<event-destination-settings-syslog
				v-if="destination.__type === '$$MessageEventBusDestinationSyslog'"
				:destination="destination"
				:treeData="eventTreeStore.items[destination.id].tree"
				@remove="onRemove"
			>
			</event-destination-settings-syslog>
			<event-destination-settings-webhook
				v-if="destination.__type === '$$MessageEventBusDestinationWebhook'"
				:destination="destination"
				:treeData="eventTreeStore.items[destination.id].tree"
				@remove="onRemove"
			>
			</event-destination-settings-webhook>
		</div>
	</div>
</template>


<script lang="ts">
import { showMessage } from '@/components/mixins/showMessage';
import { IFormInputs } from '@/Interface';
import { useUIStore } from '@/stores/ui';
import { useUsersStore } from '@/stores/users';
import { mapStores } from 'pinia';
import Vue from 'vue';
import mixins from 'vue-typed-mixins';
import { restApi } from '@/components/mixins/restApi';
import { useWorkflowsStore } from '../stores/workflows';
import { useNDVStore } from '../stores/ndv';
import EventTree, { EventNamesTreeCollection } from '@/components/SettingsLogStreaming/EventTree.vue';
import EventDestinationSettingsSyslog from '@/components/SettingsLogStreaming/EventDestinationSettingsSyslog.vue';
import EventDestinationSettingsWebhook from '@/components/SettingsLogStreaming/EventDestinationSettingsWebhook.vue';
import { useEventTreeStore } from '../stores/eventTreeStore';
import { AbstractMessageEventBusDestination } from '../components/SettingsLogStreaming/types';

export default mixins(
	showMessage,
	restApi,
).extend({
	name: 'SettingsLogStreamingView',
	props: {},
	data() {
		return {
			hasAnyChanges: false,
			formInputs: null as null | IFormInputs,
			isOpen: false,
			treeData: {} as EventNamesTreeCollection,
			item: {} as EventNamesTreeCollection,
			destinations: [] as AbstractMessageEventBusDestination[],
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
			useUIStore,
			useUsersStore,
			useNDVStore,
			useWorkflowsStore,
		),
		isFolder() {
			// return this.treeData && this.treeData._;
			return true;
		},
	},
	methods: {
		async getDestinationDataFromREST(destinationId?: string): Promise<any> {
			const backendConstants = await this.restApi().makeRestApiRequest('get', '/eventbus/constants');
			if ('eventNames' in backendConstants && Array.isArray(backendConstants['eventNames'])) {
				try {
					backendConstants['eventNames'].forEach(e=>this.eventTreeStore.addEventName(e));
				} catch (error) {
					console.log(error);
				}
			}
			const destinationData: AbstractMessageEventBusDestination[] = await this.restApi().makeRestApiRequest('get', '/eventbus/destination');
			if (destinationData) {
				this.destinations = destinationData;
				for (const destination of this.destinations) {
					this.eventTreeStore.setSelectionAndBuildItems(destination);
				}
			}
		},
		async onRemove(id: string) {
			const backendRemoveDestination = await this.restApi().makeRestApiRequest('DELETE', `/eventbus/destination?id=${id}`);
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
</style>
