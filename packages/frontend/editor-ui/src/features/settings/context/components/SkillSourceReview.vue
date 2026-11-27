<script lang="ts" setup>
import type { DiscoveredSkill, SkillScanFinding, SkillSourceDiscovery } from '@n8n/api-types';
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';
import { useFocus } from '@vueuse/core';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import {
	N8nButton,
	N8nCheckbox,
	N8nIcon,
	N8nInput,
	N8nListbox,
	N8nListboxItem,
	N8nSidebar,
	N8nTabs,
	N8nText,
	N8nTooltip,
	type TabOptions,
} from '@n8n/design-system';

import SkillSourceFilesView from './SkillSourceFilesView.vue';
import { groupByFolder, isSelectableSkill } from '../skillSourceReview.utils';
import { useSkillSourceReasons } from '../skills.utils';

const props = defineProps<{
	discovery: Pick<SkillSourceDiscovery, 'skills' | 'truncated' | 'tooDeep'>;
	disabled?: boolean;
	/** Disable selection for these skills. Their previews stay available. */
	disabledSkillKeys?: string[];
	/** The scope that the user picked, for the reason of a taken name. */
	scopeLabel: string;
}>();

const emit = defineEmits<{ preview: [key: string | null] }>();

/** The keys of the ticked skills. */
const selected = defineModel<string[]>('selected', { required: true });

const i18n = useI18n();
const { reasonText, findingsText, linkedDomainsText } = useSkillSourceReasons();

type ReviewTab = 'warning' | 'passed' | 'blocked';
const TABS: ReviewTab[] = ['warning', 'passed', 'blocked'];
const TAB_LABELS = {
	warning: 'settings.context.skills.connect.tab.warning',
	passed: 'settings.context.skills.connect.tab.passed',
	blocked: 'settings.context.skills.connect.tab.blocked',
} satisfies Record<ReviewTab, BaseTextKey>;

/** A skill that the user cannot tick is in Blocked, whatever the reason. */
function tabOf(skill: DiscoveredSkill): ReviewTab {
	if (!canSelectSkill(skill)) return 'blocked';
	return skill.check?.verdict === 'needs_review' ? 'warning' : 'passed';
}

const skillsByTab = computed(() => {
	const tabs: Record<ReviewTab, DiscoveredSkill[]> = { warning: [], passed: [], blocked: [] };
	for (const skill of props.discovery.skills) tabs[tabOf(skill)].push(skill);
	return tabs;
});

const tabOptions = computed<Array<TabOptions<ReviewTab>>>(() =>
	TABS.map((tab) => ({
		value: tab,
		label: i18n.baseText(TAB_LABELS[tab], {
			interpolate: { count: skillsByTab.value[tab].length },
		}),
	})),
);

const activeTab = ref<ReviewTab>('warning');
const search = ref('');
const searchOpen = ref(false);
const searchInput = useTemplateRef<InstanceType<typeof N8nInput>>('searchInput');
const searchToggle = useTemplateRef<InstanceType<typeof N8nButton>>('searchToggle');
const { focused: searchToggleFocused } = useFocus(searchToggle);
/** The skill that the right pane shows. */
const previewKey = ref<string | null>(null);
/** The folders that the user closed. A folder is open until then. */
const collapsedFolders = ref<string[]>([]);
/**
 * The listbox moves the focus to its selected row when the value changes from outside. Each
 * tab gets a new listbox, so a change of tab leaves the focus on the tab.
 */
const listKey = ref(0);

async function toggleSearch() {
	searchOpen.value = !searchOpen.value;
	search.value = '';
	await nextTick();
	if (searchOpen.value) searchInput.value?.focus();
	else searchToggleFocused.value = true;
}

/** A new tab shows its first skill, so the right pane is never empty when a tab has skills. */
function selectTab(tab: ReviewTab) {
	activeTab.value = tab;
	previewKey.value = visibleSkills.value[0]?.key ?? null;
	listKey.value += 1;
}

function onPreview(key: string | undefined) {
	if (key) previewKey.value = key;
}

function toggleFolder(folder: string) {
	collapsedFolders.value = collapsedFolders.value.includes(folder)
		? collapsedFolders.value.filter((closed) => closed !== folder)
		: [...collapsedFolders.value, folder];
}

/** Only Tab leaves the header of a folder, so its keys do not move or select a row. */
function stopListKeys(event: KeyboardEvent) {
	if (event.key !== 'Tab') event.stopPropagation();
}

function matches(skill: DiscoveredSkill, term: string): boolean {
	return [skill.name, skill.description, skill.location].some((text) =>
		text?.toLowerCase().includes(term),
	);
}

const visibleSkills = computed(() => {
	const term = search.value.trim().toLowerCase();
	const skills = skillsByTab.value[activeTab.value];
	return term ? skills.filter((skill) => matches(skill, term)) : skills;
});

/**
 * A folder with one skill shows that skill as a plain row. A header and an indent say nothing
 * more than the row does.
 */
const groups = computed(() =>
	groupByFolder(visibleSkills.value).map((group) => ({
		...group,
		hasHeader: group.skills.length > 1,
		open: !collapsedFolders.value.includes(group.folder),
	})),
);

// A search shows each match, so it opens the folders that the user closed.
watch(search, (term) => {
	if (term.trim()) collapsedFolders.value = [];
});

// A new discovery opens the first tab with skills, Warning first.
watch(
	() => props.discovery,
	() => {
		search.value = '';
		searchOpen.value = false;
		collapsedFolders.value = [];
		selectTab(TABS.find((tab) => skillsByTab.value[tab].length > 0) ?? 'warning');
	},
	{ immediate: true },
);

watch(previewKey, (key) => emit('preview', key), { immediate: true });

const previewSkill = computed(
	() => props.discovery.skills.find((skill) => skill.key === previewKey.value) ?? null,
);

function canSelectSkill(skill: DiscoveredSkill): boolean {
	return isSelectableSkill(skill) && !props.disabledSkillKeys?.includes(skill.key);
}

/** The state of a checkbox that ticks every selectable skill of a list. */
function stateOf(skills: DiscoveredSkill[]) {
	const keys = skills.filter(canSelectSkill).map((skill) => skill.key);
	const picked = keys.filter((key) => selected.value.includes(key)).length;
	return {
		keys,
		checked: keys.length > 0 && picked === keys.length,
		indeterminate: picked > 0 && picked < keys.length,
	};
}

const selectAll = computed(() => stateOf(visibleSkills.value));

/** Ticks every skill of the list, or none when all are ticked already. */
function toggleAll(skills: DiscoveredSkill[]) {
	const { keys, checked } = stateOf(skills);
	selected.value = checked
		? selected.value.filter((key) => !keys.includes(key))
		: [...new Set([...selected.value, ...keys])];
}

function toggle(key: string, checked: boolean) {
	selected.value = checked
		? [...selected.value, key]
		: selected.value.filter((selectedKey) => selectedKey !== key);
}

/** A skill that n8n cannot read has no name, so the row names its folder. */
function titleOf(skill: DiscoveredSkill): string {
	return skill.name ?? skill.location.split('/').filter(Boolean).pop() ?? skill.location;
}

/**
 * Why a skill cannot be ticked, in translated text. The check names the cause of a SKILL.md
 * that n8n cannot read, so its findings come before the read error.
 */
function blockedReason(skill: DiscoveredSkill): string {
	if (skill.nameTaken) {
		return i18n.baseText('settings.context.skills.connect.nameTaken.reason', {
			interpolate: { name: titleOf(skill), scope: props.scopeLabel },
		});
	}
	if (skill.error?.reason === 'name_clash') {
		return i18n.baseText('settings.context.skills.updates.agentNameClash', {
			interpolate: { name: titleOf(skill) },
		});
	}
	const findings = skill.check ? findingsText(skill.check.findings) : '';
	if (findings) return findings;
	if (props.disabledSkillKeys?.includes(skill.key)) {
		return i18n.baseText('settings.context.skills.updates.importNotAllowed');
	}
	return skill.error ? reasonText(skill.error.reason) : '';
}

const warningsByKey = computed(() =>
	Object.fromEntries<SkillScanFinding[]>(
		props.discovery.skills.map((skill) => [
			skill.key,
			skill.check?.findings.filter((finding) => finding.severity === 'needs_review') ?? [],
		]),
	),
);

function warningLabel(key: string): string {
	const count = warningsByKey.value[key].length;
	return i18n.baseText('settings.context.skills.connect.review.warnings', {
		interpolate: { count },
		adjustToNumber: count,
	});
}
</script>

<template>
	<div :class="$style.review" data-test-id="skill-source-review">
		<N8nTabs
			:class="$style.tabs"
			:model-value="activeTab"
			:options="tabOptions"
			data-test-id="skill-source-tabs"
			@update:model-value="selectTab"
		/>
		<div :class="$style.panes">
			<N8nSidebar
				:class="$style.sidebar"
				:width="320"
				:min-width="240"
				:max-width="560"
				width-storage-id="n8n-skills-review-sidebar-width"
				:label="i18n.baseText('settings.context.skills.title')"
			>
				<template #header>
					<div :class="$style.listHeader">
						<N8nCheckbox
							:model-value="selectAll.checked"
							:indeterminate="selectAll.indeterminate"
							:disabled="disabled || selectAll.keys.length === 0"
							:label="searchOpen ? undefined : i18n.baseText('settings.context.skills.title')"
							:aria-label="i18n.baseText('settings.context.skills.connect.review.selectAll')"
							data-test-id="skill-source-select-all"
							@update:model-value="toggleAll(visibleSkills)"
						/>
						<N8nInput
							v-if="searchOpen"
							ref="searchInput"
							v-model="search"
							size="small"
							:class="$style.search"
							:placeholder="i18n.baseText('settings.context.skills.connect.review.search')"
							:aria-label="i18n.baseText('settings.context.skills.connect.review.search')"
							data-test-id="skill-source-search"
							@keydown.esc.stop.prevent="toggleSearch"
						/>
						<N8nTooltip
							as-child
							placement="bottom"
							:enterable="false"
							:content="
								i18n.baseText(
									searchOpen ? 'generic.close' : 'settings.context.skills.connect.review.search',
								)
							"
						>
							<N8nButton
								ref="searchToggle"
								variant="ghost"
								size="small"
								icon-only
								:icon="searchOpen ? 'x' : 'search'"
								:aria-label="
									i18n.baseText(
										searchOpen ? 'generic.close' : 'settings.context.skills.connect.review.search',
									)
								"
								:aria-expanded="searchOpen"
								data-test-id="skill-source-search-toggle"
								@click="toggleSearch"
							/>
						</N8nTooltip>
					</div>
				</template>
				<N8nListbox
					:key="listKey"
					:model-value="previewKey ?? undefined"
					:label="i18n.baseText('settings.context.skills.title')"
					data-test-id="skill-source-skills"
					@update:model-value="onPreview"
				>
					<div
						v-for="group in groups"
						:key="group.folder"
						:class="$style.group"
						:data-folder="group.folder"
						data-test-id="skill-source-group"
					>
						<div v-if="group.hasHeader" :class="$style.groupHeader" @keydown="stopListKeys">
							<N8nCheckbox
								:model-value="stateOf(group.skills).checked"
								:indeterminate="stateOf(group.skills).indeterminate"
								:disabled="disabled || stateOf(group.skills).keys.length === 0"
								:aria-label="group.folder"
								data-test-id="skill-source-group-checkbox"
								@update:model-value="toggleAll(group.skills)"
							/>
							<!-- A plain button: the folder path must wrap, which N8nButton does not do. -->
							<button
								type="button"
								:class="$style.groupToggle"
								:aria-expanded="group.open"
								data-test-id="skill-source-group-toggle"
								@click="toggleFolder(group.folder)"
							>
								<N8nText size="small" color="text-light" bold :class="$style.folder">{{
									group.folder
								}}</N8nText>
								<N8nIcon
									:icon="group.open ? 'chevron-down' : 'chevron-right'"
									size="xsmall"
									color="text-light"
								/>
							</button>
						</div>
						<div
							v-if="!group.hasHeader || group.open"
							:class="[$style.groupSkills, group.hasHeader && $style.nested]"
						>
							<N8nListboxItem
								v-for="item in group.skills"
								:key="item.key"
								:value="item.key"
								:data-skill-key="item.key"
								data-test-id="skill-source-skill"
							>
								<template #leading>
									<!-- The checkbox keeps its click and its keys, so they do not change the preview. -->
									<N8nCheckbox
										:model-value="canSelectSkill(item) && selected.includes(item.key)"
										:disabled="disabled || !canSelectSkill(item)"
										:aria-label="titleOf(item)"
										data-test-id="skill-source-skill-checkbox"
										@update:model-value="toggle(item.key, $event)"
										@click.stop
										@keydown.enter.stop
										@keydown.space.stop
									/>
								</template>
								<N8nText bold size="small">{{ titleOf(item) }}</N8nText>
								<N8nText
									v-if="activeTab === 'blocked'"
									size="small"
									color="danger"
									:class="$style.reason"
									data-test-id="skill-source-skill-reason"
								>
									{{ blockedReason(item) }}
								</N8nText>
								<N8nText
									v-else-if="
										activeTab === 'passed' && linkedDomainsText(item.check?.findings ?? [])
									"
									size="small"
									color="text-light"
									:class="$style.reason"
									data-test-id="skill-source-skill-findings"
								>
									{{ linkedDomainsText(item.check?.findings ?? []) }}
								</N8nText>
								<template
									v-if="
										$slots['row-trailing'] ||
										(activeTab === 'warning' && warningsByKey[item.key].length)
									"
									#trailing
								>
									<span :class="$style.rowTrailing">
										<slot name="row-trailing" :skill="item" />
										<N8nTooltip
											v-if="activeTab === 'warning' && warningsByKey[item.key].length"
											as-child
											placement="right"
										>
											<template #content>
												<div>
													{{ warningLabel(item.key) }}
													<ul :class="$style.warningList">
														<li v-for="(finding, index) in warningsByKey[item.key]" :key="index">
															{{ findingsText([finding]) }}
														</li>
													</ul>
													{{ linkedDomainsText(item.check?.findings ?? []) }}
												</div>
											</template>
											<N8nButton
												variant="ghost"
												size="xsmall"
												:class="$style.warning"
												:aria-label="warningLabel(item.key)"
												data-test-id="skill-source-skill-warnings"
												@click.stop
												@keydown.enter.stop
												@keydown.space.stop
											>
												<span v-if="warningsByKey[item.key].length > 1">{{
													warningsByKey[item.key].length
												}}</span>
												<N8nIcon icon="triangle-alert" size="small" />
											</N8nButton>
										</N8nTooltip>
									</span>
								</template>
							</N8nListboxItem>
						</div>
					</div>
				</N8nListbox>
				<div
					v-if="visibleSkills.length === 0 || discovery.truncated || discovery.tooDeep"
					:class="$style.notices"
				>
					<N8nText v-if="visibleSkills.length === 0" size="small" color="text-light">
						{{
							search
								? i18n.baseText('settings.context.skills.connect.review.noMatch')
								: i18n.baseText('settings.context.skills.connect.review.empty')
						}}
					</N8nText>
					<N8nText
						v-if="discovery.truncated"
						size="small"
						color="text-light"
						data-test-id="skill-source-truncated"
					>
						{{ reasonText('too_many_skills') }}
					</N8nText>
					<N8nText
						v-if="discovery.tooDeep"
						size="small"
						color="text-light"
						data-test-id="skill-source-too-deep"
					>
						{{ reasonText('too_deep') }}
					</N8nText>
				</div>
			</N8nSidebar>
			<div :class="$style.preview">
				<slot v-if="previewSkill" name="preview" :skill="previewSkill">
					<SkillSourceFilesView :key="previewSkill.key" :skill="previewSkill" />
				</slot>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
/* The panes go from edge to edge of the dialog, so the review takes back the padding of the body. */
.review {
	display: flex;
	flex-direction: column;
	min-height: 0;
	margin-inline: calc(-1 * var(--n8n-dialog-region--padding, var(--spacing--md)));
	margin-block-end: calc(-1 * var(--focus--border-width));
}

.tabs {
	width: auto;
	padding-inline: var(--n8n-dialog-region--padding, var(--spacing--md));
	border-bottom: var(--border);
}

/* The sidebar draws the one divider between the panes. The bottom line closes it at the footer. */
.panes {
	display: flex;
	height: 60vh;
	min-height: 0;
	border-block-end: var(--border);
}

/* The list starts one row gap below the header. */
.sidebar {
	flex: none;
	--n8n-sidebar--padding: var(--spacing--4xs) var(--spacing--2xs) var(--spacing--2xs);
}

.preview {
	flex: 1;
	min-width: 0;
	min-height: 0;
	overflow: hidden;
}

/* The header has the box of a row, so its checkbox and its button are in line with the rows. */
.listHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	min-height: var(--spacing--xl);
	margin: var(--spacing--2xs) var(--spacing--2xs) 0;
	padding: var(--spacing--4xs) var(--spacing--xs);
}

.search {
	flex: 1;
	min-width: 0;
}

.group,
.groupSkills {
	display: flex;
	flex-direction: column;
	gap: var(--n8n-listbox--gap, var(--spacing--4xs));
}

.groupHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-height: var(--spacing--xl);
	padding-inline: var(--spacing--xs);
}

.groupToggle {
	display: flex;
	flex: 1;
	align-items: center;
	gap: var(--spacing--4xs);
	min-width: 0;
	padding: var(--spacing--4xs) 0;
	text-align: start;
	background: none;
	border: none;
	border-radius: var(--radius);
	cursor: pointer;

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--outline-color);
	}
}

.folder {
	min-width: 0;
	overflow-wrap: anywhere;
}

/* The checkbox of a skill sits below the path of its folder. */
.nested {
	--n8n-listbox-item--padding: var(--spacing--4xs) var(--spacing--xs) var(--spacing--4xs)
		calc(var(--spacing--xs) + var(--spacing--lg));
}

/* A reason can be long, and the user needs all of it to fix the skill. */
.reason {
	white-space: normal;
	overflow-wrap: anywhere;
}

.notices {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
}

.rowTrailing {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.warning {
	flex-shrink: 0;
	--button--color: var(--text-color--warning);
}

.warningList {
	margin: var(--spacing--5xs) 0;
	padding-left: var(--spacing--xs);
}
</style>
