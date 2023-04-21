<template>
	<div>
		<div :class="$style.header">
			<div class="mb-2xl">
				<n8n-heading size="2xlarge">
					{{ $locale.baseText(`settings.log-streaming.heading`) }}
				</n8n-heading>
				<template v-if="environment !== 'production'">
					<strong>&nbsp;&nbsp;&nbsp;&nbsp;Disable License ({{ environment }})&nbsp;</strong>
					<el-switch v-model="disableLicense" size="large" data-test-id="disable-license-toggle" />
				</template>
			</div>
		</div>
		<template v-if="isLicensed">
			<div class="mb-l">
				<n8n-info-tip theme="info" type="note">
					<template>
						<span v-html="$locale.baseText('settings.log-streaming.infoText')"></span>
					</template>
				</n8n-info-tip>
			</div>
			<template v-if="storeHasItems()">
				<el-row
					:gutter="10"
					v-for="item in sortedItemKeysByLabel"
					:key="item.key"
					:class="$style.destinationItem"
				>
					<el-col v-if="logStreamingStore.items[item.key]?.destination">
						<event-destination-card
							:destination="logStreamingStore.items[item.key]?.destination"
							:eventBus="eventBus"
							:isInstanceOwner="isInstanceOwner"
							@remove="onRemove(logStreamingStore.items[item.key]?.destination?.id)"
							@edit="onEdit(logStreamingStore.items[item.key]?.destination?.id)"
						/>
					</el-col>
				</el-row>
				<div class="mt-m text-right">
					<n8n-button v-if="isInstanceOwner" size="large" @click="addDestination">
						{{ $locale.baseText(`settings.log-streaming.add`) }}
					</n8n-button>
				</div>
			</template>
			<template v-else>
				<div :class="$style.actionBoxContainer" data-test-id="action-box-licensed">
					<n8n-action-box
						:buttonText="$locale.baseText(`settings.log-streaming.add`)"
						@click="addDestination"
					>
						<template #heading>
							<span v-html="$locale.baseText(`settings.log-streaming.addFirstTitle`)" />
						</template>
					</n8n-action-box>
				</div>
			</template>
		</template>
		<template v-else>
			<div v-if="$locale.baseText('settings.log-streaming.infoText')" class="mb-l">
				<n8n-info-tip theme="info" type="note">
					<template>
						<span v-html="$locale.baseText('settings.log-streaming.infoText')"></span>
					</template>
				</n8n-info-tip>
			</div>
			<div :class="$style.actionBoxContainer" data-test-id="action-box-unlicensed">
				<n8n-action-box
					:description="$locale.baseText('settings.log-streaming.actionBox.description')"
					:buttonText="$locale.baseText('settings.log-streaming.actionBox.button')"
					@click="onContactUsClicked"
				>
					<template #heading>
						<span v-html="$locale.baseText('settings.log-streaming.actionBox.title')" />
					</template>
				</n8n-action-box>
			</div>
		</template>
	</div>
</template>

<script lang="ts">
import { v4 as uuid } from 'uuid';
import { mapStores } from 'pinia';
import mixins from 'vue-typed-mixins';
import { useWorkflowsStore } from '../stores/workflows';
import { useUsersStore } from '../stores/users';
import { useCredentialsStore } from '../stores/credentials';
import { useLogStreamingStore } from '../stores/logStreamingStore';
import { useSettingsStore } from '../stores/settings';
import { useUIStore } from '../stores/ui';
import { LOG_STREAM_MODAL_KEY, EnterpriseEditionFeature } from '../constants';
import {
	deepCopy,
	defaultMessageEventBusDestinationOptions,
	MessageEventBusDestinationOptions,
} from 'n8n-workflow';
import PageViewLayout from '@/components/layouts/PageViewLayout.vue';
import EventDestinationCard from '@/components/SettingsLogStreaming/EventDestinationCard.ee.vue';
import { createEventBus } from '@/event-bus';

export default mixins().extend({
	name: 'SettingsLogStreamingView',
	props: {},
	components: {
		PageViewLayout,
		EventDestinationCard,
	},
	data() {
		return {
			eventBus: createEventBus(),
			destinations: Array<MessageEventBusDestinationOptions>,
			disableLicense: false,
			allDestinations: [] as MessageEventBusDestinationOptions[],
			isInstanceOwner: false,
		};
	},
	async mounted() {
		if (!this.isLicensed) return;

		this.isInstanceOwner = this.usersStore.currentUser?.globalRole?.name === 'owner';
		// Prepare credentialsStore so modals can pick up credentials
		await this.credentialsStore.fetchCredentialTypes(false);
		await this.credentialsStore.fetchAllCredentials();
		this.uiStore.nodeViewInitialized = false;

		// fetch Destination data from the backend
		await this.getDestinationDataFromBackend();

		// since we are not really integrated into the hooks, we listen to the store and refresh the destinations
		this.logStreamingStore.$onAction(({ name, after }) => {
			if (name === 'removeDestination' || name === 'updateDestination') {
				after(async () => {
					this.$forceUpdate();
				});
			}
		});
		// refresh when a modal closes
		this.eventBus.on('destinationWasSaved', this.onDestinationWasSaved);
		// listen to remove emission
		this.eventBus.on('remove', this.onRemove);
		// listen to modal closing and remove nodes from store
		this.eventBus.on('closing', this.onBusClosing);
	},
	destroyed() {
		this.eventBus.off('destinationWasSaved', this.onDestinationWasSaved);
		this.eventBus.off('remove', this.onRemove);
		this.eventBus.off('closing', this.onBusClosing);
	},
	computed: {
		...mapStores(
			useSettingsStore,
			useLogStreamingStore,
			useWorkflowsStore,
			useUIStore,
			useUsersStore,
			useCredentialsStore,
		),
		sortedItemKeysByLabel() {
			const sortedKeys: Array<{ label: string; key: string }> = [];
			for (const [key, value] of Object.entries(this.logStreamingStore.items)) {
				sortedKeys.push({ key, label: value.destination?.label ?? 'Destination' });
			}
			return sortedKeys.sort((a, b) => a.label.localeCompare(b.label));
		},
		environment() {
			return process.env.NODE_ENV;
		},
		isLicensed(): boolean {
			if (this.disableLicense === true) return false;
			return this.settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.LogStreaming);
		},
	},
	methods: {
		onDestinationWasSaved() {
			this.$forceUpdate();
		},
		onBusClosing() {
			this.workflowsStore.removeAllNodes({ setStateDirty: false, removePinData: true });
			this.uiStore.stateIsDirty = false;
		},
		async getDestinationDataFromBackend(): Promise<void> {
			this.logStreamingStore.clearEventNames();
			this.logStreamingStore.clearDestinationItemTrees();
			this.allDestinations = [];
			const eventNamesData = await this.logStreamingStore.fetchEventNames();
			if (eventNamesData) {
				for (const eventName of eventNamesData) {
					this.logStreamingStore.addEventName(eventName);
				}
			}
			const destinationData: MessageEventBusDestinationOptions[] =
				await this.logStreamingStore.fetchDestinations();
			if (destinationData) {
				for (const destination of destinationData) {
					this.logStreamingStore.addDestination(destination);
					this.allDestinations.push(destination);
				}
			}
			this.$forceUpdate();
		},
		onContactUsClicked() {
			window.open('mailto:sales@n8n.io', '_blank');
			this.$telemetry.track('user clicked contact us button', {
				feature: EnterpriseEditionFeature.LogStreaming,
			});
		},
		storeHasItems(): boolean {
			return this.logStreamingStore.items && Object.keys(this.logStreamingStore.items).length > 0;
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
			await this.logStreamingStore.deleteDestination(destinationId);
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
	flex-direction: column;
	align-items: flex-start;
	white-space: nowrap;

	*:first-child {
		flex-grow: 1;
	}
}

.destinationItem {
	margin-bottom: 0.5em;
}
</style>
