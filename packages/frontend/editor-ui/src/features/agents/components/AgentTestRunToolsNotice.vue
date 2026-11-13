<script setup lang="ts">
import { N8nButton, N8nIcon, N8nText, type IconName } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed, reactive } from 'vue';

import type {
	ToolCallReason,
	ToolTestCapability,
	ToolTestKind,
	ToolTestability,
} from '../testRunTools.types';

type NoticeTestability = Exclude<ToolTestability, 'simulated'>;

const props = withDefaults(
	defineProps<{
		/** Every tool of the Agent with its testability. Simulated tools are not listed. */
		tools: ToolTestCapability[];
		/** Rows shown per group before `Show more`. */
		collapsedLimit?: number;
	}>(),
	{ collapsedLimit: 3 },
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

const REASON_KEYS: Partial<Record<ToolCallReason, BaseTextKey>> = {
	not_simulatable: 'agents.testRun.tools.reason.notSimulatable',
	unsupported_by_simulator: 'agents.testRun.tools.reason.unsupportedBySimulator',
	simulator_unavailable: 'agents.testRun.tools.reason.simulatorUnavailable',
	blocked_by_policy: 'agents.testRun.tools.reason.blockedByPolicy',
	real_read_allowed: 'agents.testRun.tools.reason.realReadAllowed',
};

const GROUPS: Array<{
	testability: NoticeTestability;
	icon: IconName;
	title: BaseTextKey;
	description: BaseTextKey;
	fallbackReason: BaseTextKey;
}> = [
	{
		testability: 'blocked',
		icon: 'ban',
		title: 'agents.testRun.tools.blocked.title',
		description: 'agents.testRun.tools.blocked.description',
		fallbackReason: 'agents.testRun.tools.reason.blocked',
	},
	{
		testability: 'read_for_real',
		icon: 'eye',
		title: 'agents.testRun.tools.readForReal.title',
		description: 'agents.testRun.tools.readForReal.description',
		fallbackReason: 'agents.testRun.tools.reason.realReadAllowed',
	},
];

const expanded = reactive<Record<NoticeTestability, boolean>>({
	blocked: false,
	read_for_real: false,
});

const groups = computed(() =>
	GROUPS.map((group) => {
		const tools = props.tools.filter((tool) => noticeGroup(tool) === group.testability);
		const isExpanded = expanded[group.testability];
		const visibleTools = isExpanded ? tools : tools.slice(0, props.collapsedLimit);
		return {
			...group,
			tools,
			visibleTools,
			hiddenCount: tools.length - visibleTools.length,
			canCollapse: isExpanded && tools.length > props.collapsedLimit,
		};
	}).filter((group) => group.tools.length > 0),
);

/**
 * A testability this client doesn't know may come from a newer server. List it with the
 * blocked tools so the warning never disappears.
 */
function noticeGroup(tool: ToolTestCapability): NoticeTestability | undefined {
	if (tool.testability === 'simulated') return undefined;
	return tool.testability === 'read_for_real' ? 'read_for_real' : 'blocked';
}

function reasonText(tool: ToolTestCapability, fallback: BaseTextKey): string {
	const key =
		tool.reason && Object.hasOwn(REASON_KEYS, tool.reason)
			? (REASON_KEYS[tool.reason] ?? fallback)
			: fallback;
	return i18n.baseText(key);
}

function toggle(testability: NoticeTestability) {
	expanded[testability] = !expanded[testability];
}
</script>

<template>
	<section
		v-if="groups.length > 0"
		:class="$style.notice"
		:aria-label="i18n.baseText('agents.testRun.tools.ariaLabel')"
		data-testid="agent-test-run-tools"
	>
		<div
			v-for="group in groups"
			:key="group.testability"
			:class="$style.group"
			:data-testid="`agent-test-run-tools-${group.testability}`"
		>
			<div :class="$style.header">
				<N8nIcon :icon="group.icon" size="small" :class="$style.headerIcon" aria-hidden="true" />
				<div :class="$style.headerText">
					<N8nText tag="h3" size="small" bold :class="$style.title">
						{{ i18n.baseText(group.title) }}
					</N8nText>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText(group.description) }}
					</N8nText>
				</div>
			</div>

			<ul :class="$style.list">
				<li
					v-for="tool in group.visibleTools"
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
						{{ reasonText(tool, group.fallbackReason) }}
					</N8nText>
					<N8nText
						v-if="tool.detail"
						size="xsmall"
						color="text-light"
						:class="$style.detail"
						data-testid="agent-test-run-tool-detail"
					>
						{{ tool.detail }}
					</N8nText>
				</li>
			</ul>

			<N8nButton
				v-if="group.hiddenCount > 0 || group.canCollapse"
				variant="ghost"
				size="small"
				:class="$style.toggle"
				:aria-expanded="expanded[group.testability]"
				data-testid="agent-test-run-tools-toggle"
				@click="toggle(group.testability)"
			>
				{{
					group.hiddenCount > 0
						? i18n.baseText('agents.testRun.tools.showMore', {
								interpolate: { count: String(group.hiddenCount) },
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

	& + & {
		padding-top: var(--spacing--sm);
		border-top: var(--border);
	}
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
