<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import VueMarkdown from 'vue-markdown-render';
import { N8nIcon } from '@n8n/design-system';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import RichInteractionCard from './RichInteractionCard.vue';
import WorkflowExecutionLogViewer from './WorkflowExecutionLogViewer.vue';
import type { TimelineItem } from '../session-timeline.types';

const i18n = useI18n();

const props = defineProps<{ item: TimelineItem | null; agentName?: string }>();
const emit = defineEmits<{ close: [] }>();

function formatTimestamp(ts: number): string {
	if (!ts) return '';
	const { date, time } = convertToDisplayDate(new Date(ts).toISOString());
	return `${date} ${time}`;
}

function ensureParsed(value: unknown): unknown {
	if (typeof value === 'string') {
		try {
			return JSON.parse(value);
		} catch {
			return value;
		}
	}
	return value;
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function highlightJson(value: unknown, indent = 0): string {
	const pad = '  '.repeat(indent);
	const padInner = '  '.repeat(indent + 1);
	if (value === null) return '<span class="json-bool">null</span>';
	if (typeof value === 'boolean') return `<span class="json-bool">${value}</span>`;
	if (typeof value === 'number') return `<span class="json-number">${value}</span>`;
	if (typeof value === 'string')
		return `<span class="json-string">&quot;${escapeHtml(value)}&quot;</span>`;
	if (Array.isArray(value)) {
		if (value.length === 0) return '[]';
		const items = value.map((v) => `${padInner}${highlightJson(v, indent + 1)}`);
		return `[\n${items.join(',\n')}\n${pad}]`;
	}
	if (typeof value === 'object') {
		const entries = Object.entries(value as Record<string, unknown>);
		if (entries.length === 0) return '{}';
		const lines = entries.map(
			([k, v]) =>
				`${padInner}<span class="json-key">&quot;${escapeHtml(k)}&quot;</span>: ${highlightJson(v, indent + 1)}`,
		);
		return `{\n${lines.join(',\n')}\n${pad}}`;
	}
	return escapeHtml(String(value));
}

const workflowFormOutput = computed((): { formUrl: string; message: string } | null => {
	const o = props.item?.toolOutput;
	if (typeof o !== 'object' || o === null) return null;
	const rec = o as Record<string, unknown>;
	if (typeof rec.formUrl !== 'string') return null;
	return {
		formUrl: rec.formUrl,
		message: typeof rec.message === 'string' ? rec.message : '',
	};
});
</script>

<template>
	<div :class="$style.panel">
		<template v-if="item">
			<div :class="$style.header">
				<span>
					<template v-if="item.kind === 'workflow'">{{
						item.workflowName ?? item.toolName
					}}</template>
					<template v-else-if="item.kind === 'tool'">
						<N8nIcon icon="wrench" :size="14" />
						<span>{{ item.toolName }}</span>
					</template>
					<template v-else-if="item.kind === 'working-memory'">{{
						i18n.baseText('agentSessions.timeline.memory')
					}}</template>
					<template v-else-if="item.kind === 'user'">{{
						i18n.baseText('agentSessions.timeline.user')
					}}</template>
					<template v-else-if="item.kind === 'agent'">{{
						agentName ?? i18n.baseText('agentSessions.timeline.assistant')
					}}</template>
					<template v-else>{{ i18n.baseText('agentSessions.timeline.suspended') }}</template>
				</span>
				<button
					type="button"
					data-test-id="detail-close"
					:class="$style.close"
					@click="emit('close')"
				>
					<N8nIcon icon="x" :size="14" />
				</button>
			</div>

			<div :class="$style.info">
				<div v-if="item.timestamp">
					<span :class="$style.label">{{ i18n.baseText('agentSessions.timeline.created') }}</span>
					<span>{{ formatTimestamp(item.timestamp) }}</span>
				</div>
			</div>

			<template v-if="item.kind === 'workflow'">
				<WorkflowExecutionLogViewer
					v-if="item.workflowExecutionId && item.workflowId"
					:workflow-id="item.workflowId"
					:workflow-execution-id="item.workflowExecutionId"
				/>
				<div
					v-else-if="item.workflowTriggerType === 'form' && workflowFormOutput"
					data-test-id="wf-form-card"
					:class="$style.formCard"
				>
					<p>{{ workflowFormOutput.message }}</p>
					<a
						:href="workflowFormOutput.formUrl"
						target="_blank"
						rel="noopener"
						:class="$style.formLink"
						>{{ i18n.baseText('agentSessions.timeline.openForm') }}</a
					>
				</div>
				<div v-else data-test-id="wf-error-fallback" :class="$style.errorFallback">
					<div :class="$style.errorBanner">
						{{ i18n.baseText('agentSessions.timeline.workflowError') }}
					</div>
					<!-- eslint-disable vue/no-v-html -->
					<pre :class="$style.json" v-html="highlightJson(ensureParsed(item.toolOutput))" />
					<!-- eslint-enable vue/no-v-html -->
				</div>
			</template>

			<template v-else-if="item.kind === 'tool'">
				<template v-if="item.toolName === 'rich_interaction'">
					<RichInteractionCard :input="item.toolInput" :output="item.toolOutput" />
				</template>
				<template v-else>
					<div>
						<div :class="$style.label">{{ i18n.baseText('agentSessions.timeline.input') }}</div>
						<!-- eslint-disable vue/no-v-html -->
						<pre :class="$style.json" v-html="highlightJson(ensureParsed(item.toolInput))" />
						<!-- eslint-enable vue/no-v-html -->
					</div>
					<div>
						<div :class="$style.label">{{ i18n.baseText('agentSessions.timeline.output') }}</div>
						<!-- eslint-disable vue/no-v-html -->
						<pre :class="$style.json" v-html="highlightJson(ensureParsed(item.toolOutput))" />
						<!-- eslint-enable vue/no-v-html -->
					</div>
				</template>
			</template>

			<template v-else-if="item.kind === 'working-memory'">
				<pre :class="$style.json">{{ item.content }}</pre>
			</template>

			<template v-else-if="item.kind === 'user' || item.kind === 'agent'">
				<VueMarkdown :source="item.content ?? ''" class="agent-markdown" />
			</template>
		</template>

		<div v-else :class="$style.empty">{{ i18n.baseText('agentSessions.timeline.selectItem') }}</div>
	</div>
</template>

<style module lang="scss">
.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	overflow-y: auto;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
}

.close {
	background: none;
	border: none;
	cursor: pointer;
	color: var(--color--text--tint-1);
	padding: var(--spacing--4xs);
}

.info {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding-bottom: var(--spacing--sm);
	border-bottom: var(--border);
}

.label {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.json {
	font-family: monospace;
	font-size: var(--font-size--2xs);
	white-space: pre;
	background-color: var(--color--foreground--tint-2);
	padding: var(--spacing--2xs);
	border-radius: var(--radius);
	overflow-x: auto;
}

.formCard {
	border: var(--border);
	padding: var(--spacing--sm);
	border-radius: var(--radius);
}

.formLink {
	color: var(--color--primary);
	text-decoration: underline;
}

.errorFallback {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.errorBanner {
	background-color: var(--color--danger--tint-4);
	color: var(--color--danger);
	padding: var(--spacing--2xs);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
}

.empty {
	color: var(--color--text--tint-1);
	text-align: center;
	padding: var(--spacing--sm);
}
</style>
