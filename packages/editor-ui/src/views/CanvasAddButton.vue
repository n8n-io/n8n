<template>
	<div :class="$style.container" :style="containerCssVars" ref="container">
		<n8n-tooltip placement="top" :value="showTooltip" :disabled="isScrimActive" popper-class="trigger-placeholder-button-tooltip">
			<button :class="$style.button">
				<font-awesome-icon icon="plus" size="lg" />
			</button>
			<template #content>
				<p v-text="$locale.baseText('nodeView.canvasAddButton.addATriggerNodeBeforeExecuting')" />
			</template>
		</n8n-tooltip>
		<p :class="$style.label" v-text="$locale.baseText('nodeView.canvasAddButton.chooseATrigger')" />
	</div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	name: 'CanvasAddButton',
	props: {
		showTooltip: {
			type: Boolean,
		},
	},
	data() {
		return {
			leftPosition: 0,
			topPosition: 0,
		};
	},
	computed: {
		containerCssVars(): Record<string, string> {
			return {
				'--trigger-placeholder-left-position': `${this.leftPosition}px`,
				'--trigger-placeholder-top-position': `${this.topPosition}px`,
			};
		},
		isScrimActive(): boolean {
			return this.$store.getters['ui/showCreatorPanelScrim'];
		},
	},
	mounted() {
		this.centerContainer();
	},
	methods: {
		centerContainer() {
			const containerWidth = (this.$refs.container as HTMLElement).offsetWidth;
			const containerHeight = (this.$refs.container as HTMLElement).offsetHeight;

			this.leftPosition = (window.innerWidth / 2) - (containerWidth / 2);
			this.topPosition = (window.innerHeight / 2) - (containerHeight / 2);
		},
	},
});
</script>

<style lang="scss">
	.trigger-placeholder-button-tooltip {
		max-width: 180px;
	}
</style>
<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	align-items: center;

	position: absolute;
	top: var(--trigger-placeholder-top-position);
	left: var(--trigger-placeholder-left-position);
	// We have to increase z-index to make sure it's higher than selecting box in NodeView
	// otherwise the clics wouldn't register
	z-index: 101;

	&:hover .button svg path {
		fill: var(--color-primary)
	}
}

.button {
	background: var(--color-foreground-xlight);
	border: 2px dashed var(--color-foreground-xdark);
	border-radius: 8px;
	padding: 0;

	width: 100px;
	height: 100px;
	cursor: pointer;

	svg {
		width: 26px !important;
		height: 40px;
		path {
			fill: var(--color-foreground-xdark)
		}
	}
}

.tooltip {
	max-width: 166px;
}

.label {
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-m);
	line-height: var(--font-line-height-xloose	);
	color: var(--color-text-dark);
	margin-top: var(--spacing-2xs);
}
</style>
