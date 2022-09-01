<template>
	<div
		:class="$style.card"
		@click="(e) => $emit('click', e)"
	>
		<div :class="$style.container">
			<span
				v-if="!loading"
				v-text="title"
				:class="$style.title"
			/>
			<n8n-loading :loading="loading" :rows="3" variant="p" />
			<div :class="$style.footer">
				<slot name="footer"></slot>
			</div>
		</div>
	</div>
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
	border-radius: var(--border-radius-large);
	border: $--version-card-border;
	margin-right: var(--spacing-2xs);
	background-color: var(--color-background-xlight);
	padding: var(--spacing-s);
	cursor: pointer;

	&:last-child {
		margin-right: var(--spacing-5xs);
	}

	&:hover {
		box-shadow: 0 2px 4px rgba(68,28,23,0.07);
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

.container {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
}

.footer {
	display: flex;
	justify-content: space-between;
}
</style>
