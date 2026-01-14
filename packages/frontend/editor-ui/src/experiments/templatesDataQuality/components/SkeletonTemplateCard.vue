<script setup lang="ts">
import { N8nCard, N8nLoading } from '@n8n/design-system';
</script>

<template>
	<N8nCard :class="$style.card">
		<div :class="$style.cardContent">
			<div :class="$style.widthRow">
				<div :class="$style.widthBlock"><N8nLoading variant="custom" /></div>
				<div :class="$style.widthBlock"><N8nLoading variant="custom" /></div>
				<div :class="$style.widthBlock"><N8nLoading variant="custom" /></div>
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
			<div :class="$style.author">
				<div :class="$style.avatar">
					<N8nLoading variant="custom" />
				</div>
				<div :class="$style.username">
					<N8nLoading variant="custom" />
				</div>
			</div>
			<div :class="$style.categories">
				<div :class="$style.tag">
					<N8nLoading variant="custom" />
				</div>
				<div :class="$style.tag">
					<N8nLoading variant="custom" />
				</div>
			</div>
			<div :class="$style.stats">
				<div :class="$style.stat">
					<N8nLoading variant="custom" />
				</div>
				<div :class="$style.stat">
					<N8nLoading variant="custom" />
				</div>
			</div>
		</div>
	</N8nCard>
</template>

<style lang="scss" module>
.card {
	flex-direction: column;
	overflow: hidden;
}

.widthRow {
	display: flex;
	gap: var(--spacing--xs);
	overflow: hidden;
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
}

.nodes {
	display: flex;
	flex-direction: row;
	gap: var(--spacing--3xs);
}

.nodeIcon {
	width: var(--spacing--xl);
	height: var(--spacing--xl);
	border-radius: var(--radius--lg);
	overflow: hidden;
}

.title {
	height: var(--spacing--md);
	width: 80%;
	border-radius: var(--radius);
	overflow: hidden;
}

.author {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.avatar {
	width: var(--spacing--sm);
	height: var(--spacing--sm);
	border-radius: 50%;
	overflow: hidden;
}

.username {
	height: var(--font-size--sm);
	width: var(--spacing--2xl);
	border-radius: var(--radius);
	overflow: hidden;
}

.categories {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--4xs);
}

.tag {
	height: var(--spacing--lg);
	width: var(--spacing--2xl);
	border-radius: var(--radius--lg);
	overflow: hidden;
}

.stats {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--sm);
}

.stat {
	height: var(--font-size--sm);
	width: var(--spacing--3xl);
	border-radius: var(--radius);
	overflow: hidden;
}
</style>
