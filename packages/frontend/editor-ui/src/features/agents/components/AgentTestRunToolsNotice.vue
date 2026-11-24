<script setup lang="ts">
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed, ref, useId } from 'vue';

import type { BlockedReason, ToolTestCapability, ToolTestKind } from '../testRunTools.types';

const props = withDefaults(
	defineProps<{
		/** Every tool of the Agent with its testability. Simulated tools are not listed. */
		tools: ToolTestCapability[];
		/** Rows shown before `Show more`. */
		collapsedLimit?: number;
		/** Heading level that fits where the notice is mounted. */
		headingTag?: 'h2' | 'h3' | 'h4';
	}>(),
	{ collapsedLimit: 3, headingTag: 'h3' },
);

const i18n = useI18n();

const KIND_KEYS: Record<ToolTestKind, BaseTextKey> = {
	node: 'agents.testRun.tools.kind.node',
	workflow: 'agents.testRun.tools.kind.workflow',
	custom: 'agents.testRun.tools.kind.custom',
	mcp: 'agents.testRun.tools.kind.mcp',
	integration: 'agents.testRun.tools.kind.integration',
	web_search: 'agents.testRun.tools.kind.webSearch',
	other: 'agents.testRun.tools.kind.other',
};

/** The wire value may be newer than this client. */
function kindKey(kind: string): BaseTextKey {
	return Object.hasOwn(KIND_KEYS, kind) ? KIND_KEYS[kind as ToolTestKind] : KIND_KEYS.other;
}

const REASON_KEYS: Record<BlockedReason, BaseTextKey> = {
	not_simulatable: 'agents.testRun.tools.reason.notSimulatable',
	unsupported_by_simulator: 'agents.testRun.tools.reason.unsupportedBySimulator',
	simulator_unavailable: 'agents.testRun.tools.reason.simulatorUnavailable',
};

const expanded = ref(false);
const listId = useId();

/**
 * Every tool that is not simulated. A testability this client doesn't know may come from a
 * newer server, so it is listed here too and the warning never disappears.
 */
const blockedTools = computed(() => props.tools.filter((tool) => tool.testability !== 'simulated'));
const visibleTools = computed(() =>
	expanded.value ? blockedTools.value : blockedTools.value.slice(0, props.collapsedLimit),
);
const hiddenCount = computed(() => blockedTools.value.length - visibleTools.value.length);
const canCollapse = computed(
	() => expanded.value && blockedTools.value.length > props.collapsedLimit,
);

/** The reason may be missing or newer than this client, so check it at runtime. */
function reasonText(tool: ToolTestCapability): string {
	const reason: unknown = 'reason' in tool ? tool.reason : undefined;
	return i18n.baseText(
		typeof reason === 'string' && Object.hasOwn(REASON_KEYS, reason)
			? REASON_KEYS[reason as BlockedReason]
			: 'agents.testRun.tools.reason.blocked',
	);
}

function detailText(tool: ToolTestCapability): string | undefined {
	return 'detail' in tool ? tool.detail : undefined;
}
</script>

<template>
	<section
		v-if="blockedTools.length > 0"
		:class="$style.notice"
		:aria-label="i18n.baseText('agents.testRun.tools.ariaLabel')"
		data-testid="agent-test-run-tools"
	>
		<div :class="$style.group" data-testid="agent-test-run-tools-blocked">
			<div :class="$style.header">
				<N8nIcon icon="ban" size="small" :class="$style.headerIcon" aria-hidden="true" />
				<div :class="$style.headerText">
					<N8nText :tag="props.headingTag" size="small" bold :class="$style.title">
						{{ i18n.baseText('agents.testRun.tools.blocked.title') }}
					</N8nText>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('agents.testRun.tools.blocked.description') }}
					</N8nText>
				</div>
			</div>

			<ul :id="listId" :class="$style.list">
				<li
					v-for="tool in visibleTools"
					:key="tool.toolName"
					:class="$style.row"
					data-testid="agent-test-run-tool"
				>
					<div :class="$style.nameLine">
						<span
							:class="$style.name"
							:title="tool.toolName"
							data-testid="agent-test-run-tool-name"
							>{{ tool.toolName }}</span
						>
						<span :class="$style.kind">{{ i18n.baseText(kindKey(tool.kind)) }}</span>
					</div>
					<N8nText size="small" color="text-light" data-testid="agent-test-run-tool-reason">
						{{ reasonText(tool) }}
					</N8nText>
					<N8nText
						v-if="detailText(tool)"
						size="xsmall"
						color="text-light"
						:class="$style.detail"
						data-testid="agent-test-run-tool-detail"
					>
						{{ detailText(tool) }}
					</N8nText>
				</li>
			</ul>

			<N8nButton
				v-if="hiddenCount > 0 || canCollapse"
				variant="ghost"
				size="small"
				:class="$style.toggle"
				:aria-expanded="expanded"
				:aria-controls="listId"
				data-testid="agent-test-run-tools-toggle"
				@click="expanded = !expanded"
			>
				{{
					hiddenCount > 0
						? i18n.baseText('agents.testRun.tools.showMore', {
								interpolate: { count: String(hiddenCount) },
							})
						: i18n.baseText('agents.testRun.tools.showLess')
				}}
			</N8nButton>
		</div>
	</section>
</template>

<style module lang="scss">
.notice {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
	min-width: 0;
	box-sizing: border-box;
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--background--surface);
	text-align: left;
}

.group {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.header {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.headerIcon {
	flex-shrink: 0;
	margin-top: var(--spacing--5xs);
	color: var(--text-color--subtle);
}

.headerText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.title {
	margin: 0;
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.row {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-radius: var(--radius);
	background-color: var(--background--subtle);
}

.nameLine {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.name {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	color: var(--text-color);
}

.kind {
	flex-shrink: 0;
	font-size: var(--font-size--3xs);
	color: var(--text-color--subtler);
}

.detail {
	overflow-wrap: anywhere;
}

.toggle {
	align-self: flex-start;
}
</style>
