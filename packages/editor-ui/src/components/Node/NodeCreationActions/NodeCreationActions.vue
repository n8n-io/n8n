<template>
	<div v-if="!createNodeActive" :class="[$style.nodeButtonsWrapper, showStickyButton ? 'no-events' : '']" @mouseenter="onCreateMenuHoverIn">
		<div :class="$style.nodeCreatorButton">
			<n8n-icon-button size="xlarge" icon="plus" @click="() => openNodeCreator('add_node_button')" :title="$locale.baseText('nodeView.addNode')"/>
			<div :class="[$style.addStickyButton, showStickyButton ? $style.visibleButton : '']" @click="addStickyNote">
				<n8n-icon-button size="medium" type="secondary" :icon="['far', 'note-sticky']" :title="$locale.baseText('nodeView.addSticky')"/>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import { externalHooks } from "@/components/mixins/externalHooks";
import * as CanvasHelpers from "@/views/canvasHelpers";
import {DEFAULT_STICKY_HEIGHT, DEFAULT_STICKY_WIDTH, STICKY_NODE_TYPE} from "@/constants";

export default mixins(externalHooks).extend({
	name: 'node-creation-actions',
	props: {
		nodeViewScale: {
			type: Number,
			required: true,
		},
		createNodeActive: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			showStickyButton: false,
		};
	},
	methods: {
		onCreateMenuHoverIn(mouseinEvent: MouseEvent) {
			const buttonsWrapper = mouseinEvent.target as Element;

			// Once the popup menu is hovered, it's pointer events are disabled so it's not interfering with element underneath it.
			this.showStickyButton = true;
			const moveCallback = (mousemoveEvent: MouseEvent) => {
				if (buttonsWrapper) {
					const wrapperBounds = buttonsWrapper.getBoundingClientRect();
					const wrapperH = wrapperBounds.height;
					const wrapperW = wrapperBounds.width;
					const wrapperLeftNear = wrapperBounds.left;
					const wrapperLeftFar = wrapperLeftNear + wrapperW;
					const wrapperTopNear = wrapperBounds.top;
					const wrapperTopFar = wrapperTopNear + wrapperH;
					const inside = ((mousemoveEvent.pageX > wrapperLeftNear && mousemoveEvent.pageX < wrapperLeftFar) && (mousemoveEvent.pageY > wrapperTopNear && mousemoveEvent.pageY < wrapperTopFar));
					if (!inside) {
						this.showStickyButton = false;
						document.removeEventListener('mousemove', moveCallback, false);
					}
				}
			};
			document.addEventListener('mousemove', moveCallback, false);
		},
		openNodeCreator(source: string) {
			this.$emit('openNodeCreator');
			this.$externalHooks().run('nodeView.createNodeActiveChanged', { source, createNodeActive: this.createNodeActive });
			this.$telemetry.trackNodesPanel('nodeView.createNodeActiveChanged', { source, workflow_id: this.$store.getters.workflowId, createNodeActive: this.createNodeActive });
		},
		addStickyNote() {
			if (document.activeElement) {
				(document.activeElement as HTMLElement).blur();
			}

			const offset: [number, number] = [...(this.$store.getters.getNodeViewOffsetPosition as [number, number])];

			const position = CanvasHelpers.getMidCanvasPosition(this.nodeViewScale, offset);
			position[0] -= DEFAULT_STICKY_WIDTH / 2;
			position[1] -= DEFAULT_STICKY_HEIGHT / 2;

			this.$emit('addNodeButton', {
				nodeType: STICKY_NODE_TYPE,
				position,
			});
		},
	},
});
</script>

<style lang="scss" module>
.nodeButtonsWrapper {
	position: fixed;
	width: 150px;
	height: 200px;
	top: 0;
	right: 0;
	display: flex;
}

.addStickyButton {
	margin-top: var(--spacing-2xs);
	opacity: 0;
	transition: .1s;
	transition-timing-function: linear;
}

.visibleButton {
	opacity: 1;
	pointer-events: all;
}

.nodeCreatorButton {
	position: fixed;
	text-align: center;
	top: 80px;
	right: 20px;
	pointer-events: all !important;

	button {
		position: relative;
	}
}
</style>
