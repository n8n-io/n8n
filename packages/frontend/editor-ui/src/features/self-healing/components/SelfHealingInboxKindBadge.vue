<script setup lang="ts">
import { N8nBadge, N8nIcon, type IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { SelfHealingInboxKind } from '../selfHealing.types';

/** Names the kind of assistant inbox item: a fix to review, a task for the user, or a report. */
const props = defineProps<{
	kind: SelfHealingInboxKind;
}>();

const i18n = useI18n();

const icon = computed<IconName>(() => {
	switch (props.kind) {
		case 'needs_you':
			return 'user-round';
		case 'could_not_fix':
			return 'circle-x';
		default:
			return 'sparkles';
	}
});

const label = computed(() => i18n.baseText(`selfHealing.inbox.kind.${props.kind}`));
</script>

<template>
	<N8nBadge
		theme="tertiary"
		:show-border="false"
		:class="[$style.badge, $style[kind]]"
		:data-kind="kind"
		data-test-id="self-healing-inbox-kind"
	>
		<span :class="$style.content">
			<N8nIcon :icon="icon" size="small" />
			<span>{{ label }}</span>
		</span>
	</N8nBadge>
</template>

<style lang="scss" module>
.badge {
	flex-shrink: 0;
}

.content {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	white-space: nowrap;
}

.fix {
	color: var(--color--secondary);
}

.needs_you {
	color: var(--color--warning);
}

.could_not_fix {
	color: var(--color--text);
}
</style>
