<template>
	<div :class="$style.wrapper" @click="$router.go(-1)">
		<font-awesome-icon :class="$style.icon" icon="arrow-left" />
		<n8n-text size="medium" color="text-base">{{ $locale.baseText('template.buttons.goBackButton') }}</n8n-text>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
export default Vue.extend({});
</script>

<style lang="scss" module>
.wrapper {
	display: flex;
	align-items: center;
	cursor: pointer;
}

.icon {
	margin-right: 8px;
	color: #C6C8D0;
	font-size: var(--font-size-m);
}
</style>
