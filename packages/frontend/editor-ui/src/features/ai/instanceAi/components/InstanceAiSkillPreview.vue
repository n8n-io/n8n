<script lang="ts" setup>
import { ref, shallowRef, watch } from 'vue';
import type { SkillDetail } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import AgentSkillModal, {
	type AgentSkillModalData,
	type AgentSkillConfirmFailure,
} from '@/features/agents/components/AgentSkillModal.vue';
import { isSkillNameTakenError } from '@/features/agents/utils/agentSkill';
import { useSkillsStore } from '@/features/settings/context/skills.store';

const props = withDefaults(
	defineProps<{
		skillId: string;
		/** Incremented to force a re-fetch when the assistant saves the same skill again. */
		refreshKey?: number;
	}>(),
	{ refreshKey: 0 },
);

const i18n = useI18n();
const skillsStore = useSkillsStore();
const { showError } = useToast();

const detail = shallowRef<SkillDetail | null>(null);
const isLoading = ref(false);
const fetchError = ref(false);

watch(
	() => [props.skillId, props.refreshKey] as const,
	async ([skillId], previous, onCleanup) => {
		let cancelled = false;
		onCleanup(() => {
			cancelled = true;
		});

		const isSameSkill = previous?.[0] === skillId;
		if (!isSameSkill) {
			detail.value = null;
		}
		isLoading.value = true;
		fetchError.value = false;

		const result = await skillsStore.fetchSkill(skillId).catch(() => null);
		if (cancelled) return;
		isLoading.value = false;
		if (!result) {
			detail.value = null;
			fetchError.value = true;
			return;
		}
		detail.value = result;
	},
	{ immediate: true },
);

async function saveSkill({
	skill,
}: Parameters<AgentSkillModalData['onConfirm']>[0]): Promise<AgentSkillConfirmFailure | undefined> {
	const current = detail.value;
	if (!current?.canEdit || isLoading.value) return { saved: false };
	try {
		const saved = await skillsStore.saveSkill(current.id, {
			name: skill.name,
			description: skill.description,
			instructions: skill.instructions,
			references: skill.references ?? [],
			baseSkillHash: current.skillHash,
		});
		// A skill switch or an Assistant reload can finish while this save runs.
		if (detail.value !== current) return { saved: false };
		detail.value = {
			...current,
			name: saved.skill.name,
			description: saved.skill.description,
			skill: saved.skill,
			skillHash: saved.skillHash,
			latestVersion: saved.version,
		};
	} catch (error) {
		if (isSkillNameTakenError(error)) {
			return { saved: false, nameError: i18n.baseText('settings.context.skills.error.nameTaken') };
		}
		showError(error, i18n.baseText('settings.context.skills.error.save'));
		return { saved: false };
	}
	return undefined;
}
</script>

<template>
	<div :class="$style.content" :aria-busy="isLoading" data-test-id="instance-ai-skill-preview">
		<div v-if="fetchError" :class="$style.centerState">
			<N8nText color="text-light">{{
				i18n.baseText('instanceAi.skillPreview.fetchError')
			}}</N8nText>
		</div>

		<div
			v-else-if="isLoading && !detail"
			:class="$style.centerState"
			data-test-id="instance-ai-skill-preview-loading"
		>
			<N8nIcon icon="loader-circle" :size="80" spin />
		</div>

		<AgentSkillModal
			v-else-if="detail"
			:key="skillId"
			inline
			:data="{
				skillId: detail.id,
				skill: detail.skill,
				readOnly: !detail.canEdit || isLoading,
				syncedFrom: detail.syncedFrom ?? undefined,
				onConfirm: saveSkill,
			}"
		/>
	</div>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	background-color: var(--color--background--light-3);
}

.centerState {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xs);
	height: 100%;
}
</style>
