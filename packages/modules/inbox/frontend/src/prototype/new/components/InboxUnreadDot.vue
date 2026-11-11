<script setup lang="ts">
import { useI18n } from '@n8n/i18n';

const i18n = useI18n();
</script>

<template>
	<span
		:class="$style.dot"
		role="img"
		:aria-label="i18n.baseText('inbox.prototype.unread')"
		data-test-id="inbox-unread-dot"
	/>
</template>

<style module lang="scss">
// The blue of the master list dot. A row can set a halo to keep the dot visible on a tint.
.dot {
	flex-shrink: 0;
	width: var(--font-size--3xs);
	height: var(--font-size--3xs);
	border-radius: 50%;
	background-color: var(--color--blue-500);
	box-shadow: 0 0 0 var(--unread-dot--halo-width, 0) var(--unread-dot--halo-color, transparent);
}
</style>
