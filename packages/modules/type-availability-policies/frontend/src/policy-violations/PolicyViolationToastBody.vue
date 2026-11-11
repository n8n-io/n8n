<script setup lang="ts">
import type { PolicyViolation } from '@n8n/api-types';
import { N8nIcon, N8nText } from '@n8n/design-system';

import PolicyViolationList from './PolicyViolationList.vue';

/**
 * The body of a policy toast in the design's type scale: warning icon, title, description and
 * the grouped violations. The host toast keeps only its frame and close button.
 */
// Optional props fall through to PolicyViolationList's own defaults.
defineProps<{
	title: string;
	description: string;
	violations: PolicyViolation[];
	isJumpable?: (violation: PolicyViolation) => boolean;
	labelOf?: (violation: PolicyViolation) => string | undefined;
}>();

const emit = defineEmits<{ jump: [violation: PolicyViolation] }>();
</script>

<template>
	<div :class="$style.layout" data-test-id="policy-violation-toast-body">
		<N8nIcon icon="triangle-alert" size="large" color="warning" :class="$style.icon" />
		<div :class="$style.body">
			<N8nText tag="h2" size="medium" bold color="text-dark" :class="$style.text">
				{{ title }}
			</N8nText>
			<N8nText tag="p" size="small" color="text-base" :class="$style.text">
				{{ description }}
			</N8nText>
			<PolicyViolationList
				:violations="violations"
				:is-jumpable="isJumpable"
				:label-of="labelOf"
				@jump="emit('jump', $event)"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.layout {
	display: flex;
	gap: var(--spacing--xs);
}

.icon {
	flex: none;
	margin-top: var(--spacing--5xs);
}

// A gap, not margins: a host toast may reset the margins of the paragraphs inside it.
.body {
	display: flex;
	flex: auto;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.text {
	margin: 0;
}
</style>
