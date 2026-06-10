<script setup lang="ts">
import { N8nIcon, N8nPopover } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import { useMenuRovingFocus } from '../assistant/use-menu-roving-focus';

const props = defineProps<{ value: string; options?: string[] }>();
const emit = defineEmits<{ change: [value: string] }>();

const i18n = useI18n();
// N8nPopover (reka-ui) owns open/close — escape-to-close, click-outside and
// return-focus-to-trigger; the composable adds listbox semantics + Up/Down/
// Home/End roving focus inside the panel.
const open = ref(false);

// Current value first, then its alternatives, de-duplicated.
const choices = computed(() => {
	if (!props.options?.length) return [props.value];
	return Array.from(new Set([props.value, ...props.options]));
});

const selectedIndex = computed(() =>
	Math.max(
		0,
		choices.value.findIndex((choice) => choice === props.value),
	),
);

const { menuRef, onKeydown } = useMenuRovingFocus({ open, selectedIndex });

function select(choice: string) {
	emit('change', choice);
	open.value = false;
}
</script>

<template>
	<!--
		Inline within a flowing sentence, so the trigger is an inline-flex chip and
		the panel opens just below it (`side="bottom"`). `contentClass` strips the DS
		popover chrome so our dark `.menu` panel matches the prototype exactly.
	-->
	<N8nPopover
		v-model:open="open"
		side="bottom"
		align="start"
		:side-offset="4"
		:enable-scrolling="false"
		:enable-slide-in="false"
		:content-class="$style.popoverReset"
	>
		<template #trigger>
			<button
				type="button"
				:class="$style.chip"
				aria-haspopup="listbox"
				:aria-expanded="open"
				:aria-label="i18n.baseText('desktopAssistant.composer.chooseOption')"
			>
				{{ props.value }}
				<N8nIcon icon="chevron-down" :size="11" aria-hidden="true" />
			</button>
		</template>

		<template #content>
			<div
				ref="menuRef"
				:class="$style.menu"
				role="listbox"
				:aria-label="i18n.baseText('desktopAssistant.composer.chooseOption')"
				@keydown="onKeydown"
			>
				<button
					v-for="choice in choices"
					:key="choice"
					type="button"
					role="option"
					data-menu-item
					:aria-selected="choice === props.value"
					:class="[$style.item, { [$style.selected]: choice === props.value }]"
					@click="select(choice)"
				>
					<span :class="$style.itemLabel">{{ choice }}</span>
					<N8nIcon v-if="choice === props.value" icon="check" :size="13" aria-hidden="true" />
				</button>
			</div>
		</template>
	</N8nPopover>
</template>

<style module>
.chip {
	display: inline-flex;
	align-items: center;
	gap: 3px;
	padding: 1px 7px;
	font: inherit;
	font-size: inherit;
	font-weight: inherit;
	/* The prototype chip keeps the button's own (normal) line-height instead of the
	   sentence's 1.65 — inheriting 33px makes the chips ~9px too tall and stretches
	   the line boxes, which reads as extra padding/margin. */
	line-height: normal;
	color: var(--da-text);
	vertical-align: baseline;
	cursor: pointer;
	background: var(--da-surface-2);
	border: 1px solid var(--da-border-strong);
	border-radius: var(--radius--2xs);
}

.chip:hover {
	background: var(--da-surface);
	border-color: var(--da-subtlest);
}

.chip:focus-visible {
	outline: var(--da-focus-ring);
	outline-offset: var(--da-focus-ring-offset);
}

/* Strip the DS popover's own surface/radius/shadow so the prototype panel shows through. */
.popoverReset {
	padding: 0;
	background: transparent;
	border-radius: 0;
	box-shadow: none;
}

.menu {
	min-width: 180px;
	padding: var(--spacing--4xs);
	background: var(--da-surface-2);
	border: 1px solid var(--da-border);
	border-radius: var(--radius--xs);
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
}

.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	padding: 7px 9px;
	font: inherit;
	font-size: 13px;
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

.item:hover {
	color: var(--da-text);
	background: var(--da-surface);
}

.item:focus-visible {
	color: var(--da-text);
	background: var(--da-surface);
	outline: var(--da-focus-ring);
	outline-offset: calc(-1 * var(--da-focus-ring-offset));
}

.selected {
	color: var(--da-text);
	background: var(--da-surface);
}

.itemLabel {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
