<script setup lang="ts">
import { N8nButton, N8nSelectedItemsInfo } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ref, watch } from 'vue';

/**
 * The bar of actions for the selected rows of a policy table. It does not know the scope of the
 * policy, so the instance page and the project page can both use it.
 */
const props = defineProps<{
	count: number;
	/** False when every selected row is already restricted. */
	canRestrict: boolean;
	/** False when every selected row is already allowed. */
	canAllow: boolean;
	busy?: boolean;
}>();

const emit = defineEmits<{ restrict: []; allow: []; clear: [] }>();

const i18n = useI18n();

// Outside the bar, which leaves the DOM at 0, so that a screen reader also hears the clear.
const announcement = ref('');
watch(
	() => props.count,
	(count, previous) => {
		if (count > 0) {
			announcement.value = i18n.baseText('typeAvailabilityPolicies.instancePolicy.bulk.announce', {
				adjustToNumber: count,
				interpolate: { count: String(count) },
			});
		} else if (previous > 0) {
			announcement.value = i18n.baseText('typeAvailabilityPolicies.instancePolicy.bulk.cleared');
		}
	},
);
</script>

<template>
	<div :class="$style.root" @keydown.esc="emit('clear')">
		<!-- Not N8nVisuallyHidden: it sets aria-hidden, which hides the announcement too. -->
		<span
			role="status"
			aria-live="polite"
			aria-atomic="true"
			:class="$style.status"
			data-test-id="policy-bulk-status"
			>{{ announcement }}</span
		>
		<N8nSelectedItemsInfo
			role="group"
			:aria-label="i18n.baseText('typeAvailabilityPolicies.instancePolicy.bulk.toolbarLabel')"
			:class="$style.bar"
			:selected-count="count"
			@clear-selection="emit('clear')"
		>
			<template #actions>
				<!-- Not `loading`: it disables the native button, which loses the keyboard focus. -->
				<N8nButton
					variant="outline"
					:disabled="!canRestrict || busy"
					focusable-when-disabled
					data-test-id="policy-bulk-restrict"
					data-attr="policy-bulk-restrict"
					:label="i18n.baseText('typeAvailabilityPolicies.instancePolicy.bulk.restrict')"
					@click="emit('restrict')"
				/>
				<N8nButton
					variant="outline"
					:disabled="!canAllow || busy"
					focusable-when-disabled
					data-test-id="policy-bulk-allow"
					data-attr="policy-bulk-allow"
					:label="i18n.baseText('typeAvailabilityPolicies.instancePolicy.bulk.allow')"
					@click="emit('allow')"
				/>
			</template>
		</N8nSelectedItemsInfo>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/utils' as utils;

// The bar floats at the bottom of the view while the table is longer than the view, and sits under
// the table otherwise.
.root {
	position: sticky;
	bottom: var(--spacing--lg);
	/* No z-index token exists. 2 matches the sticky table header and the design-system bar. */
	z-index: 2;
	display: flex;
	justify-content: center;
}

.status {
	@include utils.utils-sr-only;
}

// The design-system bar places itself absolutely. The wrapper does the placing here.
.root .bar {
	position: static;
	transform: none;
}
</style>
