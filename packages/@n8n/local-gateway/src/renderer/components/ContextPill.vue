<script setup lang="ts">
import { N8nIcon, N8nPopover } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, useId } from 'vue';

import type { AssistantContext } from '../assistant/contexts';
import { useMenuRovingFocus } from '../assistant/use-menu-roving-focus';

const props = defineProps<{
	context: AssistantContext;
	options: readonly AssistantContext[];
}>();

const emit = defineEmits<{ select: [key: string] }>();

const i18n = useI18n();
// N8nPopover (reka-ui) owns open/close, giving us escape-to-close, click-outside
// and return-focus-to-trigger for free; the composable layers on listbox
// semantics + Up/Down/Home/End roving focus inside the panel.
const open = ref(false);

const selectedIndex = computed(() =>
	Math.max(
		0,
		props.options.findIndex((option) => option.key === props.context.key),
	),
);

const { menuRef, onKeydown } = useMenuRovingFocus({ open, selectedIndex });

// Links the listbox to its visible header for an accessible name.
const menuHeaderId = useId();

function select(key: string) {
	emit('select', key);
	open.value = false;
}
</script>

<template>
	<!--
		The composer sits at the very bottom of the panel, so the menu opens upward
		(`side="top"`). reka-ui flips on collision and teleports to <body>; CSS-module
		class names survive the teleport, so the panel keeps its prototype styling.
		`contentClass` neutralises the DS popover chrome (light surface, radius, shadow)
		so our dark `.menu` panel renders 1:1 with the prototype.
	-->
	<N8nPopover
		v-model:open="open"
		side="top"
		align="start"
		:side-offset="6"
		:enable-scrolling="false"
		:enable-slide-in="false"
		:content-class="$style.popoverReset"
	>
		<template #trigger>
			<button
				type="button"
				:class="$style.pill"
				aria-haspopup="listbox"
				:aria-expanded="open"
				:aria-label="i18n.baseText('desktopAssistant.composer.switchContextMenu')"
			>
				<N8nIcon
					:icon="props.context.icon"
					:size="13"
					:class="$style.contextIcon"
					aria-hidden="true"
				/>
				<span :class="$style.lookingAt">{{
					i18n.baseText('desktopAssistant.composer.lookingAt')
				}}</span>
				<span :class="$style.label">{{ props.context.label }}</span>
				<N8nIcon icon="chevron-down" :size="13" aria-hidden="true" />
			</button>
		</template>

		<template #content>
			<div :class="$style.menu">
				<div :id="menuHeaderId" :class="$style.menuHeader">
					{{ i18n.baseText('desktopAssistant.composer.switchContext') }}
				</div>
				<div ref="menuRef" role="listbox" :aria-labelledby="menuHeaderId" @keydown="onKeydown">
					<button
						v-for="option in props.options"
						:key="option.key"
						type="button"
						role="option"
						data-menu-item
						:aria-selected="option.key === props.context.key"
						:class="[$style.menuItem, { [$style.selected]: option.key === props.context.key }]"
						@click="select(option.key)"
					>
						<N8nIcon :icon="option.icon" :size="14" aria-hidden="true" />
						<span :class="$style.menuItemLabel">{{ option.label }}</span>
					</button>
				</div>
			</div>
		</template>
	</N8nPopover>
</template>

<style module>
.pill {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: 5px 8px 5px 10px;
	font: inherit;
	font-size: 11px;
	color: var(--da-subtler);
	cursor: pointer;
	background: rgba(167, 139, 250, 0.1);
	border: 1px solid rgba(167, 139, 250, 0.35);
	border-radius: var(--radius--full);
	transition:
		background 0.12s,
		border-color 0.12s;
}

.pill:hover {
	background: rgba(167, 139, 250, 0.18);
	border-color: rgba(167, 139, 250, 0.6);
}

.pill:focus-visible {
	outline: var(--da-focus-ring);
	outline-offset: var(--da-focus-ring-offset);
}

.contextIcon {
	color: var(--da-purple);
}

.lookingAt {
	color: var(--da-subtlest);
}

.label {
	max-width: 150px;
	overflow: hidden;
	color: var(--da-text);
	text-overflow: ellipsis;
	white-space: nowrap;
}

/* Strip the DS popover's own surface/radius/shadow so the prototype panel shows through. */
.popoverReset {
	padding: 0;
	background: transparent;
	border-radius: 0;
	box-shadow: none;
}

.menu {
	min-width: 230px;
	padding: var(--spacing--4xs);
	background: var(--da-surface-2);
	border: 1px solid var(--da-border);
	border-radius: var(--radius--xs);
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
}

.menuHeader {
	padding: var(--spacing--3xs) var(--spacing--2xs);
	font-size: 10px;
	text-transform: uppercase;
	letter-spacing: 0.7px;
	color: var(--da-subtlest);
}

.menuItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	padding: 7px var(--spacing--2xs);
	font: inherit;
	font-size: 12px;
	text-align: left;
	color: var(--da-subtler);
	cursor: pointer;
	background: none;
	border: none;
	border-radius: var(--radius--2xs);
	transition:
		background 0.12s,
		color 0.12s;
}

.menuItem:hover {
	color: var(--da-text);
	background: var(--da-surface);
}

.menuItem:focus-visible {
	color: var(--da-text);
	background: var(--da-surface);
	outline: var(--da-focus-ring);
	outline-offset: calc(-1 * var(--da-focus-ring-offset));
}

.selected {
	color: var(--da-text);
	background: var(--da-surface);
}

.menuItemLabel {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
