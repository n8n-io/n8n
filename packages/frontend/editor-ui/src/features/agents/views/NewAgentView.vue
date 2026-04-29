<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { N8nButton, N8nText } from '@n8n/design-system';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import ChatInputBase from '@/features/ai/shared/components/ChatInputBase.vue';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { createAgent } from '../composables/useAgentApi';
import { AGENT_BUILDER_VIEW } from '../constants';
import { useAgentBuilderStatus } from '../composables/useAgentBuilderStatus';
import AgentBuilderProgress from '../components/AgentBuilderProgress.vue';
import AgentBuilderUnconfiguredEmptyState from '../components/AgentBuilderUnconfiguredEmptyState.vue';
import { useI18n } from '@n8n/i18n';

const locale = useI18n();
const router = useRouter();
const route = useRoute();
const rootStore = useRootStore();
const usersStore = useUsersStore();
const projectsStore = useProjectsStore();
const telemetry = useTelemetry();
const { showError } = useToast();
const { isBuilderConfigured, fetchStatus } = useAgentBuilderStatus();

const projectId = computed(() =>
	typeof route.query.projectId === 'string'
		? route.query.projectId
		: (projectsStore.personalProject?.id ?? ''),
);
const firstName = computed(() => usersStore.currentUser?.firstName ?? '');

const inputText = ref('');
const isCreating = ref(false);

onMounted(async () => {
	try {
		await fetchStatus();
	} catch (error) {
		showError(error, locale.baseText('settings.agentBuilder.loadError'));
	}
});
// When set, we've created the agent and the progress overlay is streaming
// the build. We only route into the builder once the stream reports `done`.
const building = ref<{ agentId: string; message: string } | null>(null);

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
		telemetry.track('User created agent', {
			agent_id: agent.id,
			source: 'create_blank',
		});
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
	const message = inputText.value.trim();
	try {
		const agent = await createAgent(rootStore.restApiContext, projectId.value, 'New Agent');
		telemetry.track('User created agent', {
			agent_id: agent.id,
			source: 'description_prompt',
		});
		// Hand off to the progress overlay; it streams `/build` and fires `done`
		// once the agent is ready, at which point we route into the builder.
		building.value = { agentId: agent.id, message };
	} catch (e) {
		isCreating.value = false;
		throw e;
	}
}

function onBuildDone() {
	const target = building.value;
	if (!target) return;
	void router.push({
		name: AGENT_BUILDER_VIEW,
		params: { projectId: projectId.value, agentId: target.agentId },
	});
}

function selectSuggestion(suggestion: SuggestionTemplate) {
	inputText.value = suggestion.prompt;
	telemetry.track('User selected agent suggestion', {
		suggestion_name: suggestion.name,
	});
}
</script>

<template>
	<div :class="$style.page">
		<AgentBuilderUnconfiguredEmptyState v-if="!isBuilderConfigured" />
		<template v-else>
			<div v-if="building" :class="$style.buildingOverlay">
				<AgentBuilderProgress
					:project-id="projectId"
					:agent-id="building.agentId"
					:initial-message="building.message"
					@done="onBuildDone"
				/>
			</div>
			<div :class="$style.topBar">
				<N8nText tag="span" bold size="large">New agent</N8nText>
				<N8nButton
					label="Start blank"
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
					What should we build{{ firstName ? `, ${firstName}` : '' }}?
				</h1>

				<div :class="$style.inputWrapper">
					<ChatInputBase
						v-model="inputText"
						placeholder="Describe your agent…"
						:is-streaming="false"
						:can-submit="inputText.trim().length > 0 && !isCreating"
						:show-voice="true"
						:show-attach="false"
						@submit="submitDescription"
					/>
				</div>

				<div :class="$style.suggestions">
					<N8nText :class="$style.suggestionsLabel" tag="h3" size="medium" bold>
						Or try a template
					</N8nText>

					<div :class="$style.suggestionGrid">
						<div
							v-for="suggestion in suggestions"
							:key="suggestion.name"
							:class="$style.suggestionCard"
							data-testid="agent-suggestion-card"
							@click="selectSuggestion(suggestion)"
						>
							<div :class="$style.suggestionHeader">
								<span :class="$style.suggestionIcon">{{ suggestion.icon }}</span>
								<N8nText tag="span" bold size="small" :class="$style.suggestionName">
									{{ suggestion.name }}
								</N8nText>
							</div>
							<N8nText
								tag="span"
								size="small"
								color="text-light"
								:class="$style.suggestionDescription"
							>
								{{ suggestion.description }}
							</N8nText>
						</div>
					</div>
				</div>
			</div>
		</template>
	</div>
</template>

<style module>
.page {
	position: relative;
	display: flex;
	flex-direction: column;
	height: 100%;
	width: 100%;
}

.buildingOverlay {
	position: absolute;
	inset: 0;
	z-index: 10;
	display: flex;
	background: var(--color--background--light-3);
	backdrop-filter: blur(4px);
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
}

.inputWrapper {
	width: 100%;
	margin-bottom: var(--spacing--xl);
}

.suggestions {
	width: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.suggestionsLabel {
	margin: 0 0 var(--spacing--sm);
	text-align: center;
	color: var(--color--text);
}

.suggestionGrid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
	gap: var(--spacing--2xs);
	width: 100%;
}

.suggestionCard {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-radius: var(--radius--lg);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	cursor: pointer;
	transition: background-color 0.15s ease;
}

.suggestionCard:hover {
	background-color: var(--color--foreground--tint-2);
}

.suggestionHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.suggestionIcon {
	font-size: var(--font-size--md);
	line-height: var(--line-height--xl);
}

.suggestionName {
	white-space: nowrap;
}

.suggestionDescription {
	min-width: 0;
}
</style>
