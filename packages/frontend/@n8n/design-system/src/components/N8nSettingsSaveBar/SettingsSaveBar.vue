<script setup lang="ts">
import { useEventListener } from '@vueuse/core';

import N8nButton from '../N8nButton';
import N8nIcon from '../N8nIcon';
import N8nText from '../N8nText';

export interface SettingsSaveBarProps {
	/** Controls show/hide. Animates a slide-up on appear and a slide-down on disappear. */
	visible?: boolean;
	/** Status message shown next to the warning icon. */
	message?: string;
	/** Primary button label. */
	saveLabel?: string;
	/** Secondary button label. */
	discardLabel?: string;
	/** Puts the Save button in its loading state while a save is in flight. */
	saving?: boolean;
	/** Disables the Save button (e.g. when the form is invalid). */
	saveDisabled?: boolean;
	/**
	 * Sticks the bar to the bottom of the scrollport so it floats over the settings column.
	 * Contract: render the bar as the last child of a flex-column wrapper with `min-height: 100%`
	 * inside the scroll container (the sticky-footer pattern). The bar carries `margin-top: auto`,
	 * so on short pages it is pushed to the wrapper bottom, where `position: sticky` lifts it to
	 * its usual 24px viewport gap; on long pages the auto margin collapses to zero and the bar
	 * floats over the scrolling content exactly as before.
	 */
	floating?: boolean;
	/** Allow Cmd/Ctrl+S to trigger a save while the bar is visible and enabled. */
	saveShortcut?: boolean;
}

defineOptions({ name: 'N8nSettingsSaveBar' });

const props = withDefaults(defineProps<SettingsSaveBarProps>(), {
	visible: true,
	message: 'Unsaved changes',
	saveLabel: 'Save settings',
	discardLabel: 'Discard changes',
	saving: false,
	saveDisabled: false,
	floating: false,
	saveShortcut: true,
});

const emit = defineEmits<{ save: []; discard: [] }>();

// Cmd/Ctrl+S submits the same way the Save button does. Guarded so it never fires while
// hidden, saving, or disabled. `useEventListener` auto-detaches on unmount.
function onKeydown(event: KeyboardEvent) {
	if (!props.saveShortcut || !props.visible || props.saving || props.saveDisabled) return;
	const isSaveCombo = (event.metaKey || event.ctrlKey) && (event.key === 's' || event.key === 'S');
	if (!isSaveCombo) return;
	event.preventDefault();
	emit('save');
}

useEventListener(window, 'keydown', onKeydown);
</script>

<template>
	<Transition name="n8n-settings-save-bar">
		<div
			v-if="visible"
			:class="[$style.bar, { [$style.floating]: floating }]"
			role="region"
			:aria-label="message"
			aria-live="polite"
			data-test-id="settings-save-bar"
		>
			<div :class="$style.status" data-test-id="settings-save-bar-status">
				<slot>
					<span :class="$style.statusIcon" aria-hidden="true">
						<N8nIcon icon="triangle-alert" size="medium" />
					</span>
					<N8nText size="medium" color="text-dark">{{ message }}</N8nText>
				</slot>
			</div>
			<div :class="$style.actions">
				<slot name="actions">
					<N8nButton
						variant="outline"
						:label="discardLabel"
						:disabled="saving"
						data-test-id="settings-save-bar-discard"
						@click="emit('discard')"
					/>
					<N8nButton
						variant="solid"
						:label="saveLabel"
						:loading="saving"
						:disabled="saveDisabled"
						data-test-id="settings-save-bar-save"
						@click="emit('save')"
					/>
				</slot>
			</div>
		</div>
	</Transition>
</template>

<style lang="scss" module>
/*
 * Reuse the expandable settings row's reveal motion (no DS token equals 350ms and the curve
 * has no token either, so they live here as local constants, mirroring N8nSettingsRow).
 */
$slide-duration: 350ms;
$slide-easing: cubic-bezier(0.32, 0.72, 0, 1);

.bar {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	/*
	 * Bar width = 2 * side padding + the settings row width (--settings-content--max-width):
	 * 2*12px + 720px = 744px (Figma 5991:7910). Both terms reference their tokens — the same
	 * --n8n-settings-save-bar--padding-inline is used by `padding` and `width`, so the bar
	 * outgrows the column by exactly its own padding (inner edges sit on the column edges, give
	 * or take the 1px border under border-box sizing). Falls back to 45rem when the
	 * component-scoped --settings-content--max-width isn't in scope (e.g. when the floating bar is
	 * a sibling of N8nSettingsLayout rather than a descendant; mirrors N8nSettingsPageHeader).
	 * `max-width: 100%` keeps it from overflowing narrower containers.
	 *
	 * `margin-inline: auto` is what centers the bar within its container. It is `!important` so a
	 * higher-specificity host `margin` reset can't pin the bar to the left: e.g. Storybook's
	 * `#storybook-root > * { margin: ... }` (specificity 1,1,1) would otherwise beat this class
	 * (0,1,0) and collapse the auto margins to a fixed value, left-aligning the bar.
	 */
	--n8n-settings-save-bar--padding-inline: var(--spacing--xs);
	width: calc(
		var(--settings-content--max-width, 45rem) + 2 * var(--n8n-settings-save-bar--padding-inline)
	);
	max-width: 100%;
	margin-inline: auto !important;
	box-sizing: border-box;
	padding: var(--spacing--xs) var(--n8n-settings-save-bar--padding-inline);
	background: var(--background--surface);
	border: var(--border-width, 1px) solid var(--border-color--subtle);
	/*
	 * Gently rounded rectangle, not a pill: radius--sm (12px) in the DS3 scale, per design
	 * feedback. Hardcoded because the legacy compat layer (_tokens.legacy.scss) still overrides
	 * --radius--sm to 2px at :root for old --border-radius-small consumers, so the token can't be
	 * used directly yet. Switch to var(--radius--sm) once that legacy override is removed.
	 */
	border-radius: 0.75rem; /* 12px */
	box-shadow: var(--shadow--xl);
}

.floating {
	position: sticky;
	bottom: var(--spacing--lg);
	z-index: 2;
	/*
	 * Sticky-footer half of the floating contract (see the `floating` prop docs). Sticky alone
	 * only LIFTS the bar within its parent's box — on a page shorter than the scrollport the
	 * parent ends right after the content, so the bar would sit in flow instead of at the
	 * viewport bottom. Inside the required flex-column wrapper (min-height: 100%), the auto top
	 * margin absorbs the free space and pushes the bar to the wrapper bottom, where the sticky
	 * `bottom` offset yields the usual 24px gap. On long pages there is no free space (and in
	 * plain block layout `auto` computes to 0), so nothing changes. `!important` for the same
	 * reason as the `margin-inline: auto` above: host margin resets with higher specificity
	 * (e.g. Storybook's `#storybook-root > * { margin: ... }`) must not defeat the auto margin.
	 */
	margin-top: auto !important;
}

/*
 * Status left, actions right — the primary Save sits on the far right, matching the dialog
 * convention (confirm on the right, back/destructive further left). DOM order follows the
 * visual order, so Tab reaches Discard first and Save last.
 */
.actions {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: var(--spacing--2xs);
	flex: 0 0 auto;
}

.status {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.statusIcon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	color: var(--icon-color);
}

/* Slide-up + fade-in on appear, slide-down + fade-out on disappear. */
:global(.n8n-settings-save-bar-enter-active),
:global(.n8n-settings-save-bar-leave-active) {
	transition:
		opacity $slide-duration $slide-easing,
		transform $slide-duration $slide-easing;
	will-change: opacity, transform;

	@media (prefers-reduced-motion: reduce) {
		transition: opacity $slide-duration linear;
		will-change: auto;
	}
}

:global(.n8n-settings-save-bar-enter-from),
:global(.n8n-settings-save-bar-leave-to) {
	opacity: 0;
	transform: translateY(var(--spacing--xl, 2rem));

	@media (prefers-reduced-motion: reduce) {
		transform: none;
	}
}
</style>
