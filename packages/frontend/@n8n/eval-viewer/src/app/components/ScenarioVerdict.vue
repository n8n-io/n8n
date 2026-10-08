<script setup lang="ts">
import { N8nBadge, N8nIcon, N8nText } from '@n8n/design-system';
import { ref } from 'vue';

import type { ScenarioRun } from '../../schema';
import ValueBlock from './ValueBlock.vue';

/** One scenario run: verdict, judge reasoning and root cause, errors, data setup and success criteria. */
defineProps<{ run: ScenarioRun }>();
const open = ref(false);
</script>

<template>
	<article data-test-id="scenario-verdict">
		<button type="button" :class="$style.header" :aria-expanded="open" @click="open = !open">
			<N8nIcon :icon="open ? 'chevron-down' : 'chevron-right'" size="small" />
			<N8nIcon
				:icon="run.passed ? 'check' : 'x'"
				:color="run.passed ? 'success' : 'danger'"
				size="small"
			/>
			<span :class="$style.summary">
				<N8nText size="small">{{ run.title }}</N8nText>
				<N8nText
					v-if="run.rootCause ?? run.reasoning"
					size="xsmall"
					color="text-light"
					:class="$style.oneLine"
				>
					{{ run.rootCause ?? run.reasoning }}
				</N8nText>
			</span>
		</button>
		<div v-if="open" :class="$style.details">
			<div v-if="run.failureCategory || run.attribution" :class="$style.badges">
				<N8nBadge v-if="run.failureCategory" :variant="run.passed ? 'subtle' : 'danger'">
					{{ run.failureCategory }}
				</N8nBadge>
				<N8nBadge
					v-if="run.attribution && run.attribution !== run.failureCategory"
					variant="subtle"
				>
					{{ run.attribution }}
				</N8nBadge>
			</div>
			<dl :class="$style.fields">
				<template v-if="run.rootCause">
					<dt><N8nText size="xsmall" bold color="text-light">ROOT CAUSE (judge)</N8nText></dt>
					<dd>
						<N8nText tag="p" size="small" :class="$style.prewrap">{{ run.rootCause }}</N8nText>
					</dd>
				</template>
				<template v-if="run.reasoning">
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
						<N8nText tag="p" size="small" :class="$style.prewrap">{{
							run.successCriteria
						}}</N8nText>
					</dd>
				</template>
			</dl>
		</div>
	</article>
</template>

<style module>
.header {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	width: 100%;
	padding: 0;
	border: none;
	background: transparent;
	color: inherit;
	text-align: left;
	cursor: pointer;
}

.summary {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-width: 0;
}

.oneLine {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.details {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin: var(--spacing--2xs) 0 0 var(--spacing--lg);
}

.badges {
	display: flex;
	gap: var(--spacing--2xs);
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
