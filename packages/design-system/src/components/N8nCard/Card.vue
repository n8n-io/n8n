<template>
	<div :class="$style.card">
		<div :class="$style.body">
			<n8n-heading :bold="true" size="small">{{ title }}</n8n-heading>
			<div :class="$style.content">
				<slot name="content"></slot>
			</div>
		</div>
		<div>
			<slot name="button"></slot>
		</div>
	</div>
</template>

<script lang="ts">
export default {
	name: 'n8n-card',
	props: {
		title: {
			type: String,
			default: '',
		},
	},
	methods: {
	},
};
</script>

<style lang="scss" module>
.card {
	width: 100%;
	min-height: 68px;
	margin-right: var(--spacing-2xs);
	padding: var(--spacing-s);
	background-color: var(--color-background-xlight);
	border-bottom: 1px #dbdfe7 solid;
	display: flex;
	justify-content: space-between;
	align-items: center;
	cursor: pointer;
}

.content {
	display: flex;
	flex-direction: column;
	justify-content: space-around;
}
</style>
