<template>
	<n8n-card
		:class="$style.card"
		v-on="$listeners"
	>
		<template #header v-if="!loading">
			<span
				v-text="title"
				:class="$style.title"
			/>
		</template>
		<n8n-loading :loading="loading" :rows="3" variant="p" />
		<template #footer v-if="!loading">
			<slot name="footer" />
		</template>
	</n8n-card>
</template>

<script lang="ts">
import { genericHelpers } from '@/components/mixins/genericHelpers';
import mixins from 'vue-typed-mixins';

export default mixins(genericHelpers).extend({
	name: 'Card',
	props: {
		loading: {
			type: Boolean,
		},
		title: {
			type: String,
		},
	},
});
</script>

<style lang="scss" module>
.card {
	width: 240px !important;
	height: 140px;
	margin-right: var(--spacing-2xs);
	cursor: pointer;

	&:last-child {
		margin-right: var(--spacing-5xs);
	}

	&:hover {
		box-shadow: 0 2px 4px rgba(68,28,23,0.07);
	}

	> div {
		height: 100%;
	}
}

.title {
	display: -webkit-box;
	-webkit-line-clamp: 4;
	-webkit-box-orient: vertical;
	font-size: var(--font-size-s);
	line-height: var(--font-line-height-regular);
	font-weight: var(--font-weight-bold);
	overflow: hidden;
	white-space: normal;
}
</style>
