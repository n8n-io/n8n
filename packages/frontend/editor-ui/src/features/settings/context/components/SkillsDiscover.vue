<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { SkillCatalogItem, SkillDetail } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@n8n/stores/users.store';
import { getResourcePermissions } from '@n8n/permissions';
import { N8nButton, N8nCallout, N8nHeading, N8nInput, N8nText } from '@n8n/design-system';

import type { AgentSkillModalScopeOption } from '@/features/agents/components/AgentSkillModal.vue';
import { createAgent } from '@/features/agents/composables/useAgentApi';
import { AGENT_BUILDER_VIEW, OPEN_PREVIEW_PARAM } from '@/features/agents/constants';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';

import SkillSourceConnectDialog, {
	type SkillSourceConnected,
} from './SkillSourceConnectDialog.vue';
import { getSkill, searchSkillCatalog } from '../skills.api';
import { parseScope } from '../skills.utils';

const props = defineProps<{ scopeOptions: AgentSkillModalScopeOption[] }>();
const emit = defineEmits<{
	connected: [result: SkillSourceConnected];
	openSource: [sourceId: string];
}>();
const i18n = useI18n();
const rootStore = useRootStore();
const usersStore = useUsersStore();
const projectsStore = useProjectsStore();
const sourceControlStore = useSourceControlStore();
const router = useRouter();
const { showError, showMessage } = useToast();

const query = ref('');
const items = ref<SkillCatalogItem[]>([]);
const loading = ref(false);
const searched = ref(false);
const loadFailed = ref(false);
const selected = ref<SkillCatalogItem>();
const intent = ref<'save' | 'try'>('save');
const connectOpen = ref(false);
const creatingAgent = ref(false);
const savedTrialId = ref<string>();
const savedForTrial = ref<SkillDetail>();
const testAgent = ref<{ projectId: string; agentId: string }>();
const importedSkills = ref(new Map<string, string>());
let searchRun = 0;
onBeforeUnmount(() => {
	searchRun += 1;
});

const trialScopes = computed(() =>
	props.scopeOptions.filter((option) => {
		const scope = parseScope(option.value);
		const project = projectsStore.myProjects.find((item) => item.id === scope.projectId);
		const permissions = getResourcePermissions([
			...(usersStore.currentUser?.globalScopes ?? []),
			...(project?.scopes ?? []),
		]);
		return (
			scope.scope === 'project' &&
			!!scope.projectId &&
			!sourceControlStore.preferences.branchReadOnly &&
			permissions.agent.create === true
		);
	}),
);
const importScopes = computed(() =>
	intent.value === 'try' ? trialScopes.value : props.scopeOptions,
);
const busy = computed(() => creatingAgent.value || connectOpen.value);

async function search(term = query.value) {
	query.value = term;
	const trimmed = term.trim();
	if (trimmed.length < 2 || trimmed.length > 100 || !props.scopeOptions.length) return;
	const run = ++searchRun;
	const scope = parseScope(props.scopeOptions[0].value);
	loading.value = true;
	loadFailed.value = false;
	items.value = [];
	try {
		const result = await searchSkillCatalog(rootStore.restApiContext, trimmed, scope.projectId);
		if (run !== searchRun) return;
		items.value = result.items;
		searched.value = true;
	} catch {
		if (run === searchRun) loadFailed.value = true;
	} finally {
		if (run === searchRun) loading.value = false;
	}
}

function startImport(item: SkillCatalogItem, action: 'save' | 'try') {
	if (busy.value || (action === 'try' && !trialScopes.value.length)) return;
	selected.value = item;
	intent.value = action;
	savedTrialId.value = undefined;
	savedForTrial.value = undefined;
	testAgent.value = undefined;
	const importedId = importedSkills.value.get(item.id);
	if (action === 'try' && importedId) {
		savedTrialId.value = importedId;
		void openTestAgent();
		return;
	}
	connectOpen.value = true;
}

async function openTestAgent() {
	if (!savedTrialId.value || creatingAgent.value) return;
	creatingAgent.value = true;
	try {
		const skill =
			savedForTrial.value ?? (await getSkill(rootStore.restApiContext, savedTrialId.value));
		savedForTrial.value = skill;
		const projectId = skill.projectId ?? parseScope(trialScopes.value[0]?.value ?? '').projectId;
		if (!projectId)
			throw new Error(i18n.baseText('settings.context.skills.catalog.noTrialProject'));
		if (!testAgent.value) {
			const name = i18n.baseText('settings.context.skills.catalog.testAgentName', {
				interpolate: { name: skill.skill.name },
			});
			const agent = await createAgent(rootStore.restApiContext, projectId, name, {
				config: {
					name,
					instructions: i18n.baseText('settings.context.skills.catalog.testInstructions'),
					skills: [{ type: 'skill', id: skill.id }],
					integrations: [],
				},
			});
			// If navigation fails, retry opens the same draft instead of creating another one.
			testAgent.value = { projectId, agentId: agent.id };
		}
		await router.push({
			name: AGENT_BUILDER_VIEW,
			params: testAgent.value,
			query: { [OPEN_PREVIEW_PARAM]: 'true' },
		});
	} catch (error) {
		showError(error, i18n.baseText('settings.context.skills.catalog.testError'));
	} finally {
		creatingAgent.value = false;
	}
}

async function onConnected(result: SkillSourceConnected) {
	emit('connected', result);
	if (result.response.imported.length !== 1 || !selected.value) return;
	const imported = result.response.imported[0];
	importedSkills.value.set(selected.value.id, imported.skillId);
	if (intent.value !== 'try') return;
	// Read the saved scope and ID. The external catalog ID is never an Agent skill ref.
	savedTrialId.value = imported.skillId;
	await openTestAgent();
}

async function onExisting(skillId: string) {
	if (!selected.value) return;
	importedSkills.value.set(selected.value.id, skillId);
	showMessage({
		type: 'success',
		title: i18n.baseText('settings.context.skills.catalog.alreadySaved'),
	});
	if (intent.value !== 'try') return;
	savedTrialId.value = skillId;
	await openTestAgent();
}
</script>

<template>
	<section :class="$style.discover" data-test-id="skills-discover">
		<div>
			<N8nHeading tag="h2" size="medium">{{
				i18n.baseText('settings.context.skills.catalog.title')
			}}</N8nHeading>
			<N8nText tag="p" color="text-light">{{
				i18n.baseText('settings.context.skills.catalog.description')
			}}</N8nText>
		</div>
		<form :class="$style.search" @submit.prevent="search()">
			<N8nInput
				v-model="query"
				:maxlength="100"
				:placeholder="i18n.baseText('settings.context.skills.catalog.searchPlaceholder')"
				:aria-label="i18n.baseText('settings.context.skills.catalog.searchLabel')"
				data-test-id="skill-catalog-search"
			/>
			<N8nButton
				type="submit"
				:loading="loading"
				:disabled="query.trim().length < 2 || !scopeOptions.length"
				data-test-id="skill-catalog-search-button"
				data-attr="skill-catalog-search"
				>{{ i18n.baseText('generic.search') }}</N8nButton
			>
		</form>
		<div v-if="!searched && !loading && !loadFailed" :class="$style.suggestions">
			<N8nText color="text-light">{{
				i18n.baseText('settings.context.skills.catalog.suggestions')
			}}</N8nText>
			<N8nButton
				v-for="term in ['pdf', 'frontend', 'testing']"
				:key="term"
				variant="outline"
				@click="search(term)"
				>{{ term }}</N8nButton
			>
		</div>
		<N8nCallout v-if="loadFailed" theme="warning" data-test-id="skill-catalog-error">
			{{ i18n.baseText('settings.context.skills.catalog.loadError') }}
			<a href="https://skills.sh" target="_blank" rel="noopener noreferrer">{{
				i18n.baseText('settings.context.skills.catalog.openCatalog')
			}}</a>
		</N8nCallout>
		<N8nCallout v-if="savedTrialId" theme="info" data-test-id="skill-catalog-saved-for-trial">
			{{ i18n.baseText('settings.context.skills.catalog.savedForTrial') }}
			<N8nButton variant="outline" :loading="creatingAgent" @click="openTestAgent">{{
				i18n.baseText('settings.context.skills.catalog.openTest')
			}}</N8nButton>
		</N8nCallout>
		<N8nText
			v-if="searched && !loading && !loadFailed && !items.length"
			data-test-id="skill-catalog-empty"
			>{{ i18n.baseText('settings.context.skills.catalog.empty') }}</N8nText
		>
		<div :class="$style.grid" :aria-busy="loading">
			<article
				v-for="item in items"
				:key="item.id"
				:class="$style.card"
				data-test-id="skill-catalog-card"
			>
				<div>
					<N8nHeading tag="h3" size="small">{{ item.name }}</N8nHeading>
					<N8nText size="small" color="text-light">{{ item.source }}</N8nText>
				</div>
				<N8nText>{{
					i18n.baseText('settings.context.skills.catalog.installs', {
						interpolate: { count: item.installs.toLocaleString() },
					})
				}}</N8nText>
				<a :href="item.catalogUrl" target="_blank" rel="noopener noreferrer">{{
					i18n.baseText('settings.context.skills.catalog.details')
				}}</a>
				<div :class="$style.actions">
					<N8nButton
						variant="outline"
						:disabled="busy || !trialScopes.length"
						data-test-id="skill-catalog-try"
						data-attr="skill-catalog-try"
						@click="startImport(item, 'try')"
						>{{ i18n.baseText('settings.context.skills.catalog.try') }}</N8nButton
					>
					<N8nButton
						:disabled="busy || !scopeOptions.length || importedSkills.has(item.id)"
						data-test-id="skill-catalog-save"
						data-attr="skill-catalog-save"
						@click="startImport(item, 'save')"
						>{{
							i18n.baseText(
								importedSkills.has(item.id)
									? 'settings.context.skills.catalog.saved'
									: 'settings.context.skills.catalog.save',
							)
						}}</N8nButton
					>
				</div>
			</article>
		</div>
		<N8nText size="small" color="text-light">{{
			i18n.baseText('settings.context.skills.catalog.limits')
		}}</N8nText>
		<SkillSourceConnectDialog
			v-model:open="connectOpen"
			:scope-options="importScopes"
			:catalog-skill="selected"
			:intent="intent"
			@connected="onConnected"
			@existing="onExisting"
			@open-source="emit('openSource', $event)"
		/>
	</section>
</template>

<style module lang="scss">
.discover {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}
.search,
.suggestions,
.actions {
	display: flex;
	gap: var(--spacing--xs);
	align-items: center;
	flex-wrap: wrap;
}
.search > :first-child {
	flex: 1;
	min-width: 0;
}
.grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: var(--spacing--md);
}
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	padding: var(--spacing--lg);
	background: var(--background--surface);
	overflow-wrap: anywhere;
	min-width: 0;
}
.actions {
	margin-top: auto;
}
@media (max-width: 600px) {
	.grid {
		grid-template-columns: minmax(0, 1fr);
	}
}
</style>
