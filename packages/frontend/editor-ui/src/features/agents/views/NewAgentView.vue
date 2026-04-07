<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { N8nButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import ChatInputBase from '@/features/ai/shared/components/ChatInputBase.vue';
import { createAgent } from '../composables/useAgentApi';
import { AGENT_BUILDER_VIEW } from '../constants';

const router = useRouter();
const locale = useI18n();
const rootStore = useRootStore();
const usersStore = useUsersStore();
const projectsStore = useProjectsStore();

const projectId = computed(() => projectsStore.personalProject?.id ?? '');
const firstName = computed(() => usersStore.currentUser?.firstName ?? '');

const inputText = ref('');
const isCreating = ref(false);

interface SuggestionTemplate {
	icon: string;
	name: string;
	description: string;
	prompt: string;
}

const suggestions: SuggestionTemplate[] = [
	{
		icon: '🔍',
		name: 'SEO Audit',
		description:
			'An SEO auditor. Give it a website URL and it crawls the pages, identifies issues, and suggests improvements.',
		prompt:
			'Create an SEO auditor agent. It should accept a website URL, crawl the pages, identify SEO issues like missing meta tags, broken links, slow load times, and suggest improvements.',
	},
	{
		icon: '👋',
		name: 'Recruiting Sourcer',
		description:
			'A recruiting sourcer. Give it a job description and it finds matching candidates from multiple platforms.',
		prompt:
			'Create a recruiting sourcer agent. It should accept a job description, search for matching candidates across platforms, and compile a shortlist with contact info and relevance scores.',
	},
	{
		icon: '📬',
		name: 'Inbox Sorter',
		description:
			'Sort your inbox, classifying emails by sender and marking them as read when they match your rules.',
		prompt:
			'Create an inbox sorter agent. It should classify incoming emails by sender and topic, apply user-defined rules to mark as read, label, or archive, and provide a daily summary.',
	},
];

async function createBlank() {
	if (isCreating.value) return;
	isCreating.value = true;
	try {
		const agent = await createAgent(rootStore.restApiContext, projectId.value, 'New Agent');
		void router.push({
			name: AGENT_BUILDER_VIEW,
			params: { projectId: projectId.value, agentId: agent.id },
		});
	} finally {
		isCreating.value = false;
	}
}

async function submitDescription() {
	if (isCreating.value || !inputText.value.trim()) return;
	isCreating.value = true;
	try {
		const agent = await createAgent(rootStore.restApiContext, projectId.value, 'New Agent');
		void router.push({
			name: AGENT_BUILDER_VIEW,
			params: { projectId: projectId.value, agentId: agent.id },
			query: { prompt: inputText.value.trim() },
		});
	} finally {
		isCreating.value = false;
	}
}

function selectSuggestion(suggestion: SuggestionTemplate) {
	inputText.value = suggestion.prompt;
}
</script>

<template>
	<div :class="$style.page">
		<div :class="$style.topBar">
			<N8nText tag="span" bold size="large">{{ locale.baseText('agents.newAgent.title') }}</N8nText>
			<N8nButton
				:label="locale.baseText('agents.newAgent.createBlank')"
				type="secondary"
				size="medium"
				icon="file"
				:loading="isCreating"
				data-testid="create-blank-agent"
				@click="createBlank"
			/>
		</div>

		<div :class="$style.center">
			<h1 :class="$style.heading">
				{{
					locale.baseText('agents.newAgent.heading', {
						interpolate: { name: firstName ? `, ${firstName}` : '' },
					})
				}}
			</h1>

			<div :class="$style.inputWrapper">
				<ChatInputBase
					v-model="inputText"
					:placeholder="locale.baseText('agents.newAgent.placeholder')"
					:is-streaming="false"
					:can-submit="inputText.trim().length > 0 && !isCreating"
					:show-voice="true"
					:show-attach="false"
					@submit="submitDescription"
				/>
			</div>

			<div :class="$style.suggestions">
				<N8nText :class="$style.suggestionsLabel" size="small" color="text-light">
					{{ locale.baseText('agents.newAgent.suggestions') }}
				</N8nText>

				<div
					v-for="suggestion in suggestions"
					:key="suggestion.name"
					:class="$style.suggestionCard"
					data-testid="agent-suggestion-card"
					@click="selectSuggestion(suggestion)"
				>
					<span :class="$style.suggestionIcon">{{ suggestion.icon }}</span>
					<div :class="$style.suggestionContent">
						<N8nText tag="span" bold size="small">{{ suggestion.name }}</N8nText>
						<N8nText tag="span" size="small" color="text-light">
							{{ suggestion.description }}
						</N8nText>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style module>
.page {
	display: flex;
	flex-direction: column;
	height: 100%;
	width: 100%;
	background-color: var(--color--background);
}

.topBar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--sm) var(--spacing--lg);
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
}

.center {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--2xl) var(--spacing--lg);
	max-width: 640px;
	margin: 0 auto;
	width: 100%;
}

.heading {
	font-size: var(--font-size--2xl);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	margin: 0 0 var(--spacing--lg);
	text-align: center;
}

.inputWrapper {
	width: 100%;
	margin-bottom: var(--spacing--xl);
}

.suggestions {
	width: 100%;
}

.suggestionsLabel {
	display: block;
	margin-bottom: var(--spacing--xs);
}

.suggestionCard {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-radius: var(--radius--lg);
	cursor: pointer;
	transition: background-color 0.15s ease;
}

.suggestionCard:hover {
	background-color: var(--color--foreground--tint-2);
}

.suggestionIcon {
	font-size: var(--font-size--md);
	line-height: var(--line-height--xl);
	flex-shrink: 0;
}

.suggestionContent {
	display: flex;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.suggestionContent span:last-child {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
