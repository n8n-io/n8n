<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { SkillListItem, SkillScope } from '@n8n/api-types';
import {
	N8nButton,
	N8nIcon,
	N8nInput,
	N8nLoading,
	N8nSwitch2,
	N8nTabs,
	N8nText,
} from '@n8n/design-system';
import type { TabOptions } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useRootStore } from '@n8n/stores/useRootStore';

import { useUIStore } from '@/app/stores/ui.store';
import { getSkills } from '@/features/settings/context/skills.api';
import AgentModal from './modals/AgentModal.vue';

type PickerTab = 'all' | SkillScope;

export type AgentSkillPickerModalData = {
	agentId: string;
	/** The name of the agent's project tab: the team project name, or "Personal project". */
	projectLabel: string;
	/** A getter, so the toggles follow the agent while the picker is open. */
	attachedIds: () => string[];
	/** Resolves to false when the skill was not attached, so the toggle goes back off. */
	onAttach: (skill: SkillListItem) => Promise<boolean>;
	onDetach: (skillId: string) => void;
	onCreate: () => void;
	onManage: () => void;
};

const props = defineProps<{
	modalName: string;
	data: AgentSkillPickerModalData;
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const rootStore = useRootStore();
const { showError } = useToast();

const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);

const skills = ref<SkillListItem[]>([]);
const loading = ref(true);
const loadFailed = ref(false);
const search = ref('');
const tab = ref<PickerTab>('all');
const pending = ref(new Set<string>());

const attached = computed(() => new Set(props.data.attachedIds()));

// The list holds every skill the agent may attach, so search and tabs filter in the browser.
const matching = computed(() => {
	const term = search.value.trim().toLowerCase();
	if (!term) return skills.value;
	return skills.value.filter(
		(skill) =>
			skill.name.toLowerCase().includes(term) || skill.description.toLowerCase().includes(term),
	);
});

const visible = computed(() =>
	tab.value === 'all'
		? matching.value
		: matching.value.filter((skill) => skill.scope === tab.value),
);

const tabs = computed<Array<TabOptions<PickerTab>>>(() => {
	const count = (scope: PickerTab) =>
		scope === 'all'
			? matching.value.length
			: matching.value.filter((skill) => skill.scope === scope).length;
	const label = (text: string, scope: PickerTab) => `${text} (${count(scope)})`;
	return [
		{ value: 'all', label: label(i18n.baseText('agents.builder.skills.picker.tab.all'), 'all') },
		{ value: 'project', label: label(props.data.projectLabel, 'project') },
		{
			value: 'agent',
			label: label(i18n.baseText('agents.builder.skills.picker.tab.agent'), 'agent'),
		},
		{
			value: 'instance',
			label: label(i18n.baseText('agents.builder.skills.picker.tab.instance'), 'instance'),
		},
	];
});

async function load() {
	loading.value = true;
	loadFailed.value = false;
	try {
		const response = await getSkills(rootStore.restApiContext, {
			attachableTo: props.data.agentId,
		});
		skills.value = response.data;
	} catch (error) {
		// A failed load is not an empty hub, so the list says so and offers a retry.
		loadFailed.value = true;
		showError(error, i18n.baseText('agents.builder.skills.picker.loadError'));
	} finally {
		loading.value = false;
	}
}

async function onToggle(skill: SkillListItem, value: boolean) {
	if (!value) {
		props.data.onDetach(skill.id);
		return;
	}
	pending.value = new Set(pending.value).add(skill.id);
	try {
		await props.data.onAttach(skill);
	} finally {
		const next = new Set(pending.value);
		next.delete(skill.id);
		pending.value = next;
	}
}

function closeModal() {
	uiStore.closeModal(props.modalName);
}

function onCreate() {
	closeModal();
	props.data.onCreate();
}

function onManage() {
	closeModal();
	props.data.onManage();
}

onMounted(load);
</script>

<template>
	<AgentModal
		:open="modalOpen"
		:title="i18n.baseText('agents.builder.skills.picker.title')"
		:show-cancel="false"
		:show-footer="true"
		stable-height
		data-testid="agent-skill-picker-modal"
		@update:open="!$event && closeModal()"
	>
		<div :class="$style.content">
			<N8nInput
				v-model="search"
				:placeholder="i18n.baseText('agents.builder.skills.picker.search')"
				clearable
				data-testid="agent-skill-picker-search"
			>
				<template #prefix>
					<N8nIcon icon="search" />
				</template>
			</N8nInput>

			<N8nTabs v-model="tab" :options="tabs" justified data-testid="agent-skill-picker-tabs" />

			<div :class="$style.list">
				<button
					type="button"
					:class="[$style.row, $style.createRow]"
					data-testid="agent-skill-picker-create"
					@click="onCreate"
				>
					<N8nIcon icon="plus" color="primary" size="large" />
					<span :class="$style.text">
						<N8nText size="medium" color="text-dark">
							{{ i18n.baseText('agents.builder.skills.picker.create') }}
						</N8nText>
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('agents.builder.skills.picker.create.description') }}
						</N8nText>
					</span>
				</button>

				<N8nLoading v-if="loading" :rows="3" variant="p" />
				<div v-else-if="loadFailed" :class="$style.empty" data-testid="agent-skill-picker-error">
					<N8nText size="small" color="danger">
						{{ i18n.baseText('agents.builder.skills.picker.loadError') }}
					</N8nText>
					<N8nButton
						variant="ghost"
						size="small"
						data-testid="agent-skill-picker-retry"
						@click="load"
					>
						{{ i18n.baseText('agents.builder.skills.picker.retry') }}
					</N8nButton>
				</div>
				<N8nText
					v-else-if="visible.length === 0"
					size="small"
					color="text-light"
					:class="$style.empty"
					data-testid="agent-skill-picker-empty"
				>
					{{
						i18n.baseText(
							skills.length === 0
								? 'agents.builder.skills.picker.empty'
								: 'agents.builder.skills.picker.noResults',
						)
					}}
				</N8nText>
				<div
					v-for="skill in visible"
					v-else
					:key="skill.id"
					:class="$style.row"
					data-testid="agent-skill-picker-row"
				>
					<span :class="$style.text">
						<N8nText size="medium" color="text-dark">{{ skill.name }}</N8nText>
						<N8nText size="small" color="text-light" :class="$style.description">
							{{ skill.description }}
						</N8nText>
					</span>
					<span :class="$style.toggle">
						<N8nSwitch2
							:model-value="attached.has(skill.id)"
							:disabled="pending.has(skill.id)"
							:aria-label="skill.name"
							data-testid="agent-skill-picker-toggle"
							@update:model-value="(value: boolean) => onToggle(skill, value)"
						/>
						<N8nText size="small" color="text-base">
							{{
								i18n.baseText(
									attached.has(skill.id)
										? 'agents.builder.skills.picker.attached'
										: 'agents.builder.skills.picker.detached',
								)
							}}
						</N8nText>
					</span>
				</div>
			</div>
		</div>

		<template #footerLeft>
			<N8nButton variant="ghost" data-testid="agent-skill-picker-manage" @click="onManage">
				<template #icon><N8nIcon icon="settings" /></template>
				{{ i18n.baseText('agents.builder.skills.picker.manage') }}
			</N8nButton>
		</template>
	</AgentModal>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	min-height: 0;
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-radius: var(--radius);

	&:hover {
		background-color: var(--background--hover);
	}
}

.createRow {
	width: 100%;
	border: none;
	background: none;
	text-align: left;
	cursor: pointer;
}

.text {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.description {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.toggle {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 7rem;
}

.empty {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
}
</style>
