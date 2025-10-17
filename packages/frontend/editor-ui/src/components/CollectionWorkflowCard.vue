<script lang="ts" setup>
import { N8nCard, N8nLoading } from '@n8n/design-system';

defineProps<{
	loading: boolean;
	title?: string;
}>();
</script>

<template>
	<N8nCard :class="$style.card" v-bind="$attrs">
		<template v-if="!loading && title" #header>
			<span :class="$style.title" v-text="title" />
		</template>
		<N8nLoading :loading="loading" :rows="3" variant="p" />
		<template v-if="!loading" #footer>
			<slot name="footer" />
		</template>
	</N8nCard>
</template>

<style lang="scss" module>
.card {
	min-width: 235px;
	height: 140px;
	margin-right: var(--spacing--2xs);
	cursor: pointer;

	&:last-child {
		margin-right: var(--spacing--5xs);
	}

	&:hover {
		box-shadow: 0 2px 4px rgba(68, 28, 23, 0.07);
	}

	> div {
		height: 100%;
	}
}

.title {
	display: -webkit-box;
	-webkit-line-clamp: 4;
	-webkit-box-orient: vertical;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--md);
	font-weight: var(--font-weight--bold);
	overflow: hidden;
	white-space: normal;
}
</style>
