<template>
	<div
		draggable
		@dragstart="onDragStart"
		@dragend="onDragEnd"
		:class="{[$style['node-item']]: true}"
	>
		<node-icon :class="$style['node-icon']" :nodeType="nodeType" />
		<div>
			<div :class="$style.details">
				<span :class="$style.name">
					{{ $locale.headerText({
							key: `headers.${shortNodeType}.displayName`,
							fallback: nodeType.displayName,
						})
					}}
				</span>
				<span v-if="isTrigger" :class="$style['trigger-icon']">
					<trigger-icon />
				</span>
				<n8n-tooltip v-if="isCommunityNode" placement="top">
					<template #content>
						<div
							:class="$style['community-node-icon']"
							v-html="$locale.baseText('generic.communityNode.tooltip', { interpolate: { packageName: nodeType.name.split('.')[0], docURL: COMMUNITY_NODES_INSTALLATION_DOCS_URL } })"
							@click="onCommunityNodeTooltipClick"
						>
						</div>
					</template>
					<n8n-icon icon="cube" />
				</n8n-tooltip>
			</div>
			<div :class="$style.description">
				{{ $locale.headerText({
						key: `headers.${shortNodeType}.description`,
						fallback: nodeType.description,
					})
				}}
			</div>

			<div :class="$style['draggable-data-transfer']" ref="draggableDataTransfer" />
			<transition name="node-item-transition">
				<div
					:class="$style.draggable"
					:style="draggableStyle"
					ref="draggable"
					v-show="dragging"
				>
					<node-icon class="node-icon" :nodeType="nodeType" :size="40" :shrink="false" />
				</div>
			</transition>
		</div>
	</div>
</template>

<script lang="ts">

import Vue, { PropType } from 'vue';
import { INodeTypeDescription } from 'n8n-workflow';

import { getNewNodePosition, NODE_SIZE } from '@/views/canvasHelpers';
import { COMMUNITY_NODES_INSTALLATION_DOCS_URL } from '@/constants';

import NodeIcon from '@/components/NodeIcon.vue';
import TriggerIcon from '@/components/TriggerIcon.vue';
import { isCommunityPackageName } from '@/components/helpers';

Vue.component('node-icon', NodeIcon);
Vue.component('trigger-icon', TriggerIcon);

export default Vue.extend({
	name: 'NodeItem',
	props: {
		nodeType: {
			type: Object as PropType<INodeTypeDescription>,
		},
		active: {
			type: Boolean,
		},
	},
	data() {
		return {
			dragging: false,
			draggablePosition: {
				x: -100,
				y: -100,
			},
			COMMUNITY_NODES_INSTALLATION_DOCS_URL,
		};
	},
	computed: {
		shortNodeType(): string {
			return this.$locale.shortNodeType(this.nodeType.name);
		},
		isTrigger (): boolean {
			return this.nodeType.group.includes('trigger');
		},
		draggableStyle(): { top: string; left: string; } {
			return {
				top: `${this.draggablePosition.y}px`,
				left: `${this.draggablePosition.x}px`,
			};
		},
		isCommunityNode(): boolean {
			return isCommunityPackageName(this.nodeType.name);
		},
	},
	methods: {
		onDragStart(event: DragEvent): void {
			/**
			 * Workaround for firefox, that doesn't attach the pageX and pageY coordinates to "ondrag" event.
			 * All browsers attach the correct page coordinates to the "dragover" event.
			 * @bug https://bugzilla.mozilla.org/show_bug.cgi?id=505521
			 */
			document.body.addEventListener("dragover", this.onDragOver);
			const { pageX: x, pageY: y } = event;

			this.$emit('dragstart', event);

			if (event.dataTransfer) {
				event.dataTransfer.effectAllowed = "copy";
				event.dataTransfer.dropEffect = "copy";
				event.dataTransfer.setData('nodeTypeName', this.nodeType.name);
				event.dataTransfer.setDragImage(this.$refs.draggableDataTransfer as Element, 0, 0);
			}

			this.dragging = true;
			this.draggablePosition = { x, y };
		},
		onDragOver(event: DragEvent): void {
			if (!this.dragging || event.pageX === 0 && event.pageY === 0) {
				return;
			}

			const [x,y] = getNewNodePosition([], [event.pageX - NODE_SIZE / 2, event.pageY - NODE_SIZE / 2]);

			this.draggablePosition = { x, y };
		},
		onDragEnd(event: DragEvent): void {
			document.body.removeEventListener("dragover", this.onDragOver);
			this.$emit('dragend', event);

			this.dragging = false;
			setTimeout(() => {
				this.draggablePosition = { x: -100, y: -100 };
			}, 300);
		},
		onCommunityNodeTooltipClick(event: MouseEvent) {
			if ((event.target as Element).localName === 'a') {
				this.$telemetry.track('user clicked cnr docs link', { source: 'nodes panel node' });
			}
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
	cursor: grab;
}

.details {
	align-items: center;
}

.node-icon {
	min-width: 26px;
	max-width: 26px;
	margin-right: 15px;
}

.name {
	font-weight: var(--font-weight-bold);
	font-size: 14px;
	line-height: 18px;
	margin-right: 5px;
}

.packageName {
	margin-right: 5px;
}

.description {
	margin-top: 2px;
	font-size: var(--font-size-2xs);
	line-height: 16px;
	font-weight: 400;
	color: $node-creator-description-color;
}

.trigger-icon {
	height: 16px;
	width: 16px;
	display: inline-block;
	margin-right: var(--spacing-3xs);
	vertical-align: middle;
}

.community-node-icon {
	vertical-align: top;
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

<style lang="scss" scoped>
.node-item-transition {
	&-enter-active,
	&-leave-active {
		transition-property: opacity, transform;
		transition-duration: 300ms;
		transition-timing-function: ease;
	}

	&-enter,
	&-leave-to {
		opacity: 0;
		transform: scale(0);
	}
}

.el-tooltip svg {
	color: var(--color-foreground-xdark);
}
</style>
