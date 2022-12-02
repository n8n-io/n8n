<template>
	<page-view-layout>
		<template #aside>
			<div :class="$style.header">
				<div :class="[$style['heading-wrapper'], 'mb-xs']">
					<n8n-heading size="2xlarge">
						{{ $locale.baseText(`settings.logstreaming.heading`) }}
					</n8n-heading>
				</div>
			</div>
			<div>
				<strong>License&nbsp;</strong>
				<el-switch v-model="fakeLicense" size="large" />
			</div>
			<template v-if="isLicensed">
				<div class="mt-xs mb-l">
					<n8n-button size="large"  @click="addDestination">
						{{ $locale.baseText(`settings.logstreaming.add`) }}
					</n8n-button>
				</div>
			</template>
		</template>

		<template v-if="isLicensed">
			<el-row :gutter="10" v-for="(value, propertyName) in logStreamingStore.items" :key="propertyName" :class="$style.destinationItem">
				<el-col>
					<event-destination-card
						:destination="value.destination"
						:eventBus="eventBus"
						@remove="onRemove(value.destination.id)"
						@edit="onEdit(value.destination.id)"
					/>
				</el-col>
			</el-row>
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
	</page-view-layout>
</template>

<script lang="ts">
import {v4 as uuid} from 'uuid';
import { mapStores } from 'pinia';
import mixins from 'vue-typed-mixins';
import { useWorkflowsStore } from '../stores/workflows';
import { useCredentialsStore } from '../stores/credentials';
import { useLogStreamingStore } from '../stores/logStreamingStore';
import { useSettingsStore } from '../stores/settings';
import { useUIStore } from '../stores/ui';
import { LOG_STREAM_MODAL_KEY, EnterpriseEditionFeature } from '../constants';
import Vue from 'vue';
import { restApi } from '../mixins/restApi';
import { deepCopy, defaultMessageEventBusDestinationOptions, MessageEventBusDestinationOptions } from 'n8n-workflow';
import PageViewLayout from "@/components/layouts/PageViewLayout.vue";
import EventDestinationCard from '@/components/SettingsLogStreaming/EventDestinationCard.vue';

export default mixins(
	restApi,
).extend({
	name: 'SettingsLogStreamingView',
	props: {},
	components: {
		PageViewLayout,
		EventDestinationCard,
	},
	data() {
		return {
			eventBus: new Vue(),
			destinations: Array<MessageEventBusDestinationOptions>,
			fakeLicense: false,
			allDestinations: [] as MessageEventBusDestinationOptions[],
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
	computed: {
		...mapStores(
			useSettingsStore,
			useLogStreamingStore,
			useWorkflowsStore,
			useUIStore,
			useCredentialsStore,
		),
		isLicensed(): boolean {
			return true;
			return this.settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.LogStreaming) || this.fakeLicense;
		},
	},
	methods: {
		async getDestinationDataFromREST(): Promise<any> {
			this.logStreamingStore.clearEventNames();
			this.logStreamingStore.clearDestinationItemTrees();
			this.allDestinations = [];
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
					this.allDestinations.push(destination);
				}
			}

			this.$forceUpdate();
		},
		async addDestination() {
			const newDestination = deepCopy(defaultMessageEventBusDestinationOptions);
			newDestination.id = uuid();
			this.logStreamingStore.addDestination(newDestination);
			this.uiStore.openModalWithData({
				name: LOG_STREAM_MODAL_KEY,
				data: {
					destination: newDestination,
					isNew: true,
					eventBus: this.eventBus,
				},
			});
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
			const editDestination = this.logStreamingStore.getDestination(destinationId);
			if (editDestination) {
				this.uiStore.openModalWithData({
					name: LOG_STREAM_MODAL_KEY,
					data: {
						destination: editDestination,
						isNew: false,
						eventBus: this.eventBus,
					},
				});
			}
		},
	},
});
</script>

<style lang="scss" module>
.header {
	display: flex;
	align-items: center;
	white-space: nowrap;

	*:first-child {
		flex-grow: 1;
	}
}

.destinationItem {
	margin-bottom: .5em;
}

</style>
