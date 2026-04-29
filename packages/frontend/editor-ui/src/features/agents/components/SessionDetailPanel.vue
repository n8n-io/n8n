<script lang="ts" setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import VueMarkdown from 'vue-markdown-render';
import { N8nButton, N8nIconButton } from '@n8n/design-system';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import { VIEWS } from '@/app/constants/navigation';
import RichInteractionCard from './RichInteractionCard.vue';
import WorkflowExecutionLogViewer from './WorkflowExecutionLogViewer.vue';
import ToolIoView from './ToolIoView.vue';
import type { TimelineItem } from '../session-timeline.types';
import { builtinToolLabelKey } from '../session-timeline.utils';

const i18n = useI18n();
const router = useRouter();

const props = defineProps<{ item: TimelineItem | null }>();

const fullExecutionHref = computed((): string => {
	if (
		props.item?.kind !== 'workflow' ||
		!props.item.workflowId ||
		!props.item.workflowExecutionId
	) {
		return '';
	}
	return router.resolve({
		name: VIEWS.EXECUTION_PREVIEW,
		params: {
			name: props.item.workflowId,
			executionId: props.item.workflowExecutionId,
		},
	}).href;
});

function openFullExecution(): void {
	if (fullExecutionHref.value) {
		window.open(fullExecutionHref.value, '_blank', 'noopener');
	}
}
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

const toolDisplayName = computed((): string => {
	if (!props.item || (props.item.kind !== 'tool' && props.item.kind !== 'suspension')) return '';
	const key = builtinToolLabelKey(props.item.toolName, props.item.toolOutput);
	return key ? i18n.baseText(key) : (props.item.toolName ?? '');
});

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
					<template v-else-if="item.kind === 'tool'">{{ toolDisplayName }}</template>
					<template v-else-if="item.kind === 'node'">{{
						item.nodeDisplayName ?? item.toolName
					}}</template>
					<template v-else-if="item.kind === 'working-memory'">{{
						i18n.baseText('agentSessions.timeline.memory')
					}}</template>
					<template v-else-if="item.kind === 'user'">{{
						i18n.baseText('agentSessions.timeline.user')
					}}</template>
					<template v-else-if="item.kind === 'agent'">{{
						i18n.baseText('agentSessions.timeline.agent')
					}}</template>
					<template v-else>{{ i18n.baseText('agentSessions.timeline.suspended') }}</template>
				</span>
				<N8nIconButton
					icon="x"
					variant="ghost"
					size="small"
					data-test-id="detail-close"
					@click="emit('close')"
				/>
			</div>

			<div :class="$style.info">
				<div v-if="item.timestamp" :class="$style.infoRow">
					<span :class="$style.label">{{ i18n.baseText('agentSessions.timeline.created') }}</span>
					<span :class="$style.value">{{ formatTimestamp(item.timestamp) }}</span>
				</div>
				<div :class="$style.executionButton">
					<N8nButton
						v-if="fullExecutionHref"
						variant="outline"
						size="small"
						:label="i18n.baseText('agentSessions.workflowLog.openFull')"
						data-test-id="open-full-execution"
						@click="openFullExecution"
					/>
				</div>
			</div>

			<template v-if="item.kind === 'workflow'">
				<WorkflowExecutionLogViewer
					v-if="item.workflowExecutionId && item.workflowId"
					:key="`${item.workflowId}:${item.workflowExecutionId}`"
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

			<template v-else-if="item.kind === 'node'">
				<ToolIoView
					:name="item.nodeDisplayName ?? item.toolName ?? 'node'"
					:input="item.toolInput"
					:output="item.toolOutput"
					:node-type="item.nodeType"
					:node-type-version="item.nodeTypeVersion"
				/>
			</template>

			<template v-else-if="item.kind === 'working-memory'">
				<pre :class="$style.json">{{ item.content }}</pre>
			</template>

			<template v-else-if="item.kind === 'user' || item.kind === 'agent'">
				<VueMarkdown :source="item.content ?? ''" :class="$style.markdown" />
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

.info {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding-bottom: var(--spacing--sm);
	border-bottom: var(--border);
}

.infoRow {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: var(--spacing--2xs);
}

.label {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.value {
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	font-variant-numeric: tabular-nums;
}

.executionButton {
	padding-top: var(--spacing--xs);
	display: flex;
	justify-content: end;
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

/*
 * Markdown rendering for User/Agent message content. Surrounding global resets
 * zero out list padding, which collapsed nested bullets to the same x-position
 * as their parents — restore sensible spacing and indents for lists, headings,
 * paragraphs, and inline code so multi-level bullet output reads correctly.
 */
.markdown {
	color: inherit;
	font-size: var(--font-size--xs);
	line-height: var(--line-height--xl);

	p,
	ul,
	ol,
	pre,
	blockquote {
		margin: var(--spacing--2xs) 0;

		&:first-child {
			margin-top: 0;
		}

		&:last-child {
			margin-bottom: 0;
		}
	}

	ul,
	ol {
		padding-left: var(--spacing--md);
		list-style-position: outside;
	}

	ul {
		list-style-type: disc;
	}

	ol {
		list-style-type: decimal;
	}

	li {
		margin: var(--spacing--5xs) 0;
	}

	ul ul,
	ol ol,
	ul ol,
	ol ul {
		margin-top: var(--spacing--5xs);
		margin-bottom: 0;
		padding-left: var(--spacing--sm);
	}

	ul ul {
		list-style-type: circle;
	}

	ul ul ul {
		list-style-type: square;
	}

	strong,
	b {
		font-weight: var(--font-weight--bold);
		color: var(--color--text--shade-1);
	}

	a {
		color: var(--color--primary);
		text-decoration: underline;
	}

	code {
		font-family: monospace;
		font-size: var(--font-size--2xs);
		padding: 0 var(--spacing--5xs);
		background-color: var(--color--foreground--tint-2);
		border-radius: var(--radius--sm);
	}

	pre {
		font-family: monospace;
		font-size: var(--font-size--2xs);
		padding: var(--spacing--2xs);
		background-color: var(--color--foreground--tint-2);
		border-radius: var(--radius);
		overflow-x: auto;

		code {
			padding: 0;
			background: none;
		}
	}

	blockquote {
		border-left: 2px solid var(--color--foreground--shade-1);
		padding-left: var(--spacing--2xs);
		color: var(--color--text--tint-1);
	}
}
</style>
