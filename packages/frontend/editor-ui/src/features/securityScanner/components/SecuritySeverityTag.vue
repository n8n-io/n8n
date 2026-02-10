<script setup lang="ts">
import { N8nTag } from '@n8n/design-system';
import { computed, useCssModule } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import type { SecuritySeverity } from '../scanner/types';

const $style = useCssModule();
const i18n = useI18n();

defineOptions({ name: 'SecuritySeverityTag' });

const props = defineProps<{
	severity: SecuritySeverity;
}>();

const label = computed(() =>
	i18n.baseText(`securityScanner.severity.${props.severity}` as BaseTextKey),
);

const tagClass = computed(() => {
	const classMap: Record<SecuritySeverity, string> = {
		critical: $style.TagCritical,
		warning: $style.TagWarning,
		info: $style.TagInfo,
	};
	return classMap[props.severity];
});
</script>

<template>
	<N8nTag :text="label" :clickable="false" :class="tagClass" />
</template>

<style module>
.TagCritical {
	color: var(--color--danger);
	background-color: light-dark(var(--color--neutral-white), var(--color--foreground--tint-1));
	border: var(--border-width) var(--border-style) light-dark(var(--color--neutral-300), var(--color--foreground));
}

.TagWarning {
	color: var(--color--warning--shade-1);
	background-color: light-dark(var(--color--neutral-white), var(--color--foreground--tint-1));
	border: var(--border-width) var(--border-style) light-dark(var(--color--neutral-300), var(--color--foreground));
}

.TagInfo {
	color: light-dark(var(--color--neutral-600), var(--color--text--tint-1));
	background-color: light-dark(var(--color--neutral-white), var(--color--foreground--tint-1));
	border: var(--border-width) var(--border-style) light-dark(var(--color--neutral-300), var(--color--foreground));
}
</style>
