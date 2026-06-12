<script setup lang="ts">
import InlineChipPicker from './InlineChipPicker.vue';

import type { DesktopAssistantDescriptionPart } from '../../shared/types';

/*
 * The segmented task-description sentence shared by the draft view (always
 * editable) and the task detail view (editable behind its Edit toggle).
 * Renders inline parts only — the caller owns the wrapping <p> and its
 * typography, so each view keeps its own prose color.
 */
const props = defineProps<{
	parts: DesktopAssistantDescriptionPart[];
	/** Render params as dropdown chips; otherwise as emphasized read-mode text. */
	editing: boolean;
	/** User-picked value per param id; falls back to the part's generated value. */
	values: Record<string, string>;
}>();

const emit = defineEmits<{ change: [paramId: string, value: string] }>();
</script>

<template>
	<template v-for="(part, index) in props.parts" :key="index">
		<span v-if="part.kind === 'text'">{{ part.text }}</span>
		<InlineChipPicker
			v-else-if="editing"
			:value="props.values[part.id] ?? part.value"
			:options="part.options"
			@change="emit('change', part.id, $event)"
		/>
		<strong v-else :class="$style.paramValue">{{ part.value }}</strong>
	</template>
</template>

<style module>
/* Read-mode emphasis of an editable value — the same words that become a chip in edit mode. */
.paramValue {
	font-weight: 600;
	color: var(--da-text);
}
</style>
