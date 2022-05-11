<template>
	<div
		:class="{ [$style.dragButton]: true, [$style.dragging]: isDragging }"
		@mousedown="onMousedown"
	>
		<span v-if="canMoveLeft" :class="{ [$style.leftArrow]: true, [$style.visible]: isDragging }">
			<font-awesome-icon icon="arrow-left" />
		</span>
		<span v-if="canMoveRight" :class="{ [$style.rightArrow]: true, [$style.visible]: isDragging }">
			<font-awesome-icon icon="arrow-right" />
		</span>
		<div :class="$style.grid">
			<div>
				<div></div>
				<div></div>
				<div></div>
				<div></div>
				<div></div>
			</div>
			<div>
				<div></div>
				<div></div>
				<div></div>
				<div></div>
				<div></div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	props: {
		isDragging: {
			type: Boolean,
		},
		canMoveRight: {
			type: Boolean,
		},
		canMoveLeft: {
			type: Boolean,
		},
	},
	methods: {
		onMousedown(e: MouseEvent) {
			this.$emit('mousedown', e);
		},
	},
});
</script>

<style lang="scss" module>
.dragButton {
	background-color: var(--color-background-base);
	width: 64px;
	height: 21px;
	border-top-left-radius: var(--border-radius-base);
	border-top-right-radius: var(--border-radius-base);
	cursor: grab;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: visible;

	&:hover {
		.leftArrow, .rightArrow {
			visibility: visible;
		}
	}
}

.visible {
	visibility: visible !important;
}

.dragging {
	visibility: visible;
	cursor: grabbing;
}

.arrow {
	position: absolute;
	color: var(--color-background-xlight);
	font-size: var(--font-size-3xs);
	visibility: hidden;
	top: 0;
}

.leftArrow {
	composes: arrow;
	left: -16px;
}

.rightArrow {
	composes: arrow;
	right: -16px;
}

.grid {
	> div {
		display: flex;

		&:first-child {
			> div {
				margin-bottom: 2px;
			}
		}

		> div {
			height: 2px;
			width: 2px;
			border-radius: 50%;
			background-color: var(--color-foreground-xdark);
			margin-right: 4px;

			&:last-child {
				margin-right: 0;
			}
		}
	}
}


</style>
