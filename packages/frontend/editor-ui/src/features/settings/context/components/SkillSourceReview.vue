<script lang="ts" setup>
import type { DiscoveredSkill, SkillSourceDiscovery } from '@n8n/api-types';
import { computed, ref, watch } from 'vue';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { N8nCheckbox, N8nInput, N8nTabs, N8nText, type TabOptions } from '@n8n/design-system';

import SkillSourceFilesView from './SkillSourceFilesView.vue';
import { groupByFolder, isSelectableSkill } from '../skillSourceReview.utils';
import { useSkillSourceReasons } from '../skills.utils';

const props = defineProps<{
	discovery: SkillSourceDiscovery;
	/** The scope that the user picked, for the reason of a taken name. */
	scopeLabel: string;
}>();

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
	if (!isSelectableSkill(skill)) return 'blocked';
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
/** The skill that the right pane shows. */
const previewKey = ref<string | null>(null);

/** A new tab shows its first skill, so the right pane is never empty when a tab has skills. */
function selectTab(tab: ReviewTab) {
	activeTab.value = tab;
	previewKey.value = visibleSkills.value[0]?.key ?? null;
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

const groups = computed(() => groupByFolder(visibleSkills.value));

// A new discovery opens the first tab with skills, Warning first.
watch(
	() => props.discovery,
	() => {
		search.value = '';
		selectTab(TABS.find((tab) => skillsByTab.value[tab].length > 0) ?? 'warning');
	},
	{ immediate: true },
);

const previewSkill = computed(
	() => props.discovery.skills.find((skill) => skill.key === previewKey.value) ?? null,
);

/** The state of a checkbox that ticks every selectable skill of a list. */
function stateOf(skills: DiscoveredSkill[]) {
	const keys = skills.filter(isSelectableSkill).map((skill) => skill.key);
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
	const findings = skill.check ? findingsText(skill.check.findings) : '';
	if (findings) return findings;
	return skill.error ? reasonText(skill.error.reason) : '';
}

/** The warnings of a skill that needs review, and the domains that a skill links to. */
function noteOf(skill: DiscoveredSkill): string {
	if (!skill.check) return '';
	const warnings = skill.check.verdict === 'needs_review' ? findingsText(skill.check.findings) : '';
	return [warnings, linkedDomainsText(skill.check.findings)].filter(Boolean).join('. ');
}
</script>

<template>
	<div :class="$style.review" data-test-id="skill-source-review">
		<N8nTabs
			:model-value="activeTab"
			:options="tabOptions"
			data-test-id="skill-source-tabs"
			@update:model-value="selectTab"
		/>
		<div :class="$style.panes">
			<div :class="$style.left">
				<N8nInput
					v-model="search"
					size="small"
					:placeholder="i18n.baseText('settings.context.skills.connect.review.search')"
					data-test-id="skill-source-search"
				/>
				<N8nCheckbox
					:model-value="selectAll.checked"
					:indeterminate="selectAll.indeterminate"
					:disabled="selectAll.keys.length === 0"
					:label="i18n.baseText('settings.context.skills.connect.review.selectAll')"
					data-test-id="skill-source-select-all"
					@update:model-value="toggleAll(visibleSkills)"
				/>
				<ul :class="$style.list" data-test-id="skill-source-skills">
					<li
						v-for="group in groups"
						:key="group.folder"
						:data-folder="group.folder"
						data-test-id="skill-source-group"
					>
						<div v-if="groups.length > 1" :class="$style.groupHeader">
							<N8nCheckbox
								:model-value="stateOf(group.skills).checked"
								:indeterminate="stateOf(group.skills).indeterminate"
								:disabled="stateOf(group.skills).keys.length === 0"
								:aria-label="group.folder"
								data-test-id="skill-source-group-checkbox"
								@update:model-value="toggleAll(group.skills)"
							/>
							<N8nText size="small" color="text-light" bold>{{ group.folder }}</N8nText>
						</div>
						<ul :class="$style.groupSkills">
							<li
								v-for="item in group.skills"
								:key="item.key"
								:class="[$style.item, item.key === previewKey && $style.active]"
								:data-skill-key="item.key"
								data-test-id="skill-source-skill"
							>
								<N8nCheckbox
									:model-value="isSelectableSkill(item) && selected.includes(item.key)"
									:disabled="!isSelectableSkill(item)"
									:aria-label="titleOf(item)"
									data-test-id="skill-source-skill-checkbox"
									@update:model-value="toggle(item.key, $event)"
								/>
								<button type="button" :class="$style.itemText" @click="previewKey = item.key">
									<N8nText bold size="small">{{ titleOf(item) }}</N8nText>
									<N8nText v-if="item.description" size="small" color="text-light">
										{{ item.description }}
									</N8nText>
									<N8nText
										v-if="activeTab === 'blocked'"
										size="small"
										color="danger"
										data-test-id="skill-source-skill-reason"
									>
										{{ blockedReason(item) }}
									</N8nText>
									<N8nText
										v-else-if="noteOf(item)"
										size="small"
										:color="item.check?.verdict === 'needs_review' ? 'warning' : 'text-light'"
										data-test-id="skill-source-skill-findings"
									>
										{{ noteOf(item) }}
									</N8nText>
								</button>
							</li>
						</ul>
					</li>
				</ul>
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
			<div :class="$style.right">
				<SkillSourceFilesView v-if="previewSkill" :skill="previewSkill" />
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.review {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	min-height: 0;
}

.panes {
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
	gap: var(--spacing--sm);
	height: 60vh;
}

.left {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-height: 0;
}

.right {
	min-height: 0;
	overflow-y: auto;
	border: var(--border);
	border-radius: var(--radius);
}

.list {
	flex: 1;
	margin: 0;
	padding: 0;
	overflow-y: auto;
	list-style: none;
	border: var(--border);
	border-radius: var(--radius);
}

.groupHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--xs);
	background-color: var(--color--background--light-2);
	border-bottom: var(--border);
}

.groupSkills {
	margin: 0;
	padding: 0;
	list-style: none;
}

.item {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-bottom: var(--border);
}

.active {
	background-color: var(--color--background--light-1);
}

.itemText {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
	padding: 0;
	text-align: left;
	background: none;
	border: none;
	cursor: pointer;
}
</style>
