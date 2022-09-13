<template>
	<div>
		<div :class="$style.inputPanel" v-if="!hideInputAndOutput" :style="inputPanelStyles">
			<slot name="input"></slot>
		</div>
		<div :class="$style.outputPanel" v-if="!hideInputAndOutput" :style="outputPanelStyles">
			<slot name="output"></slot>
		</div>
		<div :class="$style.mainPanel" :style="mainPanelStyles">
			<div :class="$style.dragButtonContainer" @click="close">
				<PanelDragButton
					:class="{ [$style.draggable]: true, [$style.visible]: isDragging }"
					v-if="!hideInputAndOutput && isDraggable"
					:canMoveLeft="canMoveLeft"
					:canMoveRight="canMoveRight"
					@dragstart="onDragStart"
					@drag="onDrag"
					@dragend="onDragEnd"
				/>
			</div>
			<slot name="main"></slot>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import PanelDragButton from './PanelDragButton.vue';

const MAIN_PANEL_WIDTH = 360;
const SIDE_MARGIN = 24;
const FIXED_PANEL_WIDTH = 320;
const FIXED_PANEL_WIDTH_LARGE = 420;
const MINIMUM_INPUT_PANEL_WIDTH = 320;

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
	},
	data() {
		return {
			windowWidth: 0,
			isDragging: false,
		};
	},
	mounted() {
		this.setTotalWidth();
		window.addEventListener('resize', this.setTotalWidth);
		this.$emit('init', { position: this.getRelativePosition() });
	},
	destroyed() {
		window.removeEventListener('resize', this.setTotalWidth);
	},
	computed: {
		fixedPanelWidth() {
			if (this.windowWidth > 1700) {
				return FIXED_PANEL_WIDTH_LARGE;
			}

			return FIXED_PANEL_WIDTH;
		},
		mainPanelPosition(): number {
			if (typeof this.position === 'number') {
				return this.position;
			}

			if (!this.isDraggable) {
				return this.fixedPanelWidth + MAIN_PANEL_WIDTH / 2 + SIDE_MARGIN;
			}

			const relativePosition = this.$store.getters['ui/mainPanelPosition'] as number;

			return relativePosition * this.windowWidth;
		},
		inputPanelMargin(): number {
			return !this.isDraggable? 0 : 80;
		},
		minimumLeftPosition(): number {
			return SIDE_MARGIN + this.inputPanelMargin;
		},
		maximumRightPosition(): number {
			return this.windowWidth - MAIN_PANEL_WIDTH - this.minimumLeftPosition;
		},
		mainPanelFinalPositionPx(): number {
			const padding = this.minimumLeftPosition;
			let pos = this.mainPanelPosition + MAIN_PANEL_WIDTH / 2;
			pos = Math.max(padding, pos - MAIN_PANEL_WIDTH);
			pos = Math.min(pos, this.maximumRightPosition);

			return pos;
		},
		canMoveLeft(): boolean {
			return this.mainPanelFinalPositionPx > this.minimumLeftPosition;
		},
		canMoveRight(): boolean {
			return this.mainPanelFinalPositionPx < this.maximumRightPosition;
		},
		mainPanelStyles(): { left: string } {
			return {
				left: `${this.mainPanelFinalPositionPx}px`,
			};
		},
		inputPanelStyles(): { width: string } {
			if (!this.isDraggable) {
				return {
					width: `${this.fixedPanelWidth}px`,
				};
			}

			let width = this.mainPanelPosition - MAIN_PANEL_WIDTH / 2 - SIDE_MARGIN;
			width = Math.min(
				width,
				this.windowWidth - SIDE_MARGIN * 2 - this.inputPanelMargin - MAIN_PANEL_WIDTH,
			);
			width = Math.max(320, width);
			return {
				width: `${width}px`,
			};
		},
		outputPanelStyles(): { width: string } {
			let width = this.windowWidth - this.mainPanelPosition - MAIN_PANEL_WIDTH / 2 - SIDE_MARGIN;
			width = Math.min(
				width,
				this.windowWidth - SIDE_MARGIN * 2 - this.inputPanelMargin - MAIN_PANEL_WIDTH,
			);
			width = Math.max(MINIMUM_INPUT_PANEL_WIDTH, width);
			return {
				width: `${width}px`,
			};
		},
	},
	methods: {
		getRelativePosition() {
			const current = this.mainPanelFinalPositionPx + MAIN_PANEL_WIDTH / 2 - this.windowWidth / 2;

			const pos = Math.floor(
				(current / ((this.maximumRightPosition - this.minimumLeftPosition) / 2)) * 100,
			);
			return pos;
		},
		onDragStart() {
			this.isDragging = true;
			this.$emit('dragstart', { position: this.getRelativePosition() });
		},
		onDrag(e: {x: number, y: number}) {
			const relativePosition = e.x / this.windowWidth;
			this.$store.commit('ui/setMainPanelRelativePosition', relativePosition);
		},
		onDragEnd() {
			setTimeout(() => {
				this.isDragging = false;
				this.$emit('dragend', {
					windowWidth: this.windowWidth,
					position: this.getRelativePosition(),
				});
			}, 0);
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
$--main-panel-width: 360px;

.dataPanel {
	position: absolute;
	height: calc(100% - 2 * var(--spacing-l));
	position: absolute;
	top: var(--spacing-l);
	z-index: 0;
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
	width: $--main-panel-width;

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

.draggable {
	position: absolute;
	left: 40%;
	visibility: hidden;
}

.dragButtonContainer {
	position: absolute;
	top: -12px;
	width: $--main-panel-width;
	height: 12px;

	&:hover .draggable {
		visibility: visible;
	}
}

.visible {
	visibility: visible;
}
</style>
