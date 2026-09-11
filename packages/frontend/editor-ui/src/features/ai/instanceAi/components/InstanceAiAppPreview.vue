<script lang="ts" setup>
import { computed } from 'vue';
import AppDetailsView from '@/features/apps/AppDetailsView.vue';
import { useIsAgentWorking } from '../composables/useIsAgentWorking';

const props = withDefaults(
	defineProps<{
		appId: string | null;
		projectId: string | null;
		/** Page to open the preview on; the app's first root page when null. */
		pageId?: string | null;
		/** Incremented to force a re-fetch even when appId stays the same (e.g. a page was edited). */
		refreshKey?: number;
	}>(),
	{ pageId: null, refreshKey: 0 },
);

// The block editor stays read-only while the agent works, so a user edit
// can't race an in-flight `apps` tool call — the same lock every artifact
// preview shares. AppDetailsView has no read-only prop, so this remounts
// (via the key below) rather than mutating live state, and blocks pointer
// events on top of that remount.
const isAgentWorking = useIsAgentWorking();

const previewKey = computed(() => `${props.appId}-${props.refreshKey}`);
</script>

<template>
	<div :class="$style.content">
		<div
			v-if="props.appId && props.projectId"
			:class="[$style.frame, { [$style.readOnly]: isAgentWorking }]"
		>
			<AppDetailsView
				:key="previewKey"
				:project-id="props.projectId"
				:app-id="props.appId"
				:initial-page-id="props.pageId"
				artifact-mode
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.content {
	flex: 1;
	min-height: 0;
	position: relative;
	height: 100%;
}

.frame {
	height: 100%;
	min-height: 0;
}

.readOnly {
	pointer-events: none;
}
</style>
