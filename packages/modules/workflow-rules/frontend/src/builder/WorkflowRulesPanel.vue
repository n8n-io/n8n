<script setup lang="ts">
import { N8nButton, N8nEmptyState, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { RuleFinding } from '@n8n/workflow-rules';
import { computed } from 'vue';

import { ruleSourceText, ruleTitle } from '../rule-text';
import { SETTINGS_RULE_IDS } from '../workflow-rules.constants';
import { useWorkflowRulesStore } from '../workflow-rules.store';

const emit = defineEmits<{
	'select-node': [nodeName: string];
	'open-node': [nodeName: string];
	'open-settings': [];
}>();

const i18n = useI18n();
const store = useWorkflowRulesStore();

const customRules = computed(() => [
	...(store.effectiveRules?.instance.customRules ?? []),
	...(store.effectiveRules?.project?.customRules ?? []),
]);

const visible = (findings: RuleFinding[]) =>
	store.focusedNodeName
		? findings.filter((finding) => finding.nodeName === store.focusedNodeName)
		: findings;

const groups = computed(() =>
	[
		{
			id: 'block',
			title: i18n.baseText('workflowRules.panel.blocking'),
			icon: 'ban' as const,
			findings: visible(store.blockingFindings),
		},
		{
			id: 'warn',
			title: i18n.baseText('workflowRules.panel.warnings'),
			icon: 'triangle-alert' as const,
			findings: visible(store.warningFindings),
		},
		{
			id: 'exempted',
			title: i18n.baseText('workflowRules.panel.exempted'),
			icon: 'shield-check' as const,
			findings: visible(store.findings.filter((finding) => finding.exempted)),
		},
	].filter((group) => group.findings.length > 0),
);

const summary = computed(() => {
	const blocking = store.blockingFindings.length;
	const warnings = store.warningFindings.length;
	if (blocking > 0) {
		return i18n.baseText('workflowRules.panel.summary.blocking', {
			interpolate: { count: blocking },
			adjustToNumber: blocking,
		});
	}
	if (warnings > 0) {
		return i18n.baseText('workflowRules.panel.summary.warnings', {
			interpolate: { count: warnings },
			adjustToNumber: warnings,
		});
	}
	return i18n.baseText('workflowRules.panel.summary.passing');
});

const isSettingsFinding = (finding: RuleFinding) =>
	finding.ruleKind === 'catalogue' && SETTINGS_RULE_IDS.has(finding.ruleId);

const findingKey = (finding: RuleFinding, index: number) =>
	`${finding.ruleId}:${finding.nodeName ?? ''}:${finding.parameterPath ?? ''}:${index}`;
</script>

<template>
	<div :class="$style.panel" data-test-id="workflow-rules-panel">
		<header :class="$style.header">
			<div :class="$style.headerTitle">
				<N8nIcon icon="shield-half" size="medium" />
				<N8nText bold size="medium">{{ i18n.baseText('workflowRules.panel.title') }}</N8nText>
			</div>
			<N8nText
				size="small"
				:color="store.blockingFindings.length > 0 ? 'danger' : 'text-base'"
				data-test-id="workflow-rules-panel-summary"
			>
				{{ summary }}
			</N8nText>
		</header>

		<div v-if="store.focusedNodeName" :class="$style.focus">
			<N8nText size="small">
				{{
					i18n.baseText('workflowRules.panel.focusedNode', {
						interpolate: { node: store.focusedNodeName },
					})
				}}
			</N8nText>
			<N8nButton
				variant="ghost"
				size="small"
				:label="i18n.baseText('workflowRules.panel.showAll')"
				data-test-id="workflow-rules-panel-show-all"
				@click="store.focusedNodeName = null"
			/>
		</div>

		<N8nEmptyState
			v-if="!store.hasRules"
			:icon="{ type: 'icon', value: 'shield-half' }"
			:heading="i18n.baseText('workflowRules.panel.noRules.heading')"
			:description="i18n.baseText('workflowRules.panel.noRules.description')"
			data-test-id="workflow-rules-panel-no-rules"
		/>
		<N8nEmptyState
			v-else-if="store.activeFindings.length === 0 && groups.length === 0"
			:icon="{ type: 'icon', value: 'circle-check' }"
			:heading="i18n.baseText('workflowRules.panel.passing.heading')"
			:description="i18n.baseText('workflowRules.panel.passing.description')"
			data-test-id="workflow-rules-panel-passing"
		/>

		<section
			v-for="group in groups"
			:key="group.id"
			:class="[$style.group, $style[group.id]]"
			:data-test-id="`workflow-rules-group-${group.id}`"
		>
			<div :class="$style.groupTitle">
				<N8nIcon :icon="group.icon" size="small" />
				<N8nText size="small" bold>{{ group.title }}</N8nText>
				<N8nText size="small" color="text-light">{{ group.findings.length }}</N8nText>
			</div>
			<ul :class="$style.list">
				<li
					v-for="(finding, index) in group.findings"
					:key="findingKey(finding, index)"
					:class="$style.finding"
					data-test-id="workflow-rules-finding"
				>
					<N8nText size="small" bold :class="$style.ruleTitle">
						{{ ruleTitle(i18n, finding.ruleId, customRules) }}
					</N8nText>
					<N8nText size="small" color="text-dark" tag="p" :class="$style.message">
						{{ finding.message }}
					</N8nText>
					<N8nText size="xsmall" color="text-light" tag="p">
						{{ ruleSourceText(i18n, finding) }}
					</N8nText>
					<div :class="$style.actions">
						<button
							v-if="finding.nodeName"
							type="button"
							:class="$style.nodeChip"
							data-test-id="workflow-rules-finding-node"
							:data-attr="'workflow-rules-finding-node'"
							@click="emit('select-node', finding.nodeName)"
						>
							<N8nIcon icon="circle-dot" size="xsmall" />
							{{ finding.nodeName }}
						</button>
						<N8nButton
							v-if="isSettingsFinding(finding)"
							variant="outline"
							size="xsmall"
							icon="settings"
							:label="i18n.baseText('workflowRules.panel.openSettings')"
							data-test-id="workflow-rules-finding-open-settings"
							@click="emit('open-settings')"
						/>
						<N8nButton
							v-else-if="finding.nodeName && group.id !== 'exempted'"
							variant="outline"
							size="xsmall"
							icon="pencil"
							:label="i18n.baseText('workflowRules.panel.openNode')"
							data-test-id="workflow-rules-finding-open-node"
							@click="emit('open-node', finding.nodeName)"
						/>
					</div>
				</li>
			</ul>
		</section>
	</div>
</template>

<style lang="scss" module>
.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	overflow-y: auto;
	height: 100%;
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.headerTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.focus {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border-radius: var(--radius);
	background-color: var(--color--background--light-2);
}

.group {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.groupTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.block .groupTitle {
	color: var(--color--danger);
}

.warn .groupTitle {
	color: var(--color--warning);
}

.exempted .groupTitle {
	color: var(--color--text--tint-1);
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.finding {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--color--background--light-3);
}

.block .finding {
	border-left: var(--border-width) solid var(--color--danger);
	border-radius: 0 var(--radius--lg) var(--radius--lg) 0;
}

.warn .finding {
	border-left: var(--border-width) solid var(--color--warning);
	border-radius: 0 var(--radius--lg) var(--radius--lg) 0;
}

.exempted .finding {
	opacity: 0.7;
}

.message {
	margin: 0;
	word-break: break-word;
}

.actions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--3xs);
	margin-top: var(--spacing--4xs);
}

.nodeChip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius--full);
	background: none;
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	cursor: pointer;

	@media (hover: hover) {
		&:hover {
			border-color: var(--color--primary);
			color: var(--color--primary);
		}
	}
}

.ruleTitle {
	display: block;
}
</style>
