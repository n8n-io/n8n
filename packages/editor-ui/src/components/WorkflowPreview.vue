<template>
	<iframe :class="{'workflow_iframe': !this.nodeView,'workflow_iframe_node_view': this.nodeView}" id="preview_iframe" href="/workflows/demo"></iframe>
</template>

<script lang="ts">
	import Vue from 'vue';

  export default Vue.extend({
    props: ['workflow'],
		methods: {
			loadWorkflow(){
				try {
					const workflow = JSON.parse(this.workflow);

					// Workflow Check
					if (!workflow) {
						throw new Error('Missing workflow');
					}
					if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
						throw new Error('Must have an array of nodes');
					}
					const iframe = document.getElementById('int_iframe') as HTMLIFrameElement;

					// set workflow in canvas
					iframe.contentWindow!.postMessage(JSON.stringify(
						{
							command: 'openWorkflow',
							workflow,
						}
					), '*');
				} catch (e) {
					console.log('error invalid json');
				}
			},
			// @ts-ignore
			receiveMessage ({ data }) {
				try {
					const json = JSON.parse(data);
					if (json.command === 'n8nReady') {
						this.loadWorkflow();
					}
					else if (json.command === 'openNDV') {
						// expand iframe
						this.nodeView = true;
					}
					else if (json.command === 'closeNDV') {
						// close iframe
						this.nodeView = false;
					}
				} catch (e) {
					console.log('loading');
				}
			}
		},
		data () {
			return {
				nodeView: false
			}
  	},
		mounted () {
			window.addEventListener('message', this.receiveMessage)
		},
		beforeDestroy () {
			window.removeEventListener('message', this.receiveMessage)
		}
  });
</script>

<style lang="scss" module>
	.workflow_iframe {
		width: 100%;
		height: 100%;
		border: 0;
		padding: 10px;
	}
	.workflow_iframe_node_view {
		position:fixed;
		top:0;
		left:0;
		height:100%;
		width:100%;
		z-index:9999999;
	}
</style>
