<script lang="ts" setup>
import { ref, shallowRef, watch } from 'vue';
import type { SkillDetail } from '@n8n/api-types';
import { N8nButton, N8nHeading, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import AgentSkillFileNav from '@/features/agents/components/AgentSkillFileNav.vue';
import AgentSkillViewer from '@/features/agents/components/AgentSkillViewer.vue';
import SkillScopeBadge from '@/features/settings/context/components/SkillScopeBadge.vue';
import { useSkillsStore } from '@/features/settings/context/skills.store';
import { skillsHubHref } from '../canvasPreview.utils';

const SKILL_FILE = 'SKILL.md';

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

const detail = shallowRef<SkillDetail | null>(null);
const selectedPath = ref(SKILL_FILE);
const isLoading = ref(false);
const fetchError = ref(false);

watch(
	() => [props.skillId, props.refreshKey] as const,
	async ([skillId], previous, onCleanup) => {
		let cancelled = false;
		onCleanup(() => {
			cancelled = true;
		});

		// Keep the file the user reads when the same skill reloads after a save.
		const isSameSkill = previous?.[0] === skillId;
		if (!isSameSkill) {
			detail.value = null;
			selectedPath.value = SKILL_FILE;
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
		const pathExists =
			selectedPath.value === SKILL_FILE ||
			(result.skill.references ?? []).some((reference) => reference.path === selectedPath.value);
		if (!pathExists) selectedPath.value = SKILL_FILE;
	},
	{ immediate: true },
);

function openInSkillsHub() {
	window.open(skillsHubHref(props.skillId), '_blank', 'noopener');
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

		<template v-else-if="detail">
			<div :class="$style.header">
				<div :class="$style.titleRow">
					<N8nHeading tag="h2" size="large" bold :class="$style.title">{{
						detail.name
					}}</N8nHeading>
					<SkillScopeBadge :skill="detail" />
				</div>
				<N8nButton
					variant="outline"
					size="small"
					icon="external-link"
					:label="i18n.baseText('instanceAi.skillPreview.openInSkills')"
					data-test-id="instance-ai-skill-preview-open"
					@click="openInSkillsHub"
				/>
			</div>
			<div :class="$style.body">
				<AgentSkillFileNav
					:skill="detail.skill"
					:selected-path="selectedPath"
					read-only
					@select="selectedPath = $event"
				/>
				<AgentSkillViewer
					:class="$style.viewer"
					:skill="detail.skill"
					:selected-path="selectedPath"
					read-only
					@select:path="selectedPath = $event"
				/>
			</div>
		</template>
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

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm) var(--spacing--md);
	border-bottom: var(--border);
}

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	min-width: 0;
}

.title {
	margin: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.body {
	display: flex;
	flex: 1;
	min-height: 0;
	overflow: auto;
}

.viewer {
	padding: var(--spacing--sm) var(--spacing--md);
}

.centerState {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xs);
	height: 100%;
}

@media (max-width: 480px) {
	.body {
		flex-direction: column;
	}
}
</style>
