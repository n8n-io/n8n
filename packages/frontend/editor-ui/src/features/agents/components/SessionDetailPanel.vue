<script lang="ts" setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import VueMarkdown from 'vue-markdown-render';
import {
	N8nButton,
	N8nBadge,
	N8nCallout,
	N8nIconButton,
	N8nText,
	N8nCard,
	N8nCodeBlock,
	N8nIcon,
} from '@n8n/design-system';
import type { IconName } from '@n8n/design-system';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import { VIEWS } from '@/app/constants/navigation';
import { parseIntegrationActionCard } from '@/features/ai/shared/agentsChat/n8nChatInteraction';
import type { ChatMessageAttachment } from '@/features/ai/shared/agentsChat/types';
import AgentChatMessageAttachments from './AgentChatMessageAttachments.vue';
import RichInteractionCard from './RichInteractionCard.vue';
import WorkflowExecutionLogViewer from './WorkflowExecutionLogViewer.vue';
import ToolIoView from './ToolIoView.vue';
import type { TimelineItem } from '../session-timeline.types';
import {
	executionErrorLabel,
	executionErrorMessage,
	hitlRequestLabelKey,
	hitlTimelineName,
	isErroredToolCallTimelineItem,
	isSubAgentTimelineItem,
	linkedToolDisplayName,
	timelineItemErrorMessage,
	timelineItemStatus,
} from '../session-timeline.utils';
import { delegateLabel } from '../utils/delegate-tool';
import { formatToolNameForDisplay, resolveToolNameForDisplay } from '../utils/toolDisplayName';

const i18n = useI18n();
const router = useRouter();

const props = defineProps<{
	item: TimelineItem | null;
	/** Scope for the attachment download URLs on user items. */
	projectId?: string;
	agentId?: string;
}>();

const userAttachments = computed((): ChatMessageAttachment[] => {
	if (props.item?.kind !== 'user' || !props.item.attachments) return [];
	return props.item.attachments.map((attachment) => ({
		fileId: attachment.id,
		fileName: attachment.fileName,
		mimeType: attachment.mimeType,
		sizeBytes: attachment.sizeBytes,
	}));
});
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
			workflowId: props.item.workflowId,
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

/**
 * Card carried by an integration action tool call (any `<platform>_action`),
 * rendered as the interaction preview instead of raw input/output JSON.
 */
const actionCard = computed(() =>
	props.item?.kind === 'tool'
		? parseIntegrationActionCard(ensureParsed(props.item.toolInput))?.card
		: undefined,
);

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

function stringifyJson(value: unknown): string {
	const parsed = ensureParsed(value);
	if (typeof parsed === 'string') return parsed;
	return JSON.stringify(parsed, null, 2) ?? String(parsed);
}

const toolDisplayName = computed((): string => {
	if (
		!props.item ||
		(props.item.kind !== 'tool' &&
			props.item.kind !== 'suspension' &&
			props.item.kind !== 'hitl-response')
	) {
		return '';
	}
	return resolveToolNameForDisplay(props.item.toolName, i18n);
});

const linkedToolName = computed((): string => {
	const item = props.item;
	return item ? linkedToolDisplayName(item, i18n) : '';
});

const hitlRequestContent = computed((): unknown => {
	const item = props.item;
	if (!item || item.kind !== 'suspension') return undefined;
	const request = ensureParsed(item.hitlRequest);
	if (
		item.hitlRequestType === 'approval' &&
		request !== null &&
		typeof request === 'object' &&
		'args' in request
	) {
		return request.args;
	}
	return request;
});

const isSubAgent = computed((): boolean =>
	props.item ? isSubAgentTimelineItem(props.item) : false,
);
const status = computed(() => (props.item ? timelineItemStatus(props.item) : undefined));

/**
 * For an agent (assistant) message the persisted content is the raw response
 * text. When that text is a JSON object/array — i.e. the agent produced
 * structured output — parse it so it can be pretty-printed instead of shown as
 * a raw one-line string. Plain-text answers return `undefined` and keep their
 * markdown rendering.
 */
const agentStructuredContent = computed((): unknown => {
	const item = props.item;
	if (!item || item.kind !== 'agent') return undefined;
	const content = item.content?.trim();
	if (!content || (!content.startsWith('{') && !content.startsWith('['))) return undefined;
	try {
		const parsed: unknown = JSON.parse(content);
		return parsed !== null && typeof parsed === 'object' ? parsed : undefined;
	} catch {
		return undefined;
	}
});

const headerTitle = computed((): string => {
	const item = props.item;
	if (!item) return '';
	if (isSubAgent.value) return delegateLabel(i18n, item.subAgentName ?? '');
	if (item.kind === 'workflow') return item.workflowName ?? formatToolNameForDisplay(item.toolName);
	if (item.kind === 'tool') return toolDisplayName.value;
	if (item.kind === 'node') return item.nodeDisplayName ?? formatToolNameForDisplay(item.toolName);
	if (item.kind === 'user') return i18n.baseText('agentSessions.timeline.user');
	if (item.kind === 'agent') return i18n.baseText('agentSessions.timeline.agent');
	if (item.kind === 'execution-error') return executionErrorLabel(item, i18n);
	if (item.kind === 'suspension') {
		return item.hitlRequestType === 'approval'
			? hitlTimelineName(item, i18n)
			: i18n.baseText(hitlRequestLabelKey(item.hitlRequestType));
	}
	return item.hitlRequestType === 'approval'
		? hitlTimelineName(item, i18n)
		: i18n.baseText('agentSessions.timeline.hitlResponse');
});

const headerIcon = computed((): IconName => {
	const item = props.item;
	if (!item) return 'info';
	if (isSubAgent.value) return 'bot';
	if (item.kind === 'workflow') return 'workflow';
	if (item.kind === 'tool') return 'wrench';
	if (item.kind === 'node') return 'box';
	if (item.kind === 'user') return 'user';
	if (item.kind === 'agent') return 'bot';
	if (item.kind === 'execution-error') return 'circle-x';
	if (item.kind === 'hitl-response') return 'message-square';
	return 'clock';
});

const isFailed = computed((): boolean =>
	props.item ? isErroredToolCallTimelineItem(props.item) : false,
);

/**
 * Error message for a failed tool/workflow/node call. It surfaces a string,
 * nested `toolOutput.error.message`, or MCP `structuredContent.error` / text
 * content when available. Soft-failure payloads are detected in
 * `isErroredToolCallTimelineItem`.
 */
const errorMessage = computed((): string => {
	const item = props.item;
	if (!item || !isFailed.value) return '';
	const prefix = i18n.baseText('agentSessions.timeline.toolError');
	const message = timelineItemErrorMessage(item);
	return message ? `${prefix}: ${message}` : prefix;
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
				<div :class="$style.headerTitle">
					<N8nIcon :icon="headerIcon" :size="16" />
					<N8nText bold>{{ headerTitle }}</N8nText>
					<N8nBadge
						v-if="status"
						:theme="status.theme"
						size="xsmall"
						:data-test-id="
							status.kind === 'hitl-response'
								? 'detail-hitl-response-badge'
								: item.kind === 'execution-error'
									? 'detail-execution-error-badge'
									: 'detail-tool-error-badge'
						"
					>
						{{ i18n.baseText(status.labelKey) }}
					</N8nBadge>
				</div>
				<N8nIconButton
					icon="x"
					variant="ghost"
					data-test-id="detail-close"
					@click="emit('close')"
				/>
			</div>
			<div :class="$style.container">
				<N8nCard>
					<dl v-if="item.timestamp" :class="$style.infoRow">
						<dt :class="$style.label">{{ i18n.baseText('agentSessions.timeline.created') }}</dt>
						<dd :class="$style.value">{{ formatTimestamp(item.timestamp) }}</dd>
					</dl>
					<dl
						v-if="item.kind === 'suspension' || item.kind === 'hitl-response'"
						:class="$style.infoRow"
					>
						<dt :class="$style.label">{{ i18n.baseText('agentSessions.timeline.tool') }}</dt>
						<dd :class="$style.value">{{ linkedToolName }}</dd>
					</dl>
					<div v-if="fullExecutionHref" :class="$style.executionButton">
						<N8nButton
							variant="outline"
							size="small"
							:label="i18n.baseText('agentSessions.workflowLog.openFull')"
							data-test-id="open-full-execution"
							@click="openFullExecution"
						/>
					</div>
				</N8nCard>

				<div :class="$style.output">
					<template v-if="item.kind === 'execution-error'">
						<N8nCallout theme="danger" data-testid="execution-error-callout">
							{{ executionErrorMessage(item, i18n) }}
						</N8nCallout>
					</template>

					<template v-else-if="item.kind === 'suspension'">
						<div data-test-id="hitl-request-details">
							<div :class="$style.label">
								{{ i18n.baseText('agentSessions.timeline.requestDetails') }}
							</div>
							<N8nCodeBlock :code="stringifyJson(hitlRequestContent)" language="json" />
						</div>
					</template>

					<template v-else-if="item.kind === 'hitl-response'">
						<div data-test-id="hitl-response-details">
							<div :class="$style.label">
								{{ i18n.baseText('agentSessions.timeline.response') }}
							</div>
							<N8nCodeBlock :code="stringifyJson(item.hitlResponse)" language="json" />
						</div>
					</template>

					<template v-else-if="item.kind === 'workflow'">
						<N8nCallout
							v-if="isFailed"
							theme="danger"
							data-test-id="workflow-error-callout"
							:class="$style.errorCallout"
						>
							{{ errorMessage }}
						</N8nCallout>
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
						<div v-else-if="item.toolSuccess === undefined" data-test-id="workflow-input">
							<div :class="$style.label">
								{{ i18n.baseText('agentSessions.timeline.input') }}
							</div>
							<N8nCodeBlock
								:code="stringifyJson(item.toolInput)"
								language="json"
								:copyable="false"
							/>
						</div>
						<div v-else data-test-id="wf-error-fallback" :class="$style.errorFallback">
							<div :class="$style.errorBanner">
								{{ i18n.baseText('agentSessions.timeline.workflowError') }}
							</div>
							<N8nCodeBlock :code="stringifyJson(item.toolOutput)" language="json" />
						</div>
					</template>

					<template v-else-if="item.kind === 'tool'">
						<N8nCallout
							v-if="isFailed"
							theme="danger"
							data-test-id="tool-error-callout"
							:class="$style.errorCallout"
						>
							{{ errorMessage }}
						</N8nCallout>
						<template v-if="actionCard">
							<RichInteractionCard :input="actionCard" :output="ensureParsed(item.toolOutput)" />
						</template>
						<template v-else>
							<div>
								<div :class="$style.label">{{ i18n.baseText('agentSessions.timeline.input') }}</div>
								<N8nCodeBlock :code="stringifyJson(item.toolInput)" language="json" />
							</div>
							<div v-if="item.toolOutput !== undefined">
								<div :class="$style.label">
									{{ i18n.baseText('agentSessions.timeline.output') }}
								</div>
								<N8nCodeBlock :code="stringifyJson(item.toolOutput)" language="json" />
							</div>
						</template>
					</template>

					<template v-else-if="item.kind === 'node'">
						<N8nCallout v-if="errorMessage" theme="danger" data-test-id="node-error-callout">
							{{ errorMessage }}
						</N8nCallout>
						<ToolIoView
							:name="(item.nodeDisplayName ?? formatToolNameForDisplay(item.toolName)) || 'node'"
							:input="item.toolInput"
							:output="item.toolOutput"
							:node-parameters="item.nodeParameters"
							:success="item.toolOutcome ? item.toolOutcome !== 'error' : item.toolSuccess"
						/>
					</template>

					<template v-else-if="item.kind === 'agent' && agentStructuredContent !== undefined">
						<N8nCodeBlock :code="stringifyJson(agentStructuredContent)" language="json" />
					</template>

					<template v-else-if="item.kind === 'user' || item.kind === 'agent'">
						<AgentChatMessageAttachments
							v-if="userAttachments.length > 0 && projectId && agentId"
							:attachments="userAttachments"
							:project-id="projectId"
							:agent-id="agentId"
						/>
						<VueMarkdown :source="item.content ?? ''" :class="$style.markdown" />
					</template>
				</div>
			</div>
		</template>

		<div v-else :class="$style.empty">{{ i18n.baseText('agentSessions.timeline.selectItem') }}</div>
	</div>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins' as ds-mixins;

.panel {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	background-color: var(--background--surface);
	border-bottom: var(--border);
	flex-shrink: 0;
	height: var(--height--4xl);
}

.headerTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	color: var(--text-color);
}

.headerTitle > span:last-child {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.errorCallout {
	margin-bottom: var(--spacing--2xs);
}

.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
}

.output {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
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
	justify-content: start;
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

.markdown {
	@include ds-mixins.markdown-content;

	color: var(--color--text--shade-1);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);

	> *:last-child {
		margin-bottom: 0;
	}

	> *:first-child {
		margin-top: 0;
	}
}
</style>
