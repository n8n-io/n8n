<script lang="ts" setup>
import { computed, nextTick, onBeforeMount, onMounted, ref, getCurrentInstance } from 'vue';
import { v4 as uuid } from 'uuid';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { hasPermission } from '@/utils/rbac/permissions';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useLogStreamingStore } from '@/stores/logStreaming.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUIStore } from '@/stores/ui.store';
import { LOG_STREAM_MODAL_KEY, EnterpriseEditionFeature } from '@/constants';
import type { MessageEventBusDestinationOptions } from 'n8n-workflow';
import { deepCopy, defaultMessageEventBusDestinationOptions } from 'n8n-workflow';
import EventDestinationCard from '@/components/SettingsLogStreaming/EventDestinationCard.ee.vue';
import { createEventBus } from '@n8n/utils/event-bus';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { useI18n } from '@n8n/i18n';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';

const environment = process.env.NODE_ENV;

const settingsStore = useSettingsStore();
const logStreamingStore = useLogStreamingStore();
const workflowsStore = useWorkflowsStore();
const uiStore = useUIStore();
const credentialsStore = useCredentialsStore();
const documentTitle = useDocumentTitle();
const i18n = useI18n();

const pageRedirectHelper = usePageRedirectionHelper();

const eventBus = createEventBus();
const disableLicense = ref(false);
const allDestinations = ref<MessageEventBusDestinationOptions[]>([]);

const sortedItemKeysByLabel = computed(() => {
	const sortedKeys: Array<{ label: string; key: string }> = [];
	for (const [key, value] of Object.entries(logStreamingStore.items)) {
		sortedKeys.push({ key, label: value.destination?.label ?? 'Destination' });
	}
	return sortedKeys.sort((a, b) => a.label.localeCompare(b.label));
});

const isLicensed = computed((): boolean => {
	if (disableLicense.value) return false;
	return settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.LogStreaming];
});

const canManageLogStreaming = computed((): boolean => {
	return hasPermission(['rbac'], { rbac: { scope: 'logStreaming:manage' } });
});

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.log-streaming.heading'));
	if (!isLicensed.value) return;

	// Prepare credentialsStore so modals can pick up credentials
	await credentialsStore.fetchCredentialTypes(false);
	await credentialsStore.fetchAllCredentials();
	uiStore.nodeViewInitialized = false;

	// fetch Destination data from the backend
	await getDestinationDataFromBackend();

	// since we are not really integrated into the hooks, we listen to the store and refresh the destinations
	logStreamingStore.$onAction(({ name, after }) => {
		if (name === 'removeDestination' || name === 'updateDestination') {
			after(async () => {
				forceUpdateInstance();
			});
		}
	});
	// refresh when a modal closes
	eventBus.on('destinationWasSaved', onDestinationWasSaved);
	// listen to remove emission
	eventBus.on('remove', onRemove);
	// listen to modal closing and remove nodes from store
	eventBus.on('closing', onBusClosing);
});

onBeforeMount(() => {
	eventBus.off('destinationWasSaved', onDestinationWasSaved);
	eventBus.off('remove', onRemove);
	eventBus.off('closing', onBusClosing);
});

function onDestinationWasSaved() {
	forceUpdateInstance();
}

function forceUpdateInstance() {
	const instance = getCurrentInstance();
	instance?.proxy?.$forceUpdate();
}

function onBusClosing() {
	workflowsStore.removeAllNodes({ setStateDirty: false, removePinData: true });
	uiStore.stateIsDirty = false;
}

async function getDestinationDataFromBackend(): Promise<void> {
	logStreamingStore.clearEventNames();
	logStreamingStore.clearDestinations();
	allDestinations.value = [];
	const eventNamesData = await logStreamingStore.fetchEventNames();
	if (eventNamesData) {
		for (const eventName of eventNamesData) {
			logStreamingStore.addEventName(eventName);
		}
	}
	const destinationData: MessageEventBusDestinationOptions[] =
		await logStreamingStore.fetchDestinations();
	if (destinationData) {
		for (const destination of destinationData) {
			logStreamingStore.addDestination(destination);
			allDestinations.value.push(destination);
		}
	}
	forceUpdateInstance();
}

function goToUpgrade() {
	void pageRedirectHelper.goToUpgrade('log-streaming', 'upgrade-log-streaming');
}

function storeHasItems(): boolean {
	return logStreamingStore.items && Object.keys(logStreamingStore.items).length > 0;
}

async function addDestination() {
	const newDestination = deepCopy(defaultMessageEventBusDestinationOptions);
	newDestination.id = uuid();
	logStreamingStore.addDestination(newDestination);
	await nextTick();
	uiStore.openModalWithData({
		name: LOG_STREAM_MODAL_KEY,
		data: {
			destination: newDestination,
			isNew: true,
			eventBus,
		},
	});
}

async function onRemove(destinationId?: string) {
	if (!destinationId) return;
	await logStreamingStore.deleteDestination(destinationId);
	const foundNode = workflowsStore.getNodeByName(destinationId);
	if (foundNode) {
		workflowsStore.removeNode(foundNode);
	}
}

async function onEdit(destinationId?: string) {
	if (!destinationId) return;
	const editDestination = logStreamingStore.getDestination(destinationId);
	if (editDestination) {
		uiStore.openModalWithData({
			name: LOG_STREAM_MODAL_KEY,
			data: {
				destination: editDestination,
				isNew: false,
				eventBus,
			},
		});
	}
}
</script>

<template>
	<div>
		<div :class="$style.header">
			<div class="mb-2xl">
				<n8n-heading size="2xlarge">
					{{ i18n.baseText(`settings.log-streaming.heading`) }}
				</n8n-heading>
				<template v-if="environment !== 'production'">
					<span class="ml-m">Disable License ({{ environment }})&nbsp;</span>
					<el-switch v-model="disableLicense" size="large" data-test-id="disable-license-toggle" />
				</template>
			</div>
		</div>
		<template v-if="isLicensed">
			<div class="mb-l">
				<n8n-info-tip theme="info" type="note">
					<span v-n8n-html="i18n.baseText('settings.log-streaming.infoText')"></span>
				</n8n-info-tip>
			</div>
			<template v-if="storeHasItems()">
				<el-row
					v-for="item in sortedItemKeysByLabel"
					:key="item.key"
					:gutter="10"
					:class="$style.destinationItem"
				>
					<el-col v-if="logStreamingStore.items[item.key]?.destination">
						<EventDestinationCard
							:destination="logStreamingStore.items[item.key]?.destination"
							:event-bus="eventBus"
							:readonly="!canManageLogStreaming"
							@remove="onRemove(logStreamingStore.items[item.key]?.destination?.id)"
							@edit="onEdit(logStreamingStore.items[item.key]?.destination?.id)"
						/>
					</el-col>
				</el-row>
				<div class="mt-m text-right">
					<n8n-button v-if="canManageLogStreaming" size="large" @click="addDestination">
						{{ i18n.baseText(`settings.log-streaming.add`) }}
					</n8n-button>
				</div>
			</template>
			<div v-else data-test-id="action-box-licensed">
				<n8n-action-box
					:button-text="i18n.baseText(`settings.log-streaming.add`)"
					@click:button="addDestination"
				>
					<template #heading>
						<span v-n8n-html="i18n.baseText(`settings.log-streaming.addFirstTitle`)" />
					</template>
				</n8n-action-box>
			</div>
		</template>
		<template v-else>
			<div v-if="i18n.baseText('settings.log-streaming.infoText')" class="mb-l">
				<n8n-info-tip theme="info" type="note">
					<span v-n8n-html="i18n.baseText('settings.log-streaming.infoText')"></span>
				</n8n-info-tip>
			</div>
			<div data-test-id="action-box-unlicensed">
				<n8n-action-box
					:description="i18n.baseText('settings.log-streaming.actionBox.description')"
					:button-text="i18n.baseText('settings.log-streaming.actionBox.button')"
					@click:button="goToUpgrade"
				>
					<template #heading>
						<span v-n8n-html="i18n.baseText('settings.log-streaming.actionBox.title')" />
					</template>
				</n8n-action-box>
			</div>
		</template>
	</div>
</template>

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
