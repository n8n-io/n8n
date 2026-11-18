<script setup lang="ts">
import type { DocPageKind } from '@n8n/api-types';
import { N8nIcon, type IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

defineProps<{ kind: DocPageKind }>();

const i18n = useI18n();

const KIND_ICON: Record<DocPageKind, IconName> = {
	api: 'webhook',
	schedule: 'clock',
	event: 'zap',
	agent: 'bot',
};
</script>

<template>
	<span :class="[$style.kind, $style[kind]]" :data-testid="`doc-kind-badge-${kind}`">
		<N8nIcon :icon="KIND_ICON[kind]" size="small" />
		{{ i18n.baseText(`docPages.kind.${kind}`) }}
	</span>
</template>

<style lang="scss" module>
// One hue for each kind. The tint and the text color mix from it, so both themes work.
.api {
	--doc-kind--hue: var(--color--blue-500);
}
.schedule {
	--doc-kind--hue: var(--color--orange-500);
}
.event {
	--doc-kind--hue: var(--color--purple-500);
}
.agent {
	--doc-kind--hue: var(--color--green-500);
}

.kind {
	display: inline-flex;
	align-items: center;
	flex-shrink: 0;
	background: color-mix(in srgb, var(--doc-kind--hue) 14%, transparent);
	color: color-mix(in srgb, var(--doc-kind--hue) 70%, var(--text-color));
	gap: var(--spacing--4xs);
	height: var(--height--xs);
	padding-inline: var(--spacing--3xs) var(--spacing--2xs);
	border-radius: var(--radius--2xs);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	line-height: 1;
	white-space: nowrap;
}
</style>
