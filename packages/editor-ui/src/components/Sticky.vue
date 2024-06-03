<template>
	<div
		:id="nodeId"
		:ref="data?.name"
		class="sticky-wrapper"
		:style="stickyPosition"
		:data-name="data?.name"
		data-test-id="sticky"
	>
		<div
			:class="{
				'sticky-default': true,
				'touch-active': isTouchActive,
				'is-touch-device': deviceSupport.isTouchDevice,
				'is-read-only': isReadOnly,
			}"
			:style="stickySize"
		>
			<div v-show="isSelected" class="select-sticky-background" />
			<div
				v-touch:start="touchStart"
				v-touch:end="touchEnd"
				class="sticky-box"
				@click.left="mouseLeftClick"
				@contextmenu="onContextMenu"
			>
				<n8n-sticky
					v-if="node"
					:id="node.id"
					:model-value="node.parameters.content"
					:height="node.parameters.height"
					:width="node.parameters.width"
					:scale="nodeViewScale"
					:background-color="node.parameters.color"
					:read-only="isReadOnly"
					:default-text="defaultText"
					:edit-mode="isActive && !isReadOnly"
					:grid-size="gridSize"
					@edit="onEdit"
					@resizestart="onResizeStart"
					@resize="onResize"
					@resizeend="onResizeEnd"
					@markdown-click="onMarkdownClick"
					@update:model-value="onInputChange"
				/>
			</div>

			<div
				v-show="showActions"
				:class="{ 'sticky-options': true, 'no-select-on-click': true, 'force-show': forceActions }"
			>
				<div
					v-touch:tap="deleteNode"
					class="option"
					data-test-id="delete-sticky"
					:title="$locale.baseText('node.delete')"
				>
					<font-awesome-icon icon="trash" />
				</div>
				<n8n-popover
					effect="dark"
					:popper-style="{ width: '208px' }"
					trigger="click"
					placement="top"
					@show="onShowPopover"
					@hide="onHidePopover"
				>
					<template #reference>
						<div
							ref="colorPopoverTrigger"
							class="option"
							data-test-id="change-sticky-color"
							:title="$locale.baseText('node.changeColor')"
						>
							<font-awesome-icon icon="palette" />
						</div>
					</template>
					<div class="content">
						<div
							v-for="(_, index) in Array.from({ length: 7 })"
							:key="index"
							class="color"
							data-test-id="color"
							:class="`sticky-color-${index + 1}`"
							:style="{
								'border-width': '1px',
								'border-style': 'solid',
								'border-color': 'var(--color-foreground-xdark)',
								'background-color': `var(--color-sticky-background-${index + 1})`,
								'box-shadow':
									(index === 0 && node?.parameters.color === '') ||
									index + 1 === node?.parameters.color
										? `0 0 0 1px var(--color-sticky-background-${index + 1})`
										: 'none',
							}"
							@click="changeColor(index + 1)"
						></div>
					</div>
				</n8n-popover>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent, ref, type StyleValue } from 'vue';
import { mapStores } from 'pinia';

import { nodeBase } from '@/mixins/nodeBase';
import { isNumber, isString } from '@/utils/typeGuards';
import type {
	INodeUi,
	INodeUpdatePropertiesInformation,
	IUpdateInformation,
	XYPosition,
} from '@/Interface';

import type { INodeTypeDescription } from 'n8n-workflow';
import { QUICKSTART_NOTE_NAME } from '@/constants';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useContextMenu } from '@/composables/useContextMenu';
import { useDeviceSupport } from 'n8n-design-system';
import { GRID_SIZE } from '@/utils/nodeViewUtils';
import { useToast } from '@/composables/useToast';
import { assert } from '@/utils/assert';

export default defineComponent({
	name: 'Sticky',
	mixins: [nodeBase],
	props: {
		nodeViewScale: {
			type: Number,
			default: 1,
		},
		gridSize: {
			type: Number,
			default: GRID_SIZE,
		},
	},
	emits: { removeNode: null, nodeSelected: null },
	setup() {
		const deviceSupport = useDeviceSupport();
		const toast = useToast();
		const colorPopoverTrigger = ref<HTMLDivElement>();
		const forceActions = ref(false);
		const setForceActions = (value: boolean) => {
			forceActions.value = value;
		};
		const contextMenu = useContextMenu((action) => {
			if (action === 'change_color') {
				setForceActions(true);
				colorPopoverTrigger.value?.click();
			}
		});

		return {
			deviceSupport,
			toast,
			colorPopoverTrigger,
			contextMenu,
			forceActions,
			setForceActions,
		};
	},
	data() {
		return {
			isResizing: false,
			isTouchActive: false,
		};
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
		stickySize(): StyleValue {
			const returnStyles: {
				[key: string]: string | number;
			} = {
				height: this.height + 'px',
				width: this.width + 'px',
			};

			return returnStyles;
		},
		stickyPosition(): StyleValue {
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
			return (
				!(this.hideActions || this.isReadOnly || this.workflowRunning || this.isResizing) ||
				this.forceActions
			);
		},
		workflowRunning(): boolean {
			return this.uiStore.isActionActive('workflowRunning');
		},
	},
	methods: {
		onShowPopover() {
			this.setForceActions(true);
		},
		onHidePopover() {
			this.setForceActions(false);
		},
		async deleteNode() {
			assert(this.data);
			// Wait a tick else vue causes problems because the data is gone
			await this.$nextTick();
			this.$emit('removeNode', this.data.name);
		},
		changeColor(index: number) {
			this.workflowsStore.updateNodeProperties({
				name: this.name,
				properties: {
					parameters: {
						...this.node?.parameters,
						color: index,
					},
					position: this.node?.position ?? [0, 0],
				},
			});
		},
		onEdit(edit: boolean) {
			if (edit && !this.isActive && this.node) {
				this.ndvStore.activeNodeName = this.node.name;
			} else if (this.isActive && !edit) {
				this.ndvStore.activeNodeName = null;
			}
		},
		onMarkdownClick(link: HTMLAnchorElement) {
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
			if (!this.node) {
				return;
			}
			this.node.parameters.content = content;
			this.setParameters({ content });
		},
		onResizeStart() {
			this.isResizing = true;
			if (!this.isSelected && this.node) {
				this.$emit('nodeSelected', this.node.name, false, true);
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
		},
		setParameters(params: { content?: string; height?: number; width?: number; color?: string }) {
			if (this.node) {
				const nodeParameters = {
					content: isString(params.content) ? params.content : this.node.parameters.content,
					height: isNumber(params.height) ? params.height : this.node.parameters.height,
					width: isNumber(params.width) ? params.width : this.node.parameters.width,
					color: isString(params.color) ? params.color : this.node.parameters.color,
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
			if (this.deviceSupport.isTouchDevice && !this.deviceSupport.isMacOs && !this.isTouchActive) {
				this.isTouchActive = true;
				setTimeout(() => {
					this.isTouchActive = false;
				}, 2000);
			}
		},
		onContextMenu(e: MouseEvent): void {
			if (this.node && !this.isActive) {
				this.contextMenu.open(e, { source: 'node-right-click', node: this.node });
			} else {
				e.stopPropagation();
			}
		},
	},
});
</script>

<style lang="scss" scoped>
.sticky-wrapper {
	position: absolute;

	.sticky-default {
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

		&.is-read-only {
			pointer-events: none;
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

		.force-show {
			display: flex;
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
	background-color: var(--color-canvas-selected);
	border-radius: var(--border-radius-xlarge);
	overflow: hidden;
	height: calc(100% + 16px);
	width: calc(100% + 16px);
	left: -8px;
	top: -8px;
	z-index: 0;
}

.content {
	display: flex;
	flex-direction: row;
	width: fit-content;
	gap: var(--spacing-2xs);
}

.color {
	width: 20px;
	height: 20px;
	border-radius: 50%;
	border-color: var(--color-primary-shade-1);

	&:hover {
		cursor: pointer;
	}
}
</style>
