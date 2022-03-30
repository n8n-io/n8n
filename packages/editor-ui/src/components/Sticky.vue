<template>
  <div class="sticky-wrapper" :style="stickyPosition">
    <div class="select-sticky-background" v-show="isSelected" :style="selectedStyle" />
    <div class="sticky-default">
      <div 
        :class="stickyClass"
	      :data-name="data.name"
        :ref="data.name"
        :style="stickyStyle"
        @click="setNodeActive"
        v-touch:start="touchStart"
        v-touch:end="touchEnd"
      >
        <n8n-sticky 
				  :class="{'touch-active': isTouchActive, 'is-touch-device': isTouchDevice}"
          :content.sync="node.parameters.content"
					:height="node.parameters.height"
          :id="nodeIndex"
					:width="node.parameters.width"
					:zIndex="node.parameters.zIndex"
          @onResizeEnd="onResizeEnd"
          @onResizeStart="onResizeStart"
					@input="onInputChange"
        />
      </div>

      <div v-show="showTooltip" :style="tootlipSize" class="sticky-options no-select-on-click">
        <div v-touch:tap="deleteNode" class="option" :title="$locale.baseText('node.deleteNode')" >
          <font-awesome-icon icon="trash" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import NodeIcon from '@/components/NodeIcon.vue';

import mixins from 'vue-typed-mixins';
import { externalHooks } from '@/components/mixins/externalHooks';
import { nodeBase } from '@/components/mixins/nodeBase';
import { nodeHelpers } from '@/components/mixins/nodeHelpers';
import { workflowHelpers } from '@/components/mixins/workflowHelpers';
import { getStyleTokenValue } from './helpers';
import { INodeUi, XYPosition } from '@/Interface';

import {
	INodeTypeDescription,
} from 'n8n-workflow';

export interface Sticky {
	height: number;
	width: number;
	top: number;
	left: number;
	zIndex: number;
}

export default mixins(externalHooks, nodeBase, nodeHelpers, workflowHelpers).extend({
	name: 'Sticky',
	components: {
		NodeIcon,
	},
	watch: {
		isResizing: {
			handler(isResizing) {
				this.$emit('onResizeChange', isResizing);
			},
			immediate: true,
		},
	},
	computed: {
		isSelected (): boolean {
			return this.$store.getters.getSelectedNodes.find((node: INodeUi) => node.name === this.data.name);
		},
		nodeType (): INodeTypeDescription | null {
			return this.data && this.$store.getters.nodeType(this.data.type, this.data.typeVersion);
		},
		node (): INodeUi | undefined { // same as this.data but reactive..
			return this.$store.getters.nodesByName[this.name] as INodeUi | undefined;
		},
		position (): XYPosition {
			if (this.node) {
				return this.node.position;
			} else {
				return [0, 0];
			}
		},
		selectedStyle (): object {
			const returnStyles: {
				[key: string]: string | number;
			} = {
				height: this.stickyProp.height + 16 + 'px',
				width: this.stickyProp.width + 16 + 'px',
				left: this.stickyProp.left - 8 + 'px',
				top: this.stickyProp.top - 8 + 'px',
				zIndex: this.stickyProp.zIndex,
			};

			return returnStyles;
		},
		stickyClass (): object {
			return {
				'sticky-box': true,
				disabled: this.data.disabled,
			};
		},
		stickyPosition (): object {
			const returnStyles: {
				[key: string]: string | number;
			} = {
				left: this.position[0] + 'px',
				top: this.position[1] + 'px',
				zIndex: this.stickyProp.zIndex,
			};

			return returnStyles;
		},
		stickyStyle (): object {
			let borderColor = getStyleTokenValue('--color-foreground-xdark');

			if (this.data.disabled) {
				borderColor = getStyleTokenValue('--color-foreground-base');
			}

			const returnStyles: {
				[key: string]: string;
			} = {
				'border-color': borderColor,
			};

			return returnStyles;
		},
		tootlipSize(): object {
			const returnStyles: {
				[key: string]: string;
			} = {
				width: this.stickyProp.width + 16 + 'px',
				left: this.stickyProp.left - 8 + 'px',
				top: this.stickyProp.top - 25 + 'px',
			};

			return returnStyles;
		},
		showTooltip(): boolean {
			return !this.hideActions;
		},
 	},
	data () {
		return {
			dragging: false,
			isResizing: false,
			isTouchActive: false,
			stickyProp: {
				height: 0,
				width: 0,
				top: 0,
				left: 0,
				zIndex: 0,
			},
		};
	},
	methods: {
		deleteNode () {
			Vue.nextTick(() => {
				// Wait a tick else vue causes problems because the data is gone
				this.$emit('removeNode', this.data.name);
			});
		},
		onInputChange(content: string) {
			if (this.node) {

				const nodeParameters = {
					content,
					width: this.node.parameters.width,
					height: this.node.parameters.height,
					totalSize: this.stickyProp.height + this.stickyProp.width,
					zIndex: (this.stickyProp.height + this.stickyProp.width) * -1,
				};

				const updateInformation = {
					name: this.node.name,
					value: nodeParameters,
				};

				this.$store.commit('setNodeParameters', updateInformation);
			}
		},
		onResizeStart(parameters: Sticky) {
			this.isResizing = true;
			this.stickyProp.height = parameters.height;
			this.stickyProp.width = parameters.width;
			this.stickyProp.zIndex = (parameters.height + parameters.width) * -1;
			
			if(parameters.top) {
				this.stickyProp.top = parameters.top;
			}

			if (parameters.left) {
				this.stickyProp.left = parameters.left;
			}
	
			const nodeIndex = this.$store.getters.getNodeIndex(this.data.name);
			const nodeIdName = `node-${nodeIndex}`;
			this.instance.destroyDraggable(nodeIdName);
		},
		onResizeEnd() {
			this.isResizing = false;
			this.setSizeParameters(this.stickyProp.height, this.stickyProp.width);
			this.__makeInstanceDraggable(this.data);
		},
		setNodeActive () {
			this.$store.commit('setActiveNode', this.data.name);
		},
		setSizeParameters(height: number, width: number) {
			if (this.node) {

				const nodeParameters = {
					content: this.node.parameters.content,
					height,
					width,
					totalSize: height + width,
					zIndex: (height + width) * -1,
				};

				const updateInformation = {
					name: this.node.name,
					value: nodeParameters,
				};

				this.$store.commit('setNodeParameters', updateInformation);
			}
		},
		touchStart () {
			if (this.isTouchDevice === true && this.isMacOs === false && this.isTouchActive === false) {
				this.isTouchActive = true;
				setTimeout(() => {
					this.isTouchActive = false;
				}, 2000);
			}
		},
	},
	mounted() {
		this.stickyProp.height = this.data.parameters.height as number;
		this.stickyProp.width = this.data.parameters.width as number;
		this.stickyProp.zIndex = this.data.parameters.zIndex as number;
	},
});

</script>

<style lang="scss" scoped>
.sticky-wrapper {
	position: absolute;

	.sticky-default {
		position: absolute;

		.sticky-box {
			width: 100%;
			height: 100%;
		}

		&.touch-active,
		&:hover {
			.sticky-options {
				display: flex;
				cursor: pointer;
			}
		}

		.sticky-options {
			display: none;
			justify-content: flex-end;
			position: absolute;
			top: -25px;
			height: 26px;
			font-size: 0.9em;
			text-align: left;
			z-index: 10;
			color: #aaa;
			text-align: center;

			.option {
				width: 28px;
				display: inline-block;

				&.touch {
					display: none;
				}

				&:hover {
					color: $--color-primary;
				}
			}
		}

		&.is-touch-device .sticky-options {
			left: -25px;
			width: 150px;

			.option.touch {
				display: initial;
			}
		}
	}
}

.select-sticky-background {
	display: block;
	position: absolute;
	background-color: hsla(var(--color-foreground-base-h), var(--color-foreground-base-s), var(--color-foreground-base-l), 60%);
	border-radius: var(--border-radius-xlarge);
	overflow: hidden;
}
</style>