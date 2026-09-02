<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';

const i18n = useI18n();
const settingsStore = useSettingsStore();
</script>

<template>
	<div
		v-if="settingsStore.isE2ETestMode"
		:class="$style.marker"
		data-test-id="e2e-test-mode-marker"
	>
		<span :class="$style.pill" :title="i18n.baseText('e2eTestMode.markerTooltip')">
			{{ i18n.baseText('e2eTestMode.marker') }}
		</span>
	</div>
</template>

<style lang="scss" module>
.marker {
	position: absolute;
	inset: 0;
	pointer-events: none;
	z-index: var(--e2e-test-mode-marker--z);
	outline: 3px solid var(--color--danger);
	outline-offset: -3px;
}

// Top-center is the only edge that stays clear of app chrome on every view;
// the bottom-right corner collides with the canvas logs-panel controls.
.pill {
	position: absolute;
	top: 0;
	left: 50%;
	transform: translateX(-50%);
	padding: var(--spacing--4xs);
	border-radius: 0 0 var(--radius--3xs) var(--radius--3xs);
	background-color: var(--color--danger);
	color: var(--color--text--tint-3);
	font-size: var(--font-size--2xs);
	line-height: 1;
}
</style>
