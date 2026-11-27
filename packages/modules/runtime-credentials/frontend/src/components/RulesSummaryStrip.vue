<script setup lang="ts">
import { N8nHeading, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { RuntimeCredentialRule } from '../runtime-credentials.api';

const { rules } = defineProps<{ rules: RuntimeCredentialRule[] }>();

const i18n = useI18n();

const stats = computed(() => [
	{
		id: 'rules',
		value: rules.length,
		label: i18n.baseText('runtimeCredentials.page.stats.rules'),
	},
	{
		id: 'credential-types',
		value: new Set(rules.map((rule) => rule.credentialType)).size,
		label: i18n.baseText('runtimeCredentials.page.stats.credentialTypes'),
	},
	{
		id: 'environment',
		value: rules.filter((rule) => rule.source === 'environment').length,
		label: i18n.baseText('runtimeCredentials.page.stats.environment'),
	},
]);
</script>

<template>
	<dl :class="$style.strip" data-test-id="runtime-rules-summary">
		<div v-for="stat in stats" :key="stat.id" :class="$style.stat">
			<N8nText tag="dt" size="small" color="text-light">{{ stat.label }}</N8nText>
			<N8nHeading tag="dd" size="xlarge" :data-test-id="`runtime-rules-stat-${stat.id}`">
				{{ stat.value }}
			</N8nHeading>
		</div>
	</dl>
</template>

<style lang="scss" module>
.strip {
	display: flex;
	flex-wrap: wrap;
	margin: 0;
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--background--surface);
	overflow: hidden;
}

.stat {
	display: flex;
	flex: 1 1 0;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: var(--spacing--4xl);
	padding: var(--spacing--xs) var(--spacing--sm);

	& + & {
		border-inline-start: var(--border);
	}

	/* A stat that wraps to a new row has no neighbor on its left. */
	@media (width < 30rem) {
		& + & {
			border-inline-start: none;
			border-block-start: var(--border);
		}
	}

	dd {
		margin: 0;
	}
}
</style>
