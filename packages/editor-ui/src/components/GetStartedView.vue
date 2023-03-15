<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router/composables';
import { telemetry } from '@/plugins/telemetry';
import { i18n as locale } from '@/plugins/i18n';

import MainPanel from './Node/NodeCreator/MainPanel.vue';

const progress = ref(10);
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.progressBar">
			<div :style="{ width: `${progress}%` }"></div>
		</div>

		<div :class="$style.nodes">
			<main-panel @nodeTypeSelected="$listeners.nodeTypeSelected" />
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	width: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.progressBar {
	width: 100%;
	height: 12px;
	background-color: #eeecf9;

	> div {
		background-color: #5c4ec2;
		height: 12px;
	}
}

.nodes {
	width: 480px;
	margin-top: 44px;

	> div {
		margin-bottom: 8px;
	}
}
</style>
