<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
	SKILL_CATALOG_CATEGORIES,
	type SkillCatalogCategory,
	type SkillCatalogItem,
	type SkillCatalogSummary,
	type SkillCatalogView,
	type SkillDetail,
} from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@n8n/stores/users.store';
import { getResourcePermissions } from '@n8n/permissions';
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nHeading,
	N8nIcon,
	N8nInput,
	N8nTabs,
	N8nText,
} from '@n8n/design-system';

import type { AgentSkillModalScopeOption } from '@/features/agents/components/AgentSkillModal.vue';
import { createAgent } from '@/features/agents/composables/useAgentApi';
import { AGENT_BUILDER_VIEW, OPEN_PREVIEW_PARAM } from '@/features/agents/constants';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';

import SkillSourceConnectDialog, {
	type SkillSourceConnected,
} from './SkillSourceConnectDialog.vue';
import SkillCatalogDetail from './SkillCatalogDetail.vue';
import {
	browseSkillCatalog,
	getSkillCatalogMetadata,
	getSkill,
	searchSkillCatalog,
} from '../skills.api';
import { categoryLabel } from '../skillCatalog.utils';
import { parseScope } from '../skills.utils';

const props = withDefaults(
	defineProps<{ scopeOptions: AgentSkillModalScopeOption[]; active?: boolean }>(),
	{ active: true },
);
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
const route = useRoute();
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
const view = ref<SkillCatalogView>('popular');
const category = ref<SkillCatalogCategory | 'all'>('all');
const searchActive = ref(false);
const visibleCount = ref(12);
const summaries = ref(new Map<string, SkillCatalogSummary>());
const pendingSummaries = new Set<string>();
const failedSummaries = new Set<string>();
const openedItem = ref<SkillCatalogItem>();
let mounted = true;
const projectId = computed(() => parseScope(props.scopeOptions[0]?.value ?? '').projectId);
const viewOptions = computed(() => [
	{ value: 'popular', label: i18n.baseText('settings.context.skills.catalog.popular') },
	{ value: 'trending', label: i18n.baseText('settings.context.skills.catalog.trending') },
]);
const categoryFor = (item: SkillCatalogItem) =>
	summaries.value.get(item.id)?.category ?? item.category ?? 'other';
const filteredItems = computed(() =>
	items.value.filter((item) => category.value === 'all' || categoryFor(item) === category.value),
);
const visibleItems = computed(() => filteredItems.value.slice(0, visibleCount.value));
const categories = computed(() =>
	SKILL_CATALOG_CATEGORIES.filter((value) =>
		items.value.some((item) => categoryFor(item) === value),
	),
);
let searchRun = 0;
onBeforeUnmount(() => {
	searchRun += 1;
	mounted = false;
});

function enrichCards() {
	if (!mounted || !props.active || openedItem.value) return;
	for (const item of visibleItems.value) {
		if (pendingSummaries.size >= 3) break;
		if (
			summaries.value.has(item.id) ||
			pendingSummaries.has(item.id) ||
			failedSummaries.has(item.id)
		)
			continue;
		pendingSummaries.add(item.id);
		void getSkillCatalogMetadata(rootStore.restApiContext, item.id, projectId.value)
			.then((summary) => {
				if (mounted) summaries.value.set(item.id, summary);
			})
			.catch(() => {
				failedSummaries.add(item.id);
			})
			.finally(() => {
				pendingSummaries.delete(item.id);
				enrichCards();
			});
	}
}
watch(() => visibleItems.value.map((item) => item.id).join(','), enrichCards);
watch(
	() => props.active,
	(active) => {
		if (active && !searched.value && !loading.value) void browse();
		else if (active) enrichCards();
	},
	{ immediate: true },
);
watch(category, () => {
	visibleCount.value = 12;
});
watch(view, () => {
	void browse();
});
watch(
	() => route.query.catalogSkill,
	(id) => {
		if (
			typeof id !== 'string' ||
			!/^[a-zA-Z0-9][a-zA-Z0-9-]*\/[a-zA-Z0-9_][a-zA-Z0-9._-]*\/[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(
				id,
			)
		) {
			openedItem.value = undefined;
			return;
		}
		const [owner, repo, slug] = id.split('/');
		openedItem.value = items.value.find((item) => item.id === id) ?? {
			id,
			name: slug,
			slug,
			source: `${owner}/${repo}`,
			githubUrl: `https://github.com/${owner}/${repo}`,
			catalogUrl: `https://skills.sh/${id}`,
		};
	},
	{ immediate: true },
);

function openDetails(item: SkillCatalogItem) {
	openedItem.value = item;
	void router.push({ query: { ...route.query, catalogSkill: item.id } });
}

function closeDetails() {
	openedItem.value = undefined;
	const { catalogSkill: _id, ...query } = route.query;
	void router.push({ query });
	enrichCards();
}

async function browse() {
	query.value = '';
	searchActive.value = false;
	category.value = 'all';
	await loadCatalog();
}

async function loadCatalog(term?: string) {
	if (!props.scopeOptions.length) return;
	const run = ++searchRun;
	loading.value = true;
	loadFailed.value = false;
	items.value = [];
	visibleCount.value = 12;
	try {
		const result = term
			? await searchSkillCatalog(rootStore.restApiContext, term, projectId.value)
			: await browseSkillCatalog(rootStore.restApiContext, view.value, projectId.value);
		if (run !== searchRun) return;
		items.value = result.items;
		if (openedItem.value) {
			openedItem.value =
				items.value.find((item) => item.id === openedItem.value?.id) ?? openedItem.value;
		}
		searched.value = true;
	} catch {
		if (run === searchRun) loadFailed.value = true;
	} finally {
		if (run === searchRun) loading.value = false;
	}
}

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
	searchActive.value = true;
	category.value = 'all';
	await loadCatalog(trimmed);
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
		<SkillCatalogDetail
			v-if="openedItem"
			:item="openedItem"
			:project-id="projectId"
			:view="searchActive ? undefined : view"
			:busy="busy"
			:saved="importedSkills.has(openedItem.id)"
			:can-save="!!scopeOptions.length"
			:can-try="!!trialScopes.length"
			@back="closeDetails"
			@save="startImport(openedItem, 'save')"
			@try="startImport(openedItem, 'try')"
		/>
		<div v-else :class="$style.discover">
			<div :class="$style.intro">
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
					><template #prefix><N8nIcon icon="search" /></template
				></N8nInput>
				<N8nButton
					type="submit"
					:loading="loading"
					:disabled="query.trim().length < 2 || !scopeOptions.length"
					data-test-id="skill-catalog-search-button"
					data-attr="skill-catalog-search"
					>{{ i18n.baseText('generic.search') }}</N8nButton
				>
			</form>
			<div v-if="searchActive" :class="$style.resultHeading">
				<N8nHeading tag="h3" size="small">{{
					i18n.baseText('settings.context.skills.catalog.searchResults')
				}}</N8nHeading
				><N8nButton variant="outline" @click="browse">{{
					i18n.baseText('settings.context.skills.catalog.clearSearch')
				}}</N8nButton>
			</div>
			<N8nTabs
				v-else
				v-model="view"
				:options="viewOptions"
				variant="modern"
				data-test-id="skill-catalog-views"
			/>
			<div
				:class="$style.filters"
				:aria-label="i18n.baseText('settings.context.skills.catalog.categories')"
			>
				<N8nButton
					:variant="category === 'all' ? 'solid' : 'outline'"
					size="small"
					:aria-pressed="category === 'all'"
					data-attr="skill-category-all"
					@click="category = 'all'"
					>{{ i18n.baseText('settings.context.skills.catalog.allCategories') }}</N8nButton
				>
				<N8nButton
					v-for="value in categories"
					:key="value"
					:variant="category === value ? 'solid' : 'outline'"
					size="small"
					:aria-pressed="category === value"
					data-test-id="skill-category"
					data-attr="skill-category"
					@click="category = value"
					>{{ categoryLabel(value, i18n) }}</N8nButton
				>
			</div>
			<div :class="$style.resultHeading">
				<N8nText size="small" color="text-light">{{
					loading
						? i18n.baseText('settings.context.skills.catalog.loading')
						: i18n.baseText('settings.context.skills.catalog.resultCount', {
								interpolate: { count: filteredItems.length },
								adjustToNumber: filteredItems.length,
							})
				}}</N8nText
				><N8nText size="small" color="text-light">{{
					i18n.baseText('settings.context.skills.catalog.categorySource')
				}}</N8nText>
			</div>
			<N8nCallout v-if="loadFailed" theme="warning" data-test-id="skill-catalog-error">
				{{ i18n.baseText('settings.context.skills.catalog.loadError') }}
				<N8nButton variant="outline" @click="searchActive ? search() : browse()">{{
					i18n.baseText('settings.context.skills.catalog.retry')
				}}</N8nButton>
			</N8nCallout>
			<N8nText
				v-if="searched && !loading && !loadFailed && !filteredItems.length"
				data-test-id="skill-catalog-empty"
				>{{ i18n.baseText('settings.context.skills.catalog.empty') }}</N8nText
			>
			<div :class="$style.grid" :aria-busy="loading">
				<article
					v-for="item in visibleItems"
					:key="item.id"
					:class="$style.card"
					data-test-id="skill-catalog-card"
				>
					<div :class="$style.cardTop">
						<N8nBadge>{{ categoryLabel(categoryFor(item), i18n) }}</N8nBadge
						><N8nBadge v-if="item.isOfficial">{{
							i18n.baseText('settings.context.skills.catalog.official')
						}}</N8nBadge>
					</div>
					<div :class="$style.cardIdentity">
						<button
							:class="$style.cardTitle"
							:aria-label="item.name"
							data-test-id="skill-catalog-title"
							data-attr="skill-catalog-detail"
							@click="openDetails(item)"
						>
							<N8nHeading tag="h3" size="small">{{ item.name }}</N8nHeading>
						</button>
						<N8nText size="small" color="text-light">{{ item.source }}</N8nText>
					</div>
					<N8nText tag="p" color="text-light" :class="$style.cardDescription">{{
						summaries.get(item.id)?.description ??
						i18n.baseText('settings.context.skills.catalog.descriptionFallback')
					}}</N8nText>
					<div v-if="item.installs !== undefined" :class="$style.installs">
						<N8nIcon
							:icon="!searchActive && view === 'trending' ? 'trending-up' : 'download'"
							size="small"
						/><N8nText size="small"
							>{{ item.installs.toLocaleString() }}
							{{
								i18n.baseText(
									!searchActive && view === 'trending'
										? 'settings.context.skills.catalog.recentInstalls'
										: 'settings.context.skills.catalog.totalInstalls',
								)
							}}</N8nText
						>
					</div>
					<button
						:class="$style.detailsLink"
						data-attr="skill-catalog-detail"
						@click="openDetails(item)"
					>
						{{ i18n.baseText('settings.context.skills.catalog.details') }}
					</button>
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
			<div v-if="filteredItems.length > visibleCount" :class="$style.loadMore">
				<N8nButton
					variant="outline"
					data-attr="skill-catalog-load-more"
					@click="visibleCount += 12"
					>{{ i18n.baseText('settings.context.skills.catalog.loadMore') }}</N8nButton
				>
			</div>
			<N8nText size="small" color="text-light">{{
				i18n.baseText('settings.context.skills.catalog.limits')
			}}</N8nText>
		</div>
		<N8nCallout v-if="savedTrialId" theme="info" data-test-id="skill-catalog-saved-for-trial">
			{{ i18n.baseText('settings.context.skills.catalog.savedForTrial') }}
			<N8nButton variant="outline" :loading="creatingAgent" @click="openTestAgent">{{
				i18n.baseText('settings.context.skills.catalog.openTest')
			}}</N8nButton>
		</N8nCallout>
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
.filters,
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
	grid-template-columns: repeat(3, minmax(0, 1fr));
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
	padding-top: var(--spacing--xs);
}
.intro,
.cardIdentity {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}
.resultHeading,
.cardTop {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
	flex-wrap: wrap;
}
.cardTitle,
.detailsLink {
	background: none;
	border: none;
	padding: 0;
	cursor: pointer;
	text-align: left;
	color: inherit;
}
.cardTitle:hover {
	text-decoration: underline;
}
.detailsLink {
	color: var(--color--primary);
	font-size: var(--font-size--sm);
	align-self: flex-start;
}
.cardDescription {
	display: -webkit-box;
	-webkit-line-clamp: 3;
	-webkit-box-orient: vertical;
	overflow: hidden;
	// Reserve three text lines without exposing part of a clipped fourth line.
	min-height: 3lh;
}
.installs {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
.loadMore {
	display: flex;
	justify-content: center;
}
@media (max-width: 1100px) {
	.grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}
@media (max-width: 600px) {
	.grid {
		grid-template-columns: minmax(0, 1fr);
	}
}
</style>
