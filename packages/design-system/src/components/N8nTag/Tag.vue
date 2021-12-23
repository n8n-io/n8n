<template functional>
	<div :class="$style.tag" v-text="props.tag" />
</template>

<script lang="ts">
export default {
	name: 'n8n-tag',
	props: {
		tag: {
			type: String,
		},
	},
};
</script>

<style lang="scss" module>
.tag {
	margin-right: 4px;
	padding: 3px 4px;
	background-color: #DBDFE7;
	border-radius: var(--border-radius-base);
	font-size: 11px;
}
</style>
