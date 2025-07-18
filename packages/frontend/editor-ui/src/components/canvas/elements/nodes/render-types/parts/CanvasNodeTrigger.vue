<script lang="ts" setup>
import KeyboardShortcutTooltip from '@/components/KeyboardShortcutTooltip.vue';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import { useI18n } from '@n8n/i18n';
import { useRunWorkflow } from '@/composables/useRunWorkflow';
import { CHAT_TRIGGER_NODE_TYPE } from '@/constants';
import { useLogsStore } from '@/stores/logs.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { N8nButton } from '@n8n/design-system';
import { computed, useCssModule } from 'vue';
import { useRouter } from 'vue-router';

const {
	name,
	type,
	hovered,
	disabled,
	readOnly,
	class: cls,
} = defineProps<{
	name: string;
	type: string;
	hovered?: boolean;
	disabled?: boolean;
	readOnly?: boolean;
	class?: string;
}>();

const style = useCssModule();
const containerClass = computed(() => ({
	[cls ?? '']: true,
	[style.container]: true,
	[style.interactive]: !disabled && !readOnly,
	[style.hovered]: !!hovered,
}));

const router = useRouter();
const i18n = useI18n();
const workflowsStore = useWorkflowsStore();
const logsStore = useLogsStore();
const { runEntireWorkflow } = useRunWorkflow({ router });
const { startChat } = useCanvasOperations();

const isChatOpen = computed(() => logsStore.isOpen);
const isExecuting = computed(() => workflowsStore.isWorkflowRunning);
const testId = computed(() => `execute-workflow-button-${name}`);

async function handleClickExecute() {
	workflowsStore.setSelectedTriggerNodeName(name);
	await runEntireWorkflow('node', name);
}
</script>

<template>
	<!-- click and mousedown event are suppressed to avoid unwanted selection or dragging of the node -->
	<div :class="containerClass" @click.stop.prevent @mousedown.stop.prevent>
		<div>
			<div :class="$style.bolt">
				<N8nIcon icon="bolt-filled" size="large" />
			</div>

			<template v-if="!readOnly">
				<template v-if="type === CHAT_TRIGGER_NODE_TYPE">
					<N8nButton
						v-if="isChatOpen"
						type="secondary"
						icon="message-circle"
						size="large"
						:disabled="isExecuting"
						:data-test-id="testId"
						:label="i18n.baseText('chat.hide')"
						@click.capture="logsStore.toggleOpen(false)"
					/>
					<KeyboardShortcutTooltip
						v-else
						:label="i18n.baseText('chat.open')"
						:shortcut="{ keys: ['c'] }"
					>
						<N8nButton
							type="primary"
							icon="message-circle"
							size="large"
							:disabled="isExecuting"
							:data-test-id="testId"
							:label="i18n.baseText('chat.open')"
							@click.capture="startChat('node')"
						/>
					</KeyboardShortcutTooltip>
				</template>
				<N8nButton
					v-else
					type="primary"
					icon="flask-conical"
					size="large"
					:disabled="isExecuting"
					:data-test-id="testId"
					:label="i18n.baseText('nodeView.runButtonText.executeWorkflow')"
					@click.capture="handleClickExecute"
				/>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	z-index: -1;
	position: absolute;
	display: flex;
	align-items: center;
	height: 100%;
	right: 100%;
	top: 0;
	pointer-events: none;

	& > div {
		position: relative;
		display: flex;
		align-items: center;
	}

	& button {
		margin-right: var(--spacing-s);
		opacity: 0;
		translate: -12px 0;
		transition:
			translate 0.1s ease-in,
			opacity 0.1s ease-in;
	}

	&.interactive.hovered button {
		opacity: 1;
		translate: 0 0;
		pointer-events: all;
	}
}

.bolt {
	position: absolute;
	right: 0;
	color: var(--color-primary);
	padding: var(--spacing-s);
	opacity: 1;
	translate: 0 0;
	transition:
		translate 0.1s ease-in,
		opacity 0.1s ease-in;

	.container.interactive.hovered & {
		translate: -12px 0;
		opacity: 0;
	}
}
</style>
