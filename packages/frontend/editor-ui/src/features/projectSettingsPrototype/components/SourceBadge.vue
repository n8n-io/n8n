<script setup lang="ts">
import { N8nIcon, N8nTooltip } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import type { Source } from '../state/resolve';

/**
 * Where a project's value comes from. Every setting that exists at both
 * levels shows one, so the three states read the same on every page.
 */
defineProps<{ source: Source }>();

const LABELS: Record<Source, string> = {
	instance: 'Follows instance',
	project: 'Set in this project',
	locked: 'Set by instance',
};

const HINTS: Record<Source, string> = {
	instance: 'This project uses the instance setting. It can set its own.',
	project: 'This project set its own, in place of the instance setting.',
	locked: "Instance admins set this. A project can't change it.",
};

const ICONS: Record<Source, IconName> = {
	instance: 'globe',
	project: 'layers',
	locked: 'lock',
};
</script>

<template>
	<N8nTooltip :content="HINTS[source]" placement="top">
		<span :class="[$style.badge, $style[source]]" data-test-id="proto-source-badge">
			<N8nIcon :icon="ICONS[source]" size="xsmall" />
			{{ LABELS[source] }}
		</span>
	</N8nTooltip>
</template>

<style lang="scss" module>
.badge {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	height: var(--spacing--md);
	padding: 0 var(--spacing--2xs);
	border-radius: var(--radius--full);
	background-color: var(--background--subtle);
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	line-height: 1;
	white-space: nowrap;
}

.project {
	background-color: var(--background--brand--subtle, var(--background--subtle));
	color: var(--text-color);
}
</style>
