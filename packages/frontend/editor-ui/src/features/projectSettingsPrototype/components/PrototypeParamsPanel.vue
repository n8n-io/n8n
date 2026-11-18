<script setup lang="ts">
import { N8nButton, N8nIconButton, N8nText } from '@n8n/design-system';
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import ParamField from './ParamField.vue';
import PrototypeDataSection from './PrototypeDataSection.vue';
import { panelOpen, paramDefs, resetProtoParams, shareLink } from '../params';

/**
 * The prototype parameters panel, opened with Alt+P (⌥P on a Mac) or the chip.
 * It floats over the app without blocking it, so a parameter can be changed
 * and the result used straight away.
 *
 * Styled as an inverted (dark) panel so it reads as prototype chrome, not as
 * part of n8n.
 */
const copied = ref(false);
const panel = ref<HTMLElement | null>(null);
let returnFocusTo: HTMLElement | null = null;
let copiedTimer: ReturnType<typeof setTimeout> | undefined;

// Matched on the physical key (`code`), because ⌥P on a Mac reports `key` as "π".
function onKeydown(event: KeyboardEvent) {
	if (
		event.altKey &&
		!event.metaKey &&
		!event.ctrlKey &&
		!event.shiftKey &&
		event.code === 'KeyP'
	) {
		event.preventDefault();
		event.stopPropagation();
		panelOpen.value = !panelOpen.value;
	}
}

/** Escape closes the panel only from inside it, so it never steals n8n's own Escape. */
function onPanelKeydown(event: KeyboardEvent) {
	if (event.key !== 'Escape') return;
	event.preventDefault();
	event.stopPropagation();
	panelOpen.value = false;
}

watch(panelOpen, async (open) => {
	if (open) {
		returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		await nextTick();
		panel.value?.focus({ preventScroll: true });
		return;
	}
	// Only when focus was still in the panel: clicking the app closes nothing and keeps its focus.
	if (panel.value?.contains(document.activeElement) ?? true) returnFocusTo?.focus();
	returnFocusTo = null;
});

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform ?? '');
const shortcutLabel = isMac ? '⌥P' : 'Alt+P';

onMounted(() => window.addEventListener('keydown', onKeydown, true));
onBeforeUnmount(() => {
	window.removeEventListener('keydown', onKeydown, true);
	clearTimeout(copiedTimer);
});

async function copyShareLink() {
	await navigator.clipboard.writeText(shareLink());
	copied.value = true;
	clearTimeout(copiedTimer);
	copiedTimer = setTimeout(() => (copied.value = false), 1500);
}
</script>

<template>
	<Transition
		:enter-active-class="$style.transition"
		:leave-active-class="$style.transition"
		:enter-from-class="$style.away"
		:leave-to-class="$style.away"
	>
		<aside
			v-if="panelOpen"
			ref="panel"
			:class="$style.panel"
			data-theme="dark"
			role="dialog"
			aria-labelledby="proto-panel-title"
			tabindex="-1"
			data-test-id="proto-panel"
			@keydown="onPanelKeydown"
		>
			<header :class="$style.header">
				<div :class="$style.headerText">
					<N8nText id="proto-panel-title" tag="h2" size="medium" bold color="text-dark">
						Prototype parameters
					</N8nText>
					<N8nText size="xsmall" color="text-light">
						Changes apply straight away and stay in this browser.
					</N8nText>
				</div>
				<kbd :class="$style.kbd" :title="`Press ${shortcutLabel} to open or close this panel`">
					{{ shortcutLabel }}
				</kbd>
				<N8nIconButton
					variant="ghost"
					icon="x"
					size="small"
					aria-label="Close prototype parameters"
					@click="panelOpen = false"
				/>
			</header>

			<div :class="$style.body">
				<ParamField v-for="def in paramDefs" :key="def.id" :def="def" />
				<PrototypeDataSection />
			</div>

			<footer :class="$style.footer">
				<N8nButton
					variant="ghost"
					size="small"
					data-test-id="proto-reset"
					@click="resetProtoParams"
				>
					Reset parameters
				</N8nButton>
				<N8nButton
					variant="solid"
					size="small"
					:icon="copied ? 'check' : 'link'"
					data-test-id="proto-copy-link"
					@click="copyShareLink"
				>
					{{ copied ? 'Copied' : 'Copy link' }}
				</N8nButton>
				<span :class="$style.srOnly" role="status">{{ copied ? 'Link copied' : '' }}</span>
			</footer>
		</aside>
	</Transition>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/utils' as utils;

.panel {
	--proto-panel--inset: var(--spacing--2xs);

	position: fixed;
	inset-block: var(--proto-panel--inset);
	inset-inline-end: var(--proto-panel--inset);
	z-index: calc(var(--modals--z, 2000) + 50);
	display: flex;
	width: 360px;
	max-width: calc(100vw - 2 * var(--proto-panel--inset));
	flex-direction: column;
	overflow: hidden;
	border-radius: var(--radius--md);
	background-color: var(--background--surface);
	box-shadow: var(--shadow--outline), var(--shadow--xl);
	color: var(--text-color);
	font-family: var(--font-family);
	overscroll-behavior: contain;

	&:focus {
		outline: none;
	}
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--xs) var(--spacing--xs) var(--spacing--sm);
	border-bottom: var(--border);
}

.headerText {
	display: flex;
	flex: 1;
	min-width: 0;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.kbd {
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border: var(--border);
	border-radius: var(--radius--3xs);
	background-color: var(--background--subtle);
	color: var(--text-color--subtle);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--3xs);
	white-space: nowrap;
}

.body {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--md);
	overflow-y: auto;
	padding: var(--spacing--sm);
	scrollbar-width: thin;
}

.footer {
	display: flex;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-top: var(--border);
}

.srOnly {
	@include utils.utils-sr-only;
}

/* Enter and exit share one curve. The panel moves a short, fixed distance. */
.transition {
	transition:
		opacity var(--duration--snappy) var(--easing--ease-out-quint),
		transform var(--duration--snappy) var(--easing--ease-out-quint);
}

.away {
	opacity: 0;
	transform: translateX(var(--spacing--sm));
}

@media (prefers-reduced-motion: reduce) {
	.transition {
		transition: opacity var(--duration--snappy) var(--easing--ease-out-quint);
	}

	.away {
		transform: none;
	}
}
</style>
