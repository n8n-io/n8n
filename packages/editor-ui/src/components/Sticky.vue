<template>
	<div class="sticky-wrapper" :style="stickyPosition" :id="nodeId" ref="sticky">
		<div
			:class="{
				'sticky-default': true,
				'touch-active': isTouchActive,
				'is-touch-device': isTouchDevice,
			}"
			:style="stickySize"
		>
			<div class="select-sticky-background" v-show="isSelected" />
			<div
				class="sticky-box"
				:data-name="data.name"
				:ref="data.name"
				@click.left="mouseLeftClick"
				v-touch:start="touchStart"
				v-touch:end="touchEnd"
			>
				<n8n-sticky
					:content.sync="node.parameters.content"
					:height="node.parameters.height"
					:width="node.parameters.width"
					:scale="nodeViewScale"
					:id="node.id"
					:readOnly="isReadOnly"
					:defaultText="defaultText"
					:editMode="isActive && !isReadOnly"
					:gridSize="gridSize"
					@input="onInputChange"
					@edit="onEdit"
					@resizestart="onResizeStart"
					@resize="onResize"
					@resizeend="onResizeEnd"
					@markdown-click="onMarkdownClick"
				/>
			</div>

			<div v-show="showActions" class="sticky-options no-select-on-click">
				<div v-touch:tap="deleteNode" class="option" :title="$locale.baseText('node.deleteNode')">
					<font-awesome-icon icon="trash" />
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';

import mixins from 'vue-typed-mixins';
import { externalHooks } from '@/mixins/externalHooks';
import { nodeBase } from '@/mixins/nodeBase';
import { nodeHelpers } from '@/mixins/nodeHelpers';
import { workflowHelpers } from '@/mixins/workflowHelpers';
import { getStyleTokenValue, isNumber, isString } from '@/utils';
import {
	INodeUi,
	INodeUpdatePropertiesInformation,
	IUpdateInformation,
	XYPosition,
} from '@/Interface';

import { IDataObject, INodeTypeDescription } from 'n8n-workflow';
import { QUICKSTART_NOTE_NAME } from '@/constants';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui';
import { useWorkflowsStore } from '@/stores/workflows';
import { useNDVStore } from '@/stores/ndv';
import { useNodeTypesStore } from '@/stores/nodeTypes';

export default mixins(externalHooks, nodeBase, nodeHelpers, workflowHelpers).extend({
	name: 'Sticky',
	props: {
		nodeViewScale: {
			type: Number,
		},
		gridSize: {
			type: Number,
		},
	},
	computed: {
		...mapStores(useNodeTypesStore, useNDVStore, useUIStore, useWorkflowsStore),
		defaultText(): string {
			if (!this.nodeType) {
				return '';
			}
			const properties = this.nodeType.properties;
			const content = properties.find((property) => property.name === 'content');

			return content && isString(content.default) ? content.default : '';
		},
		isSelected(): boolean {
			return (
				this.uiStore.getSelectedNodes.find((node: INodeUi) => node.name === this.data.name) !==
				undefined
			);
		},
		nodeType(): INodeTypeDescription | null {
			return this.data && this.nodeTypesStore.getNodeType(this.data.type, this.data.typeVersion);
		},
		node(): INodeUi | null {
			// same as this.data but reactive..
			return this.workflowsStore.getNodeByName(this.name);
		},
		position(): XYPosition {
			if (this.node) {
				return this.node.position;
			} else {
				return [0, 0];
			}
		},
		height(): number {
			return this.node && isNumber(this.node.parameters.height) ? this.node.parameters.height : 0;
		},
		width(): number {
			return this.node && isNumber(this.node.parameters.width) ? this.node.parameters.width : 0;
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
		stickyPosition(): object {
			const returnStyles: {
				[key: string]: string | number;
			} = {
				left: this.position[0] + 'px',
				top: this.position[1] + 'px',
				zIndex: this.isActive ? 9999999 : -1 * Math.floor((this.height * this.width) / 1000),
			};

			return returnStyles;
		},
		showActions(): boolean {
			return !(this.hideActions || this.isReadOnly || this.workflowRunning || this.isResizing);
		},
		workflowRunning(): boolean {
			return this.uiStore.isActionActive('workflowRunning');
		},
	},
	data() {
		return {
			isResizing: false,
			isTouchActive: false,
		};
	},
	methods: {
		deleteNode() {
			Vue.nextTick(() => {
				// Wait a tick else vue causes problems because the data is gone
				this.$emit('removeNode', this.data.name);
			});
		},
		onEdit(edit: boolean) {
			if (edit && !this.isActive && this.node) {
				this.ndvStore.activeNodeName = this.node.name;
			} else if (this.isActive && !edit) {
				this.ndvStore.activeNodeName = null;
			}
		},
		onMarkdownClick(link: HTMLAnchorElement, event: Event) {
			if (link) {
				const isOnboardingNote = this.name === QUICKSTART_NOTE_NAME;
				const isWelcomeVideo = link.querySelector('img[alt="n8n quickstart video"');
				const type =
					isOnboardingNote && isWelcomeVideo
						? 'welcome_video'
						: isOnboardingNote && link.getAttribute('href') === '/templates'
						? 'templates'
						: 'other';

				this.$telemetry.track('User clicked note link', { type });
			}
		},
		onInputChange(content: string) {
			this.setParameters({ content });
		},
		onResizeStart() {
			this.isResizing = true;
			if (!this.isSelected && this.node) {
				this.$emit('nodeSelected', this.node.name, false, true);
			}
			if (this.node) {
				this.instance.destroyDraggable(this.node.id); // todo avoid destroying if possible
			}
		},
		onResize({ height, width, dX, dY }: { width: number; height: number; dX: number; dY: number }) {
			if (!this.node) {
				return;
			}
			if (dX !== 0 || dY !== 0) {
				this.setPosition([this.node.position[0] + (dX || 0), this.node.position[1] + (dY || 0)]);
			}

			this.setParameters({ height, width });
		},
		onResizeEnd() {
			this.isResizing = false;
			this.__makeInstanceDraggable(this.data);
		},
		setParameters(params: { content?: string; height?: number; width?: number }) {
			if (this.node) {
				const nodeParameters = {
					content: isString(params.content) ? params.content : this.node.parameters.content,
					height: isNumber(params.height) ? params.height : this.node.parameters.height,
					width: isNumber(params.width) ? params.width : this.node.parameters.width,
				};

				const updateInformation: IUpdateInformation = {
					key: this.node.id,
					name: this.node.name,
					value: nodeParameters,
				};

				this.workflowsStore.setNodeParameters(updateInformation);
			}
		},
		setPosition(position: XYPosition) {
			if (!this.node) {
				return;
			}

			const updateInformation: INodeUpdatePropertiesInformation = {
				name: this.node.name,
				properties: {
					position,
				},
			};

			this.workflowsStore.updateNodeProperties(updateInformation);
		},
		touchStart() {
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
			left: -8px;
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
					color: $color-primary;
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
	background-color: hsla(
		var(--color-foreground-base-h),
		var(--color-foreground-base-s),
		var(--color-foreground-base-l),
		60%
	);
	border-radius: var(--border-radius-xlarge);
	overflow: hidden;
	height: calc(100% + 16px);
	width: calc(100% + 16px);
	left: -8px;
	top: -8px;
	z-index: 0;
}
</style>
