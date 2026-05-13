<script lang="ts" setup>
import type { IncChecklistItem, IncPhase } from '@n8n/api-types';
import { N8nCallout, N8nCard, N8nIcon, N8nText } from '@n8n/design-system';
import { computed } from 'vue';

import { useInstanceAiIncrementalStore } from '../instanceAiIncremental.store';

const props = defineProps<{ threadId: string }>();

const store = useInstanceAiIncrementalStore();
const state = computed(() => store.get(props.threadId));

const items = computed<IncChecklistItem[]>(() => state.value.checklist?.items ?? []);
const phase = computed<IncPhase>(() => state.value.phase);
const phaseMessage = computed(() => state.value.phaseMessage);
const verifier = computed(() => state.value.verifier);

const counts = computed(() => {
	const total = items.value.length;
	const done = items.value.filter((i) => i.status === 'done').length;
	return { done, total };
});

const phaseLabels: Record<IncPhase, string> = {
	idle: 'Idle',
	intake: 'Clarifying scope',
	planning: 'Drafting plan',
	'awaiting-plan-approval': 'Awaiting your approval',
	building: 'Building',
	verifying: 'Verifying',
	done: 'Done',
	blocked: 'Blocked',
};

const phaseTone: Record<IncPhase, 'info' | 'success' | 'danger' | 'warning' | 'secondary'> = {
	idle: 'secondary',
	intake: 'info',
	planning: 'info',
	'awaiting-plan-approval': 'warning',
	building: 'info',
	verifying: 'info',
	done: 'success',
	blocked: 'danger',
};

type IconKey = 'circle' | 'loader-circle' | 'circle-check' | 'circle-alert' | 'circle-x';
const statusIcon: Record<IncChecklistItem['status'], IconKey> = {
	pending: 'circle',
	in_progress: 'loader-circle',
	done: 'circle-check',
	needs_user: 'circle-alert',
	failed: 'circle-x',
	skipped: 'circle',
};

const statusColorClass = (status: IncChecklistItem['status']): string => `icon-${status}`;

const verifierTheme: Record<
	NonNullable<typeof verifier.value>['verdict'],
	'success' | 'warning' | 'danger'
> = {
	verified: 'success',
	needs_changes: 'warning',
	failed: 'danger',
};
</script>

<template>
	<N8nCard v-if="phase !== 'idle'" :class="$style.panel">
		<header :class="$style.header">
			<div :class="$style.phaseRow">
				<N8nIcon
					:icon="phase === 'done' ? 'circle-check' : 'loader-circle'"
					:class="[$style.phaseIcon, $style[`tone-${phaseTone[phase]}`]]"
					:spin="phase !== 'done' && phase !== 'blocked'"
					size="small"
				/>
				<N8nText :bold="true" size="small">{{ phaseLabels[phase] }}</N8nText>
				<N8nText v-if="counts.total > 0" size="xsmall" color="text-light" :class="$style.counts">
					{{ counts.done }} / {{ counts.total }}
				</N8nText>
			</div>
			<N8nText v-if="phaseMessage" size="xsmall" color="text-light">
				{{ phaseMessage }}
			</N8nText>
		</header>

		<ol v-if="items.length" :class="$style.items">
			<li
				v-for="item in items"
				:key="item.id"
				:class="[$style.item, $style[`status-${item.status}`]]"
			>
				<N8nIcon
					:icon="statusIcon[item.status]"
					:spin="item.status === 'in_progress'"
					size="small"
					:class="[$style.statusIcon, $style[statusColorClass(item.status)]]"
				/>
				<div :class="$style.body">
					<div :class="$style.titleRow">
						<N8nText :bold="true" size="small">{{ item.title }}</N8nText>
						<span
							v-if="item.confidence"
							:class="[$style.confidence, $style[`confidence-${item.confidence}`]]"
						>
							{{ item.confidence }}
						</span>
					</div>
					<N8nText size="xsmall" color="text-base">{{ item.intent }}</N8nText>
					<N8nText v-if="item.note" size="xsmall" color="text-light" :class="$style.note">
						{{ item.note }}
					</N8nText>
					<N8nText v-if="item.verifierNote" size="xsmall" :class="$style.verifierNote">
						Verifier: {{ item.verifierNote }}
					</N8nText>
				</div>
			</li>
		</ol>

		<N8nCallout v-if="verifier" :theme="verifierTheme[verifier.verdict]" :class="$style.verifier">
			<N8nText :bold="true" size="small">
				Verifier · {{ verifier.verdict.replace('_', ' ') }}
			</N8nText>
			<N8nText size="xsmall" tag="p" :class="$style.verifierSummary">
				{{ verifier.summary }}
			</N8nText>
			<ul v-if="verifier.issues.length" :class="$style.verifierIssues">
				<li v-for="(issue, idx) in verifier.issues" :key="idx">
					<N8nText size="xsmall">
						<strong>{{ issue.severity }}:</strong>
						{{ issue.problem }}
						<span v-if="issue.nodeName"> (node: {{ issue.nodeName }})</span>
					</N8nText>
				</li>
			</ul>
		</N8nCallout>
	</N8nCard>
</template>

<style lang="scss" module>
.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	margin-top: var(--spacing--xs);
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.phaseRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.counts {
	margin-left: auto;
	font-variant-numeric: tabular-nums;
}

.phaseIcon {
	&.tone-success {
		color: var(--icon-color--success);
	}
	&.tone-info {
		color: var(--color--primary);
	}
	&.tone-warning {
		color: var(--icon-color--warning);
	}
	&.tone-danger {
		color: var(--icon-color--danger);
	}
	&.tone-secondary {
		color: var(--color--text--tint-1);
	}
}

.items {
	list-style: none;
	padding: 0;
	margin: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.item {
	display: flex;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs);
	border-radius: var(--border-radius);
	transition: background-color 0.2s ease;
}

.status-in_progress {
	background: var(--color--background--light-3);
}
.status-failed {
	background: var(--color--background--light-2);
}
.status-done .body :first-child {
	opacity: 0.7;
}

.statusIcon {
	flex-shrink: 0;
	margin-top: 2px;
}
.icon-pending {
	color: var(--color--text--tint-2);
}
.icon-in_progress {
	color: var(--color--primary);
}
.icon-done {
	color: var(--icon-color--success);
}
.icon-failed {
	color: var(--icon-color--danger);
}
.icon-needs_user {
	color: var(--icon-color--warning);
}
.icon-skipped {
	color: var(--color--text--tint-2);
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	flex: 1;
	min-width: 0;
}

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.confidence {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	text-transform: uppercase;
	letter-spacing: 0.4px;
	padding: 0 var(--spacing--4xs);
	border-radius: var(--border-radius);
	line-height: 1.4;
}
.confidence-high {
	color: var(--text-color--success);
	background: var(--color--green-100);
}
.confidence-medium {
	color: var(--text-color--warning);
	background: var(--color--yellow-100);
}
.confidence-low {
	color: var(--text-color--danger);
	background: var(--color--red-100);
}

.note {
	font-style: italic;
}

.verifierNote {
	color: var(--text-color--danger);
}

.verifier {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.verifierSummary {
	margin: 0;
}

.verifierIssues {
	list-style: disc;
	padding-left: var(--spacing--sm);
	margin: var(--spacing--4xs) 0 0;
}
</style>
