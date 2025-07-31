<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/composables/useToast';
import type { IWorkflowDb } from '@/Interface';
import type { IWorkflowTemplate } from '@n8n/rest-api-client/api/templates';
import { useExecutionsStore } from '@/stores/executions.store';

const props = withDefaults(
	defineProps<{
		loading?: boolean;
		mode?: 'workflow' | 'execution';
		workflow?: IWorkflowDb | IWorkflowTemplate['workflow'];
		executionId?: string;
		executionMode?: string;
		nodeId?: string;
		loaderType?: 'image' | 'spinner';
		canOpenNDV?: boolean;
		hideNodeIssues?: boolean;
		focusOnLoad?: boolean;
	}>(),
	{
		loading: false,
		mode: 'workflow',
		workflow: undefined,
		executionId: undefined,
		executionMode: undefined,
		nodeId: undefined,
		loaderType: 'image',
		canOpenNDV: true,
		hideNodeIssues: false,
		focusOnLoad: true,
	},
);

const emit = defineEmits<{
	close: [];
}>();

const i18n = useI18n();
const toast = useToast();
const executionsStore = useExecutionsStore();

const iframeRef = ref<HTMLIFrameElement | null>(null);
const nodeViewDetailsOpened = ref(false);
const ready = ref(false);
const insideIframe = ref(false);
const scrollX = ref(0);
const scrollY = ref(0);

const iframeSrc = computed(() => {
	return `${window.BASE_PATH ?? '/'}workflows/demo`;
});

const showPreview = computed(() => {
	return (
		!props.loading &&
		((props.mode === 'workflow' && !!props.workflow) ||
			(props.mode === 'execution' && !!props.executionId)) &&
		ready.value
	);
});

const loadWorkflow = () => {
	try {
		if (!props.workflow) {
			throw new Error(i18n.baseText('workflowPreview.showError.missingWorkflow'));
		}
		if (!props.workflow.nodes || !Array.isArray(props.workflow.nodes)) {
			throw new Error(i18n.baseText('workflowPreview.showError.arrayEmpty'));
		}
		iframeRef.value?.contentWindow?.postMessage?.(
			JSON.stringify({
				command: 'openWorkflow',
				workflow: props.workflow,
				canOpenNDV: props.canOpenNDV,
				hideNodeIssues: props.hideNodeIssues,
			}),
			'*',
		);
	} catch (error) {
		toast.showError(
			error,
			i18n.baseText('workflowPreview.showError.previewError.title'),
			i18n.baseText('workflowPreview.showError.previewError.message'),
		);
	}
};

const loadExecution = () => {
	try {
		if (!props.executionId) {
			throw new Error(i18n.baseText('workflowPreview.showError.missingExecution'));
		}
		iframeRef.value?.contentWindow?.postMessage?.(
			JSON.stringify({
				command: 'openExecution',
				executionId: props.executionId,
				executionMode: props.executionMode ?? '',
				nodeId: props.nodeId,
				canOpenNDV: props.canOpenNDV,
			}),
			'*',
		);

		if (executionsStore.activeExecution) {
			iframeRef.value?.contentWindow?.postMessage?.(
				JSON.stringify({
					command: 'setActiveExecution',
					executionId: executionsStore.activeExecution.id,
				}),
				'*',
			);
		}
	} catch (error) {
		toast.showError(
			error,
			i18n.baseText('workflowPreview.showError.previewError.title'),
			i18n.baseText('workflowPreview.executionMode.showError.previewError.message'),
		);
	}
};

const onMouseEnter = () => {
	insideIframe.value = true;
	scrollX.value = window.scrollX;
	scrollY.value = window.scrollY;
};

const onMouseLeave = () => {
	insideIframe.value = false;
};

const receiveMessage = ({ data }: MessageEvent) => {
	if (!data?.includes?.('"command"')) {
		return;
	}
	try {
		const json = JSON.parse(data);
		if (json.command === 'n8nReady') {
			onReady();
		} else if (json.command === 'openNDV') {
			onOpenNDV();
		} else if (json.command === 'closeNDV') {
			onCloseNDV();
		} else if (json.command === 'error') {
			onError();
		}
	} catch (e) {
		console.error(e);
	}
};

const onReady = () => {
	ready.value = true;

	if (props.focusOnLoad) {
		setTimeout(() => {
			iframeRef.value?.contentWindow?.focus();
		});
	}
};

const onOpenNDV = () => {
	nodeViewDetailsOpened.value = true;
};

const onCloseNDV = () => {
	nodeViewDetailsOpened.value = false;
};

const onError = () => {
	emit('close');
};

const onDocumentScroll = () => {
	if (insideIframe.value) {
		window.scrollTo(scrollX.value, scrollY.value);
	}
};

onMounted(() => {
	window.addEventListener('message', receiveMessage);
	document.addEventListener('scroll', onDocumentScroll);
});

onBeforeUnmount(() => {
	window.removeEventListener('message', receiveMessage);
	document.removeEventListener('scroll', onDocumentScroll);
});

watch(
	() => showPreview.value,
	() => {
		if (showPreview.value) {
			if (props.mode === 'workflow') {
				loadWorkflow();
			} else if (props.mode === 'execution') {
				loadExecution();
			}
		}
	},
);

watch(
	() => props.executionId,
	() => {
		if (props.mode === 'execution' && props.executionId) {
			loadExecution();
		}
	},
);

watch(
	() => props.workflow,
	() => {
		if (props.mode === 'workflow' && props.workflow) {
			loadWorkflow();
		}
	},
);
</script>

<template>
	<div :class="$style.container">
		<div v-if="loaderType === 'image' && !showPreview" :class="$style.imageLoader">
			<n8n-loading :loading="!showPreview" :rows="1" variant="image" />
		</div>
		<div v-else-if="loaderType === 'spinner' && !showPreview" :class="$style.spinner">
			<n8n-spinner type="dots" />
		</div>
		<iframe
			ref="iframeRef"
			:class="{
				[$style.workflow]: !nodeViewDetailsOpened,
				[$style.executionPreview]: mode === 'execution',
				[$style.openNDV]: nodeViewDetailsOpened,
				[$style.show]: showPreview,
			}"
			:src="iframeSrc"
			data-test-id="workflow-preview-iframe"
			@mouseenter="onMouseEnter"
			@mouseleave="onMouseLeave"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	width: 100%;
	height: 100%;
	display: flex;
	justify-content: center;
}

.workflow {
	// firefox bug requires loading iframe as such
	visibility: hidden;
	height: 0;
	width: 0;
}

.show {
	visibility: visible;
	height: 100%;
	width: 100%;
}

.openNDV {
	position: fixed;
	top: 0;
	left: 0;
	height: 100%;
	width: 100%;
	z-index: var(--z-index-workflow-preview-ndv);
}

.spinner {
	color: var(--color-primary);
	position: absolute;
	top: 50% !important;
	-ms-transform: translateY(-50%);
	transform: translateY(-50%);
}

.imageLoader {
	width: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
	height: 100%;
}

.executionPreview {
	height: 100%;
}
</style>
