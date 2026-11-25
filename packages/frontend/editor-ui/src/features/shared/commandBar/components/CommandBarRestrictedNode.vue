<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue';
import { useElementVisibility, useEventListener } from '@vueuse/core';
import { useI18n } from '@n8n/i18n';
import {
	RESTRICTED_NODE_POPOVER_SIDE_OFFSET,
	RESTRICTED_NODE_POPOVER_WIDTH,
	RestrictedNodePopover,
	SCOPE_LABEL_KEY,
	type TypeRestriction,
} from '@n8n/frontend-module-type-availability-policies';

const props = defineProps<{
	nodeTypeName: string;
	restriction: TypeRestriction;
	rowElement?: HTMLElement | null;
	isActive?: boolean;
}>();

const VIEWPORT_MARGIN = 8;
const SPACE_FOR_CARD_ON_LEFT =
	RESTRICTED_NODE_POPOVER_WIDTH + RESTRICTED_NODE_POPOVER_SIDE_OFFSET + VIEWPORT_MARGIN;
const OFFSET_BELOW_ROW = 4;

const i18n = useI18n();

// Only the active row is watched: a list can hold many restricted rows.
const activeRow = computed(() => (props.isActive ? props.rowElement : null));

// The popover only hides when its row leaves the viewport, not when the list scrolls it out.
const rowVisible = useElementVisibility(activeRow, { initialValue: true });

const opensBelow = ref(false);
function updatePlacement() {
	if (activeRow.value) {
		opensBelow.value = activeRow.value.getBoundingClientRect().left < SPACE_FOR_CARD_ON_LEFT;
	}
}
watch(activeRow, updatePlacement, { immediate: true });
useEventListener(() => (activeRow.value ? window : null), 'resize', updatePlacement, {
	passive: true,
});

const popover = useTemplateRef('popover');

defineExpose({ activate: () => popover.value?.requestContactAdmin() });

const scopeLabel = computed(() => {
	const scope = props.restriction.scope;
	return scope ? i18n.baseText(SCOPE_LABEL_KEY[scope]) : undefined;
});
</script>

<template>
	<span :class="$style.root">
		<span v-if="scopeLabel" :class="$style.scope" data-test-id="command-bar-restriction-scope">{{
			scopeLabel
		}}</span>
		<RestrictedNodePopover
			ref="popover"
			:node-type-name="nodeTypeName"
			:restriction="restriction"
			:anchor="rowElement"
			:active="isActive && rowVisible"
			:side="opensBelow ? 'bottom' : 'left'"
			:align="opensBelow ? 'end' : 'center'"
			:side-offset="opensBelow ? OFFSET_BELOW_ROW : RESTRICTED_NODE_POPOVER_SIDE_OFFSET"
		/>
	</span>
</template>

<style lang="scss" module>
.root {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.scope {
	white-space: nowrap;
}
</style>
