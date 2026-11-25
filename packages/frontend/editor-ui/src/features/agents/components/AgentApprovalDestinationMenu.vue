<script setup lang="ts">
import { computed, nextTick, reactive, ref, shallowRef, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { N8nButton, N8nIcon, N8nInput, N8nPopover } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import {
	AGENT_DECISION_TRIGGER_NODE_TYPE,
	type AgentHitlChannelDescriptor,
	type AgentHitlOption,
} from '@n8n/api-types';
import { DEBOUNCE_TIME } from '@/app/constants';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { getAgentHitlChannels, getAgentHitlChannelOptions } from '../composables/useAgentApi';
import { useCreateApprovalWorkflow } from '../composables/useCreateApprovalWorkflow';
import { approvalName, type ApprovalDestination } from '../utils/approvalDestination';
import type { AgentHitlContext } from './agent-hitl.types';

const props = defineProps<{
	context: AgentHitlContext;
	projectId: string;
	disabled?: boolean;
	existing?: boolean;
	excludeIds?: string[];
	iconOnly?: boolean;
	label: string;
	testId?: string;
}>();
const emit = defineEmits<{
	select: [destination: ApprovalDestination];
	attach: [id: string];
}>();
defineSlots<{ trigger?: () => unknown }>();
const i18n = useI18n();
const toast = useToast();
const api = useRootStore().restApiContext;
const workflows = useWorkflowsListStore();
const createWorkflow = useCreateApprovalWorkflow();
const PAGE_SIZE = 20;
const existingApprovers = computed(() =>
	(props.context.getConfig()?.hitlConfigurations ?? []).filter(
		({ id }) => !props.excludeIds?.includes(id),
	),
);
const open = ref(false);
const agentId = computed(() => props.context.agentId);
const busy = ref(false);
const channels = ref<AgentHitlChannelDescriptor[]>([]);
const source = ref<'workflow' | AgentHitlChannelDescriptor>();
const guild = ref<AgentHitlOption>();
const query = ref('');
type DestinationSource = NonNullable<typeof source.value>;
interface DestinationPage {
	source: DestinationSource;
	guildId?: string;
	agentId?: string;
	query: string;
	options: AgentHitlOption[];
	cursor?: string;
	hasMore: boolean;
	loading: boolean;
	failed: boolean;
	target: number;
}

const cache = new Map<string, DestinationPage>();
let menuSession = 0;
const page = shallowRef<DestinationPage>();
const options = computed(() => page.value?.options.slice(0, page.value.target) ?? []);
const loading = computed(() => page.value?.loading ?? false);
const failed = computed(() => page.value?.failed ?? false);
const searchArea = ref<HTMLElement>();
const sources = ref<HTMLElement>();
const list = ref<HTMLElement>();
const requiresGuild = computed(
	() =>
		typeof source.value === 'object' &&
		source.value.fields.some((field) => field.name === 'guild') &&
		!guild.value,
);
const textDestination = computed(
	() =>
		typeof source.value === 'object' && source.value.fields.some((field) => field.type === 'text'),
);
const showDiscordSearchHint = computed(
	() =>
		typeof source.value === 'object' &&
		source.value.channel === 'discord' &&
		!requiresGuild.value &&
		!query.value.trim() &&
		!loading.value &&
		!failed.value &&
		!options.value.some((row) => row.kind === 'user'),
);
const groups = computed<Array<{ label: string; rows: AgentHitlOption[]; hint?: string }>>(() => {
	const visible = options.value;
	if (source.value === 'workflow')
		return [{ label: i18n.baseText('agents.hitl.workflows'), rows: visible }];
	if (requiresGuild.value) return [{ label: i18n.baseText('agents.hitl.server'), rows: visible }];
	return [
		{
			label: i18n.baseText('agents.hitl.people'),
			rows: visible.filter((row) => row.kind === 'user'),
			hint: showDiscordSearchHint.value
				? i18n.baseText('agents.hitl.discordPeopleSearchHint')
				: undefined,
		},
		{
			label: i18n.baseText('agents.hitl.channels'),
			rows: visible.filter((row) => row.kind === 'channel'),
		},
	];
});
const telegramId = computed(() => {
	const id = query.value.trim();
	return /^\d+$/.test(id) ? id : undefined;
});

watch([open, agentId, () => props.projectId], async ([value, id, projectId], _, onCleanup) => {
	menuSession++;
	cache.clear();
	page.value = undefined;
	source.value = undefined;
	channels.value = [];
	let active = true;
	onCleanup(() => {
		active = false;
	});
	if (!value || !id) return;
	try {
		const result = await getAgentHitlChannels(api, projectId, id);
		if (active) channels.value = result;
	} catch (error) {
		if (active) toast.showError(error, i18n.baseText('agents.hitl.loadFailed'));
	}
});

function currentPage() {
	const selected = source.value;
	if (!selected || textDestination.value) return undefined;
	const guildId = guild.value?.id;
	const search = query.value.trim().slice(0, 200);
	const sourceKey = selected === 'workflow' ? selected : [selected.channel, selected.credentialId];
	const key = JSON.stringify([sourceKey, guildId, search]);
	let entry = cache.get(key);
	if (!entry) {
		entry = reactive<DestinationPage>({
			source: selected,
			guildId,
			agentId: agentId.value,
			query: search,
			options: [],
			hasMore: true,
			loading: false,
			failed: false,
			target: PAGE_SIZE,
		});
		cache.set(key, entry);
	}
	return entry;
}

async function load(entry: DestinationPage | undefined = page.value) {
	if (!entry || !open.value || entry.loading || !entry.hasMore) return;
	const selected = entry.source;
	const session = menuSession;
	const projectId = props.projectId;
	entry.loading = true;
	entry.failed = false;
	try {
		while (open.value && entry.hasMore && entry.options.length < entry.target) {
			if (selected === 'workflow') {
				const rows = await workflows.searchWorkflows({
					projectId,
					query: entry.query,
					triggerNodeTypes: [AGENT_DECISION_TRIGGER_NODE_TYPE],
					isArchived: false,
					select: ['id', 'name'],
					options: {
						take: PAGE_SIZE,
						skip: entry.options.length,
						sortBy: 'name:asc',
						includeScopes: false,
					},
				});
				entry.options.push(...rows.map(({ id, name }) => ({ id, name })));
				entry.hasMore = rows.length === PAGE_SIZE;
			} else if (entry.agentId) {
				const field =
					!entry.guildId && selected.fields.some((item) => item.name === 'guild')
						? 'guild'
						: 'recipient';
				const result = await getAgentHitlChannelOptions(api, projectId, entry.agentId, {
					channel: selected.channel,
					credentialId: selected.credentialId,
					field,
					query: entry.query,
					cursor: entry.cursor,
					guildId: entry.guildId,
				});
				entry.options.push(
					...result.options.filter(
						(row) =>
							!entry.options.some((option) => row.id === option.id && row.kind === option.kind),
					),
				);
				entry.hasMore = !!result.nextCursor && result.nextCursor !== entry.cursor;
				entry.cursor = result.nextCursor;
			} else {
				entry.hasMore = false;
			}
			// Stop fetching a cached page if this menu session has ended.
			if (session !== menuSession) return;
		}
	} catch {
		entry.failed = true;
	} finally {
		entry.loading = false;
	}
}

const search = useDebounceFn((entry: DestinationPage | undefined) => {
	if (entry === page.value) return load(entry);
}, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));

function showPage(debounce = false) {
	page.value = currentPage();
	if (list.value) list.value.scrollTop = 0;
	if (debounce) void search(page.value);
	else void load();
}
function setQuery(value: string | number) {
	query.value = String(value);
	showPage(true);
}
function activate(value: typeof source.value) {
	if (busy.value || source.value === value) return;
	source.value = value;
	guild.value = undefined;
	query.value = '';
	showPage();
}

function onScroll(event: Event) {
	const target = event.currentTarget;
	const entry = page.value;
	if (
		entry &&
		(entry.hasMore || entry.options.length > entry.target) &&
		!entry.loading &&
		!entry.failed &&
		target instanceof HTMLElement &&
		target.scrollHeight - target.scrollTop - target.clientHeight < 40
	) {
		entry.target += PAGE_SIZE;
		void load(entry);
	}
}
function choose(row: AgentHitlOption) {
	if (busy.value || props.disabled) return;
	const selected = source.value;
	if (selected === 'workflow') {
		emit('select', { method: 'workflow', workflowId: row.id, name: row.name });
	} else if (selected) {
		if (requiresGuild.value) {
			guild.value = row;
			query.value = '';
			showPage();
			return;
		}
		if (!row.kind) return;
		emit('select', {
			method: 'channel',
			channel: selected.channel,
			credentialId: selected.credentialId,
			guildId: guild.value?.id,
			recipient: { id: row.id, kind: row.kind, name: row.name },
			name: row.name,
		});
	}
	open.value = false;
}
function chooseTelegram() {
	const id = telegramId.value;
	if (id) choose({ id, name: id, kind: 'user' });
}
async function create() {
	if (busy.value || props.disabled) return;
	busy.value = true;
	try {
		const workflow = await createWorkflow(props.projectId, props.context.getConfig()?.name);
		if (props.disabled) return;
		emit('select', { method: 'workflow', workflowId: workflow.id, name: workflow.name });
		open.value = false;
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.hitl.createFailed'));
	} finally {
		busy.value = false;
	}
}
function focusSourceFromResult(event: KeyboardEvent) {
	if (event.target instanceof HTMLInputElement) return;
	event.preventDefault();
	sources.value?.querySelector<HTMLButtonElement>('button[aria-expanded="true"]')?.focus();
}

async function enter(value: typeof source.value) {
	activate(value);
	await nextTick();
	searchArea.value?.querySelector('input')?.focus();
}
</script>

<template>
	<N8nPopover
		v-model:open="open"
		:teleported="false"
		position-strategy="fixed"
		:enable-scrolling="false"
		:content-class="$style.popover"
	>
		<template #trigger>
			<slot name="trigger">
				<N8nButton
					variant="ghost"
					icon="plus"
					:icon-only="iconOnly"
					:disabled="disabled || busy"
					:loading="busy"
					:aria-label="label"
					:data-testid="testId"
					><template v-if="!iconOnly">{{ label }}</template></N8nButton
				>
			</slot>
		</template>
		<template #content>
			<div :class="$style.menu">
				<div ref="sources" :class="$style.sources">
					<template v-if="existing && existingApprovers.length">
						<button
							v-for="configuration in existingApprovers"
							:key="configuration.id"
							type="button"
							:class="$style.item"
							@pointerenter="activate(undefined)"
							@click="
								emit('attach', configuration.id);
								open = false;
							"
						>
							<N8nIcon
								:icon="configuration.method === 'workflow' ? 'workflow' : configuration.channel"
							/>
							{{ approvalName(configuration) }}
						</button>
						<hr :class="$style.separator" />
					</template>
					<button
						type="button"
						:class="$style.item"
						:aria-expanded="source === 'workflow'"
						:disabled="busy"
						@pointerenter="activate('workflow')"
						@click="enter('workflow')"
						@keydown.right.prevent="enter('workflow')"
					>
						<N8nIcon icon="workflow" />{{ i18n.baseText('agents.hitl.workflowMethod') }}
						<N8nIcon icon="chevron-right" :class="$style.chevron" />
					</button>
					<button
						v-for="channel in channels"
						:key="`${channel.channel}:${channel.credentialId}`"
						type="button"
						:class="$style.item"
						:aria-expanded="source === channel"
						:disabled="busy"
						@pointerenter="activate(channel)"
						@click="enter(channel)"
						@keydown.right.prevent="enter(channel)"
					>
						<N8nIcon :icon="channel.channel" />{{ channel.label }}
						<N8nIcon icon="chevron-right" :class="$style.chevron" />
					</button>
				</div>
				<div
					v-if="source"
					ref="searchArea"
					:class="$style.destination"
					@keydown.left="focusSourceFromResult"
				>
					<div :class="$style.search">
						<N8nInput
							:model-value="query"
							:maxlength="200"
							:placeholder="
								i18n.baseText(textDestination ? 'agents.hitl.telegramUserId' : 'generic.search')
							"
							:aria-label="
								i18n.baseText(textDestination ? 'agents.hitl.telegramUserId' : 'generic.search')
							"
							@update:model-value="setQuery"
							@keydown.enter.prevent="textDestination && chooseTelegram()"
						/>
					</div>
					<button
						v-if="source === 'workflow'"
						:class="$style.item"
						type="button"
						:disabled="busy"
						@click="create"
					>
						<N8nIcon icon="plus" />{{ i18n.baseText('agents.hitl.createWorkflow') }}
					</button>
					<button
						v-if="textDestination"
						:class="$style.item"
						type="button"
						:disabled="!telegramId"
						@click="chooseTelegram"
					>
						{{ i18n.baseText('agents.hitl.useTelegramId') }}
					</button>
					<div
						v-else
						ref="list"
						data-testid="approval-destination-results"
						:class="$style.results"
						@scroll="onScroll"
					>
						<div
							v-for="group in groups.filter((entry) => entry.rows.length || entry.hint)"
							:key="group.label"
							:class="$style.group"
						>
							<div :class="$style.caption">{{ group.label }}</div>
							<div v-if="group.hint" :class="$style.caption">{{ group.hint }}</div>
							<button
								v-for="row in group.rows"
								:key="row.id"
								:class="$style.item"
								type="button"
								@click="choose(row)"
							>
								{{ row.name }}
							</button>
						</div>
						<div v-if="failed" :class="$style.caption">
							{{ i18n.baseText('agents.hitl.destinationLoadFailed') }}
						</div>
						<div v-else-if="loading" :class="$style.caption" role="status">
							{{ i18n.baseText('agents.hitl.loading') }}
						</div>
						<div v-else-if="!options.length && !showDiscordSearchHint" :class="$style.caption">
							{{ i18n.baseText('agents.hitl.noDestinations') }}
						</div>
						<button v-if="failed" :class="$style.item" type="button" @click="load()">
							{{ i18n.baseText('agents.hitl.retry') }}
						</button>
					</div>
				</div>
			</div>
		</template>
	</N8nPopover>
</template>

<style module lang="scss">
.popover[data-state='open'] {
	background-color: transparent;
	box-shadow: none;
}
.menu {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--5xs);
	max-width: calc(100vw - var(--spacing--md));
}
.sources,
.destination {
	width: var(--spacing--5xl);
	min-width: 0;
	flex-shrink: 1;
	border-radius: var(--radius--xs);
	background-color: var(--background--surface);
	box-shadow: var(--shadow--md), var(--shadow--outline);
}
.sources,
.results {
	max-height: min(45vh, 20rem);
	overflow: auto;
}
.destination {
	max-height: min(45vh, 20rem);
	display: flex;
	flex-direction: column;
	overflow: hidden;
}
.results {
	min-height: 0;
}
.separator {
	border: 0;
	border-top: var(--border);
	margin: var(--spacing--5xs) 0;
}
.search,
.group {
	border-bottom: var(--border);
}
.search,
.caption {
	padding: var(--spacing--2xs) var(--spacing--xs);
}
.caption {
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtler);
}
.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: 0;
	text-align: left;
	background: transparent;
	color: var(--text-color);
	font-size: var(--font-size--sm);
	cursor: pointer;

	&:hover,
	&[aria-expanded='true'],
	&:focus-visible {
		background: var(--background--hover);
	}
	&:disabled {
		opacity: 0.5;
		cursor: default;
	}
}
.chevron {
	margin-left: auto;
}
</style>
