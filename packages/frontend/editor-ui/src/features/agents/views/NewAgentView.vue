<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { N8nButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import ChatInputBase from '@/features/ai/shared/components/ChatInputBase.vue';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { createAgent } from '../composables/useAgentApi';
import { AGENT_BUILDER_VIEW } from '../constants';
import { useAgentBuilderStatus } from '../composables/useAgentBuilderStatus';
import { useAgentTelemetry } from '../composables/useAgentTelemetry';
import { buildAgentConfigFingerprint } from '../composables/agentTelemetry.utils';
import AgentBuilderProgress from '../components/AgentBuilderProgress.vue';
import AgentBuilderUnconfiguredEmptyState from '../components/AgentBuilderUnconfiguredEmptyState.vue';

const router = useRouter();
const route = useRoute();
const rootStore = useRootStore();
const usersStore = useUsersStore();
const projectsStore = useProjectsStore();
const telemetry = useTelemetry();
const agentTelemetry = useAgentTelemetry();
const i18n = useI18n();
const { showError } = useToast();
const { isBuilderConfigured, fetchStatus } = useAgentBuilderStatus();

const projectId = computed(() =>
	typeof route.query.projectId === 'string'
		? route.query.projectId
		: (projectsStore.personalProject?.id ?? ''),
);
const firstName = computed(() => usersStore.currentUser?.firstName ?? '');
const heading = computed(() =>
	firstName.value
		? i18n.baseText('agents.new.headingWithName', { interpolate: { name: firstName.value } })
		: i18n.baseText('agents.new.heading'),
);

const inputText = ref('');
const isCreating = ref(false);
const statusLoaded = ref(false);
const chatInputRef = ref<InstanceType<typeof ChatInputBase> | null>(null);

onMounted(async () => {
	try {
		await fetchStatus();
	} catch (error) {
		showError(error, i18n.baseText('settings.agentBuilder.loadError'));
	} finally {
		statusLoaded.value = true;
		await nextTick();
		if (isBuilderConfigured.value) {
			chatInputRef.value?.focus();
		}
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
	skills: SkillTemplate[];
}

interface SkillTemplate {
	name: string;
	description: string;
	body: string;
}

const suggestions: SuggestionTemplate[] = [
	{
		icon: '🔍',
		name: 'SEO Audit',
		description:
			'An SEO auditor. Give it a website URL and it crawls the pages, identifies issues, and suggests improvements.',
		prompt:
			'Create an SEO auditor agent. It should accept a website URL, crawl the pages, identify SEO issues like missing meta tags, broken links, slow load times, and suggest improvements.',
		skills: [
			{
				name: 'Technical SEO Triage',
				description:
					'Use when checking crawlability, indexability, structured data, or performance issues',
				body: [
					'Review the site in a technical SEO pass before recommending content changes.',
					'Check crawlability, indexability, robots directives, canonical tags, redirects, broken links, sitemap coverage, structured data, mobile usability, and page performance.',
					'Group findings by severity: critical blockers, ranking risks, and nice-to-have improvements.',
					'For every issue, explain the user impact, the likely SEO impact, and a concrete fix.',
				].join('\n'),
			},
			{
				name: 'SERP Snippet Review',
				description:
					'Use when evaluating titles, meta descriptions, headings, or search-result copy',
				body: [
					'Assess whether titles, meta descriptions, and H1s clearly match search intent.',
					'Prefer specific, benefit-led copy over generic marketing language.',
					'Flag missing, duplicate, overlong, or vague metadata.',
					'When rewriting snippets, keep titles concise and make meta descriptions actionable without overpromising.',
				].join('\n'),
			},
		],
	},
	{
		icon: '👋',
		name: 'Recruiting Sourcer',
		description:
			'A recruiting sourcer. Give it a job description and it finds matching candidates from multiple platforms.',
		prompt:
			'Create a recruiting sourcer agent. It should accept a job description, search for matching candidates across platforms, and compile a shortlist with contact info and relevance scores.',
		skills: [
			{
				name: 'Candidate Scorecard',
				description: 'Use when comparing candidates against a role or building a shortlist',
				body: [
					'Score candidates against the job requirements using explicit evidence from their profile.',
					'Separate must-have qualifications from nice-to-have signals.',
					'Call out uncertainty instead of inferring experience that is not visible.',
					'Return a concise scorecard with fit score, strongest evidence, possible gaps, and recommended next step.',
				].join('\n'),
			},
			{
				name: 'Personalized Outreach',
				description: 'Use when drafting initial candidate outreach or follow-up messages',
				body: [
					'Write concise, respectful outreach that references one or two specific candidate signals.',
					'Lead with why the role may be relevant to the candidate, not with company boilerplate.',
					'Keep the tone warm, direct, and low-pressure.',
					'Include a clear call to action and avoid exaggerated claims about fit.',
				].join('\n'),
			},
		],
	},
	{
		icon: '📬',
		name: 'Inbox Sorter',
		description:
			'Sort your inbox, classifying emails by sender and marking them as read when they match your rules.',
		prompt:
			'Create an inbox sorter agent. It should classify incoming emails by sender and topic, apply user-defined rules to mark as read, label, or archive, and provide a daily summary.',
		skills: [
			{
				name: 'Inbox Classification Rules',
				description: 'Use when categorizing, labeling, archiving, or marking emails as read',
				body: [
					'Classify emails by sender, topic, urgency, and whether a response is needed.',
					'Apply user rules conservatively: when a message is ambiguous, leave it visible and explain why.',
					'Never archive or mark an email as read if it appears urgent, personal, financial, legal, security-related, or action-required unless the user rule explicitly covers it.',
					'Prefer labels that make future review easier, such as Action Needed, FYI, Receipt, Newsletter, Scheduling, or Support.',
				].join('\n'),
			},
			{
				name: 'Daily Inbox Digest',
				description: 'Use when creating a daily or periodic summary of inbox activity',
				body: [
					'Summarize the inbox by priority, not by raw arrival order.',
					'Start with urgent or response-needed messages, then important updates, then low-priority bulk mail.',
					'Include sender, subject, one-line summary, recommended action, and due date if present.',
					'Keep the digest skimmable and avoid exposing unnecessary message body details.',
				].join('\n'),
			},
		],
	},
];

function buildPromptWithSkills(suggestion: SuggestionTemplate): string {
	if (suggestion.skills.length === 0) return suggestion.prompt;

	const skills = suggestion.skills
		.map(
			(skill) => `- ${skill.name}
  description: ${skill.description}
  body: ${skill.body}`,
		)
		.join('\n\n');

	return `${suggestion.prompt}

Also create these curated skills and attach them to the agent config. For each skill, call create_skill with the name, description, and body. After creating the skills, call read_config and patch_config to append the returned skill refs to the config skills array.

${skills}`;
}

async function createBlank() {
	if (isCreating.value) return;
	isCreating.value = true;
	try {
		const agent = await createAgent(
			rootStore.restApiContext,
			projectId.value,
			i18n.baseText('agents.new.defaultName'),
		);
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
		const agent = await createAgent(
			rootStore.restApiContext,
			projectId.value,
			i18n.baseText('agents.new.defaultName'),
		);
		telemetry.track('User created agent', {
			agent_id: agent.id,
			source: 'description_prompt',
		});
		// Mirror the build-chat submission event: the description prompt IS the
		// first build-mode message for this agent, just routed through the
		// progress overlay instead of AgentChatPanel. Fingerprint reflects the
		// fresh empty config (no instructions/tools/triggers/memory/model yet).
		try {
			const fingerprint = await buildAgentConfigFingerprint(null, []);
			agentTelemetry.trackSubmittedMessage({
				agentId: agent.id,
				mode: 'build',
				status: 'draft',
				agentConfig: fingerprint,
			});
		} catch {
			// Swallow — telemetry is best-effort and must not block the build.
		}
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
	inputText.value = buildPromptWithSkills(suggestion);
	telemetry.track('User selected agent suggestion', {
		suggestion_name: suggestion.name,
	});
}
</script>

<template>
	<div :class="$style.page">
		<AgentBuilderUnconfiguredEmptyState v-if="statusLoaded && !isBuilderConfigured" />
		<template v-else-if="statusLoaded">
			<Transition name="building-overlay">
				<div v-if="building" :class="$style.buildingOverlay">
					<AgentBuilderProgress
						:project-id="projectId"
						:agent-id="building.agentId"
						:initial-message="building.message"
						@done="onBuildDone"
					/>
				</div>
			</Transition>
			<Transition name="new-agent-content">
				<div v-if="!building" :class="$style.content">
					<div :class="$style.topBar">
						<N8nButton
							:label="i18n.baseText('agents.new.startBlank')"
							variant="ghost"
							size="medium"
							icon="file"
							:loading="isCreating"
							data-testid="create-blank-agent"
							@click="createBlank"
						/>
					</div>

					<div :class="$style.center">
						<h1 :class="$style.heading">{{ heading }}</h1>

						<div :class="$style.inputWrapper">
							<ChatInputBase
								ref="chatInputRef"
								v-model="inputText"
								:placeholder="i18n.baseText('agents.new.description.placeholder')"
								:is-streaming="false"
								:can-submit="inputText.trim().length > 0 && !isCreating"
								:show-voice="true"
								:show-attach="false"
								@submit="submitDescription"
							/>
						</div>

						<div :class="$style.suggestions">
							<N8nText :class="$style.suggestionsLabel" tag="h3" size="medium" bold>
								{{ i18n.baseText('agents.new.templates.label') }}
							</N8nText>

							<div :class="$style.suggestionGrid">
								<button
									v-for="(suggestion, index) in suggestions"
									:key="suggestion.name"
									type="button"
									:class="$style.suggestionCard"
									:style="{ '--suggestion-index': index }"
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
								</button>
							</div>
						</div>
					</div>
				</div>
			</Transition>
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
	pointer-events: all;
}

.content {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-height: 0;
}

:global(.building-overlay-enter-active) {
	transition: opacity calc(var(--duration--base) * 1.5) var(--easing--ease-out)
		calc(var(--duration--base) / 3);
}

:global(.building-overlay-enter-from) {
	opacity: 0;
}

:global(.new-agent-content-leave-active) {
	transition:
		opacity var(--duration--base) var(--easing--ease-out),
		filter var(--duration--base) var(--easing--ease-out),
		transform var(--duration--base) var(--easing--ease-out);
}

:global(.new-agent-content-leave-to) {
	opacity: 0;
	filter: blur(3px);
	transform: translateY(calc(-1 * var(--spacing--xs)));
}

.topBar {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	padding: var(--spacing--xs) var(--spacing--xs);
	background-image: linear-gradient(
		to bottom,
		var(--color--background--light-3),
		var(--color--background--light-3) 1px,
		transparent 1px
	);
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
	color: var(--color--text--shade-1);
	margin: 0 0 var(--spacing--lg);
	animation: headingLift var(--duration--base) var(--easing--ease-out) both;
}

.inputWrapper {
	width: 100%;
	margin-bottom: var(--spacing--xl);
	animation: contentDropIn var(--duration--base) var(--easing--ease-out)
		calc(var(--duration--base) / 4) both;
}

.suggestions {
	width: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	animation: contentDropIn var(--duration--base) var(--easing--ease-out) 160ms both;
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
	width: 100%;
	gap: var(--spacing--4xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-radius: var(--radius--lg);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	background: var(--color--background--light-3);
	cursor: pointer;
	transition:
		background-color var(--duration--snappy) var(--easing--ease-out),
		border-color var(--duration--snappy) var(--easing--ease-out),
		box-shadow var(--duration--snappy) var(--easing--ease-out);
	text-align: left;
	font: inherit;
	animation: suggestionCardIn var(--duration--base) var(--easing--ease-out)
		calc(240ms + var(--suggestion-index) * 80ms) both;
}

.suggestionCard:hover,
.suggestionCard:focus-visible {
	background-color: var(--color--background--light-2);
	border-color: var(--color--foreground--shade-1);
	box-shadow: var(--shadow--card-hover);
}

.suggestionCard:active {
	background-color: var(--color--background--light-1);
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

@keyframes headingLift {
	from {
		opacity: 0;
		filter: blur(3px);
		transform: translateY(var(--spacing--xs));
	}

	to {
		opacity: 1;
		filter: blur(0);
		transform: translateY(calc(-1 * var(--spacing--xs)));
	}
}

@keyframes contentDropIn {
	from {
		opacity: 0;
		filter: blur(3px);
		transform: translateY(calc(-1 * var(--spacing--xs)));
	}

	to {
		opacity: 1;
		filter: blur(0);
		transform: translateY(0);
	}
}

@keyframes suggestionCardIn {
	from {
		opacity: 0;
		transform: translateY(var(--spacing--2xs));
	}

	to {
		opacity: 1;
		transform: translateY(0);
	}
}

@media (prefers-reduced-motion: reduce) {
	.heading,
	.inputWrapper,
	.suggestions,
	.suggestionCard {
		animation: none;
	}

	:global(.building-overlay-enter-active),
	:global(.new-agent-content-leave-active) {
		transition: none;
	}
}
</style>
