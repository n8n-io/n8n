<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRouter } from 'vue-router';

import { INSTANCE_AI_VIEW } from '@/features/ai/instanceAi/constants';

/**
 * `fill`: the agent chat view's content (the chat panel) manages its own
 * internal scroll and centering, so the page must not also scroll or cap its
 * width. `false` (default) is the library's plain scrollable, centered column.
 */
withDefaults(defineProps<{ fill?: boolean }>(), { fill: false });

const i18n = useI18n();
const router = useRouter();
// Back always leads to the n8n Assistant home page, not to the previous history entry.
function goBack(): void {
	void router.push({ name: INSTANCE_AI_VIEW });
}
</script>

<template>
	<div :class="[$style.page, { [$style.fill]: fill }]">
		<div :class="$style.topRow">
			<button type="button" :class="$style.backLink" data-testid="n8n-chat-back" @click="goBack">
				<N8nIcon icon="arrow-left" size="small" />
				{{ i18n.baseText('generic.back') }}
			</button>
			<template v-if="$slots.leading">
				<span :class="$style.divider" aria-hidden="true" />
				<slot name="leading" />
			</template>
		</div>

		<div :class="[$style.content, { [$style.fill]: fill }]">
			<slot />
		</div>
	</div>
</template>

<style lang="scss" module>
.page {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	// The layout's content wrapper is a centered flex row, so the page must claim the full width.
	width: 100%;
	padding: var(--spacing--sm) var(--spacing--sm) 0;
	overflow-y: auto;

	&.fill {
		overflow-y: hidden;
	}
}

.topRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	margin-bottom: var(--spacing--sm);
}

.backLink {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: 0;
	border: 0;
	background: none;
	cursor: pointer;
	color: var(--text-color--subtle);
	font-size: var(--font-size--sm);

	&:hover {
		color: var(--color--primary);
	}
}

.divider {
	width: var(--border-width);
	height: var(--spacing--sm);
	background-color: var(--color--foreground);
}

.content {
	align-self: center;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	width: 100%;
	max-width: 800px;
	padding-bottom: var(--spacing--xl);

	&.fill {
		align-self: stretch;
		flex: 1;
		min-height: 0;
		max-width: none;
		padding-bottom: 0;
	}
}
</style>
