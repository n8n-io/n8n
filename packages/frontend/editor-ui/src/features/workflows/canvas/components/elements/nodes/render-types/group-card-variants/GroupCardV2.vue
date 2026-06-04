<script setup lang="ts">
// PROTOTYPE VARIANT V2 — currently an exact copy of V1. Edit this file to
// diverge the V2 card design (e.g. service icons). See registry.ts.
import { useI18n } from '@n8n/i18n';
import { N8nActionDropdown, N8nIconButton } from '@n8n/design-system';

import NodeIcon from '@/app/components/NodeIcon.vue';
import type { GroupCardProps, GroupCardEmits } from './types';

defineProps<GroupCardProps>();
const emit = defineEmits<GroupCardEmits>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style.body">
		<div :class="$style.header">
			<N8nIconButton
				v-if="!isReadOnly"
				:class="$style.expandToggle"
				variant="ghost"
				icon="chevrons-up-down"
				:aria-label="i18n.baseText('canvas.nodeGroup.expand')"
				data-test-id="canvas-collapsed-group-expand"
				@click.stop="emit('expand')"
				@mousedown.stop
			/>
			<div :class="$style.titleBlock">
				<span :class="$style.title" data-test-id="canvas-collapsed-group-title">{{ title }}</span>
				<p
					v-if="description"
					:class="$style.description"
					data-test-id="canvas-collapsed-group-description"
				>
					{{ description }}
				</p>
			</div>
			<!-- Stop propagation on the wrapper (not the button): the dropdown's
				trigger is a descendant and opens first, then we halt the event so it
				doesn't reach Vue Flow's node drag/select. Stopping on the button
				itself would swallow the click before the trigger sees it. -->
			<div
				v-if="canPickNodes"
				:class="$style.pinButton"
				@pointerdown.stop
				@mousedown.stop
				@click.stop
				@dblclick.stop
			>
				<N8nActionDropdown
					:items="pickableItems"
					placement="bottom-end"
					data-test-id="canvas-collapsed-group-pin"
					@select="(id: string) => emit('pick-node', id)"
				>
					<template #activator>
						<N8nIconButton
							variant="ghost"
							icon="plus"
							:aria-label="i18n.baseText('canvas.nodeGroup.pinNode')"
						/>
					</template>
					<template #menuItem="item">
						<span :class="$style.menuItem">
							<NodeIcon :icon-source="iconSourceForNodeId(item.id)" :size="14" />
							<span :class="$style.menuItemLabel">{{ item.label }}</span>
						</span>
					</template>
				</N8nActionDropdown>
			</div>
		</div>

		<ul
			v-if="pinnedNodes.length"
			:class="$style.pinnedList"
			data-test-id="canvas-collapsed-group-pinned"
		>
			<li
				v-for="pinned in pinnedNodes"
				:key="pinned.id"
				:class="$style.pinnedItem"
				data-test-id="canvas-collapsed-group-pinned-item"
				@pointerdown.stop
				@mousedown.stop
				@click.stop="emit('open-node', pinned.name)"
			>
				<div :class="$style.iconWrapper">
					<NodeIcon :icon-source="pinned.iconSource" :size="14" />
				</div>
				<span :class="$style.pinnedName">{{ pinned.name }}</span>
				<N8nIconButton
					v-if="!isReadOnly"
					:class="$style.unpinButton"
					variant="ghost"
					size="small"
					icon="x"
					:aria-label="i18n.baseText('canvas.nodeGroup.unpinNode')"
					data-test-id="canvas-collapsed-group-unpin"
					@click.stop="emit('unpin-node', pinned.id)"
					@mousedown.stop
					@pointerdown.stop
				/>
			</li>
		</ul>
	</div>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-width: 0;
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.expandToggle,
.pinButton {
	flex-shrink: 0;
}

// The "+" picker only appears while hovering the card body.
.pinButton {
	opacity: 0;
	transition: opacity 0.1s ease-in;
}

.body:hover .pinButton,
.pinButton:focus-within {
	opacity: 1;
}

.titleBlock {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	flex: 1;
	min-width: 0;
}

.title {
	min-width: 0;

	white-space: nowrap;
}

.description {
	margin: 0;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--regular);
	line-height: var(--line-height--md);
	color: var(--color--text--tint-1);
	overflow-wrap: anywhere;
}

.pinnedList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin: 0;
	margin-top: var(--spacing--xs);
	list-style: none;
}

.pinnedItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) 0;
	border-radius: var(--radius);
	font-weight: var(--font-weight--regular);
	font-size: var(--font-size--sm);
	cursor: pointer;

	&:hover {
		background: var(--color--foreground--tint-2);
	}
}

.iconWrapper {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32px;
}

.pinnedName {
	flex: 1;
	min-width: 0;

	text-overflow: ellipsis;
	white-space: nowrap;
}

.unpinButton {
	flex-shrink: 0;
	opacity: 0;
	transition: opacity 0.1s ease-in;
}

.pinnedItem:hover .unpinButton,
.unpinButton:focus-visible {
	opacity: 1;
}

.menuItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.menuItemLabel {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
