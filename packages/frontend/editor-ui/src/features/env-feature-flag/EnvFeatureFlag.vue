<script setup lang="ts">
import { computed } from 'vue';
import { useEnvFeatureFlag } from '@/features/env-feature-flag/useEnvFeatureFlag';

const props = defineProps<{ name: Uppercase<string> }>();
const envFeatureFlag = useEnvFeatureFlag();
const isEnabled = computed(() => envFeatureFlag.check(props.name));
</script>

<template>
	<div>
		<slot v-if="isEnabled" />
	</div>
</template>
