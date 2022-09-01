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
				:isResizingEnabled="true"
				:width="relativeWidthToPx(mainPanelRelativeWidth)"
				:minWidth="MINIMUM_INPUT_PANEL_WIDTH"
				:gridSize="20"
				@resize="onResize"
				@resizestart="onResizeStart"
				@resizeend="onResizeEnd"
				:supportedDirections="['left','right']"
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
import Vue from 'vue';
import PanelDragButton from './PanelDragButton.vue';
import { get, round } from 'lodash';

import {
	LOCAL_STORAGE_MAIN_PANEL_POSITION,
	LOCAL_STORAGE_MAIN_PANEL_RELATIVE_WIDTH,
	MAIN_NODE_PANEL_WIDTH,
} from '@/constants';


const SIDE_MARGIN = 24;
const MINIMUM_INPUT_PANEL_WIDTH = 320;

const initialMainPanelWidth:{ [key: string]: number } = {
	regular: MAIN_NODE_PANEL_WIDTH,
	dragless: MAIN_NODE_PANEL_WIDTH,
	inputless: MAIN_NODE_PANEL_WIDTH,
	wide: MAIN_NODE_PANEL_WIDTH * 2,
};

export default Vue.extend({
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
			type: Object,
			default: () => ({}),
		},
	},
	// tslint:disable-next-line:no-any
	data():any {
		return {
			windowWidth: 1,
			isDragging: false,
			mainPanelRelativeWidth: 1,
			MINIMUM_INPUT_PANEL_WIDTH,
			positions: {
				mainPanelRelativeLeft: 1,
				mainPanelRelativeRight: 1,
			},
		};
	},
	mounted() {
		this.setTotalWidth();
		this.setMainPanelWidth();
		// Initial position is centered if we have input slot and left-aligned if we don't
		const initialLeft = this.hasInputSlot
			? 0.5 - (this.mainPanelRelativeWidth / 2)
			: this.pxToRelativeWidth(SIDE_MARGIN + 1);

		if(!this.restorePositionData()) this.setPositions({ relativeLeft: initialLeft });

		window.addEventListener('resize', this.setTotalWidth);
		this.$emit('init', { position: this.positions.mainPanelRelativeLeft });
	},
	destroyed() {
		window.removeEventListener('resize', this.setTotalWidth);
	},
	computed: {
		currentNodePaneType() {
			if(!this.hasInputSlot) return 'inputless';
			if(!this.isDraggable) return 'dragless';
			return get(this, 'nodeType.parameterPane') || 'regular';
		},
		hasInputSlot() {
			return this.$slots.input !== undefined;
		},
		inputPanelMargin(): number {
			return this.pxToRelativeWidth(80);
		},
		minimumLeftPosition(): number {
			if(!this.hasInputSlot) return this.pxToRelativeWidth(SIDE_MARGIN);
			return this.pxToRelativeWidth(SIDE_MARGIN + 20) + this.inputPanelMargin;
		},
		maximumRightPosition(): number {
			return this.pxToRelativeWidth(SIDE_MARGIN + 20) + this.inputPanelMargin;
		},
		canMoveLeft(): boolean {
			return this.positions.mainPanelRelativeLeft > this.minimumLeftPosition;
		},
		canMoveRight(): boolean {
			return this.positions.mainPanelRelativeRight > this.maximumRightPosition;
		},
		mainPanelStyles(): { left: string, right: string } {
			return {
				'left': `${this.relativeWidthToPx(this.positions.mainPanelRelativeLeft)}px`,
				'right': `${this.relativeWidthToPx(this.positions.mainPanelRelativeRight)}px`,
			};
		},
		inputPanelStyles():{ right: string } {
			return {
				right: `${this.relativeWidthToPx(this.calculatedPositions.inputPanelRelativeRight)}px`,
			};
		},
		outputPanelStyles(): { left: string, transform: string} {
			return {
				left: `${this.relativeWidthToPx(this.calculatedPositions.outputPanelRelativeLeft)}px`,
				transform: `translateX(-${this.relativeWidthToPx(this.outputPanelRelativeTranslate)}px)`,
			};
		},
		calculatedPositions():{ inputPanelRelativeRight: number, outputPanelRelativeLeft: number } {
			const hasInput = this.$slots.input !== undefined;
			const outputPanelRelativeLeft = this.positions.mainPanelRelativeLeft + this.mainPanelRelativeWidth;

			const inputPanelRelativeRight = hasInput
				? 1 - outputPanelRelativeLeft + this.mainPanelRelativeWidth
				: (1 - this.pxToRelativeWidth(SIDE_MARGIN));

			return {
				inputPanelRelativeRight,
				outputPanelRelativeLeft,
			};
		},
		outputPanelRelativeTranslate():number {
			const panelMinLeft = 1 - this.pxToRelativeWidth(MINIMUM_INPUT_PANEL_WIDTH + SIDE_MARGIN);
			const currentRelativeLeftDelta = this.calculatedPositions.outputPanelRelativeLeft - panelMinLeft;
			return currentRelativeLeftDelta > 0 ? currentRelativeLeftDelta : 0;
		},
	},
	methods: {
		setMainPanelWidth(relativeWidth?: number) {
			const mainPanelRelativeWidth = relativeWidth || this.pxToRelativeWidth(initialMainPanelWidth[this.currentNodePaneType]);

			this.mainPanelRelativeWidth = mainPanelRelativeWidth;
		},
		setPositions({ relativeLeft, relativeRight }: { relativeLeft: number, relativeRight: number }) {
			const mainPanelRelativeLeft = relativeLeft || 1 - this.calculatedPositions.inputPanelRelativeRight;
			const mainPanelRelativeRight = relativeRight || 1 - mainPanelRelativeLeft - this.mainPanelRelativeWidth;

			if(round(this.minimumLeftPosition, 5) > round(mainPanelRelativeLeft, 5)) {
				this.positions.mainPanelRelativeLeft = this.minimumLeftPosition;
				return;
			};

			if(round(this.maximumRightPosition, 5) > round(mainPanelRelativeRight, 5)) {
				this.positions.mainPanelRelativeRight = this.maximumRightPosition;
				return;
			};

			this.positions = {
				mainPanelRelativeLeft,
				mainPanelRelativeRight,
			};
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
			this.setPositions({ relativeLeft: this.positions.mainPanelRelativeLeft });
			this.storePositionData();
		},
		onResize({ direction, x, width }: { direction: string, x: number, width: number}) {
			const relativeDistance = this.pxToRelativeWidth(x);
			const relativeWidth = this.pxToRelativeWidth(width - 1);

			if(direction === "left" && relativeDistance <= this.minimumLeftPosition) return;
			if(direction === "right" && (1 - relativeDistance) <= this.maximumRightPosition) return;
			if(width <= MINIMUM_INPUT_PANEL_WIDTH) return;

			this.setMainPanelWidth(relativeWidth);
			this.setPositions(
				direction === 'left'
					? { relativeLeft: relativeDistance }
					: { relativeRight: 1 - relativeDistance },
			);
		},
		restorePositionData() {
			const storedPositionData = window.localStorage.getItem(`${LOCAL_STORAGE_MAIN_PANEL_POSITION}_${this.currentNodePaneType}`);
			const storedPanelWidthData = window.localStorage.getItem(`${LOCAL_STORAGE_MAIN_PANEL_RELATIVE_WIDTH}_${this.currentNodePaneType}`);

			if(storedPositionData && storedPanelWidthData) {
				const parsedPositionData = JSON.parse(storedPositionData);
				this.setMainPanelWidth(parseFloat(storedPanelWidthData));
				this.setPositions({ relativeLeft: parsedPositionData.mainPanelRelativeLeft, mainPanelRelativeRight: parsedPositionData.mainPanelRelativeRight});
				return true;
			}

			return false;
		},
		storePositionData() {
			window.localStorage.setItem(`${LOCAL_STORAGE_MAIN_PANEL_POSITION}_${this.currentNodePaneType}`, JSON.stringify(this.positions));
			window.localStorage.setItem(`${LOCAL_STORAGE_MAIN_PANEL_RELATIVE_WIDTH}_${this.currentNodePaneType}`, this.mainPanelRelativeWidth.toString());
		},
		onDragStart() {
			this.isDragging = true;
			this.$emit('dragstart', { position: this.positions.mainPanelRelativeLeft });
		},
		onDrag(e: {x: number, y: number}) {
			const relativeLeft = this.pxToRelativeWidth(e.x) - (this.mainPanelRelativeWidth / 2);

			this.setPositions({ relativeLeft });
		},
		onDragEnd() {
			setTimeout(() => {
				this.isDragging = false;
				this.$emit('dragend', {
					windowWidth: this.windowWidth,
					position: this.positions.mainPanelRelativeLeft,
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
	min-width: 320px;
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

	&:hover .draggable {
		visibility: visible;
	}
}

.visible {
	visibility: visible;
}
</style>
