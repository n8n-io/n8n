<script lang="ts" setup>
import {
	type InstanceAiRunDebugStep,
	type InstanceAiRunDebugWorkflowCodeSnapshot,
	parseInputExtras,
	parseMessageBlocks,
	parseOutputDisplayBlocks,
	parseOutputExtras,
	parseSystemPromptForDisplay,
	parseUsageSummary,
} from '@n8n/api-types';
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';
import { mapWorkflowSnapshotsByToolCallId } from '../utils/workflow-code-match';
import InstanceAiDebugJsonPanel from './InstanceAiDebugJsonPanel.vue';
import InstanceAiDebugMessageBody from './InstanceAiDebugMessageBody.vue';

const props = defineProps<{
	input?: Record<string, unknown>;
	output?: Record<string, unknown>;
	runSteps?: InstanceAiRunDebugStep[];
	workflowCode?: InstanceAiRunDebugWorkflowCodeSnapshot[];
}>();

const i18n = useI18n();
const outputSectionRef = ref<HTMLElement | null>(null);

const parsedSystemPrompt = computed(() => parseSystemPromptForDisplay(props.input?.system));
const systemBlocks = computed(() => parsedSystemPrompt.value.systemBlocks);
const systemObservations = computed(() => parsedSystemPrompt.value.observations);
const messageBlocks = computed(() => parseMessageBlocks(props.input?.messages));
const inputExtras = computed(() => parseInputExtras(props.input));
const outputDisplayBlocks = computed(() => parseOutputDisplayBlocks(props.output));
const usageSummary = computed(() => parseUsageSummary(props.output?.usage));
const outputExtras = computed(() => parseOutputExtras(props.output));
const workflowSnapshotsByToolCallId = computed(() =>
	mapWorkflowSnapshotsByToolCallId(props.runSteps ?? [], props.workflowCode ?? []),
);
const finishReason = computed(() =>
	typeof props.output?.finishReason === 'string' ? props.output.finishReason : undefined,
);
const systemCharCount = computed(() =>
	systemBlocks.value.reduce((total, block) => total + block.content.length, 0),
);
const hasInputContent = computed(
	() =>
		systemBlocks.value.length > 0 ||
		Boolean(systemObservations.value) ||
		messageBlocks.value.length > 0 ||
		Boolean(inputExtras.value),
);
const hasOutputContent = computed(
	() =>
		outputDisplayBlocks.value.length > 0 ||
		Boolean(outputExtras.value) ||
		Boolean(usageSummary.value),
);
const showSystemDetails = computed(() => systemBlocks.value.length > 0);

function getCardClass(role: string): string {
	const normalized = role.toLowerCase();
	if (normalized.includes('system')) return 'cardSystem';
	if (normalized === 'reasoning') return 'cardMuted';
	if (normalized === 'user') return 'cardUser';
	if (normalized === 'assistant') return 'cardAssistant';
	if (normalized === 'tool') return 'cardTool';
	return 'cardMuted';
}

function formatCharCount(count: number): string {
	return i18n.baseText('instanceAi.debug.runDebug.charCount', {
		interpolate: { count: count.toLocaleString() },
	});
}

function scrollToOutput(container: HTMLElement) {
	if (!outputSectionRef.value) {
		container.scrollTo({ top: 0, behavior: 'smooth' });
		return;
	}

	const containerTop = container.getBoundingClientRect().top;
	const sectionTop = outputSectionRef.value.getBoundingClientRect().top;

	container.scrollTo({
		top: container.scrollTop + (sectionTop - containerTop),
		behavior: 'smooth',
	});
}

defineExpose({ scrollToOutput });
</script>

<template>
	<div :class="$style.root">
		<section v-if="input" :class="$style.section">
			<N8nText tag="h3" size="small" bold color="text-dark" :class="$style.sectionTitle">
				{{ i18n.baseText('instanceAi.debug.runDebug.input') }}
			</N8nText>

			<div v-if="hasInputContent" :class="$style.stack">
				<details
					v-if="showSystemDetails"
					:class="[$style.card, $style.cardSystem, $style.expandableCard]"
				>
					<summary :class="$style.cardHeader">
						<span :class="$style.roleLabel">system</span>
						<span :class="$style.headerMeta">
							<span :class="$style.metaLabel">{{ formatCharCount(systemCharCount) }}</span>
						</span>
					</summary>
					<div :class="$style.cardBody">
						<template v-for="(block, index) in systemBlocks" :key="`system-${index}`">
							<InstanceAiDebugMessageBody
								v-if="block.segments?.length"
								:segments="block.segments"
								:workflow-snapshots-by-tool-call-id="workflowSnapshotsByToolCallId"
							/>
							<p v-else :class="$style.text">{{ block.content }}</p>
							<InstanceAiDebugJsonPanel
								v-if="block.metadata"
								:value="block.metadata"
								:label="i18n.baseText('instanceAi.debug.runDebug.metadata')"
							/>
						</template>
					</div>
				</details>

				<article v-if="systemObservations" :class="[$style.card, $style.cardObservations]">
					<div :class="$style.cardHeader">
						<span :class="$style.roleLabel">observations</span>
					</div>
					<div :class="$style.cardBody">
						<p :class="$style.text">{{ systemObservations }}</p>
					</div>
				</article>

				<template v-if="messageBlocks.length > 0">
					<N8nText size="small" color="text-light" :class="$style.stackLabel">
						{{ i18n.baseText('instanceAi.debug.runDebug.messages') }}
					</N8nText>
					<article
						v-for="(block, index) in messageBlocks"
						:key="`message-${index}`"
						:class="[$style.card, $style[getCardClass(block.role)]]"
					>
						<div :class="$style.cardHeader">
							<span :class="$style.roleLabel">{{ block.role }}</span>
						</div>
						<div :class="$style.cardBody">
							<InstanceAiDebugMessageBody
								v-if="block.segments?.length"
								:segments="block.segments"
								:workflow-snapshots-by-tool-call-id="workflowSnapshotsByToolCallId"
							/>
							<p v-else :class="$style.text">{{ block.content }}</p>
							<InstanceAiDebugJsonPanel
								v-if="block.metadata"
								:value="block.metadata"
								:label="i18n.baseText('instanceAi.debug.runDebug.metadata')"
							/>
						</div>
					</article>
				</template>

				<InstanceAiDebugJsonPanel
					v-if="inputExtras"
					:value="inputExtras"
					:label="i18n.baseText('instanceAi.debug.runDebug.inputExtras')"
				/>
			</div>
		</section>

		<section
			v-if="output"
			ref="outputSectionRef"
			data-test-id="instance-ai-llm-step-output"
			:class="$style.section"
		>
			<div :class="$style.sectionHeader">
				<N8nText tag="h3" size="small" bold color="text-dark" :class="$style.sectionTitle">
					{{ i18n.baseText('instanceAi.debug.runDebug.output') }}
				</N8nText>
				<div v-if="finishReason || usageSummary" :class="$style.statsBar">
					<span v-if="finishReason" :class="$style.statChip">{{ finishReason }}</span>
					<N8nText v-if="usageSummary" size="small" color="text-light">
						{{ usageSummary.label }}
					</N8nText>
				</div>
			</div>

			<div v-if="hasOutputContent" :class="$style.stack">
				<article
					v-for="(block, index) in outputDisplayBlocks"
					:key="`output-${index}`"
					:class="[$style.card, $style[getCardClass(block.role)]]"
				>
					<div :class="$style.cardHeader">
						<span :class="$style.roleLabel">{{ block.role }}</span>
					</div>
					<div :class="$style.cardBody">
						<InstanceAiDebugMessageBody
							v-if="block.segments?.length"
							:segments="block.segments"
							:workflow-snapshots-by-tool-call-id="workflowSnapshotsByToolCallId"
						/>
						<p v-else :class="$style.text">{{ block.content }}</p>
						<InstanceAiDebugJsonPanel
							v-if="block.metadata"
							:value="block.metadata"
							:label="i18n.baseText('instanceAi.debug.runDebug.metadata')"
						/>
					</div>
				</article>

				<InstanceAiDebugJsonPanel
					v-if="usageSummary"
					:value="usageSummary.metadata"
					:label="i18n.baseText('instanceAi.debug.runDebug.usage')"
				/>

				<InstanceAiDebugJsonPanel
					v-if="outputExtras"
					:value="outputExtras"
					:label="i18n.baseText('instanceAi.debug.runDebug.outputMetadata')"
				/>
			</div>
		</section>

		<div v-if="!input && !output" :class="$style.emptyState">
			{{ i18n.baseText('instanceAi.debug.runDebug.noStepDetail') }}
		</div>
	</div>
</template>

<style lang="scss" module>
.root {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.section + .section {
	padding-top: var(--spacing--2xs);
	border-top: var(--border);
}

.sectionHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.sectionTitle {
	margin: 0;
}

.statsBar {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.statChip {
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border-radius: var(--radius--xl);
	background: var(--color--background--shade-1);
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
}

.stack {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.stackLabel {
	margin-top: var(--spacing--5xs);
}

.card {
	border-radius: var(--radius);
	background: var(--background--surface);
	border: 1px solid var(--color--foreground--tint-2);
	overflow: hidden;
}

.expandableCard {
	.cardHeader {
		cursor: pointer;
		list-style: none;

		&::-webkit-details-marker {
			display: none;
		}
	}

	.headerMeta::after {
		content: '▸';
		margin-left: var(--spacing--3xs);
		color: var(--color--text--tint-1);
		transition: transform var(--duration--fast) ease;
	}

	&[open] .headerMeta::after {
		transform: rotate(90deg);
	}
}

.cardSystem {
	border-left: 2px solid color-mix(in srgb, var(--color--warning) 45%, transparent);
}

.cardObservations {
	border-left: 2px solid color-mix(in srgb, var(--color--primary) 35%, transparent);
}

.cardUser {
	border-left: 2px solid color-mix(in srgb, var(--color--success) 45%, transparent);
}

.cardAssistant {
	border-left: 2px solid color-mix(in srgb, var(--color--primary) 45%, transparent);
}

.cardTool {
	border-left: 2px solid var(--color--foreground--tint-1);
}

.cardMuted {
	border-left: 2px solid var(--color--foreground--tint-2);
}

.cardHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	background: var(--color--background--shade-1);
}

.headerMeta {
	display: inline-flex;
	align-items: center;
}

.cardBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--2xs);
}

.roleLabel {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	color: var(--color--text);
	text-transform: lowercase;
}

.metaLabel {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
}

.text {
	margin: 0;
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);
	white-space: pre-wrap;
	word-break: break-word;
	color: var(--color--text);
}

.emptyState {
	padding: var(--spacing--md);
	text-align: center;
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}
</style>
