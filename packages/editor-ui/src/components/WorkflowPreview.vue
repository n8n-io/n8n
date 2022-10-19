<template>
	<div :class="$style.container">
		<div v-if="loaderType === 'image' && !showPreview" :class="$style.imageLoader">
			<n8n-loading :loading="!showPreview" :rows="1" variant="image" />
		</div>
		<div v-else-if="loaderType === 'spinner' && !showPreview" :class="$style.spinner">
			<n8n-spinner type="dots" />
		</div>
		<iframe
			:class="{
				[$style.workflow]: !this.nodeViewDetailsOpened,
				[$style.executionPreview]: mode === 'execution',
				[$style.openNDV]: this.nodeViewDetailsOpened,
				[$style.show]: this.showPreview,
			}"
			ref="preview_iframe"
			src="/workflows/demo"
			@mouseenter="onMouseEnter"
			@mouseleave="onMouseLeave"
		></iframe>
	</div>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import { showMessage } from '@/components/mixins/showMessage';
import { IWorkflowDb } from '../Interface';

export default mixins(showMessage).extend({
	name: 'WorkflowPreview',
	props: {
		loading: {
			type: Boolean,
			default: false,
		},
		mode: {
			type: String,
			default: 'workflow',
			validator: (value: string): boolean =>
				['workflow', 'execution', 'medium'].includes(value),
		},
		workflow: {
			type: Object as () => IWorkflowDb,
			required: false,
		},
		executionId: {
			type: String,
			required: false,
		},
		loaderType: {
			type: String,
			default: 'image',
			validator: (value: string): boolean =>
				['image', 'spinner'].includes(value),
		},
	},
	data() {
		return {
			nodeViewDetailsOpened: false,
			ready: false,
			insideIframe: false,
			scrollX: 0,
			scrollY: 0,
		};
	},
	computed: {
		showPreview(): boolean {
			return !this.loading &&
				(
					(this.mode === 'workflow' && !!this.workflow) ||
					(this.mode === 'execution' && !!this.executionId)
				) &&
				this.ready;
		},
	},
	methods: {
		onMouseEnter() {
			this.insideIframe = true;
			this.scrollX = window.scrollX;
			this.scrollY = window.scrollY;
		},
		onMouseLeave() {
			this.insideIframe = false;
		},
		loadWorkflow() {
			try {
				if (!this.workflow) {
					throw new Error(this.$locale.baseText('workflowPreview.showError.missingWorkflow'));
				}
				if (!this.workflow.nodes || !Array.isArray(this.workflow.nodes)) {
					throw new Error(this.$locale.baseText('workflowPreview.showError.arrayEmpty'));
				}

				const iframe = this.$refs.preview_iframe as HTMLIFrameElement;
				if (iframe.contentWindow) {
					iframe.contentWindow.postMessage(
						JSON.stringify({
							command: 'openWorkflow',
							workflow: this.workflow,
						}),
						'*',
					);
				}
			} catch (error) {
				this.$showError(
					error,
					this.$locale.baseText('workflowPreview.showError.previewError.title'),
					this.$locale.baseText('workflowPreview.showError.previewError.message'),
				);
			}
		},
		loadExecution() {
			try {
				if (!this.executionId) {
					throw new Error(this.$locale.baseText('workflowPreview.showError.missingExecution'));
				}
				const iframe = this.$refs.preview_iframe as HTMLIFrameElement;
				if (iframe.contentWindow) {
					iframe.contentWindow.postMessage(
						JSON.stringify({
							command: 'openExecution',
							executionId: this.executionId,
						}),
						'*',
					);
				}
			} catch (error) {
				this.$showError(
					error,
					this.$locale.baseText('workflowPreview.showError.previewError.title'),
					this.$locale.baseText('workflowPreview.executionMode.showError.previewError.message'),
				);
			}
		},
		receiveMessage({ data }: MessageEvent) {
			try {
				const json = JSON.parse(data);
				if (json.command === 'n8nReady') {
					this.ready = true;
				} else if (json.command === 'openNDV') {
					this.nodeViewDetailsOpened = true;
				} else if (json.command === 'closeNDV') {
					this.nodeViewDetailsOpened = false;
				} else if (json.command === 'error') {
					this.$emit('close');
				}
			} catch (e) {
			}
		},
		onDocumentScroll() {
			if (this.insideIframe) {
				window.scrollTo(this.scrollX, this.scrollY);
			}
		},
	},
	watch: {
		showPreview(show) {
			if (show) {
				if (this.mode === 'workflow') {
					this.loadWorkflow();
				} else if (this.mode === 'execution') {
					this.loadExecution();
				}
			}
		},
		executionId(value) {
			if (this.mode === 'execution' && this.executionId) {
				this.loadExecution();
			}
		},
	},
	mounted() {
		window.addEventListener('message', this.receiveMessage);
		document.addEventListener('scroll', this.onDocumentScroll);
	},
	beforeDestroy() {
		window.removeEventListener('message', this.receiveMessage);
		document.removeEventListener('scroll', this.onDocumentScroll);
	},
});
</script>

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
	z-index: 9999999;
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
}

.executionPreview {
	height: 100%;
}
</style>
