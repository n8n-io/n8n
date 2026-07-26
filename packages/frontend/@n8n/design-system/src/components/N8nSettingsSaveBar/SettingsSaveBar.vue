<script setup lang="ts">
import { useEventListener } from '@vueuse/core';

import N8nButton from '../N8nButton';
import N8nIcon from '../N8nIcon';
import N8nText from '../N8nText';

export interface SettingsSaveBarProps {
	/** Controls show/hide. Animates a slide-up on appear and a slide-down on disappear. */
	visible?: boolean;
	/**
	 * Status message shown next to the warning icon. Always a single line — overflow truncates
	 * with an ellipsis. Prefer the default copy; override only when the page has a real reason to.
	 */
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
	 * Floats the bar 24px above the bottom of the scrollport while there is more content below
	 * the fold; once the user reaches the end of the page (or the page is shorter than the
	 * scrollport) the bar settles into its natural in-flow position after the last settings row.
	 * Contract: render the bar as the last child of the settings content column — plain
	 * `position: sticky` does the rest, no host wiring needed.
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
					<N8nText size="medium" color="text-dark" :class="$style.statusMessage">
						{{ message }}
					</N8nText>
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
	 * Bar width = the settings content column (its container) + side padding and border on each
	 * side (Figma 5991:7910: 720px column + 2*12px padding). Sizing off the container instead of
	 * a fixed token means the CONTENT box always equals the column exactly: the status icon's
	 * left edge sits on the settings rows' left edge and the Save button's right edge on their
	 * right edge, while the bar surface overhangs the column by its own padding (+1px border,
	 * so the inner edges land precisely under border-box sizing). The negative inline margins
	 * cancel the overhang in layout, keeping the bar centered on the column with no host wiring.
	 * Render the bar inside the settings content column (e.g. as the last child of
	 * N8nSettingsLayout's content) — on narrower viewports it shrinks with the column.
	 *
	 * `!important` so a higher-specificity host `margin` reset can't defeat the overhang: e.g.
	 * Storybook's `#storybook-root > * { margin: ... }` (specificity 1,1,1) would otherwise beat
	 * this class (0,1,0) and re-align the bar flush with the column.
	 */
	--n8n-settings-save-bar--padding-inline: var(--spacing--xs);
	--n8n-settings-save-bar--overhang: calc(
		var(--n8n-settings-save-bar--padding-inline) + var(--border-width, 1px)
	);
	width: calc(100% + 2 * var(--n8n-settings-save-bar--overhang));
	margin-inline: calc(-1 * var(--n8n-settings-save-bar--overhang)) !important;
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
	 * Native sticky mechanics carry the whole behavior (see the `floating` prop docs): while the
	 * bar's natural position is below the fold it floats 24px above the scrollport bottom, and
	 * when the user scrolls to the end of the page — or the page is shorter than the scrollport —
	 * it docks into flow after the last settings row. The top margin is the docked bar's gap from
	 * that row.
	 */
	margin-block-start: var(--spacing--lg);
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

/* The bar is always one line tall: the status message never wraps, it truncates. */
.statusMessage {
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
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
