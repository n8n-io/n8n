<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { useElementBounding } from '@vueuse/core';
import { useI18n } from '@n8n/i18n';
import {
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

/** The popover card width plus its gap to the row and a margin to the viewport edge. */
const SPACE_FOR_CARD_ON_LEFT = 254 + 24 + 8;

const i18n = useI18n();
const { left: rowLeft } = useElementBounding(() => props.rowElement);

// The command bar is centered and wide. On a narrow viewport the card does not fit beside it.
const opensBelow = computed(() => rowLeft.value < SPACE_FOR_CARD_ON_LEFT);

const popover = useTemplateRef('popover');

// Enter on the row runs the card's action: the list keeps focus in its search input.
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
			:side-offset="opensBelow ? 4 : 24"
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
