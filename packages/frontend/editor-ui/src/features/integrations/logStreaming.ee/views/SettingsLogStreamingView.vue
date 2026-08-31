<script lang="ts" setup>
import { computed, nextTick, onBeforeMount, onMounted, ref, getCurrentInstance } from 'vue';
import { v4 as uuid } from 'uuid';
import { hasPermission } from '@/app/utils/rbac/permissions';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useLogStreamingStore } from '../logStreaming.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import { LOG_STREAM_MODAL_KEY, EnterpriseEditionFeature } from '@/app/constants';
import type { MessageEventBusDestinationOptions } from 'n8n-workflow';
import { deepCopy, defaultMessageEventBusDestinationOptions } from 'n8n-workflow';
import EventDestinationCard from '../components/EventDestinationCard.vue';
import { createEventBus } from '@n8n/utils/event-bus';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useI18n } from '@n8n/i18n';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

import { ElCol, ElRow, ElSwitch } from 'element-plus';
import {
	N8nEmptyState,
	N8nButton,
	N8nNotice,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
} from '@n8n/design-system';
const environment = process.env.NODE_ENV;

const settingsStore = useSettingsStore();
const logStreamingStore = useLogStreamingStore();
const workflowDocumentStore = injectWorkflowDocumentStore();
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

const isManagedByEnv = computed((): boolean => {
	return settingsStore.settings.logStreaming?.managedByEnv ?? false;
});

const isReadonly = computed((): boolean => isManagedByEnv.value || !canManageLogStreaming.value);

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
	workflowDocumentStore.value.removeAllNodes();
	uiStore.markStateClean();
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
	const foundNode = workflowDocumentStore.value.getNodeByName(destinationId);
	if (foundNode) {
		workflowDocumentStore.value.removeNode(foundNode);
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
	<N8nSettingsLayout size="wide">
		<N8nSettingsPageHeader
			:title="i18n.baseText('settings.log-streaming.heading')"
			:description="i18n.baseText('settings.log-streaming.description')"
			docs-url="https://docs.n8n.io/log-streaming/"
		/>
		<N8nSettingsSection v-if="environment !== 'production'">
			<N8nSettingsRowGroup>
				<N8nSettingsRow :title="`Disable License (${environment})`">
					<template #action>
						<ElSwitch v-model="disableLicense" size="large" data-test-id="disable-license-toggle" />
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>
		<template v-if="isLicensed">
			<N8nNotice
				v-if="isManagedByEnv"
				class="mb-l"
				:content="i18n.baseText('settings.log-streaming.managedByEnv')"
				data-test-id="log-streaming-managed-by-env"
			/>
			<template v-if="storeHasItems()">
				<ElRow
					v-for="item in sortedItemKeysByLabel"
					:key="item.key"
					:gutter="10"
					:class="$style.destinationItem"
				>
					<ElCol v-if="logStreamingStore.items[item.key]?.destination">
						<EventDestinationCard
							:destination="logStreamingStore.items[item.key]?.destination"
							:event-bus="eventBus"
							:readonly="isReadonly"
							@remove="onRemove(logStreamingStore.items[item.key]?.destination?.id)"
							@edit="onEdit(logStreamingStore.items[item.key]?.destination?.id)"
						/>
					</ElCol>
				</ElRow>
				<div v-if="!isReadonly" class="mt-m text-right">
					<N8nButton size="large" @click="addDestination">
						{{ i18n.baseText(`settings.log-streaming.add`) }}
					</N8nButton>
				</div>
			</template>
			<div v-else-if="!isManagedByEnv" data-test-id="action-box-licensed">
				<N8nEmptyState
					:button-text="i18n.baseText(`settings.log-streaming.add`)"
					@click:button="addDestination"
				>
					<template #heading>
						<span v-n8n-html="i18n.baseText(`settings.log-streaming.addFirstTitle`)" />
					</template>
				</N8nEmptyState>
			</div>
		</template>
		<template v-else>
			<div data-test-id="action-box-unlicensed">
				<N8nEmptyState
					:description="i18n.baseText('settings.log-streaming.actionBox.description')"
					:button-text="i18n.baseText('settings.log-streaming.actionBox.button')"
					@click:button="goToUpgrade"
				>
					<template #heading>
						<span v-n8n-html="i18n.baseText('settings.log-streaming.actionBox.title')" />
					</template>
				</N8nEmptyState>
			</div>
		</template>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
.destinationItem {
	margin-bottom: 0.5em;
}
</style>
