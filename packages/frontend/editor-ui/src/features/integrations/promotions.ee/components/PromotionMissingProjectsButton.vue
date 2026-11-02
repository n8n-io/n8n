<script setup lang="ts">
import type { SerializedProject } from '@n8n/api-types';
import { useLatestFetch } from '@n8n/composables/useLatestFetch';
import { N8nButton, N8nTooltip, TOOLTIP_DELAY_MS } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { computed, ref, shallowRef, watch } from 'vue';

import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { fetchMissingPromotionProjects } from '../promotionsSettings.api';
import PromotionMissingProjectsDialog from './PromotionMissingProjectsDialog.vue';

const props = defineProps<{
	environmentId: string;
	environmentName: string;
	connected: boolean;
	busy?: boolean;
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const projectsStore = useProjectsStore();
const { next: nextLoad } = useLatestFetch();

const projects = shallowRef<SerializedProject[]>();
const loadError = ref<string>();
const dialogOpen = ref(false);

const count = computed(() => projects.value?.length ?? 0);

const tooltip = computed(() => {
	const interpolate = { environment: props.environmentName, count: String(count.value) };
	if (loadError.value !== undefined) {
		return i18n.baseText('settings.promotions.missingProjects.tooltip.error', {
			interpolate: { ...interpolate, error: loadError.value },
		});
	}
	if (projects.value === undefined) return undefined;
	return count.value
		? i18n.baseText('settings.promotions.missingProjects.tooltip.missing', {
				adjustToNumber: count.value,
				interpolate,
			})
		: i18n.baseText('settings.promotions.missingProjects.tooltip.none', { interpolate });
});

async function load() {
	const isLatestLoad = nextLoad();
	projects.value = undefined;
	loadError.value = undefined;
	if (!props.connected) return;
	try {
		const { data } = await fetchMissingPromotionProjects(
			rootStore.publicApiContext,
			props.environmentId,
		);
		if (isLatestLoad()) projects.value = data;
	} catch (error) {
		if (isLatestLoad()) loadError.value = getErrorMessage(error);
	}
}

watch(() => [props.environmentId, props.connected], load, { immediate: true });

// After a failed check the button stays enabled, so a click checks again.
async function onClick() {
	if (loadError.value !== undefined) await load();
	if (count.value) dialogOpen.value = true;
}
</script>

<template>
	<div :class="$style.root">
		<N8nTooltip :content="tooltip" :disabled="!tooltip" :show-after="TOOLTIP_DELAY_MS">
			<N8nButton
				variant="outline"
				size="small"
				:disabled="
					busy ||
					(!count && loadError === undefined) ||
					!projectsStore.hasPermissionToCreateProjects
				"
				data-test-id="promotion-missing-projects-button"
				@click="onClick"
			>
				{{
					count
						? i18n.baseText('settings.promotions.missingProjects.button.count', {
								adjustToNumber: count,
								interpolate: { count: String(count) },
							})
						: i18n.baseText('settings.promotions.missingProjects.button')
				}}
			</N8nButton>
		</N8nTooltip>
		<PromotionMissingProjectsDialog
			v-if="dialogOpen && projects"
			:open="dialogOpen"
			:environment-name="environmentName"
			:projects="projects"
			@update:open="dialogOpen = $event"
			@changed="load"
		/>
	</div>
</template>

<style lang="scss" module>
// The card lays out its action buttons, so this wrapper adds no box.
.root {
	display: contents;
}
</style>
