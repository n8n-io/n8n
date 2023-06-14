<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useAI } from './useAI.composable';

const emit = defineEmits(['back', 'next']);
const { setUserPrompt, fetchSuggestedNodes, setApiKey } = useAI();

const userPrompt = ref('');
const apiKey = ref('');
const isLoading = computed(() => useAI().isLoading);
async function onSubmit() {
	setUserPrompt(userPrompt.value);
	// const actions = useAI().parsedActions;
	// const stringifiedActions = actions
	// 	.map((action) => {
	// 		return `${action.displayName}|${action.node}|${action.inputs}|${action.outputs}`;
	// 	})
	// 	.join('\n');
	// console.log('🚀 ~ file: UserPrompt.vue:14 ~ onSubmit ~ actions:', stringifiedActions);
	await fetchSuggestedNodes();
	emit('next');
}
onMounted(() => {
	const localStorageApiKey = localStorage.getItem('n8n-ai-apiKey');
	if (localStorageApiKey) {
		apiKey.value = localStorageApiKey;
		setApiKey(localStorageApiKey);
	}
});
watch(apiKey, (value) => {
	if (value) {
		setApiKey(value);
		localStorage.setItem('n8n-ai-apiKey', value);
	}
});
</script>

<template>
	<div :class="$style.container">
		<p>Please describe the workflow in the box below.</p>
		<n8n-input v-model="userPrompt" type="textarea" :rows="10" />
		<n8n-input v-model="apiKey" type="text" placeholder="API Key" />

		<div :class="$style.controls">
			<n8n-button
				@click="onSubmit"
				label="Next"
				type="primary"
				size="large"
				:loading="isLoading"
				:disabled="!apiKey"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: 20px;
	height: 100%;
}

.controls {
	display: flex;
	justify-content: flex-end;
}
</style>
