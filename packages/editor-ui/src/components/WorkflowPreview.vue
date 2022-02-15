<template>
	<iframe
		:class="{ [$style.workflow]: !this.nodeViewDetailsOpened, [$style.openNDV]: this.nodeViewDetailsOpened }"
		ref="preview_iframe"
		src="/workflows/demo"
	></iframe>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import { showMessage } from '@/components/mixins/showMessage';

export default mixins(showMessage).extend({
	name: 'WorkflowPreview',
	props: ['workflow'],
	methods: {
		loadWorkflow() {
			try {
				if (!this.workflow) {
					throw new Error('Missing workflow');
				}
				if (!this.workflow.nodes || !Array.isArray(this.workflow.nodes)) {
					throw new Error('Must have an array of nodes');
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
		receiveMessage({ data }: MessageEvent) {
			try {
				const json = JSON.parse(data);
				if (json.command === 'n8nReady') {
					this.loadWorkflow();
				} else if (json.command === 'openNDV') {
					// expand iframe
					this.nodeViewDetailsOpened = true;
				} else if (json.command === 'closeNDV') {
					// close iframe
					this.nodeViewDetailsOpened = false;
				} else if (json.command === 'error') {
					this.$emit('close');
				}
			} catch (error) {
				this.nodeViewDetailsOpened = false;
			}
		},
	},
	data() {
		return {
			nodeViewDetailsOpened: false,
		};
	},
	mounted() {
		window.addEventListener('message', this.receiveMessage);
	},
	beforeDestroy() {
		window.removeEventListener('message', this.receiveMessage);
	},
});
</script>

<style lang="scss" module>
.workflow {
	width: 100%;
	height: 100%;
	border: 0;
	padding: 10px;
}
.openNDV {
	position: fixed;
	top: 0;
	left: 0;
	height: 100%;
	width: 100%;
	z-index: 9999999;
}
</style>
