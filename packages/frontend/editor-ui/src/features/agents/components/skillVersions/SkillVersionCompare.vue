<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { SkillVersionSummary } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { N8nButton, N8nLoading } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { AgentSkill } from '../../types';
import SkillVersionCompareBar from './SkillVersionCompareBar.vue';
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

const options = computed<Array<{ value: SkillCompareTarget; label: string }>>(() => [
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
		<SkillVersionCompareBar v-model:from="from" v-model:to="to" :options="options">
			<N8nButton
				variant="ghost"
				size="small"
				data-testid="skill-version-compare-close"
				@click="emit('close')"
			>
				{{ i18n.baseText('settings.context.skills.versions.compare.close') }}
			</N8nButton>
		</SkillVersionCompareBar>

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
</style>
