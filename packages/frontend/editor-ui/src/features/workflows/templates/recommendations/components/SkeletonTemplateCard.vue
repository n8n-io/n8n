<script setup lang="ts">
import { N8nCard, N8nLoading } from '@n8n/design-system';
</script>

<template>
	<N8nCard :class="$style.card" aria-hidden="true">
		<div :class="$style.cardContent">
			<div :class="$style.widthRow">
				<div :class="$style.widthBlock" />
				<div :class="$style.widthBlock" />
				<div :class="$style.widthBlock" />
			</div>
			<div :class="$style.nodes">
				<div :class="$style.nodeIcon">
					<N8nLoading variant="custom" />
				</div>
				<div :class="$style.nodeIcon">
					<N8nLoading variant="custom" />
				</div>
			</div>
			<div :class="$style.title">
				<N8nLoading variant="custom" />
			</div>
			<div :class="$style.title">
				<N8nLoading variant="custom" />
			</div>
			<div :class="$style.title">
				<N8nLoading variant="custom" />
			</div>
			<div :class="$style.stats">
				<div :class="$style.statItem">
					<N8nLoading variant="custom" />
				</div>
			</div>
		</div>
	</N8nCard>
</template>

<style lang="scss" module>
.card {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--lg);
	min-width: 200px;
	background-color: var(--color--background--light-3);
}

.widthRow {
	display: flex;
	gap: var(--spacing--xs);
	overflow: hidden;
	margin-bottom: calc(-1 * var(--spacing--sm));
}

.widthBlock {
	width: var(--spacing--4xl);
	height: 0;
	visibility: hidden;
}

.cardContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	flex: 1;
}

.nodes {
	display: flex;
	flex-direction: row;
}

.nodeIcon {
	width: var(--spacing--xl);
	height: var(--spacing--xl);
	padding: 0 var(--spacing--2xs);
	background-color: var(--dialog--color--background);
	border-radius: var(--radius--lg);
	margin-right: var(--spacing--3xs);
	overflow: hidden;
}

.title {
	height: var(--font-size--md);
	width: 80%;
	border-radius: var(--radius);
	overflow: hidden;
}

.stats {
	margin-top: auto;
}

.statItem {
	height: var(--font-size--sm);
	width: var(--spacing--3xl);
	border-radius: var(--radius);
	overflow: hidden;
}
</style>
