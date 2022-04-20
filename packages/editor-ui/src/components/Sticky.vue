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
				@click.left="mouseLeftClick"
				v-touch:start="touchStart"
				v-touch:end="touchEnd"
			>
				<n8n-sticky
					:content.sync="node.parameters.content"
					:height="node.parameters.height"
					:id="nodeIndex"
					:readOnly="isReadOnly"
					:width="node.parameters.width"
					:defaultText="defaultText"
					:editMode="isActive && !isReadOnly"
					@input="onInputChange"
					@edit="onEdit"
					@onMouseHover="onMouseHover"
					@resizestart="onResizeStart"
					@resize="onResize"
					@resizeend="onResizeEnd"
				/>
			</div>

			<div v-show="showActions" :style="tootlipSize" class="sticky-options no-select-on-click">
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
import { getStyleTokenValue, isNumber, isString } from './helpers';
import { INodeUi, XYPosition } from '@/Interface';

import {
	INodeTypeDescription,
} from 'n8n-workflow';

export interface Sticky {
	top: number;
	left: number;
}

export default mixins(externalHooks, nodeBase, nodeHelpers, workflowHelpers).extend({
	name: 'Sticky',
	components: {
		NodeIcon,
	},
	watch: {
		isSelected: {
			handler(isSelected) {
				if (!isSelected) {
					if (this.node) {
						const nodeParameters = {
							content: this.node.parameters.content,
							height: this.height,
							isEditable: false,
							width: this.width,
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
		defaultText (): string {
			if (!this.nodeType) {
				return '';
			}
			const properties = this.nodeType.properties;
			const content = properties.find((property) => property.name === 'content');

			return content && isString(content.default) ? content.default : '';
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
		height(): number {
			return this.node && isNumber(this.node.parameters.height)? this.node.parameters.height : 0;
		},
		width(): number {
			return this.node && isNumber(this.node.parameters.width)? this.node.parameters.width : 0;
		},
		selectedStickyStyle (): object {
			const returnStyles: {
				[key: string]: string | number;
			} = {
				height: this.height + 16 + 'px',
				width: this.width + 16 + 'px',
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
				height: this.height + 'px',
				width: this.width + 'px',
			};

			return returnStyles;
		},
		stickyPosition (): object {
			const returnStyles: {
				[key: string]: string | number;
			} = {
				left: this.position[0] + 'px',
				top: this.position[1] + 'px',
				zIndex: this.isActive ? 9999999 : -1 * Math.floor((this.height * this.width) / 1000),
			};

			return returnStyles;
		},
		tootlipSize(): object {
			const returnStyles: {
				[key: string]: string;
			} = {
				width: this.width + 16 + 'px',
				left: this.stickyProp.left - 8 + 'px',
				top: this.stickyProp.top - 25 + 'px',
			};

			return returnStyles;
		},
		showActions(): boolean {
			return !(this.hideActions || this.isReadOnly || this.workflowRunning || this.isResizing);
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
				top: 0,
				left: 0,
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
		onEdit(edit: boolean) {
			if (edit && !this.isActive && this.node) {
				this.$store.commit('setActiveNode', this.node.name);
			}
			else if (this.isActive && !edit) {
				this.$store.commit('setActiveNode', null);
			}
		},
		onMouseHover(isMouseHoverActive: boolean) {
			this.$emit('onMouseHover', isMouseHoverActive);
		},
		onInputChange(content: string) {
			this.setParameters({content});
		},
		onResizeStart() {
			this.isResizing = true;
			const nodeIndex = this.$store.getters.getNodeIndex(this.data.name);
			const nodeIdName = `node-${nodeIndex}`;
			this.instance.destroyDraggable(nodeIdName); // todo
		},
		onResize(deltas:  { width: number, height: number, left: boolean, top: boolean }) {
			const minHeight = 180;
			const minWidth = 150;
			const newHeight = this.height + deltas.height >= minHeight ? this.height + deltas.height : minHeight;
			const newWidth = this.width + deltas.width >= minWidth ? this.width + deltas.width : minWidth;

			if (this.node && (deltas.top || deltas.left)) {
				const x = deltas.left && newWidth !== this.width ? this.node.position[0] - deltas.width : this.node.position[0];
				const y = deltas.top && newHeight !== this.height ? this.node.position[1] - deltas.height: this.node.position[1];
				this.setPosition([x, y]);
			}

			this.setParameters({ height: newHeight, width: newWidth });
		},
		onResizeEnd() {
			this.isResizing = false;
			this.__makeInstanceDraggable(this.data);
		},
		setParameters(params: {content?: string, height?: number, width?: number}) {
			if (this.node) {
				const nodeParameters = {
					content: params.content ? params.content : this.node.parameters.content,
					height: params.height ? params.height : this.node.parameters.height,
					width: params.width ? params.width : this.node.parameters.width,
				};

				const updateInformation = {
					name: this.node.name,
					value: nodeParameters,
				};

				this.$store.commit('setNodeParameters', updateInformation);
			}
		},
		setPosition(position: XYPosition) {
			if (!this.node) {
				return;
			}

			const updateInformation = {
				name: this.node.name,
				properties: {
					position,
				},
			};

			this.$store.commit('updateNodeProperties', updateInformation);
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
