<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { AgentChatListItem } from '@n8n/api-types';
import {
	N8nAssistantIcon,
	N8nButton,
	N8nDropdownMenu,
	N8nIcon,
	N8nText,
	type DropdownMenuItemProps,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { DEBOUNCE_TIME } from '@/app/constants';
import { AGENT_N8N_CHAT_LIBRARY_VIEW } from '../../constants';
import { useN8nChatAgents } from '../composables/useN8nChatAgents';
import { useN8nAssistantIdentity } from '../composables/useN8nAssistantIdentity';
import { useAgentTelemetry } from '../../composables/useAgentTelemetry';
import { useAgentPermissions } from '../../composables/useAgentPermissions';
import { useCreateAgent } from '../../composables/useCreateAgent';
import AgentPersonalisationIcon from '../../components/AgentPersonalisationIcon.vue';

/** Non-agent id for the "n8n Assistant" row, which has no agent id of its own. */
const ASSISTANT_ITEM_ID = '__n8n_assistant__';
const PAGE_SIZE = 10;

type PickerItemData = { kind: 'assistant' } | { kind: 'agent'; agent: AgentChatListItem };

const props = defineProps<{
	/** `null` selects n8n Assistant. */
	modelValue: AgentChatListItem | null;
	projectId?: string;
}>();

const emit = defineEmits<{
	'update:modelValue': [agent: AgentChatListItem | null];
}>();

const i18n = useI18n();
const router = useRouter();
const agentTelemetry = useAgentTelemetry();
const { canCreate } = useAgentPermissions(() => props.projectId);
const { createAgent } = useCreateAgent();

const searchQuery = ref('');
const { agents, count, isLoading } = useN8nChatAgents({
	query: searchQuery,
	page: 1,
	pageSize: PAGE_SIZE,
});

const { name: assistantName, description: assistantDescription } = useN8nAssistantIdentity();

// The dropdown's internal search mode manages the search text and keyboard
// navigation but renders no filtering of its own (DropdownMenuSearchableContent
// only emits `search`) — the Assistant row's visibility is filtered here.
const showAssistantItem = computed(() => {
	const query = searchQuery.value.trim().toLowerCase();
	return query.length === 0 || assistantName.value.toLowerCase().includes(query);
});

const items = computed<Array<DropdownMenuItemProps<string, PickerItemData>>>(() => {
	const agentItems = agents.value.map((agent) => ({
		id: agent.id,
		testId: `n8n-chat-agent-picker-item-${agent.id}`,
		label: agent.name,
		data: { kind: 'agent' as const, agent },
	}));
	if (!showAssistantItem.value) return agentItems;
	return [
		{
			id: ASSISTANT_ITEM_ID,
			testId: 'n8n-chat-agent-picker-item-assistant',
			label: assistantName.value,
			data: { kind: 'assistant' as const },
		},
		...agentItems,
	];
});

function itemDescription(data?: PickerItemData): string | undefined {
	if (!data) return undefined;
	return data.kind === 'assistant' ? assistantDescription.value : data.agent.description;
}

const showViewAll = computed(() => count.value > PAGE_SIZE);
const canCreateInProject = computed(() => Boolean(props.projectId) && canCreate.value);
const showFooter = computed(() => showViewAll.value || canCreateInProject.value);

const selectedName = computed(() => props.modelValue?.name ?? assistantName.value);
const selectedDescription = computed(() =>
	props.modelValue ? props.modelValue.description : assistantDescription.value,
);

function handleSearch(term: string) {
	searchQuery.value = term;
}

function handleSelect(id: string) {
	if (id === ASSISTANT_ITEM_ID) {
		emit('update:modelValue', null);
		return;
	}
	const agent = agents.value.find((candidate) => candidate.id === id);
	if (!agent) return;
	emit('update:modelValue', agent);
	agentTelemetry.trackSelectedN8nChatAgent({ agentId: agent.id, source: 'dropdown' });
}

function goToLibrary() {
	void router.push({ name: AGENT_N8N_CHAT_LIBRARY_VIEW });
}

function handleCreateAgent() {
	if (!props.projectId) return;
	createAgent('dropdown', props.projectId);
}
</script>

<template>
	<div :class="$style.container" data-test-id="n8n-chat-agent-picker">
		<N8nText tag="h1" size="xlarge" bold :class="$style.heading">
			{{ i18n.baseText('agents.n8nChatPage.picker.chatWith') }}
			<N8nDropdownMenu
				:items="items"
				:loading="isLoading"
				searchable
				:search-placeholder="i18n.baseText('agents.n8nChatPage.library.search.placeholder')"
				:search-debounce="getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH)"
				:empty-text="i18n.baseText('agents.n8nChatPage.library.empty.noResults.title')"
				placement="bottom-start"
				max-height="50vh"
				content-test-id="n8n-chat-agent-picker-menu"
				@search="handleSearch"
				@select="handleSelect"
			>
				<template #trigger>
					<button
						type="button"
						:class="$style.trigger"
						data-test-id="n8n-chat-agent-picker-trigger"
					>
						<N8nAssistantIcon v-if="!modelValue" size="large" />
						<AgentPersonalisationIcon
							v-else
							:personalisation="modelValue.personalisation"
							:size="24"
						/>
						<span :class="$style.triggerName">{{ selectedName }}</span>
						<N8nIcon icon="chevron-down" size="small" color="text-light" />
					</button>
				</template>

				<template #item-leading="{ item, ui }">
					<span :class="[ui.class, $style.itemAvatar]">
						<N8nAssistantIcon v-if="item.data?.kind === 'assistant'" size="large" />
						<AgentPersonalisationIcon
							v-else
							:personalisation="
								item.data?.kind === 'agent' ? item.data.agent.personalisation : null
							"
							:size="24"
						/>
					</span>
				</template>

				<template #item-label="{ item }">
					<div :class="$style.itemLabel">
						<N8nText bold>{{ item.label }}</N8nText>
						<N8nText
							v-if="itemDescription(item.data)"
							size="small"
							color="text-light"
							:class="$style.itemDescription"
						>
							{{ itemDescription(item.data) }}
						</N8nText>
					</div>
				</template>

				<template v-if="showFooter" #footer>
					<div :class="$style.footer">
						<N8nButton
							v-if="showViewAll"
							variant="ghost"
							data-test-id="n8n-chat-agent-picker-view-all"
							@click="goToLibrary"
						>
							{{ i18n.baseText('agents.n8nChatPage.viewAllAgents') }}
							<N8nIcon icon="chevron-right" size="small" />
						</N8nButton>
						<N8nButton
							v-if="canCreateInProject"
							variant="ghost"
							icon="plus"
							data-test-id="n8n-chat-agent-picker-create"
							@click="handleCreateAgent"
						>
							{{ i18n.baseText('agents.n8nChatPage.picker.createNewAgent') }}
							<!-- Opens the agent builder, a new page. -->
							<N8nIcon icon="external-link" size="small" />
						</N8nButton>
					</div>
				</template>
			</N8nDropdownMenu>
		</N8nText>
		<N8nText
			v-if="selectedDescription"
			tag="p"
			color="text-light"
			:class="$style.subtitle"
			data-test-id="n8n-chat-agent-picker-subtitle"
		>
			{{ selectedDescription }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--2xs);
	text-align: center;
}

.heading {
	display: inline-flex;
	align-items: center;
	flex-wrap: wrap;
	justify-content: center;
	gap: var(--spacing--2xs);
}

.trigger {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: 0;
	font: inherit;
	font-weight: inherit;
	color: inherit;
	background: none;
	border: none;
	cursor: pointer;
}

.triggerName {
	text-decoration: underline dotted;
	text-underline-offset: var(--spacing--5xs);
}

.subtitle {
	max-width: 480px;
}

// Top-aligned next to a two-line label, not centered.
.itemAvatar {
	align-self: flex-start;
	display: inline-flex;
}

.itemLabel {
	display: flex;
	flex-direction: column;
	min-width: 0;
	line-height: var(--line-height--sm);
}

.itemDescription {
	line-height: var(--line-height--sm);
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
}

.footer {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--2xs);
	gap: var(--spacing--4xs);
}
</style>
