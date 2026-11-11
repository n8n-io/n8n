<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { useElementBounding } from '@vueuse/core';
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
const { left: rowLeft } = useElementBounding(() => props.rowElement);

const opensBelow = computed(() => rowLeft.value < SPACE_FOR_CARD_ON_LEFT);

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
			:active="isActive"
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
