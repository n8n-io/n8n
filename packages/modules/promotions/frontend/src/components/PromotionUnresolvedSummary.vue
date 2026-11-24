<script setup lang="ts">
import { N8nIcon, N8nText } from '@n8n/design-system';

import type { UnresolvedRow } from '../composables/usePromotionUnresolvedSummary';

/**
 * The warning of a confirmation about the dependencies that the operation leaves unresolved.
 * `usePromotionUnresolvedSummary` makes the sentence and the rows.
 */
defineProps<{ lead: string; rows: UnresolvedRow[] }>();
</script>

<template>
	<div :class="$style.summary" data-test-id="promotion-unresolved-summary">
		<N8nIcon icon="triangle-alert" size="medium" color="warning" :class="$style.icon" />
		<N8nText color="text-base" data-test-id="promotion-unresolved-lead">{{ lead }}</N8nText>
		<!-- A long list scrolls, so it does not move the buttons out of the dialog. -->
		<ul :class="$style.list" data-test-id="promotion-unresolved-list">
			<li
				v-for="row in rows"
				:key="row.key"
				:class="$style.row"
				data-test-id="promotion-unresolved-row"
			>
				<N8nText bold size="small" color="text-dark">{{ row.name }}</N8nText>
				<N8nText v-if="row.detail" size="small" color="text-light">{{ row.detail }}</N8nText>
			</li>
		</ul>
	</div>
</template>

<style lang="scss" module>
// Two columns: the icon, then the text. The list is in the text column, below the sentence.
.summary {
	display: grid;
	grid-template-columns: auto 1fr;
	gap: var(--spacing--2xs);
}

// Puts the icon on the first line of the sentence.
.icon {
	margin-top: var(--spacing--5xs);
}

.list {
	grid-column: 2;
	display: flex;
	flex-direction: column;
	// The design sets this height. No size token has this value.
	max-height: 14rem;
	margin: 0;
	padding: 0;
	overflow-y: auto;
	list-style: none;
	border-top: var(--border);
	border-bottom: var(--border);
}

.row {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--2xs) 0;

	& + & {
		border-top: var(--border);
	}
}
</style>
