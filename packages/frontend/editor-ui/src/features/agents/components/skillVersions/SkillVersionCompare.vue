<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { SkillVersionSummary } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { N8nButton, N8nIcon, N8nLoading, N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { AgentSkill } from '../../types';
import SkillVersionDiff from './SkillVersionDiff.vue';

/** A saved version number, or the edits the user has not saved yet. */
export type SkillCompareTarget = number | 'unsaved';

const props = defineProps<{
	/** Newest first, as the API lists them. */
	versions: SkillVersionSummary[];
	latestVersion: number;
	loadVersion: (version: number) => Promise<AgentSkill>;
	/** Set while the editor has unsaved edits, so they can be compared too. */
	unsavedSkill?: AgentSkill | null;
}>();

const from = defineModel<SkillCompareTarget>('from', { required: true });
const to = defineModel<SkillCompareTarget>('to', { required: true });

const emit = defineEmits<{ close: [] }>();

const i18n = useI18n();
const { showError } = useToast();

const contents = ref<{ from: AgentSkill; to: AgentSkill } | null>(null);
const loading = ref(false);
let latestLoad = 0;

const options = computed(() => [
	...(props.unsavedSkill
		? [
				{
					value: 'unsaved' as const,
					label: i18n.baseText('settings.context.skills.versions.compare.unsaved'),
				},
			]
		: []),
	...props.versions.map(({ version, label }) => ({
		value: version,
		label: optionLabel(version, label),
	})),
]);

function optionLabel(version: number, label: string | null): string {
	const parts = [
		i18n.baseText('settings.context.skills.versions.number', {
			interpolate: { version: String(version) },
		}),
		...(label ? [label] : []),
	];
	const text = parts.join(' · ');
	return version === props.latestVersion
		? `${text} ${i18n.baseText('settings.context.skills.versions.compare.latest')}`
		: text;
}

function targetLabel(target: SkillCompareTarget): string {
	return options.value.find(({ value }) => value === target)?.label ?? '';
}

function toTarget(value: unknown): SkillCompareTarget | undefined {
	if (value === 'unsaved') return 'unsaved';
	return typeof value === 'number' ? value : undefined;
}

function onSelect(side: 'from' | 'to', value: unknown) {
	const target = toTarget(value);
	if (target === undefined) return;
	if (side === 'from') from.value = target;
	else to.value = target;
}

function onSwap() {
	[from.value, to.value] = [to.value, from.value];
}

async function contentOf(target: SkillCompareTarget): Promise<AgentSkill> {
	if (target === 'unsaved') {
		// The edits can be gone after a save. The latest version then holds them.
		return props.unsavedSkill ?? (await props.loadVersion(props.latestVersion));
	}
	return await props.loadVersion(target);
}

// Only the newest pair of choices commits, so a slow earlier load cannot replace it.
watch(
	[from, to, () => props.unsavedSkill],
	async () => {
		const load = ++latestLoad;
		loading.value = true;
		try {
			const [fromSkill, toSkill] = await Promise.all([contentOf(from.value), contentOf(to.value)]);
			if (load === latestLoad) contents.value = { from: fromSkill, to: toSkill };
		} catch (error) {
			if (load === latestLoad)
				showError(error, i18n.baseText('settings.context.skills.versions.loadError'));
		} finally {
			if (load === latestLoad) loading.value = false;
		}
	},
	{ immediate: true },
);
</script>

<template>
	<div :class="$style.compare" data-testid="skill-version-compare">
		<div :class="$style.bar">
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('settings.context.skills.versions.compare.title') }}
			</N8nText>
			<N8nSelect
				:model-value="from"
				size="small"
				:teleported="false"
				:class="$style.select"
				:aria-label="i18n.baseText('settings.context.skills.versions.compare.from')"
				data-testid="skill-version-compare-from"
				@update:model-value="onSelect('from', $event)"
			>
				<N8nOption
					v-for="option in options"
					:key="option.value"
					:value="option.value"
					:label="option.label"
				/>
			</N8nSelect>
			<N8nIcon icon="arrow-right" size="small" color="text-light" />
			<N8nSelect
				:model-value="to"
				size="small"
				:teleported="false"
				:class="$style.select"
				:aria-label="i18n.baseText('settings.context.skills.versions.compare.to')"
				data-testid="skill-version-compare-to"
				@update:model-value="onSelect('to', $event)"
			>
				<N8nOption
					v-for="option in options"
					:key="option.value"
					:value="option.value"
					:label="option.label"
				/>
			</N8nSelect>
			<N8nButton
				variant="outline"
				size="small"
				data-testid="skill-version-compare-swap"
				@click="onSwap"
			>
				<template #icon><N8nIcon icon="arrow-left-right" size="small" /></template>
				{{ i18n.baseText('settings.context.skills.versions.compare.swap') }}
			</N8nButton>
			<span :class="$style.spacer" />
			<N8nButton
				variant="ghost"
				size="small"
				data-testid="skill-version-compare-close"
				@click="emit('close')"
			>
				{{ i18n.baseText('settings.context.skills.versions.compare.close') }}
			</N8nButton>
		</div>

		<N8nLoading v-if="loading && !contents" :rows="4" />
		<SkillVersionDiff
			v-else-if="contents"
			:from="contents.from"
			:to="contents.to"
			:from-label="targetLabel(from)"
			:to-label="targetLabel(to)"
		/>
	</div>
</template>

<style lang="scss" module>
.compare {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--md) var(--spacing--lg);
	min-width: 0;
	flex: 1;
	overflow-y: auto;
}

.bar {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.select {
	width: 14rem;
}

.spacer {
	flex: 1;
}
</style>
