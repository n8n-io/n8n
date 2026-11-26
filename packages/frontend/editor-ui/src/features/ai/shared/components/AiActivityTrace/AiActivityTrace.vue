<script setup lang="ts" generic="TTool">
import {
	N8nAiActivityStep,
	N8nAiActivityStepGroup,
	N8nAiActivityStepResultSection,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { isRecord } from '@n8n/utils/is-record';
import { computed, type FunctionalComponent } from 'vue';
import ChatMarkdown from '../ChatMarkdown/ChatMarkdown.vue';
import ToolResultJson from '../ToolResult/ToolResultJson.vue';
import ToolResultRenderer from '../ToolResult/ToolResultRenderer.vue';
import AiActivityThinkingStep from './AiActivityThinkingStep.vue';
import { groupActivityItems, hasToolBody, isToolGroupLoading } from './groupActivityItems';
import type {
	AiActivityItem,
	AiActivityRenderItem,
	AiActivityThinkingItem,
	AiActivityToolItem,
} from './types';

const props = defineProps<{
	items: Array<AiActivityItem<TTool>>;
}>();

/**
 * Hooks for content that only one feature has. The trace renders all
 * shared presentation itself.
 */
defineSlots<{
	/** Shows before the segments of a thinking step. */
	'thinking-prepend'?: (props: { item: AiActivityThinkingItem }) => unknown;
	/** Shows before the row of a tool call. */
	'before-tool'?: (props: { item: AiActivityToolItem<TTool> }) => unknown;
	/** Shows after the row of a tool call. */
	'after-tool'?: (props: { item: AiActivityToolItem<TTool> }) => unknown;
	/** Error callout of a tool call with `customErrorCallout`. */
	'tool-error-callout'?: (props: { item: AiActivityToolItem<TTool> }) => unknown;
}>();

const i18n = useI18n();

const renderItems = computed(() => groupActivityItems(props.items));

/** Renders the rows of a single call without a group around them. */
const PassThrough: FunctionalComponent = (_, { slots }) => slots.default?.();

function toolsOf(item: AiActivityRenderItem<TTool>): Array<AiActivityToolItem<TTool>> {
	if (item.kind === 'tools') return item.items;
	return item.kind === 'tool' ? [item] : [];
}

function wrapperFor(item: AiActivityRenderItem<TTool>) {
	return item.kind === 'tools' ? N8nAiActivityStepGroup : PassThrough;
}

function wrapperProps(item: AiActivityRenderItem<TTool>) {
	if (item.kind !== 'tools') return {};
	return {
		label: i18n.baseText('instanceAi.activitySummary.toolCalls', {
			adjustToNumber: item.items.length,
			interpolate: { count: String(item.items.length) },
		}),
		size: 'medium',
		loading: isToolGroupLoading(item),
	};
}

function toolArgs(tool: AiActivityToolItem<TTool>): Record<string, unknown> | undefined {
	return isRecord(tool.input) ? tool.input : undefined;
}
</script>

<template>
	<div :class="$style.trace" data-test-id="ai-activity-trace">
		<template v-for="item in renderItems" :key="item.id">
			<AiActivityThinkingStep
				v-if="item.kind === 'thinking'"
				:segments="item.segments"
				:active="item.active"
				:awaiting-input="item.awaitingInput"
				:duration-sec="item.durationSec"
				:activity-label="item.activityLabel"
				:idle-label="item.idleLabel"
				:settled-label="item.settledLabel"
				:test-id="item.testId"
			>
				<template v-if="$slots['thinking-prepend']" #prepend>
					<slot name="thinking-prepend" :item="item" />
				</template>
			</AiActivityThinkingStep>

			<component
				:is="wrapperFor(item)"
				v-else-if="item.kind === 'tool' || item.kind === 'tools'"
				v-bind="wrapperProps(item)"
			>
				<template v-for="tool in toolsOf(item)" :key="tool.id">
					<slot name="before-tool" :item="tool" />
					<N8nAiActivityStep
						:label="tool.label"
						:loading="tool.loading"
						:error="tool.error"
						:error-icon="tool.errorIcon"
						:hide-error-callout="tool.hideErrorCallout"
						:has-content="tool.hasContent ?? hasToolBody(tool)"
						data-test-id="ai-activity-tool"
					>
						<template v-if="tool.customErrorCallout" #errorCallout>
							<slot name="tool-error-callout" :item="tool" />
						</template>
						<div :class="$style.toolBody">
							<AiActivityTrace
								v-if="tool.children?.length"
								:items="tool.children"
								:class="$style.children"
								data-test-id="ai-activity-tool-children"
							/>
							<N8nAiActivityStepResultSection v-if="tool.details">
								<ChatMarkdown :content="tool.details" data-test-id="ai-activity-tool-details" />
							</N8nAiActivityStepResultSection>
							<ToolResultJson v-if="tool.input !== undefined" :value="tool.input" />
							<component
								:is="tool.outputView.component"
								v-if="tool.outputView"
								v-bind="tool.outputView.props"
							/>
							<ToolResultRenderer
								v-else-if="tool.output !== undefined"
								:result="tool.output"
								:tool-name="tool.toolName"
								:tool-args="toolArgs(tool)"
							/>
						</div>
					</N8nAiActivityStep>
					<slot name="after-tool" :item="tool" />
				</template>
			</component>

			<N8nAiActivityStep
				v-else-if="item.kind === 'step'"
				:label="item.label"
				:loading="item.loading"
				:error="item.error"
				:has-content="Boolean(item.description)"
				:data-test-id="item.testId"
			>
				<N8nText tag="div" size="small" color="text-base" :class="$style.description">
					{{ item.description }}
				</N8nText>
			</N8nAiActivityStep>
		</template>
	</div>
</template>

<style module lang="scss">
.trace {
	display: flex;
	flex-direction: column;
	gap: var(--n8n-ai-activity-step--gap, 0);
}

.toolBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--xs);
	min-width: 0;
}

.children {
	margin-left: var(--spacing--xs);
}

.description {
	display: block;
	margin: var(--spacing--3xs) 0 var(--spacing--2xs);
	max-width: 95%;
}
</style>
