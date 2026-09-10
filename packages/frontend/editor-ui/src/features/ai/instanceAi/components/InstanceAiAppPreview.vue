<script setup lang="ts">
import { computed, watch } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import AppDetailsView from '@/features/apps/AppDetailsView.vue';
import { getAppBuilderTargetFromThreadMetadata } from '../instanceAi.threadRuntime';
import { useThread, useInstanceAiStore } from '../instanceAi.store';
import { INSTANCE_AI_APP_BUILDER_TARGET_METADATA_KEY } from '../constants';

const props = defineProps<{
	appId: string;
	projectId: string;
	/** Latest built version; absent until the first `apps build` result arrives. */
	versionId?: string;
	/** An `apps build` call for this app is in flight. */
	building?: boolean;
}>();

defineEmits<{ 'assistant-handoff': [prompt: string] }>();

const thread = useThread();
const instanceAiStore = useInstanceAiStore();
const i18n = useI18n();
const toast = useToast();

// Showing an app binds the thread to it, so a later visit reopens this tab and
// the agent keeps building the same app.
async function syncAppTarget() {
	const target = getAppBuilderTargetFromThreadMetadata(
		instanceAiStore.getThreadMetadata(thread.id),
	);
	if (target?.appId === props.appId && target.projectId === props.projectId) return;

	const name = thread.producedArtifacts.get(props.appId)?.name;
	try {
		await instanceAiStore.updateThreadMetadata(thread.id, {
			[INSTANCE_AI_APP_BUILDER_TARGET_METADATA_KEY]: {
				appId: props.appId,
				projectId: props.projectId,
				...(name ? { name } : {}),
			},
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('generic.error'));
	}
}

watch(() => props.appId, syncAppTarget, { immediate: true });

// Seeded once (see openAppArtifactThread) when this thread was opened from a
// specific page's inspector — not kept in sync with in-app navigation.
const pagePath = computed(
	() =>
		getAppBuilderTargetFromThreadMetadata(instanceAiStore.getThreadMetadata(thread.id))?.pagePath,
);
</script>

<template>
	<div :class="$style.root">
		<Transition name="app-building-indicator">
			<div
				v-if="props.building"
				:class="$style.buildingIndicator"
				role="status"
				data-test-id="instance-ai-app-building-indicator"
			>
				<N8nIcon icon="spinner" spin size="small" />
				<span :class="$style.buildingLabel">
					{{ i18n.baseText('instanceAi.appPreview.building') }}
				</span>
			</div>
		</Transition>
		<AppDetailsView
			artifact-mode
			:project-id="props.projectId"
			:app-id="props.appId"
			:artifact-version-id="props.versionId"
			:artifact-page-path="pagePath"
			@assistant-handoff="$emit('assistant-handoff', $event)"
		/>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

.root {
	position: relative;
	height: 100%;
	min-height: 0;
}

.buildingIndicator {
	position: absolute;
	top: calc(var(--height--4xl) + var(--spacing--xs));
	left: 50%;
	transform: translateX(-50%);
	z-index: 10;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--xl);
	background: var(--background--surface);
	box-shadow: var(--shadow--sm);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
	color: var(--text-color--subtle);
	pointer-events: none;
	white-space: nowrap;
}

.buildingLabel {
	--animation--shimmer--duration: 1.5s;
	--animation--shimmer--background: color-mix(
		in srgb,
		var(--text-color--subtle) 30%,
		var(--background--surface) 70%
	);
	--animation--shimmer--foreground: var(--text-color--subtle);
	@include motion.shimmer;
}
</style>

<style lang="scss">
.app-building-indicator-enter-from,
.app-building-indicator-leave-to {
	opacity: 0;
	transform: translate(-50%, -4px);
}

.app-building-indicator-enter-active {
	transition: all var(--duration--snappy) var(--easing--ease-out);
}

.app-building-indicator-leave-active {
	transition: all var(--duration--snappy) var(--easing--ease-in);
}
</style>
