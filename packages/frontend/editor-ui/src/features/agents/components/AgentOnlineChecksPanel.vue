<script setup lang="ts">
/**
 * Spike: checks generated from the agent's own definition, run over its recent
 * real sessions. Shows only what needs a look, failures first, each with the
 * session and message it points at. Nothing is stored: a reload starts empty.
 */
import { computed, ref, watch } from 'vue';
import { N8nButton, N8nCallout, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

import { runOnlineChecks } from '../agentEvals.api';
import type { OnlineCheck, OnlineChecksReport, OnlineCheckToolProfile } from '../agentEvals.types';
import { AGENT_SESSION_DETAIL_VIEW } from '../constants';

const props = defineProps<{
	projectId: string;
	agentId: string;
	/** No `agent:update`: running spends the builder's model credits. */
	disabled?: boolean;
}>();

const i18n = useI18n();
const rootStore = useRootStore();

const report = ref<OnlineChecksReport | null>(null);
const running = ref(false);
const errorMessage = ref<string | null>(null);

const STATUS_ORDER = { fail: 0, unsure: 1 } as const;

type Finding = {
	key: string;
	check: OnlineCheck;
	status: 'fail' | 'unsure';
	reason: string;
	threadId: string;
	sessionTitle: string;
	turn?: number;
};

const findings = computed<Finding[]>(() => {
	if (!report.value) return [];
	const checks = new Map(report.value.checks.map((c) => [c.id, c]));
	const found: Finding[] = [];
	for (const session of report.value.sessions) {
		session.verdicts.forEach((verdict, index) => {
			const check = checks.get(verdict.checkId);
			if (!check || (verdict.status !== 'fail' && verdict.status !== 'unsure')) return;
			found.push({
				key: `${session.threadId}:${verdict.checkId}:${index}`,
				check,
				status: verdict.status,
				reason: verdict.reason,
				threadId: session.threadId,
				sessionTitle: session.title,
				turn: verdict.moment ? verdict.moment.turnIndex + 1 : undefined,
			});
		});
	}
	return found.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
});

const runLabel = computed(() => {
	if (running.value) return i18n.baseText('agents.builder.agentEvals.onlineChecks.running');
	if (report.value) return i18n.baseText('agents.builder.agentEvals.onlineChecks.rerun');
	return i18n.baseText('agents.builder.agentEvals.onlineChecks.run');
});

const hasSessions = computed(() => (report.value?.sessions.length ?? 0) > 0);

const onRun = async () => {
	const { projectId, agentId } = props;
	running.value = true;
	errorMessage.value = null;
	try {
		const result = await runOnlineChecks(rootStore.restApiContext, projectId, agentId);
		if (props.agentId === agentId) report.value = result;
	} catch (error) {
		if (props.agentId === agentId) {
			errorMessage.value = error instanceof Error ? error.message : String(error);
		}
	} finally {
		running.value = false;
	}
};

const toolLabel = (tool: OnlineCheckToolProfile) => {
	if (tool.action === 'reads')
		return i18n.baseText('agents.builder.agentEvals.onlineChecks.tool.reads');
	if (tool.requireApproval)
		return i18n.baseText('agents.builder.agentEvals.onlineChecks.tool.asksFirst');
	return i18n.baseText('agents.builder.agentEvals.onlineChecks.tool.acts');
};

const findingPlace = (finding: Finding) => {
	if (finding.turn === undefined) return finding.sessionTitle;
	return i18n.baseText('agents.builder.agentEvals.onlineChecks.turn', {
		interpolate: { session: finding.sessionTitle, turn: String(finding.turn) },
	});
};

const sessionRoute = (threadId: string) => ({
	name: AGENT_SESSION_DETAIL_VIEW,
	params: { projectId: props.projectId, agentId: props.agentId, threadId },
});

watch(
	() => props.agentId,
	() => {
		report.value = null;
		errorMessage.value = null;
	},
);
</script>

<template>
	<section :class="$style.panel" data-testid="agent-online-checks">
		<header :class="$style.header">
			<div :class="$style.heading">
				<N8nText tag="h3" size="large" color="text-dark" bold>
					{{ i18n.baseText('agents.builder.agentEvals.onlineChecks.title') }}
				</N8nText>
				<N8nText size="small" color="text-base">
					{{ i18n.baseText('agents.builder.agentEvals.onlineChecks.description') }}
				</N8nText>
			</div>
			<N8nButton
				:variant="report ? 'outline' : 'solid'"
				size="medium"
				type="button"
				icon="list-checks"
				:loading="running"
				:disabled="disabled || running"
				data-testid="agent-online-checks-run"
				@click="onRun"
			>
				{{ runLabel }}
			</N8nButton>
		</header>

		<N8nCallout v-if="errorMessage" theme="danger" data-testid="agent-online-checks-error">
			{{ i18n.baseText('agents.builder.agentEvals.onlineChecks.error') }}: {{ errorMessage }}
		</N8nCallout>

		<template v-if="report">
			<div :class="$style.stakes" data-testid="agent-online-checks-tools">
				<N8nText size="small" color="text-dark" bold>
					{{ i18n.baseText(`agents.builder.agentEvals.onlineChecks.stakes.${report.stakes}`) }}
				</N8nText>
				<ul :class="$style.tools">
					<li
						v-for="tool in report.tools"
						:key="tool.name"
						:class="[$style.tool, tool.action === 'acts' && $style.toolActs]"
						:title="
							tool.basis === 'default'
								? i18n.baseText('agents.builder.agentEvals.onlineChecks.tool.guess')
								: undefined
						"
					>
						<span :class="$style.toolName">{{ tool.name }}</span>
						<span :class="$style.toolAction">{{ toolLabel(tool) }}</span>
					</li>
				</ul>
			</div>

			<N8nText
				v-if="!hasSessions"
				size="small"
				color="text-base"
				data-testid="agent-online-checks-no-sessions"
			>
				{{ i18n.baseText('agents.builder.agentEvals.onlineChecks.noSessions') }}
			</N8nText>

			<div v-else-if="findings.length" :class="$style.findings">
				<N8nText size="small" color="text-dark" bold>
					{{ i18n.baseText('agents.builder.agentEvals.onlineChecks.needsALook') }}
				</N8nText>
				<article
					v-for="finding in findings"
					:key="finding.key"
					:class="[$style.finding, finding.status === 'fail' ? $style.fail : $style.unsure]"
					data-testid="agent-online-check-finding"
				>
					<div :class="$style.findingTop">
						<N8nIcon
							:icon="finding.status === 'fail' ? 'circle-x' : 'circle-help'"
							size="small"
							:class="$style.findingIcon"
						/>
						<N8nText size="small" :class="$style.findingStatus">
							{{ i18n.baseText(`agents.builder.agentEvals.onlineChecks.status.${finding.status}`) }}
						</N8nText>
					</div>
					<N8nText tag="p" size="medium" color="text-dark" bold :class="$style.question">
						{{ finding.check.question }}
					</N8nText>
					<N8nText tag="p" size="small" color="text-base" :class="$style.reason">
						{{ finding.reason }}
					</N8nText>
					<div :class="$style.findingFooter">
						<N8nText size="xsmall" color="text-light">{{ findingPlace(finding) }}</N8nText>
						<RouterLink :to="sessionRoute(finding.threadId)" :class="$style.link">
							{{ i18n.baseText('agents.builder.agentEvals.onlineChecks.openSession') }}
						</RouterLink>
					</div>
				</article>
			</div>

			<N8nText v-else size="small" color="text-base" data-testid="agent-online-checks-clear">
				{{ i18n.baseText('agents.builder.agentEvals.onlineChecks.clear') }}
			</N8nText>

			<details :class="$style.checks">
				<summary>
					<N8nText size="small" color="text-dark" bold>
						{{ i18n.baseText('agents.builder.agentEvals.onlineChecks.checksTitle') }}
					</N8nText>
				</summary>
				<ul :class="$style.checkList">
					<li v-for="check in report.checks" :key="check.id" :class="$style.checkItem">
						<N8nText size="xsmall" color="text-light">
							{{ i18n.baseText(`agents.builder.agentEvals.onlineChecks.kind.${check.kind}`) }}
						</N8nText>
						<N8nText size="small" color="text-dark">{{ check.question }}</N8nText>
						<N8nText
							v-if="check.source.quote"
							size="xsmall"
							color="text-base"
							:class="$style.quote"
						>
							“{{ check.source.quote }}”
						</N8nText>
					</li>
				</ul>
			</details>
		</template>
	</section>
</template>

<style lang="scss" module>
.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
	box-sizing: border-box;
	padding: var(--spacing--md);
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--radius);
}

.header {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.heading {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
	flex: 1 1 16rem;
}

.stakes {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.tools {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--3xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.tool {
	display: inline-flex;
	align-items: baseline;
	gap: var(--spacing--3xs);
	max-width: 100%;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--radius);
	background-color: var(--background--subtle);
	font-size: var(--font-size--2xs);
	color: var(--color--text);
}

.toolActs {
	background-color: var(--background--active);
}

.toolName {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-family: var(--font-family--monospace);
}

.toolAction {
	color: var(--text-color--subtler);
	white-space: nowrap;
}

.findings {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.finding {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--sm);
	border: var(--border-width) var(--border-style) var(--border-color);
	border-left-width: var(--spacing--5xs);
	border-radius: var(--radius);
}

.fail {
	border-left-color: var(--color--danger);
}

.unsure {
	border-left-color: var(--color--warning);
}

.findingTop {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.fail .findingIcon,
.fail .findingStatus {
	color: var(--color--danger);
}

.unsure .findingIcon,
.unsure .findingStatus {
	color: var(--color--warning);
}

.question,
.reason {
	margin: 0;
	overflow-wrap: anywhere;
}

.findingFooter {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}

.link {
	font-size: var(--font-size--2xs);
	color: var(--color--primary);
	text-decoration: none;

	&:hover {
		text-decoration: underline;
	}
}

.checks summary {
	cursor: pointer;
}

.checkList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	margin: var(--spacing--xs) 0 0;
	padding: 0;
	list-style: none;
}

.checkItem {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.quote {
	font-style: italic;
	overflow-wrap: anywhere;
}
</style>
