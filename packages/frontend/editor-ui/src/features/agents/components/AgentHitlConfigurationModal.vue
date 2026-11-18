<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useElementSize } from '@vueuse/core';
import { v4 as uuid } from 'uuid';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import {
	N8nButton,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nSettingsRowGroup,
	N8nSelect2,
	N8nSegmentControl,
	type SelectItem,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import {
	AGENT_DECISION_TRIGGER_NODE_TYPE,
	AgentHitlChannelSchema,
	type AgentHitlChannelDescriptor,
	type AgentHitlConfiguration,
	type AgentHitlOption,
} from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import { VIEWS } from '@/app/constants';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { getAgentHitlChannels, getAgentHitlChannelOptions } from '../composables/useAgentApi';
import type { AgentHitlContext } from './agent-hitl.types';
import AgentModal from './modals/AgentModal.vue';
import type { ChannelView } from './AgentChannelModal.vue';
import AgentFormSettingRow from './AgentFormSettingRow.vue';
import AgentHitlDestinationPicker from './AgentHitlDestinationPicker.vue';
import AgentHitlToolsSelect from './AgentHitlToolsSelect.vue';
import { hitlConfigurationToolKeys, hitlToolKeys } from '../utils/hitlConfiguration';

const AgentChannelModal = defineAsyncComponent(() => import('./AgentChannelModal.vue'));

const props = defineProps<{
	projectId: string;
	context: AgentHitlContext;
	configuration?: AgentHitlConfiguration;
	nextNumber: number;
	hideRemove?: boolean;
	/** Preselects the tool that opened this modal. */
	includeToolKey?: string;
}>();
const emit = defineEmits<{
	save: [configuration: AgentHitlConfiguration, toolKeys?: string[]];
	close: [];
	remove: [];
}>();
const i18n = useI18n();
const toast = useToast();
const router = useRouter();
const rootStore = useRootStore();
const workflowsStore = useWorkflowsStore();
const workflowList = useWorkflowsListStore();
const customName = ref(props.configuration?.nameOverridden ? props.configuration.name : '');
const expirySeconds = ref<AgentHitlConfiguration['expirySeconds'] | 'none'>(
	props.configuration?.expirySeconds ?? 'none',
);
const method = ref<'workflow' | 'channel'>(props.configuration?.method ?? 'workflow');
const workflowId = ref(
	props.configuration?.method === 'workflow' ? props.configuration.workflowId : '',
);
const workflowHref = computed(() =>
	workflowId.value
		? router.resolve({ name: VIEWS.WORKFLOW, params: { workflowId: workflowId.value } }).href
		: undefined,
);
const workflows = ref<Array<{ id: string; name: string }>>([]);
const channels = ref<AgentHitlChannelDescriptor[]>([]);
const channelKey = ref(
	props.configuration?.method === 'channel'
		? `${props.configuration.channel}:${props.configuration.credentialId}`
		: '',
);
const channel = computed(() =>
	channels.value.find((item) => `${item.channel}:${item.credentialId}` === channelKey.value),
);
function channelLabel(item: AgentHitlChannelDescriptor) {
	const connections = channels.value.filter((other) => other.channel === item.channel);
	return connections.length > 1 ? `${item.label} ${connections.indexOf(item) + 1}` : item.label;
}
const channelSelectOpen = ref(false);
const channelModalOpen = ref(false);
const channelModalView = ref<ChannelView>('list');
const openingChannel = ref(false);
let connectedChannel: string | undefined;
let channelsChanged = false;
const channelItems = computed<SelectItem[]>(() => [
	{
		value: '__create_review_channel__',
		label: i18n.baseText('agents.hitl.createChannel'),
		icon: 'plus',
		onSelect: (event: Event) => {
			event.preventDefault();
			channelSelectOpen.value = false;
			void createChannel();
		},
	},
	...(channels.value.length ? [{ type: 'separator' as const }] : []),
	...channels.value.map((item) => ({
		value: `${item.channel}:${item.credentialId}`,
		label: channelLabel(item),
		icon: item.channel,
	})),
]);
function updateMethod(value: unknown) {
	if (value === 'workflow' || value === 'channel') method.value = value;
}
async function createChannel() {
	if (openingChannel.value) return;
	openingChannel.value = true;
	try {
		await props.context.ensureAgentPersisted?.();
		await nextTick();
		if (!props.context.getConfig()) return;
		if (!props.context.agentId) throw new Error(i18n.baseText('agents.hitl.channelAgentRequired'));
		channelModalView.value = 'list';
		channelModalOpen.value = true;
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.channels.modal.saveChannelError'));
	} finally {
		openingChannel.value = false;
	}
}
watch(channelModalOpen, async (open, wasOpen) => {
	if (open || !wasOpen || !props.context.agentId) return;
	loading.value = true;
	try {
		if (channelsChanged) await props.context.onChannelsChanged?.();
		channels.value = await getAgentHitlChannels(
			rootStore.restApiContext,
			props.projectId,
			props.context.agentId,
		);
		const added = channels.value.find((item) => item.channel === connectedChannel);
		if (added) channelKey.value = `${added.channel}:${added.credentialId}`;
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.hitl.loadFailed'));
	} finally {
		connectedChannel = undefined;
		channelsChanged = false;
		loading.value = false;
	}
});
function channelConnected(type: string) {
	connectedChannel = type;
	channelsChanged = true;
}
function updateExpiry(value: unknown) {
	if (typeof value !== 'string') return;
	const seconds = value === 'none' ? 'none' : Number(value);
	if (seconds === 'none' || seconds === 3600 || seconds === 86400 || seconds === 604800)
		expirySeconds.value = seconds;
}
function updateChannel(value: unknown) {
	channelKey.value = typeof value === 'string' ? value : '';
}
const recipient = ref<AgentHitlOption | undefined>(
	props.configuration?.method === 'channel'
		? {
				id: props.configuration.recipient.id,
				kind: props.configuration.recipient.kind,
				name: props.configuration.recipient.name ?? props.configuration.recipient.id,
			}
		: undefined,
);
const guild = ref<AgentHitlOption | undefined>(
	props.configuration?.method === 'channel' && props.configuration.guildId
		? { id: props.configuration.guildId, name: props.configuration.guildId }
		: undefined,
);
const telegramId = ref(
	props.configuration?.method === 'channel' && props.configuration.channel === 'telegram'
		? props.configuration.recipient.id
		: '',
);
const channelFields = computed(() => {
	const selectedChannel = channel.value;
	if (!selectedChannel) return [];
	const requiresGuild = selectedChannel.fields.some((field) => field.name === 'guild');
	return selectedChannel.fields
		.filter((field) => field.name !== 'recipient' || !requiresGuild || guild.value)
		.map((field) => ({
			...field,
			label: i18n.baseText(field.name === 'guild' ? 'agents.hitl.server' : 'agents.hitl.recipient'),
		}));
});
function updateDestination(field: 'guild' | 'recipient', value: AgentHitlOption | undefined) {
	if (field === 'guild') guild.value = value;
	else recipient.value = value;
}
const generatedName = computed(() => {
	const defaultName = i18n.baseText('agents.hitl.defaultName', {
		interpolate: { number: String(props.nextNumber) },
	});
	if (method.value === 'workflow') {
		return (
			workflows.value.find((workflow) => workflow.id === workflowId.value)?.name ??
			(props.configuration?.method === 'workflow' &&
			props.configuration.workflowId === workflowId.value
				? props.configuration.name
				: defaultName)
		);
	}
	const destination =
		channel.value?.channel === 'telegram' ? telegramId.value : recipient.value?.name;
	if (!channel.value || !destination) return defaultName;
	const destinationName =
		recipient.value?.kind === 'channel' && !destination.startsWith('#')
			? `#${destination}`
			: destination;
	return i18n.baseText('agents.hitl.channelName', {
		interpolate: { channel: channelLabel(channel.value), destination: destinationName },
	});
});
const name = computed({
	get: () => (customName.value.trim() ? customName.value : generatedName.value),
	set: (value: string) => {
		customName.value = value;
	},
});
const loading = ref(false);
const creating = ref(false);
const destinationValid = computed(() =>
	method.value === 'workflow'
		? Boolean(workflowId.value)
		: Boolean(
				channel.value &&
					(channel.value.channel === 'telegram'
						? /^\d+$/.test(telegramId.value)
						: recipient.value?.kind && (channel.value.channel !== 'discord' || guild.value)),
			),
);
const saveDisabledReason = computed(() => {
	if (!name.value.trim()) return i18n.baseText('agents.hitl.nameRequired');
	if (!destinationValid.value)
		return i18n.baseText(
			method.value === 'workflow' ? 'agents.hitl.workflowRequired' : 'agents.hitl.channelRequired',
		);
	return '';
});
const workflowSelectOpen = ref(false);
const workflowSearch = ref('');
watch(workflowSelectOpen, () => {
	workflowSearch.value = '';
});
const selectedWorkflowName = computed(
	() =>
		workflows.value.find((workflow) => workflow.id === workflowId.value)?.name ?? workflowId.value,
);
const filteredWorkflows = computed(() =>
	workflows.value.filter((workflow) =>
		workflow.name.toLocaleLowerCase().includes(workflowSearch.value.trim().toLocaleLowerCase()),
	),
);
function onWorkflowSearchKeydown(event: KeyboardEvent) {
	if (!['ArrowDown', 'ArrowUp', 'Escape', 'Tab'].includes(event.key)) event.stopPropagation();
}
const advancedExpanded = ref(false);
const hasTools = computed(() => hitlToolKeys(props.context.getConfig()).length > 0);
const selectedToolKeys = ref([
	...new Set([
		...hitlConfigurationToolKeys(props.context.getConfig(), props.configuration?.id),
		...(props.includeToolKey ? [props.includeToolKey] : []),
	]),
]);
const toolSelectionChanged = ref(false);
const workflowItems = computed<SelectItem[]>(() => [
	{
		value: '__create_hitl_workflow__',
		label: i18n.baseText('generic.create.workflow'),
		icon: 'plus',
		onSelect: (event: Event) => {
			event.preventDefault();
			workflowSelectOpen.value = false;
			void createWorkflow();
		},
	},
	{ type: 'separator' },
	...filteredWorkflows.value.map((workflow) => ({
		value: workflow.id,
		label: workflow.name,
		icon: 'workflow' as const,
	})),
]);
function updateWorkflow(value: unknown) {
	workflowId.value = typeof value === 'string' ? value : '';
}
function updateTools(value: string[]) {
	selectedToolKeys.value = value;
	toolSelectionChanged.value = true;
}
function saveConfiguration(configuration: AgentHitlConfiguration) {
	if (toolSelectionChanged.value) emit('save', configuration, selectedToolKeys.value);
	else emit('save', configuration);
}
watch(channelKey, () => {
	recipient.value = undefined;
	guild.value = undefined;
	telegramId.value = '';
});
watch(guild, () => {
	recipient.value = undefined;
});

async function load() {
	loading.value = true;
	const [workflowResult, channelResult] = await Promise.allSettled([
		workflowList.searchWorkflows({
			projectId: props.projectId,
			triggerNodeTypes: [AGENT_DECISION_TRIGGER_NODE_TYPE],
			isArchived: false,
			select: ['id', 'name'],
		}),
		props.context.agentId
			? getAgentHitlChannels(rootStore.restApiContext, props.projectId, props.context.agentId)
			: Promise.resolve([]),
	]);
	if (workflowResult.status === 'fulfilled') workflows.value = workflowResult.value;
	else toast.showError(workflowResult.reason, i18n.baseText('agents.hitl.workflowLoadFailed'));
	if (channelResult.status === 'fulfilled') channels.value = channelResult.value;
	else toast.showError(channelResult.reason, i18n.baseText('agents.hitl.loadFailed'));
	loading.value = false;
}

onMounted(load);
async function createWorkflow() {
	if (creating.value) return;
	creating.value = true;
	// Open the tab while the select event still counts as a user gesture, so browsers do not block it.
	const tab = window.open('', '_blank');
	try {
		const triggerId = uuid();
		const agentName = props.context.getConfig()?.name ?? i18n.baseText('agents.hitl.unnamedAgent');
		const existing = await workflowList.searchWorkflows({
			projectId: props.projectId,
			select: ['name'],
		});
		let workflowNumber = 1;
		const workflowName = (value: number) =>
			i18n.baseText('agents.hitl.workflowDefaultName', {
				interpolate: { agent: agentName, number: String(value) },
			});
		while (existing.some((workflow) => workflow.name === workflowName(workflowNumber)))
			workflowNumber++;
		const workflow = await workflowsStore.createNewWorkflow({
			name: workflowName(workflowNumber),
			projectId: props.projectId,
			nodes: [
				{
					id: triggerId,
					name: 'Agent review',
					type: AGENT_DECISION_TRIGGER_NODE_TYPE,
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: uuid(),
					name: 'Respond to agent review',
					type: 'n8n-nodes-base.agentDecisionResponse',
					typeVersion: 1,
					position: [480, 0],
					parameters: { approved: false },
				},
			],
			connections: {
				'Agent review': {
					main: [[{ node: 'Respond to agent review', type: 'main', index: 0 }]],
				},
			},
		});
		workflows.value = [...workflows.value, { id: workflow.id, name: workflow.name }];
		workflowId.value = workflow.id;
		const { href } = router.resolve({
			name: VIEWS.WORKFLOW,
			params: { workflowId: workflow.id, nodeId: triggerId },
		});
		if (tab) {
			tab.opener = null;
			tab.location.href = href;
		} else window.open(href, '_blank');
	} catch (error) {
		tab?.close();
		toast.showError(error, i18n.baseText('agents.hitl.createFailed'));
	} finally {
		creating.value = false;
	}
}
async function loadOptions(field: 'guild' | 'recipient', query: string, cursor?: string) {
	if (!channel.value || !props.context.agentId) return { options: [] };
	return await getAgentHitlChannelOptions(
		rootStore.restApiContext,
		props.projectId,
		props.context.agentId,
		{
			channel: channel.value.channel,
			credentialId: channel.value.credentialId,
			field,
			query,
			cursor,
			guildId: guild.value?.id,
		},
	);
}
function save() {
	if (saveDisabledReason.value || creating.value || openingChannel.value || channelModalOpen.value)
		return;
	const base = {
		id: props.configuration?.id ?? `review_${generateNanoId()}`,
		name: name.value.trim(),
		nameOverridden: Boolean(customName.value.trim()),
		expirySeconds: expirySeconds.value === 'none' ? undefined : expirySeconds.value,
	};
	if (method.value === 'workflow')
		saveConfiguration({ ...base, method: 'workflow', workflowId: workflowId.value });
	else if (channel.value) {
		const destination =
			channel.value.channel === 'telegram'
				? { id: telegramId.value, name: telegramId.value, kind: 'user' as const }
				: recipient.value;
		if (!destination?.kind) return;
		saveConfiguration({
			...base,
			method: 'channel',
			channel: channel.value.channel,
			credentialId: channel.value.credentialId,
			recipient: {
				...destination,
				kind: destination.kind,
			},
			...(guild.value ? { guildId: guild.value.id } : {}),
		});
	}
}
const fieldsRef = ref<HTMLElement>();
const { width: fieldsWidth } = useElementSize(fieldsRef);
const rowLayout = computed(() => (fieldsWidth.value < 480 ? 'vertical' : 'horizontal'));
</script>

<template>
	<div>
		<AgentModal
			:open="true"
			v-model:title="name"
			editable-title
			:busy="creating || openingChannel"
			:trap-focus="!channelModalOpen"
			:disable-outside-pointer-events="!channelModalOpen"
			stacked
			@update:open="emit('close')"
		>
			<div ref="fieldsRef" :class="$style.fields">
				<div :class="$style.destinationSettings">
					<AgentFormSettingRow
						:title="i18n.baseText('agents.hitl.method')"
						:class="{ [$style.stackedMethodRow]: rowLayout === 'vertical' }"
					>
						<N8nSegmentControl
							id="agent-hitl-method"
							:class="$style.methodControl"
							:model-value="method"
							:disabled="creating || openingChannel"
							:options="[
								{ value: 'workflow', label: i18n.baseText('agents.hitl.workflowMethod') },
								{ value: 'channel', label: i18n.baseText('agents.hitl.channelMethod') },
							]"
							:aria-label="i18n.baseText('agents.hitl.method')"
							data-testid="agent-hitl-method"
							@update:model-value="updateMethod"
						/>
					</AgentFormSettingRow>
					<N8nSettingsRowGroup
						:class="$style.settingsGroup"
						data-testid="agent-hitl-destination-section"
					>
						<AgentFormSettingRow
							v-if="method === 'workflow'"
							:title="i18n.baseText('agents.hitl.workflow')"
							:layout="rowLayout"
							action-max-width="66.666%"
							:class="$style.sectionRow"
						>
							<div :class="[$style.resourceRow, { [$style.withWorkflowLink]: workflowHref }]">
								<N8nSelect2
									size="large"
									:model-value="workflowId || undefined"
									v-model:open="workflowSelectOpen"
									:items="workflowItems"
									:disabled="loading || creating"
									:icon="workflowId ? 'workflow' : undefined"
									:aria-label="i18n.baseText('agents.hitl.workflow')"
									:placeholder="i18n.baseText('agents.hitl.selectWorkflow')"
									data-testid="agent-hitl-workflow"
									@update:model-value="updateWorkflow"
								>
									<template #default>
										{{ selectedWorkflowName || i18n.baseText('agents.hitl.selectWorkflow') }}
									</template>
									<template #header>
										<div :class="$style.workflowSearch">
											<N8nInput
												v-model="workflowSearch"
												:placeholder="i18n.baseText('agents.tools.workflow.search.placeholder')"
												:aria-label="i18n.baseText('agents.tools.workflow.search.placeholder')"
												data-testid="agent-hitl-workflow-search"
												@keydown="onWorkflowSearchKeydown"
											/>
										</div>
									</template>
									<template v-if="workflowSearch && !filteredWorkflows.length" #footer>
										<div :class="$style.workflowSearch">
											{{ i18n.baseText('agents.tools.workflow.empty.noResults') }}
										</div>
									</template>
								</N8nSelect2>
								<N8nIconButton
									v-if="workflowHref"
									icon="external-link"
									variant="ghost"
									size="small"
									:href="workflowHref"
									target="_blank"
									rel="noopener noreferrer"
									:title="i18n.baseText('agents.toolConfig.workflow.target.open')"
									:aria-label="i18n.baseText('agents.toolConfig.workflow.target.open')"
									data-testid="agent-hitl-workflow-open"
								/>
							</div>
						</AgentFormSettingRow>
						<template v-else>
							<AgentFormSettingRow
								:title="i18n.baseText('agents.hitl.channel')"
								:layout="rowLayout"
								action-max-width="66.666%"
								:class="$style.sectionRow"
							>
								<div :class="$style.resourceRow">
									<N8nSelect2
										:model-value="channelKey || undefined"
										v-model:open="channelSelectOpen"
										:placeholder="i18n.baseText('agents.hitl.selectChannel')"
										:teleported="false"
										:items="channelItems"
										:disabled="loading"
										size="large"
										:aria-label="i18n.baseText('agents.hitl.channel')"
										data-testid="agent-hitl-channel"
										@update:model-value="updateChannel"
									/>
								</div>
							</AgentFormSettingRow>
							<AgentFormSettingRow
								v-for="field in channelFields"
								:key="field.name"
								:title="field.label"
								:layout="rowLayout"
								action-max-width="66.666%"
								:class="$style.sectionRow"
							>
								<N8nInput
									v-if="field.type === 'text'"
									v-model="telegramId"
									size="large"
									inputmode="numeric"
									:aria-label="field.label"
									:class="$style.control"
									data-testid="agent-hitl-telegram-user"
								/>
								<AgentHitlDestinationPicker
									v-else
									:key="`${channelKey}:${field.name}:${field.name === 'recipient' ? guild?.id : ''}`"
									:model-value="field.name === 'guild' ? guild : recipient"
									:class="$style.control"
									:icon="field.name === 'guild' ? 'server' : 'hash'"
									:label="field.label"
									:load="(query, cursor) => loadOptions(field.name, query, cursor)"
									@update:model-value="updateDestination(field.name, $event)"
								/>
							</AgentFormSettingRow>
						</template>
						<div>
							<button
								type="button"
								:class="$style.advancedTrigger"
								:aria-expanded="advancedExpanded"
								aria-controls="agent-hitl-advanced-content"
								data-testid="agent-hitl-advanced"
								@click="advancedExpanded = !advancedExpanded"
							>
								{{ i18n.baseText('agents.hitl.advanced') }}
								<N8nIcon :icon="advancedExpanded ? 'chevron-up' : 'chevron-down'" size="medium" />
							</button>
							<div
								id="agent-hitl-advanced-content"
								v-show="advancedExpanded"
								:class="$style.advancedContent"
							>
								<AgentFormSettingRow
									:title="i18n.baseText('agents.hitl.expiry')"
									:layout="rowLayout"
									action-max-width="66.666%"
									:class="$style.sectionRow"
								>
									<N8nSelect2
										:model-value="String(expirySeconds)"
										@update:model-value="updateExpiry"
										size="large"
										:teleported="false"
										:items="[
											{ value: 'none', label: i18n.baseText('agents.hitl.expiry.none') },
											{ value: '3600', label: i18n.baseText('agents.hitl.expiry.hour') },
											{ value: '86400', label: i18n.baseText('agents.hitl.expiry.day') },
											{ value: '604800', label: i18n.baseText('agents.hitl.expiry.week') },
										]"
										:aria-label="i18n.baseText('agents.hitl.expiry')"
										:class="$style.control"
										data-testid="agent-hitl-expiry"
									/>
								</AgentFormSettingRow>
								<div v-if="hasTools" :class="$style.sectionRow">
									<AgentHitlToolsSelect
										embedded
										:model-value="selectedToolKeys"
										:config="context.getConfig()"
										:get-custom-tool-name="context.getCustomToolName"
										@update:model-value="updateTools"
									/>
								</div>
							</div>
						</div>
					</N8nSettingsRowGroup>
				</div>
			</div>
			<template v-if="configuration && !hideRemove" #footerLeft>
				<N8nButton variant="ghost" data-testid="agent-hitl-remove" @click="emit('remove')">
					<template #icon><N8nIcon icon="trash-2" :size="16" /></template>
					{{ i18n.baseText('agents.builder.tools.remove') }}
				</N8nButton>
			</template>
			<template #footerActions>
				<N8nTooltip as-child :disabled="!saveDisabledReason" :teleported="false">
					<template #content>{{ saveDisabledReason }}</template>
					<span
						:class="$style.saveTrigger"
						:tabindex="saveDisabledReason ? 0 : undefined"
						data-testid="agent-hitl-save-trigger"
					>
						<N8nButton
							:label="i18n.baseText('agents.hitl.save')"
							:disabled="
								Boolean(saveDisabledReason) || creating || openingChannel || channelModalOpen
							"
							data-testid="agent-hitl-save"
							@click="save"
						/>
					</span>
				</N8nTooltip>
			</template>
		</AgentModal>
		<AgentChannelModal
			v-if="channelModalOpen && context.agentId"
			v-model:open="channelModalOpen"
			v-model:view="channelModalView"
			:agent-id="context.agentId"
			:is-published="context.isPublished"
			:project-id="projectId"
			:channel-types="AgentHitlChannelSchema.options"
			stacked
			@channel-connected="channelConnected"
			@channel-disconnected="channelsChanged = true"
			@agent-changed="channelsChanged = true"
		/>
	</div>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/focus';

.destinationSettings {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}
.stackedMethodRow {
	flex-direction: column;
	align-items: flex-start;
}
.fields {
	container-type: inline-size;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}
.methodControl {
	background-color: var(--background--hover);
}
.resourceRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: calc((100cqi - 2 * var(--spacing--md)) / 3);
	max-width: 100%;

	> :first-child {
		flex: 1;
		min-width: 0;
	}
}
.withWorkflowLink {
	// Keep the select width stable, but add space only for a visible link.
	width: calc((100cqi - 2 * var(--spacing--md)) / 3 + var(--spacing--lg) + var(--spacing--2xs));
}
.workflowSearch {
	padding: var(--spacing--4xs);
}
.saveTrigger {
	display: inline-flex;

	> button:disabled {
		pointer-events: none;
	}
}
.settingsGroup {
	border-radius: var(--radius--lg);
	background: transparent;
	overflow: visible;
}
.sectionRow {
	padding: var(--spacing--sm) var(--spacing--md);
	column-gap: var(--spacing--2xs);
	border-bottom: var(--border);

	&:last-child {
		border-bottom: 0;
	}
}
.advancedTrigger {
	@include focus.focus-visible-ring;
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	padding: var(--spacing--sm) var(--spacing--md);
	border: none;
	border-radius: 0 0 var(--radius--lg) var(--radius--lg);
	background: transparent;
	color: inherit;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	cursor: pointer;

	&:hover {
		background: var(--background--hover);
	}

	&[aria-expanded='true'] {
		border-radius: 0;
	}
}
.advancedContent {
	border-top: var(--border);
}
.control {
	width: calc((100cqi - 2 * var(--spacing--md)) / 3);
	max-width: 100%;
}
.sectionRow[data-layout='vertical'] {
	.control,
	.resourceRow {
		width: 100%;
	}
}
</style>
