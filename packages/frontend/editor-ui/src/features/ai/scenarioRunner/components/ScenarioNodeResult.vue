<script setup lang="ts">
import type { InstanceAiEvalNodeResult } from '@n8n/api-types';
import { N8nIcon, N8nTag, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

const props = defineProps<{
	nodeName: string;
	result: InstanceAiEvalNodeResult;
}>();

const i18n = useI18n();

const expanded = ref(false);

const modeTheme = computed<'success' | 'warning' | 'info' | 'danger'>(() => {
	switch (props.result.executionMode) {
		case 'mocked':
			return 'success';
		case 'pinned':
			return 'info';
		case 'real':
			return 'warning';
		default:
			return 'info';
	}
});

const modeLabel = computed(() =>
	i18n.baseText(`scenarioRunner.mode.${props.result.executionMode}`),
);

const outputPreview = computed(() => {
	try {
		return JSON.stringify(props.result.output, null, 2);
	} catch {
		return String(props.result.output);
	}
});

const configIssueEntries = computed(() => Object.entries(props.result.configIssues ?? {}));

const hasConfigIssues = computed(() => configIssueEntries.value.length > 0);

const interceptedRequests = computed(() => props.result.interceptedRequests ?? []);
</script>

<template>
	<article :class="$style.card">
		<button
			type="button"
			:class="$style.header"
			:aria-expanded="expanded"
			@click="expanded = !expanded"
		>
			<N8nIcon :icon="expanded ? 'chevron-down' : 'chevron-right'" size="small" color="text-base" />
			<N8nText bold size="small" :class="$style.name">{{ nodeName }}</N8nText>
			<N8nTag :class="$style.modeTag" :text="modeLabel" :theme="modeTheme" />
			<N8nText
				v-if="interceptedRequests.length > 0"
				size="xsmall"
				color="text-light"
				:class="$style.meta"
			>
				{{
					i18n.baseText('scenarioRunner.result.node.requestCount', {
						interpolate: { count: interceptedRequests.length },
					})
				}}
			</N8nText>
			<N8nIcon
				v-if="hasConfigIssues"
				icon="triangle-alert"
				size="small"
				color="warning"
				:class="$style.warnIcon"
			/>
		</button>

		<div v-if="expanded" :class="$style.body">
			<section v-if="hasConfigIssues" :class="$style.section">
				<N8nText bold size="xsmall" color="text-base">
					{{ i18n.baseText('scenarioRunner.result.node.configIssues') }}
				</N8nText>
				<ul :class="$style.issueList">
					<li v-for="[param, issues] in configIssueEntries" :key="param">
						<N8nText size="xsmall" color="text-base" bold>{{ param }}</N8nText>
						<ul>
							<li v-for="issue in issues" :key="issue">
								<N8nText size="xsmall" color="text-light">{{ issue }}</N8nText>
							</li>
						</ul>
					</li>
				</ul>
			</section>

			<section v-if="interceptedRequests.length > 0" :class="$style.section">
				<N8nText bold size="xsmall" color="text-base">
					{{ i18n.baseText('scenarioRunner.result.node.requestsHeader') }}
				</N8nText>
				<div v-for="(req, idx) in interceptedRequests" :key="idx" :class="$style.request">
					<div :class="$style.requestLine">
						<N8nTag :text="req.method" theme="info" :class="$style.methodTag" />
						<N8nText size="xsmall" color="text-base" :class="$style.url">{{ req.url }}</N8nText>
					</div>
					<pre v-if="req.mockResponse !== undefined" :class="$style.json">{{
						JSON.stringify(req.mockResponse, null, 2)
					}}</pre>
				</div>
			</section>

			<section :class="$style.section">
				<N8nText bold size="xsmall" color="text-base">
					{{ i18n.baseText('scenarioRunner.result.node.outputHeader') }}
					<N8nText
						v-if="result.outputCount !== undefined"
						size="xsmall"
						color="text-light"
						tag="span"
					>
						{{
							i18n.baseText('scenarioRunner.result.node.outputCount', {
								interpolate: { count: result.outputCount },
							})
						}}
					</N8nText>
				</N8nText>
				<pre :class="$style.json">{{ outputPreview }}</pre>
			</section>
		</div>
	</article>
</template>

<style module lang="scss">
.card {
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--color--background);
	overflow: hidden;
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	padding: var(--spacing--2xs) var(--spacing--xs);
	background: none;
	border: none;
	cursor: pointer;
	text-align: left;

	&:hover {
		background-color: var(--color--background--light-2);
	}
}

.name {
	flex: 0 1 auto;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.modeTag {
	flex-shrink: 0;
}

.meta {
	flex-shrink: 0;
}

.warnIcon {
	margin-left: auto;
	flex-shrink: 0;
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs);
	border-top: var(--border);
	background-color: var(--color--background--light-2);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.issueList {
	list-style: none;
	padding: 0;
	margin: 0;

	& > li {
		margin-bottom: var(--spacing--3xs);
	}

	& ul {
		list-style: disc;
		padding-left: var(--spacing--sm);
		margin: var(--spacing--5xs) 0 0 0;
	}
}

.request {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius--sm);
	background-color: var(--color--background);
}

.requestLine {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.methodTag {
	flex-shrink: 0;
}

.url {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-family: monospace;
}

.json {
	font-family: monospace;
	font-size: var(--font-size--3xs);
	line-height: var(--line-height--md);
	margin: 0;
	padding: var(--spacing--2xs);
	background-color: var(--color--background--shade-1);
	border-radius: var(--radius--sm);
	max-height: 240px;
	overflow: auto;
	white-space: pre-wrap;
	word-break: break-word;
	color: var(--color--text);
}
</style>
