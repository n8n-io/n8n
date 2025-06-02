<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useCanvasNode } from '@/composables/useCanvasNode';
import { useBuilderStore } from '@/stores/builder.store';

const emit = defineEmits<{
	delete: [id: string];
}>();
const i18n = useI18n();

const { id } = useCanvasNode();
const builderStore = useBuilderStore();

const isPromptVisible = ref(true);
const isFocused = ref(false);

const prompt = ref('');
const hasContent = computed(() => prompt.value.trim().length > 0);

async function onSubmit() {
	builderStore.openChat();
	emit('delete', id.value);
	await builderStore.initBuilderChat(prompt.value, 'canvas');
	isPromptVisible.value = false;
}
</script>

<template>
	<div v-if="isPromptVisible" :class="$style.container" data-test-id="canvas-ai-prompt">
		<div :class="[$style.promptContainer, { [$style.focused]: isFocused }]">
			<form :class="$style.form" @submit.prevent="onSubmit">
				<n8n-input
					v-model="prompt"
					:class="$style.form_textarea"
					type="textarea"
					:disabled="builderStore.streaming"
					:placeholder="i18n.baseText('aiAssistant.builder.placeholder')"
					:read-only="false"
					:rows="15"
					@focus="isFocused = true"
					@blur="isFocused = false"
					@keydown.meta.enter.stop="onSubmit"
				/>
				<div :class="$style.form_footer">
					<n8n-button
						native-type="submit"
						:disabled="!hasContent || builderStore.streaming"
						@keydown.enter="onSubmit"
						>{{ i18n.baseText('aiAssistant.builder.buildWorkflow') }}</n8n-button
					>
				</div>
			</form>
		</div>
		<div :class="$style.or">
			<p :class="$style.or_text">or</p>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: row;
}

.promptContainer {
	--width: 620px;
	--height: 150px;

	display: flex;
	flex-direction: column;
	gap: var(--spacing-2xs);
	width: var(--width);
	height: var(--height);
	padding: 0;
	border: 1px solid var(--color-foreground-dark);
	background-color: var(--color-background-xlight);
	border-radius: var(--border-radius-base);
	overflow: hidden;

	&.focused {
		border: 1px solid var(--color-primary);
	}
}

.form {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
}

.form_textarea {
	display: flex;
	flex: 1;
	min-height: 0;
	overflow: hidden;
	border: 0;

	:global(.el-textarea__inner) {
		height: 100%;
		min-height: 0;
		overflow-y: auto;
		border: 0;
		background: transparent;
		resize: none;
		font-family: var(--font-family);
	}
}

.form_footer {
	display: flex;
	justify-content: flex-end;
	padding: var(--spacing-2xs);
}

.or {
	display: flex;
	justify-content: center;
	align-items: center;
	width: 60px;
	height: 100px;
	cursor: auto;
}

.or_text {
	font-size: var(--font-size-m);
	color: var(--color-text-base);
}
</style>
