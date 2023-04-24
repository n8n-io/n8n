<template>
	<div>
		<div :class="$style.inputPanel" v-if="!hideInputAndOutput" :style="inputPanelStyles">
			<slot name="input"></slot>
		</div>
		<div :class="$style.outputPanel" v-if="!hideInputAndOutput" :style="outputPanelStyles">
			<slot name="output"></slot>
		</div>
		<div :class="$style.mainPanel" :style="mainPanelStyles">
			<n8n-resize-wrapper
				:isResizingEnabled="currentNodePaneType !== 'unknown'"
				:width="relativeWidthToPx(mainPanelDimensions.relativeWidth)"
				:minWidth="MIN_PANEL_WIDTH"
				:gridSize="20"
				@resize="onResizeDebounced"
				@resizestart="onResizeStart"
				@resizeend="onResizeEnd"
				:supportedDirections="supportedResizeDirections"
			>
				<div :class="$style.dragButtonContainer">
					<PanelDragButton
						:class="{ [$style.draggable]: true, [$style.visible]: isDragging }"
						:canMoveLeft="canMoveLeft"
						:canMoveRight="canMoveRight"
						v-if="!hideInputAndOutput && isDraggable"
						@dragstart="onDragStart"
						@drag="onDrag"
						@dragend="onDragEnd"
					/>
				</div>
				<div :class="{ [$style.mainPanelInner]: true, [$style.dragging]: isDragging }">
					<slot name="main" />
				</div>
			</n8n-resize-wrapper>
		</div>
	</div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import Vue from 'vue';
import { get } from 'lodash-es';

import type { INodeTypeDescription } from 'n8n-workflow';
import PanelDragButton from './PanelDragButton.vue';

import { LOCAL_STORAGE_MAIN_PANEL_RELATIVE_WIDTH, MAIN_NODE_PANEL_WIDTH } from '@/constants';
import mixins from 'vue-typed-mixins';
import { debounceHelper } from '@/mixins/debounce';
import { mapStores } from 'pinia';
import { useNDVStore } from '@/stores/ndv';
import { NodePanelType } from '@/Interface';

const SIDE_MARGIN = 24;
const SIDE_PANELS_MARGIN = 80;
const MIN_PANEL_WIDTH = 280;
const PANEL_WIDTH = 320;
const PANEL_WIDTH_LARGE = 420;

const initialMainPanelWidth: { [key: string]: number } = {
	regular: MAIN_NODE_PANEL_WIDTH,
	dragless: MAIN_NODE_PANEL_WIDTH,
	unknown: MAIN_NODE_PANEL_WIDTH,
	inputless: MAIN_NODE_PANEL_WIDTH,
	wide: MAIN_NODE_PANEL_WIDTH * 2,
};

export default mixins(debounceHelper).extend({
	name: 'NDVDraggablePanels',
	components: {
		PanelDragButton,
	},
	props: {
		isDraggable: {
			type: Boolean,
		},
		hideInputAndOutput: {
			type: Boolean,
		},
		position: {
			type: Number,
		},
		nodeType: {
			type: Object as PropType<INodeTypeDescription>,
			default: () => ({}),
		},
	},
	data(): {
		windowWidth: number;
		isDragging: boolean;
		MIN_PANEL_WIDTH: number;
		initialized: boolean;
	} {
		return {
			windowWidth: 1,
			isDragging: false,
			MIN_PANEL_WIDTH,
			initialized: false,
		};
	},
	mounted() {
		this.setTotalWidth();

		/*
			Only set(or restore) initial position if `mainPanelDimensions`
			is at the default state({relativeLeft:1, relativeRight: 1, relativeWidth: 1}) to make sure we use store values if they are set
		*/
		if (
			this.mainPanelDimensions.relativeLeft === 1 &&
			this.mainPanelDimensions.relativeRight === 1
		) {
			this.setMainPanelWidth();
			this.setPositions(this.getInitialLeftPosition(this.mainPanelDimensions.relativeWidth));
			this.restorePositionData();
		}

		window.addEventListener('resize', this.setTotalWidth);
		this.$emit('init', { position: this.mainPanelDimensions.relativeLeft });
		setTimeout(() => {
			this.initialized = true;
		}, 0);
	},
	destroyed() {
		window.removeEventListener('resize', this.setTotalWidth);
	},
	computed: {
		...mapStores(useNDVStore),
		mainPanelDimensions(): {
			relativeWidth: number;
			relativeLeft: number;
			relativeRight: number;
		} {
			return this.ndvStore.getMainPanelDimensions(this.currentNodePaneType);
		},
		supportedResizeDirections(): string[] {
			const supportedDirections = ['right'];

			if (this.isDraggable) supportedDirections.push('left');
			return supportedDirections;
		},
		currentNodePaneType(): string {
			if (!this.hasInputSlot) return 'inputless';
			if (!this.isDraggable) return 'dragless';
			if (this.nodeType === null) return 'unknown';
			return get(this, 'nodeType.parameterPane') || 'regular';
		},
		hasInputSlot(): boolean {
			return this.$slots.input !== undefined;
		},
		inputPanelMargin(): number {
			return this.pxToRelativeWidth(SIDE_PANELS_MARGIN);
		},
		minWindowWidth(): number {
			return 2 * (SIDE_MARGIN + SIDE_PANELS_MARGIN) + MIN_PANEL_WIDTH;
		},
		minimumLeftPosition(): number {
			if (this.windowWidth < this.minWindowWidth) return this.pxToRelativeWidth(1);

			if (!this.hasInputSlot) return this.pxToRelativeWidth(SIDE_MARGIN);
			return this.pxToRelativeWidth(SIDE_MARGIN + 20) + this.inputPanelMargin;
		},
		maximumRightPosition(): number {
			if (this.windowWidth < this.minWindowWidth) return this.pxToRelativeWidth(1);

			return this.pxToRelativeWidth(SIDE_MARGIN + 20) + this.inputPanelMargin;
		},
		canMoveLeft(): boolean {
			return this.mainPanelDimensions.relativeLeft > this.minimumLeftPosition;
		},
		canMoveRight(): boolean {
			return this.mainPanelDimensions.relativeRight > this.maximumRightPosition;
		},
		mainPanelStyles(): { left: string; right: string } {
			return {
				left: `${this.relativeWidthToPx(this.mainPanelDimensions.relativeLeft)}px`,
				right: `${this.relativeWidthToPx(this.mainPanelDimensions.relativeRight)}px`,
			};
		},
		inputPanelStyles(): { right: string } {
			return {
				right: `${this.relativeWidthToPx(this.calculatedPositions.inputPanelRelativeRight)}px`,
			};
		},
		outputPanelStyles(): { left: string; transform: string } {
			return {
				left: `${this.relativeWidthToPx(this.calculatedPositions.outputPanelRelativeLeft)}px`,
				transform: `translateX(-${this.relativeWidthToPx(this.outputPanelRelativeTranslate)}px)`,
			};
		},
		calculatedPositions(): { inputPanelRelativeRight: number; outputPanelRelativeLeft: number } {
			const hasInput = this.$slots.input !== undefined;
			const outputPanelRelativeLeft =
				this.mainPanelDimensions.relativeLeft + this.mainPanelDimensions.relativeWidth;

			const inputPanelRelativeRight = hasInput
				? 1 - outputPanelRelativeLeft + this.mainPanelDimensions.relativeWidth
				: 1 - this.pxToRelativeWidth(SIDE_MARGIN);

			return {
				inputPanelRelativeRight,
				outputPanelRelativeLeft,
			};
		},
		outputPanelRelativeTranslate(): number {
			const panelMinLeft = 1 - this.pxToRelativeWidth(MIN_PANEL_WIDTH + SIDE_MARGIN);
			const currentRelativeLeftDelta =
				this.calculatedPositions.outputPanelRelativeLeft - panelMinLeft;
			return currentRelativeLeftDelta > 0 ? currentRelativeLeftDelta : 0;
		},
		hasDoubleWidth(): boolean {
			return get(this, 'nodeType.parameterPane') === 'wide';
		},
		fixedPanelWidth(): number {
			const multiplier = this.hasDoubleWidth ? 2 : 1;

			if (this.windowWidth > 1700) {
				return PANEL_WIDTH_LARGE * multiplier;
			}

			return PANEL_WIDTH * multiplier;
		},
		isBelowMinWidthMainPanel(): boolean {
			const minRelativeWidth = this.pxToRelativeWidth(MIN_PANEL_WIDTH);
			return this.mainPanelDimensions.relativeWidth < minRelativeWidth;
		},
	},
	watch: {
		windowWidth(windowWidth) {
			const minRelativeWidth = this.pxToRelativeWidth(MIN_PANEL_WIDTH);
			// Prevent the panel resizing below MIN_PANEL_WIDTH whhile maintaing position
			if (this.isBelowMinWidthMainPanel) {
				this.setMainPanelWidth(minRelativeWidth);
			}

			const isBelowMinLeft = this.minimumLeftPosition > this.mainPanelDimensions.relativeLeft;
			const isMaxRight = this.maximumRightPosition > this.mainPanelDimensions.relativeRight;

			// When user is resizing from non-supported view(sub ~488px) we need to refit the panels
			if (windowWidth > this.minWindowWidth && isBelowMinLeft && isMaxRight) {
				this.setMainPanelWidth(minRelativeWidth);
				this.setPositions(this.getInitialLeftPosition(this.mainPanelDimensions.relativeWidth));
			}

			this.setPositions(this.mainPanelDimensions.relativeLeft);
		},
	},
	methods: {
		getInitialLeftPosition(width: number) {
			if (this.currentNodePaneType === 'dragless')
				return this.pxToRelativeWidth(SIDE_MARGIN + 1 + this.fixedPanelWidth);

			return this.hasInputSlot ? 0.5 - width / 2 : this.minimumLeftPosition;
		},
		setMainPanelWidth(relativeWidth?: number) {
			const mainPanelRelativeWidth =
				relativeWidth || this.pxToRelativeWidth(initialMainPanelWidth[this.currentNodePaneType]);

			this.ndvStore.setMainPanelDimensions({
				panelType: this.currentNodePaneType,
				dimensions: {
					relativeWidth: mainPanelRelativeWidth,
				},
			});
		},
		setPositions(relativeLeft: number) {
			const mainPanelRelativeLeft =
				relativeLeft || 1 - this.calculatedPositions.inputPanelRelativeRight;
			const mainPanelRelativeRight =
				1 - mainPanelRelativeLeft - this.mainPanelDimensions.relativeWidth;

			const isMaxRight = this.maximumRightPosition > mainPanelRelativeRight;
			const isMinLeft = this.minimumLeftPosition > mainPanelRelativeLeft;
			const isInputless = this.currentNodePaneType === 'inputless';

			if (isMinLeft) {
				this.ndvStore.setMainPanelDimensions({
					panelType: this.currentNodePaneType,
					dimensions: {
						relativeLeft: this.minimumLeftPosition,
						relativeRight: 1 - this.mainPanelDimensions.relativeWidth - this.minimumLeftPosition,
					},
				});
				return;
			}

			if (isMaxRight) {
				this.ndvStore.setMainPanelDimensions({
					panelType: this.currentNodePaneType,
					dimensions: {
						relativeLeft: 1 - this.mainPanelDimensions.relativeWidth - this.maximumRightPosition,
						relativeRight: this.maximumRightPosition as number,
					},
				});
				return;
			}

			this.ndvStore.setMainPanelDimensions({
				panelType: this.currentNodePaneType,
				dimensions: {
					relativeLeft: isInputless ? this.minimumLeftPosition : mainPanelRelativeLeft,
					relativeRight: mainPanelRelativeRight,
				},
			});
		},
		pxToRelativeWidth(px: number) {
			return px / this.windowWidth;
		},
		relativeWidthToPx(relativeWidth: number) {
			return relativeWidth * this.windowWidth;
		},
		onResizeStart() {
			this.setTotalWidth();
		},
		onResizeEnd() {
			this.storePositionData();
		},
		onResizeDebounced(data: { direction: string; x: number; width: number }) {
			if (this.initialized) {
				this.callDebounced('onResize', { debounceTime: 10, trailing: true }, data);
			}
		},
		onResize({ direction, x, width }: { direction: string; x: number; width: number }) {
			const relativeDistance = this.pxToRelativeWidth(x);
			const relativeWidth = this.pxToRelativeWidth(width);

			if (direction === 'left' && relativeDistance <= this.minimumLeftPosition) return;
			if (direction === 'right' && 1 - relativeDistance <= this.maximumRightPosition) return;
			if (width <= MIN_PANEL_WIDTH) return;

			this.setMainPanelWidth(relativeWidth);
			this.setPositions(
				direction === 'left' ? relativeDistance : this.mainPanelDimensions.relativeLeft,
			);
		},
		restorePositionData() {
			const storedPanelWidthData = window.localStorage.getItem(
				`${LOCAL_STORAGE_MAIN_PANEL_RELATIVE_WIDTH}_${this.currentNodePaneType}`,
			);

			if (storedPanelWidthData) {
				const parsedWidth = parseFloat(storedPanelWidthData);
				this.setMainPanelWidth(parsedWidth);
				const initialPosition = this.getInitialLeftPosition(parsedWidth);

				this.setPositions(initialPosition);
				return true;
			}
			return false;
		},
		storePositionData() {
			window.localStorage.setItem(
				`${LOCAL_STORAGE_MAIN_PANEL_RELATIVE_WIDTH}_${this.currentNodePaneType}`,
				this.mainPanelDimensions.relativeWidth.toString(),
			);
		},
		onDragStart() {
			this.isDragging = true;
			this.$emit('dragstart', { position: this.mainPanelDimensions.relativeLeft });
		},
		onDrag(e: { x: number; y: number }) {
			const relativeLeft = this.pxToRelativeWidth(e.x) - this.mainPanelDimensions.relativeWidth / 2;

			this.setPositions(relativeLeft);
		},
		onDragEnd() {
			setTimeout(() => {
				this.isDragging = false;
				this.$emit('dragend', {
					windowWidth: this.windowWidth,
					position: this.mainPanelDimensions.relativeLeft,
				});
			}, 0);
			this.storePositionData();
		},
		setTotalWidth() {
			this.windowWidth = window.innerWidth;
		},
		close() {
			this.$emit('close');
		},
	},
});
</script>

<style lang="scss" module>
.dataPanel {
	position: absolute;
	height: calc(100% - 2 * var(--spacing-l));
	position: absolute;
	top: var(--spacing-l);
	z-index: 0;
	min-width: 280px;
}

.inputPanel {
	composes: dataPanel;
	left: var(--spacing-l);

	> * {
		border-radius: var(--border-radius-large) 0 0 var(--border-radius-large);
	}
}

.outputPanel {
	composes: dataPanel;
	right: var(--spacing-l);

	> * {
		border-radius: 0 var(--border-radius-large) var(--border-radius-large) 0;
	}
}

.mainPanel {
	position: absolute;
	height: 100%;

	&:hover {
		.draggable {
			visibility: visible;
		}
	}
}

.mainPanelInner {
	height: 100%;
	border: var(--border-base);
	border-radius: var(--border-radius-large);
	box-shadow: 0 4px 16px rgb(50 61 85 / 10%);
	overflow: hidden;

	&.dragging {
		border-color: var(--color-primary);
		box-shadow: 0px 6px 16px rgba(255, 74, 51, 0.15);
	}
}

.draggable {
	visibility: hidden;
}

.dragButtonContainer {
	position: absolute;
	top: -12px;
	width: 100%;
	height: 12px;
	display: flex;
	justify-content: center;
	pointer-events: none;

	.draggable {
		pointer-events: all;
	}
	&:hover .draggable {
		visibility: visible;
	}
}

.visible {
	visibility: visible;
}
</style>
