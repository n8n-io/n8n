<template>
	<div>
		<div
			v-if="!createNodeActive"
			:class="[$style.nodeButtonsWrapper, showStickyButton ? $style.noEvents : '']"
			@mouseenter="onCreateMenuHoverIn"
		>
			<div :class="$style.nodeCreatorButton" data-test-id="node-creator-plus-button">
				<n8n-icon-button
					size="xlarge"
					icon="plus"
					type="tertiary"
					:class="$style.nodeCreatorPlus"
					@click="openNodeCreator"
					:title="$locale.baseText('nodeView.addNode')"
				/>
				<div
					:class="[$style.addStickyButton, showStickyButton ? $style.visibleButton : '']"
					@click="addStickyNote"
					data-test-id="add-sticky-button"
				>
					<n8n-icon-button
						size="medium"
						type="tertiary"
						:icon="['far', 'note-sticky']"
						:title="$locale.baseText('nodeView.addSticky')"
					/>
				</div>
			</div>
		</div>
		<node-creator
			:active="createNodeActive"
			@nodeTypeSelected="nodeTypeSelected"
			@closeNodeCreator="closeNodeCreator"
		/>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { getMidCanvasPosition } from '@/utils/nodeViewUtils';
import {
	DEFAULT_STICKY_HEIGHT,
	DEFAULT_STICKY_WIDTH,
	NODE_CREATOR_OPEN_SOURCES,
	STICKY_NODE_TYPE,
} from '@/constants';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui';

export default defineComponent({
	name: 'node-creation',
	components: {
		NodeCreator: () => import('@/components/Node/NodeCreator/NodeCreator.vue'),
	},
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
	computed: {
		...mapStores(useUIStore),
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
					const inside =
						mousemoveEvent.pageX > wrapperLeftNear &&
						mousemoveEvent.pageX < wrapperLeftFar &&
						mousemoveEvent.pageY > wrapperTopNear &&
						mousemoveEvent.pageY < wrapperTopFar;
					if (!inside) {
						this.showStickyButton = false;
						document.removeEventListener('mousemove', moveCallback, false);
					}
				}
			};
			document.addEventListener('mousemove', moveCallback, false);
		},
		openNodeCreator() {
			this.$emit('toggleNodeCreator', {
				source: NODE_CREATOR_OPEN_SOURCES.ADD_NODE_BUTTON,
				createNodeActive: true,
			});
		},
		addStickyNote() {
			if (document.activeElement) {
				(document.activeElement as HTMLElement).blur();
			}

			const offset: [number, number] = [...this.uiStore.nodeViewOffsetPosition];

			const position = getMidCanvasPosition(this.nodeViewScale, offset);
			position[0] -= DEFAULT_STICKY_WIDTH / 2;
			position[1] -= DEFAULT_STICKY_HEIGHT / 2;

			this.$emit('addNode', [
				{
					nodeTypeName: STICKY_NODE_TYPE,
					position,
				},
			]);
		},
		closeNodeCreator() {
			this.$emit('toggleNodeCreator', { createNodeActive: false });
		},
		nodeTypeSelected(nodeTypeNames: string[]) {
			this.$emit(
				'addNode',
				nodeTypeNames.map((nodeTypeName) => ({ nodeTypeName })),
			);
			this.closeNodeCreator();
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
	transition: 0.1s;
	transition-timing-function: linear;
}

.visibleButton {
	opacity: 1;
	pointer-events: all;
}

.noEvents {
	pointer-events: none;
}

.nodeCreatorButton {
	position: fixed;
	text-align: center;
	top: calc(#{$header-height} + var(--spacing-s));
	right: var(--spacing-s);
	pointer-events: all !important;

	button {
		border-color: var(--color-foreground-xdark);
		color: var(--color-foreground-xdark);

		&:hover {
			border-color: var(--color-primary);
			color: var(--color-primary);
			background: var(--color-background-xlight);
		}
	}
}
.nodeCreatorPlus {
	border-width: 2px;
	border-radius: var(--border-radius-base);
	width: 36px;
	height: 36px;
}
</style>
