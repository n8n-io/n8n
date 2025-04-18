<script lang="ts" setup>
import { LOGS_PANEL_STATE } from '@/components/CanvasChat/types/logs';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import { useI18n } from '@/composables/useI18n';
import { useRunWorkflow } from '@/composables/useRunWorkflow';
import { CHAT_TRIGGER_NODE_TYPE } from '@/constants';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
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
const uiStore = useUIStore();
const { runEntireWorkflow } = useRunWorkflow({ router });
const { toggleChatOpen } = useCanvasOperations({ router });

const isChatOpen = computed(() => workflowsStore.logsPanelState !== LOGS_PANEL_STATE.CLOSED);
const isExecuting = computed(() => uiStore.isActionActive.workflowRunning);
const testId = computed(() => `execute-workflow-button-${name}`);
</script>

<template>
	<!-- click and mousedown event are suppressed to avoid unwanted selection or dragging of the node -->
	<div :class="containerClass" @click.stop.prevent @mousedown.stop.prevent>
		<div>
			<div :class="$style.bolt">
				<FontAwesomeIcon icon="bolt" size="lg" />
			</div>

			<template v-if="!readOnly">
				<N8nButton
					v-if="type === CHAT_TRIGGER_NODE_TYPE"
					:type="isChatOpen ? 'secondary' : 'primary'"
					size="large"
					:disabled="isExecuting"
					:data-test-id="testId"
					:label="isChatOpen ? i18n.baseText('chat.hide') : i18n.baseText('chat.open')"
					@click.capture="toggleChatOpen('node')"
				/>
				<N8nButton
					v-else
					type="primary"
					size="large"
					:disabled="isExecuting"
					:data-test-id="testId"
					:label="i18n.baseText('nodeView.runButtonText.executeWorkflow')"
					@click.capture="runEntireWorkflow('node', name)"
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
