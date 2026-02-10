<script setup lang="ts">
import { N8nText, N8nLink } from '@n8n/design-system';
import type { SecurityFinding } from '../scanner/types';
import SecuritySeverityTag from './SecuritySeverityTag.vue';

defineOptions({ name: 'SecurityFindingCard' });

const props = defineProps<{
	finding: SecurityFinding;
}>();

const emit = defineEmits<{
	navigate: [nodeName: string];
}>();

function onNavigate() {
	emit('navigate', props.finding.nodeName);
}
</script>

<template>
	<div :class="$style.card" data-test-id="security-finding-card">
		<div :class="$style.header">
			<N8nText tag="span" size="small" bold :class="$style.title">
				{{ finding.title }}
			</N8nText>
			<SecuritySeverityTag :severity="finding.severity" />
		</div>

		<N8nText tag="p" size="small" color="text-base" :class="$style.description">
			{{ finding.description }}
		</N8nText>

		<div :class="$style.footer">
			<N8nLink :class="$style.nodeLink" size="small" @click="onNavigate">
				{{ finding.nodeName }}
				<span :class="$style.arrow">&rarr;</span>
			</N8nLink>

			<N8nText
				v-if="finding.parameterPath"
				tag="span"
				size="small"
				color="text-light"
				:class="$style.paramPath"
			>
				{{ finding.parameterPath }}
			</N8nText>
		</div>

		<N8nText
			v-if="finding.matchedValue"
			tag="code"
			size="small"
			color="text-light"
			:class="$style.matchedValue"
		>
			{{ finding.matchedValue }}
		</N8nText>
	</div>
</template>

<style module>
.card {
	padding: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--color--background);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	transition: border-color 0.15s ease;
}

.card:hover {
	border-color: var(--color--foreground--shade-1);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}

.title {
	flex: 1;
	min-width: 0;
}

.description {
	margin: 0;
	line-height: var(--line-height--xl);
}

.footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}

.nodeLink {
	cursor: pointer;
	font-weight: var(--font-weight--bold);
}

.arrow {
	margin-left: var(--spacing--4xs);
}

.paramPath {
	font-family: monospace;
	font-size: var(--font-size--3xs);
}

.matchedValue {
	display: block;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	background-color: var(--color--foreground--tint-2);
	border-radius: var(--radius--sm);
	font-family: monospace;
	font-size: var(--font-size--2xs);
	word-break: break-all;
}
</style>
