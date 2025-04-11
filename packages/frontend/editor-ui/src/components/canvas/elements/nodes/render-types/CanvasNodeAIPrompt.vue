<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, computed } from 'vue';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import { nodeViewEventBus } from '@/event-bus';
import { useI18n } from '@/composables/useI18n';
import { useCanvasNode } from '@/composables/useCanvasNode';
import { useBuilderStore } from '@/stores/builder.store';

const emit = defineEmits<{
	delete: [id: string];
}>();
const i18n = useI18n();

const { id } = useCanvasNode();
const nodeCreatorStore = useNodeCreatorStore();
const builderStore = useBuilderStore();

const isTooltipVisible = ref(false);
const isPromptVisible = ref(true);
const isFocused = ref(false);

// const prompt = ref('Every morning at 9 am get current weather in Prague and send me an email if it's going to rain');
const prompt = ref('');
const hasContent = computed(() => prompt.value.trim().length > 0);

onMounted(() => {
	nodeViewEventBus.on('runWorkflowButton:mouseenter', onShowTooltip);
	nodeViewEventBus.on('runWorkflowButton:mouseleave', onHideTooltip);
});

onBeforeUnmount(() => {
	nodeViewEventBus.off('runWorkflowButton:mouseenter', onShowTooltip);
	nodeViewEventBus.off('runWorkflowButton:mouseleave', onHideTooltip);
});

function onShowTooltip() {
	isTooltipVisible.value = true;
}

function onHideTooltip() {
	isTooltipVisible.value = false;
}

async function onSubmit() {
	builderStore.openChat();
	emit('delete', id.value);
	await builderStore.initSupportChat(prompt.value);
	isPromptVisible.value = false;
}
</script>

<template>
	<div v-if="isPromptVisible" :class="$style.container" data-test-id="canvas-ai-prompt">
		<div :class="[$style.promptContainer, { [$style.focused]: isFocused }]">
			<N8nTooltip
				placement="top"
				:visible="isTooltipVisible"
				:disabled="nodeCreatorStore.showScrim"
				:popper-class="$style.tooltip"
				:show-after="700"
			>
				<form :class="$style.form" @submit.prevent="onSubmit">
					<n8n-input
						v-model="prompt"
						:class="$style.form_textarea"
						type="textarea"
						placeholder="What would you like to automate?"
						:read-only="false"
						:rows="15"
						@focus="isFocused = true"
						@blur="isFocused = false"
					/>
					<div :class="$style.form_footer">
						<n8n-button native-type="submit" :disabled="!hasContent">Build workflow</n8n-button>
					</div>
				</form>
				<template #content> Type your prompt here </template>
			</N8nTooltip>
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
}

.or_text {
	font-size: var(--font-size-m);
	color: var(--color-text-base);
}
</style>
