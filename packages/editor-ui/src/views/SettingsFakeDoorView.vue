<script lang="ts" setup>
interface Props {
	featureId: string;
}

defineProps<Props>();
</script>

<template>
	<FeatureComingSoon :feature-id="featureId" show-title />
</template>
