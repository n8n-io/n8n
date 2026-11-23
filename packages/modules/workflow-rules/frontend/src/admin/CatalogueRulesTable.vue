<script setup lang="ts">
import {
	N8nBadge,
	N8nButton,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { CATALOGUE_RULES, type RuleCategory } from '@n8n/workflow-rules';
import { computed } from 'vue';

import RuleSeverityControl from './RuleSeverityControl.vue';
import type { RuleSetEditor } from './useRuleSetEditor';
import { CONFIGURABLE_RULE_IDS } from './rule-options';
import { CATALOGUE_RULE_TEXT, CATEGORY_TEXT, SEVERITY_TEXT } from '../workflow-rules.constants';

const props = defineProps<{ editor: RuleSetEditor }>();
const emit = defineEmits<{ configure: [ruleId: string]; 'show-report': [] }>();

const i18n = useI18n();

const CATEGORY_ORDER: RuleCategory[] = ['security', 'reliability', 'conventions'];

const groups = computed(() =>
	CATEGORY_ORDER.map((category) => ({
		category,
		rules: CATALOGUE_RULES.filter((rule) => rule.category === category),
	})),
);

const isInstance = computed(() => props.editor.projectId === null);

const reportCounts = computed(() => {
	const counts = new Map<string, number>();
	for (const rule of props.editor.report.value?.rules ?? [])
		counts.set(rule.ruleId, rule.workflows);
	return counts;
});

/** An instance admin configures every rule, because each one can be opened to projects. */
const canConfigure = (ruleId: string) => isInstance.value || CONFIGURABLE_RULE_IDS.has(ruleId);

function inheritedLabel(ruleId: string) {
	const inherited = props.editor.inheritedSetting(ruleId);
	if (!inherited || inherited.severity === 'off') return null;
	return i18n.baseText(
		inherited.adjustable
			? 'workflowRules.rules.inheritedAdjustable'
			: 'workflowRules.rules.inheritedLocked',
		{ interpolate: { severity: i18n.baseText(SEVERITY_TEXT[inherited.severity]) } },
	);
}
</script>

<template>
	<div :class="$style.groups">
		<N8nSettingsSection
			v-for="group in groups"
			:key="group.category"
			:title="i18n.baseText(CATEGORY_TEXT[group.category])"
		>
			<N8nSettingsRowGroup>
				<N8nSettingsRow
					v-for="rule in group.rules"
					:key="rule.id"
					:data-test-id="`workflow-rule-row-${rule.id}`"
				>
					<template #info>
						<N8nText bold size="medium" color="text-dark">
							{{ i18n.baseText(CATALOGUE_RULE_TEXT[rule.id].title) }}
						</N8nText>
						<N8nText size="small" color="text-light" tag="p" :class="$style.description">
							{{ i18n.baseText(CATALOGUE_RULE_TEXT[rule.id].description) }}
						</N8nText>
						<div :class="$style.meta">
							<N8nBadge v-if="inheritedLabel(rule.id)" variant="subtle" size="xsmall">
								{{ inheritedLabel(rule.id) }}
							</N8nBadge>
							<N8nBadge
								v-if="isInstance && editor.settingFor(rule.id)?.adjustable"
								variant="subtle"
								size="xsmall"
								leading-icon="users"
								:data-test-id="`workflow-rule-adjustable-badge-${rule.id}`"
							>
								{{ i18n.baseText('workflowRules.rules.adjustable') }}
							</N8nBadge>
							<button
								v-if="reportCounts.get(rule.id)"
								type="button"
								:class="$style.affected"
								data-test-id="workflow-rule-row-count"
								@click="emit('show-report')"
							>
								{{
									i18n.baseText('workflowRules.rules.affected', {
										interpolate: { count: reportCounts.get(rule.id) ?? 0 },
										adjustToNumber: reportCounts.get(rule.id) ?? 0,
									})
								}}
							</button>
							<N8nText v-if="rule.needsNodeTypes" size="xsmall" color="text-light">
								{{ i18n.baseText('workflowRules.rules.notOffline') }}
							</N8nText>
						</div>
					</template>
					<template #action>
						<div :class="$style.actions">
							<N8nTooltip
								v-if="canConfigure(rule.id)"
								:content="i18n.baseText('workflowRules.rules.configure')"
								placement="top"
							>
								<N8nButton
									variant="ghost"
									size="small"
									icon="settings"
									icon-only
									:aria-label="i18n.baseText('workflowRules.rules.configure')"
									:data-test-id="`workflow-rule-configure-${rule.id}`"
									@click="emit('configure', rule.id)"
								/>
							</N8nTooltip>
							<RuleSeverityControl
								:model-value="editor.effectiveSeverity(rule.id)"
								:minimum="editor.minimumSeverity(rule.id)"
								@update:model-value="(severity) => editor.setSeverity(rule.id, severity)"
							/>
						</div>
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>
	</div>
</template>

<style lang="scss" module>
.groups {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}

.description {
	margin: var(--spacing--5xs) 0 0;
}

.meta {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--3xs);
	margin-top: var(--spacing--4xs);

	&:empty {
		display: none;
	}
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.affected {
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border: var(--border-width) solid var(--color--warning);
	border-radius: var(--radius--full);
	background: none;
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	font-variant-numeric: tabular-nums;
	color: var(--color--warning);
	cursor: pointer;

	@media (hover: hover) {
		&:hover {
			background-color: color-mix(in srgb, var(--color--warning) 12%, transparent);
		}
	}
}
</style>
