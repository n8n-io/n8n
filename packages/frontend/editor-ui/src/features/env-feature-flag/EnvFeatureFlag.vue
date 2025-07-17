<script setup lang="ts">
import { computed } from 'vue';
import { useEnvFeatureFlag } from '@/features/env-feature-flag/useEnvFeatureFlag';

/*
  EnvFeatureFlag conditionally renders content based on environment variable based feature flags
  Environment variable feature flags are defined in form of `N8N_ENV_FEAT_<FEATURE_NAME>`
  The component's name property should be in uppercase and match the environment variable name without the prefix
  Usage example: <EnvFeatureFlag name="FEATURE_NAME"> Feature content </EnvFeatureFlag>
 */

const props = defineProps<{ name: Uppercase<string> }>();
const envFeatureFlag = useEnvFeatureFlag();
const isEnabled = computed(() => envFeatureFlag.check.value(props.name));
</script>

<template>
	<slot v-if="isEnabled" />
</template>
