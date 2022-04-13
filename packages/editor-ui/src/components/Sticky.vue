<template>
  <div class="sticky-wrapper" :style="stickyPosition">
    <div class="select-sticky-background" v-show="isSelected" :style="selectedStickyStyle" />
    <div 
      :class="{'sticky-default': true, 'touch-active': isTouchActive, 'is-touch-device': isTouchDevice}"
      :style="stickySize"
    >
      <div
        class="sticky-box"
        :data-name="data.name"
        :ref="data.name"
        :style="borderStyle"
        @click="setNodeActive"
        @click.left="mouseLeftClick"
        v-touch:start="touchStart"
        v-touch:end="touchEnd"
      >
        <n8n-sticky 
          :content.sync="node.parameters.content"
          :height="node.parameters.height"
          :id="nodeIndex"
					:isDefaultTextChanged="node.parameters.isDefaultTextChanged"
					:isEditable="node.parameters.isEditable"
					:readOnly="!showTooltip"
          :width="node.parameters.width"
          :zIndex="node.parameters.zIndex"
          @input="onInputChange"
					@onChangeMode="onChangeMode"
					@onMouseHover="onMouseHover"
          @onResizeEnd="onResizeEnd"
          @onResizeStart="onResizeStart"
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
		isSelected: {
			handler(isSelected) {
				if (!isSelected) {
					if (this.node) {
						const nodeParameters = {
							content: this.node.parameters.content,
							height: this.stickyProp.height,
							isDefaultTextChanged: this.node.parameters.isDefaultTextChanged,
							isEditable: false,
							width: this.stickyProp.width,
							totalSize: this.stickyProp.height + this.stickyProp.width,
							zIndex: (this.stickyProp.height + this.stickyProp.width) * -1,
						};

						const updateInformation = {
							name: this.node.name,
							value: nodeParameters,
						};

						this.$store.commit('setNodeParameters', updateInformation);
					}
					this.$emit('onChangeMode', false);
				}
			},	
		},
	},
	computed: {
		borderStyle (): object {
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
		selectedStickyStyle (): object {
			const returnStyles: {
				[key: string]: string | number;
			} = {
				height: this.stickyProp.height + 16 + 'px',
				width: this.stickyProp.width + 16 + 'px',
				left: this.stickyProp.left - 8 + 'px',
				top: this.stickyProp.top - 8 + 'px',
				zIndex: 0,
			};

			return returnStyles;
		},
		stickySize(): object {
			const returnStyles: {
				[key: string]: string | number;
			} = {
				height: this.stickyProp.height + 'px',
				width: this.stickyProp.width + 'px',
			};

			return returnStyles;
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
			return !this.hideActions && !this.isReadOnly && !this.workflowRunning;
		},
		workflowRunning (): boolean {
			return this.$store.getters.isActionActive('workflowRunning');
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
		onChangeMode(isStickyInEditMode: boolean) {
			if (isStickyInEditMode) {
				this.setSizeParameters(null, isStickyInEditMode, 99999);
			} else {
				this.setSizeParameters(null, isStickyInEditMode);
			}
			
			this.$emit('onChangeMode', isStickyInEditMode);
		},
		onMouseHover(isMouseHoverActive: boolean) {
			this.$emit('onMouseHover', isMouseHoverActive);
		},
		onInputChange(content: string) {
			this.setSizeParameters(content, true, 9999, true);
		},
		onResizeStart(parameters: Sticky) {
			this.isResizing = true;
			this.stickyProp.height = parameters.height;
			this.stickyProp.width = parameters.width;
			
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
			if (this.node) {
				const isStickyInEditMode = this.node.parameters.isEditable as boolean;
				if (isStickyInEditMode) {
					this.setSizeParameters(null, isStickyInEditMode, 99999);
				} else {
					this.setSizeParameters(null, isStickyInEditMode);
				}
			}
			
			this.__makeInstanceDraggable(this.data);
		},
		setNodeActive () {
			this.$store.commit('setActiveNode', this.data.name);
		},
		setSizeParameters(content: string | null = null, isEditable = false, zIndex: number | null = null, isDefaultTextChanged: boolean | null = null) {
			if (this.node) {
				
				if (zIndex) {
					this.stickyProp.zIndex = zIndex;
				} else {
					this.stickyProp.zIndex = (this.stickyProp.height + this.stickyProp.width) * -1;
				}

				const nodeParameters = {
					content: content ? content : this.node.parameters.content,
					height: this.stickyProp.height,
					width: this.stickyProp.width,
					isDefaultTextChanged: isDefaultTextChanged ? isDefaultTextChanged : this.node.parameters.isDefaultTextChanged,
					isEditable,
					totalSize: this.stickyProp.height + this.stickyProp.width,
					zIndex: this.stickyProp.zIndex,
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
			justify-content: flex-start;
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