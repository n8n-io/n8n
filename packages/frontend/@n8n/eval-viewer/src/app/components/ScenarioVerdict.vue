<script setup lang="ts">
import { N8nBadge, N8nIcon, N8nText } from '@n8n/design-system';

import type { ScenarioRun } from '../../schema';
import ValueBlock from './ValueBlock.vue';

/** One scenario run: verdict, judge reasoning and root cause, errors, data setup and success criteria. */
defineProps<{ run: ScenarioRun; detailed: boolean }>();
const emit = defineEmits<{ open: [] }>();
</script>

<template>
	<article
		:class="[$style.card, run.passed ? $style.pass : $style.fail]"
		data-test-id="scenario-verdict"
	>
		<header :class="$style.header">
			<N8nIcon :icon="run.passed ? 'check' : 'x'" :color="run.passed ? 'success' : 'danger'" />
			<button v-if="!detailed" type="button" :class="$style.title" @click="emit('open')">
				<N8nText bold>{{ run.title }}</N8nText>
			</button>
			<N8nText v-else bold>{{ run.passed ? 'Passed' : 'Failed' }}</N8nText>
			<N8nText size="small" color="text-light">{{ run.slug }}</N8nText>
			<N8nBadge v-if="run.failureCategory" :variant="run.passed ? 'subtle' : 'danger'">
				{{ run.failureCategory }}
			</N8nBadge>
			<N8nBadge v-if="run.attribution && run.attribution !== run.failureCategory" variant="subtle">
				{{ run.attribution }}
			</N8nBadge>
		</header>
		<dl :class="$style.fields">
			<template v-if="run.rootCause">
				<dt><N8nText size="xsmall" bold color="text-light">ROOT CAUSE (judge)</N8nText></dt>
				<dd>
					<N8nText tag="p" size="small" :class="$style.prewrap">{{ run.rootCause }}</N8nText>
				</dd>
			</template>
			<template v-if="run.reasoning && (detailed || !run.rootCause)">
				<dt><N8nText size="xsmall" bold color="text-light">REASONING (judge)</N8nText></dt>
				<dd>
					<N8nText tag="p" size="small" :class="$style.prewrap">{{ run.reasoning }}</N8nText>
				</dd>
			</template>
			<template v-if="run.execErrors.length > 0">
				<dt><N8nText size="xsmall" bold color="text-light">EXECUTION ERRORS</N8nText></dt>
				<dd><ValueBlock :value="run.execErrors" nested /></dd>
			</template>
			<template v-if="run.dataSetup">
				<dt><N8nText size="xsmall" bold color="text-light">DATA SETUP</N8nText></dt>
				<dd>
					<N8nText tag="p" size="small" :class="$style.prewrap">{{ run.dataSetup }}</N8nText>
				</dd>
			</template>
			<template v-if="run.successCriteria">
				<dt><N8nText size="xsmall" bold color="text-light">SUCCESS CRITERIA</N8nText></dt>
				<dd>
					<N8nText tag="p" size="small" :class="$style.prewrap">{{ run.successCriteria }}</N8nText>
				</dd>
			</template>
		</dl>
	</article>
</template>

<style module>
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border: var(--border);
	border-left-width: var(--spacing--4xs);
	border-radius: var(--radius--md);
}

.pass {
	border-left-color: var(--border-color--success);
}

.fail {
	border-left-color: var(--border-color--danger);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-wrap: wrap;
}

.title {
	padding: 0;
	border: none;
	background: transparent;
	color: inherit;
	text-align: left;
	cursor: pointer;
}

@media (hover: hover) {
	.title:hover {
		text-decoration: underline;
	}
}

.fields {
	margin: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.fields dd {
	margin: 0 0 var(--spacing--2xs);
}

.prewrap {
	margin: 0;
	white-space: pre-wrap;
	word-break: break-word;
}
</style>
