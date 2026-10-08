<script setup lang="ts">
/** "Shared with {project}" next to the chat title, for the owner and the teammates. */
import { computed, nextTick, ref, useTemplateRef } from 'vue';
import { useResizeObserver } from '@vueuse/core';
import { N8nBadge, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useThread } from '../instanceAi.store';
import { useThreadSharingView } from './useThreadSharing';
import { useSharingText } from './useSharingText';

const thread = useThread();
const i18n = useI18n();
const text = useSharingText();
const view = useThreadSharingView(thread);

const label = computed(() =>
	i18n.baseText('instanceAi.sharing.sharedWith', {
		interpolate: { project: text.project(view.value.projectName) },
	}),
);

// A narrow header cuts a long project name off. The tooltip then gives the full text.
const labelText = useTemplateRef<HTMLElement>('labelText');
const isLabelCut = ref(false);
useResizeObserver(labelText, () => {
	const element = labelText.value;
	isLabelCut.value = element !== null && element.scrollWidth > element.clientWidth;
});

const chip = useTemplateRef<HTMLElement>('chip');

/**
 * Moves the focus to the chip once it shows. The Share button goes away when the chat is
 * shared, so the header gives its focus to the chip, which screen readers then read.
 */
function focus(): void {
	void nextTick(() => chip.value?.focus());
}

defineExpose({ focus });
</script>

<template>
	<N8nTooltip v-if="view.isShared" placement="bottom" as-child :disabled="!isLabelCut">
		<template #content>{{ label }}</template>
		<span
			ref="chip"
			:class="$style.chip"
			tabindex="-1"
			data-test-id="instance-ai-shared-thread-chip"
		>
			<N8nBadge variant="outline" leading-icon="users" :class="$style.badge">
				<span :class="$style.labelTrack">
					<span ref="labelText" :class="$style.labelText">{{ label }}</span>
				</span>
			</N8nBadge>
		</span>
	</N8nTooltip>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/focus';

// The chip shrinks before the chat title does, and never takes more than half the header.
.chip {
	display: inline-flex;
	min-width: 0;
	max-width: 50%;
	flex-shrink: 2;
	// The radius of the default badge size, so the focus ring follows its corners.
	border-radius: var(--radius--2xs);

	&:focus-visible {
		@include focus.focus-ring;
	}
}

.badge {
	min-width: 0;
	max-width: 100%;
}

// A `minmax(0, max-content)` track adds no width to the smallest size of the badge, so the
// text gets an ellipsis when the header is narrow.
.labelTrack {
	display: grid;
	grid-template-columns: minmax(0, max-content);
}

.labelText {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
