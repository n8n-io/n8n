<template>
	<div
		draggable
		@dragstart="onDragStart"
		@dragend="onDragEnd"
		:class="{[$style['node-item']]: true, [$style.bordered]: bordered}"
	>
		<NodeIcon :class="$style['node-icon']" :nodeType="nodeType" />
		<div>
			<div :class="$style.details">
				<span :class="$style.name">
					{{ $locale.headerText({
							key: `headers.${shortNodeType}.displayName`,
							fallback: nodeType.displayName,
						})
					}}
				</span>
				<span :class="$style['trigger-icon']">
					<TriggerIcon v-if="isTrigger" />
				</span>
			</div>
			<div :class="$style.description">
				{{ $locale.headerText({
						key: `headers.${shortNodeType}.description`,
						fallback: nodeType.description,
					})
				}}
			</div>

			<div :class="$style['draggable-data-transfer']" ref="draggableDataTransfer" />
			<div :class="$style.draggable" :style="{ top: `${draggablePosition.y}px`, left: `${draggablePosition.x}px` }" ref="draggable" v-show="dragging">
				<NodeIcon class="node-icon" :nodeType="nodeType" :size="40" :shrink="false" />
			</div>
		</div>
	</div>
</template>

<script lang="ts">

import { getNewNodePosition } from '@/views/canvasHelpers';
import Vue from 'vue';

import NodeIcon from '../NodeIcon.vue';
import TriggerIcon from '../TriggerIcon.vue';

Vue.component('NodeIcon', NodeIcon);
Vue.component('TriggerIcon', TriggerIcon);

interface Data {
	dragging: boolean;
	draggablePosition: {
		x: number;
		y: number;
	};
}

export default Vue.extend({
	name: 'NodeItem',
	props: [
		'active',
		'filter',
		'nodeType',
		'bordered',
	],
	data(): Data {
		return {
			dragging: false,
			draggablePosition: {
				x: -100,
				y: -100,
			},
		};
	},
	computed: {
		shortNodeType(): string {
			return this.$locale.shortNodeType(this.nodeType.name);
		},
		isTrigger (): boolean {
			return this.nodeType.group.includes('trigger');
		},
	},
	mounted() {
		/**
		 * Workaround for firefox, that doesn't attach the pageX and pageY coordinates to "ondrag" event.
		 * All browsers attach the correct page coordinates to the "dragover" event.
		 * @bug https://bugzilla.mozilla.org/show_bug.cgi?id=505521
		 */
		document.addEventListener("dragover", this.onDragOver);
	},
	destroyed() {
		document.removeEventListener("dragover", this.onDragOver);
	},
	methods: {
		onDragStart(event: DragEvent): void {
			const { pageX: x, pageY: y } = event;

			this.$emit('dragstart', event);

			if (event.dataTransfer) {
				event.dataTransfer.setDragImage(this.$refs.draggableDataTransfer as Element, 0, 0);
			}

			this.$data.dragging = true;
			this.$data.draggablePosition = { x, y };
		},
		onDragOver(event: DragEvent): void {
			if (!this.dragging || event.pageX === 0 && event.pageY === 0) {
				return;
			}

			const [x,y] = getNewNodePosition([], [event.pageX, event.pageY]);

			this.$data.draggablePosition = { x, y };
		},
		onDragEnd(event: DragEvent): void {
			this.$emit('dragend', {
				...event,

				// Safari and Firefox return incorrect values for "dragend" event,
				// override with last known value
				pageX: this.$data.draggablePosition.x,
				pageY: this.$data.draggablePosition.y,
			});

			this.$data.dragging = false;
			this.$data.draggablePosition = { x: -100, y: -100 };
		},
	},
});
</script>

<style lang="scss" module>
.node-item {
	padding: 11px 8px 11px 0;
	margin-left: 15px;
	margin-right: 12px;
	display: flex;

	&.bordered {
		border-bottom: 1px solid $--node-creator-border-color;
	}
}

.details {
	display: flex;
	align-items: center;
}

.node-icon {
	min-width: 26px;
	max-width: 26px;
	margin-right: 15px;
}

.name {
	font-weight: bold;
	font-size: 14px;
	line-height: 18px;
	margin-right: 5px;
}

.description {
	margin-top: 2px;
	font-size: 11px;
	line-height: 16px;
	font-weight: 400;
	color: $--node-creator-description-color;
}

.trigger-icon {
	height: 16px;
	width: 16px;
	display: flex;
}

.draggable {
	width: 100px;
	height: 100px;
	position: fixed;
	z-index: 1;
	opacity: 0.66;
	border: 2px solid var(--color-foreground-xdark);
	border-radius: var(--border-radius-large);
	background-color: var(--color-background-xlight);
	display: flex;
	justify-content: center;
	align-items: center;
}

.draggable-data-transfer {
	width: 1px;
	height: 1px;
}
</style>
