<template>
	<transition name="el-fade-in" @after-enter="showDocumentHelp = true">
		<div class="data-display-wrapper close-on-click" v-show="node" @click="close">
			<div class="data-display" >
				<NodeSettings @valueChanged="valueChanged" />
				<RunData />
				<div class="close-button clickable close-on-click" title="Close">
					<i class="el-icon-close close-on-click"></i>
				</div>
				<transition name="fade">
					<div v-if="showDocumentHelp && nodeType" class="doc-help-wrapper">
								<svg id="help-logo" v-if="showDocumentHelp && nodeType" :href="documentationUrl" target="_blank" width="18px" height="18px" viewBox="0 0 18 18" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
									<title>Node Documentation</title>
									<g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
										<g transform="translate(-1127.000000, -836.000000)" fill-rule="nonzero">
											<g transform="translate(1117.000000, 825.000000)">
												<g transform="translate(10.000000, 11.000000)">
													<g transform="translate(2.250000, 2.250000)" fill="#FF6150">
														<path d="M6,11.25 L7.5,11.25 L7.5,9.75 L6,9.75 L6,11.25 M6.75,2.25 C5.09314575,2.25 3.75,3.59314575 3.75,5.25 L5.25,5.25 C5.25,4.42157288 5.92157288,3.75 6.75,3.75 C7.57842712,3.75 8.25,4.42157288 8.25,5.25 C8.25,6.75 6,6.5625 6,9 L7.5,9 C7.5,7.3125 9.75,7.125 9.75,5.25 C9.75,3.59314575 8.40685425,2.25 6.75,2.25 M1.5,0 L12,0 C12.8284271,0 13.5,0.671572875 13.5,1.5 L13.5,12 C13.5,12.8284271 12.8284271,13.5 12,13.5 L1.5,13.5 C0.671572875,13.5 0,12.8284271 0,12 L0,1.5 C0,0.671572875 0.671572875,0 1.5,0 Z"></path>
													</g>
													<rect x="0" y="0" width="18" height="18"></rect>
												</g>
											</g>
										</g>
									</g>
								</svg>

							<div v-if="showDocumentHelp && nodeType" class="text">
								Need help? <a id="doc-hyperlink" v-if="showDocumentHelp && nodeType" :href="documentationUrl" target="_blank" @click="onDocumentationUrlClick">Open {{nodeType.displayName}} documentation</a>
							</div>
					</div>
				</transition>
			</div>
		</div>
	</transition>

</template>

<script lang="ts">

import Vue from 'vue';

import {
	IRunData,
	INodeTypeDescription,
} from 'n8n-workflow';
import {
	INodeUi,
	IUpdateInformation,
} from '../Interface';

import { externalHooks } from '@/components/mixins/externalHooks';
import { nodeHelpers } from '@/components/mixins/nodeHelpers';
import { workflowHelpers } from '@/components/mixins/workflowHelpers';

import NodeSettings from '@/components/NodeSettings.vue';
import RunData from '@/components/RunData.vue';

import mixins from 'vue-typed-mixins';

export default mixins(externalHooks, nodeHelpers, workflowHelpers).extend({
	name: 'DataDisplay',
	components: {
		NodeSettings,
		RunData,
	},
	data () {
		return {
			basePath: this.$store.getters.getBaseUrl,
			showDocumentHelp: false,
		};
	},
	computed: {
		documentationUrl (): string {
			if (!this.nodeType) {
				return '';
			}

			if (this.nodeType.documentationUrl && this.nodeType.documentationUrl.startsWith('http')) {
				return this.nodeType.documentationUrl;
			}

			return 'https://docs.n8n.io/nodes/' + (this.nodeType.documentationUrl || this.nodeType.name) + '?utm_source=n8n_app&utm_medium=node_settings_modal-credential_link&utm_campaign=' + this.nodeType.name;
		},
		node (): INodeUi {
			return this.$store.getters.activeNode;
		},
		nodeType (): INodeTypeDescription | null {
			const activeNode = this.node;
			if (this.node) {
				return this.$store.getters.nodeType(this.node.type);
			}

			return null;
		},
	},
	watch: {
		node (node, oldNode) {
			if(node && !oldNode) {
				this.$externalHooks().run('dataDisplay.nodeTypeChanged', { nodeSubtitle: this.getNodeSubtitle(node, this.nodeType, this.getWorkflow()) });
			}
		},
	},
	methods: {
		valueChanged (parameterData: IUpdateInformation) {
			this.$emit('valueChanged', parameterData);
		},
		nodeTypeSelected (nodeTypeName: string) {
			this.$emit('nodeTypeSelected', nodeTypeName);
		},
		close (e: MouseEvent) {
			// @ts-ignore
			if (e.target.className && e.target.className.includes && e.target.className.includes('close-on-click')) {
				this.showDocumentHelp = false;
				this.$store.commit('setActiveNode', null);
			}
		},
		onDocumentationUrlClick () {
			this.$externalHooks().run('dataDisplay.onDocumentationUrlClick', { nodeType: this.nodeType, documentationUrl: this.documentationUrl });
		},
	},
});

</script>

<style lang="scss">


.data-display-wrapper {
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	z-index: 20;
	background-color: #9d8d9dd8;

	.close-button {
		position: absolute;
		top: 0;
		right: -50px;
		color: #fff;
		background-color: $--custom-header-background;
		border-radius: 0 18px 18px 0;
		z-index: 110;
		font-size: 1.7em;
		text-align: center;
		line-height: 50px;
		height: 50px;
		width: 50px;

		.close-on-click {
			color: #fff;
			font-weight: 400;
		}

		.close-on-click:hover {
			transform: scale(1.2);
		}
	}

	.data-display {
		position: relative;
		width: 80%;
		height: 80%;
		margin: 3em auto;
		background-color: #fff;
		border-radius: 2px;
		@media (max-height: 720px) {
			margin: 1em auto;
			height: 95%;
		}

		.fade-enter-active, .fade-enter-to, .fade-leave-active {
			transition: all .75s ease;
		}

		.fade-enter, .fade-leave-to /* .fade-leave-active below version 2.1.8 */ {
			opacity: 0;
		}

		.doc-help-wrapper {
			transition-delay: 2s;
			background-color: #fff;
			margin-top: 1%;
			box-sizing: border-box;
			border: 1px solid #DCDFE6;
			border-radius: 4px;
			background-color: #FFFFFF;
			box-shadow: 0 2px 7px 0 rgba(0,0,0,0.15);
			min-width: 319px;
			height: 40px;
			float: right;
			padding: 5px;
			display: flex;
			flex-direction: row;
			padding-top: 10px;
			padding-right: 12px;

			#help-logo {
				flex: 1;
			}

			.text {
				margin-left: 5px;
				flex: 9;
				font-family: "Open Sans";
				color: #666666;
				font-size: 12px;
				font-weight: 600;
				letter-spacing: 0;
				line-height: 17px;
				white-space: nowrap;
			}

			#doc-hyperlink, #doc-hyperlink:visited, #doc-hyperlink:focus, #doc-hyperlink:active {
				text-decoration: none;
				color: #FF6150;
			}
		}
	}


}



</style>
