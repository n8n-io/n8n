<template>
	<div>
		<iframe
			v-show="showPreview"
			:class="{
				[$style.workflow]: !this.nodeViewDetailsOpened,
				[$style.openNDV]: this.nodeViewDetailsOpened,
			}"
			ref="preview_iframe"
			src="/workflows/demo"
		></iframe>
		<n8n-loading animated :loading="!showPreview" :rows="1" variant="image" />
	</div>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import { showMessage } from '@/components/mixins/showMessage';

export default mixins(showMessage).extend({
	name: 'WorkflowPreview',
	props: ['loading', 'workflow'],
	data() {
		return {
			nodeViewDetailsOpened: false,
			ready: false,
		};
	},
	computed: {
		showPreview(): boolean {
			return !this.loading && !!this.workflow && this.ready;
		},
	},
	methods: {
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
			} catch (error) {
				this.nodeViewDetailsOpened = false;
			}
		},
	},
	watch: {
		showPreview(show) {
			if (show) {
				this.loadWorkflow();
			}
		},
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
	height: 607px;
	border: 0;
}

.openNDV {
	width: 100%;
	height: 607px;
	z-index: 2;
}
</style>
