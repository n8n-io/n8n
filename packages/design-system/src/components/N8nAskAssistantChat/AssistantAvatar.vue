<script setup lang="ts">
import AssistantIcon from '../N8nAskAssistantButton/AssistantIcon.vue';
</script>

<template>
	<div :class="$style.container">
		<AssistantIcon :size="10" :style="'blank'" />
	</div>
</template>

<style lang="scss" module>
.container {
	background: linear-gradient(105deg, #5b60e8 0%, #aa7bec 50%, #ec7b8e 100%);
	border-radius: 50%;
	width: 20px;
	height: 20px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
}
</style>
