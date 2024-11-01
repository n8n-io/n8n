<script lang="ts" setup>
interface Props {
	featureId: string;
}

defineProps<Props>();
</script>

<template>
	<FeatureComingSoon :feature-id="featureId" show-title />
</template>

<style lang="scss" module>
.header {
	display: flex;
	align-items: center;
	white-space: nowrap;

	*:first-child {
		flex-grow: 1;
	}
}
</style>
