<script setup lang="ts">
import type { WorkflowRulesScanWorkflow } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nBadge,
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogClose,
	N8nDialogFooter,
	N8nEmptyState,
	N8nInput,
	N8nInputLabel,
	N8nText,
} from '@n8n/design-system';
import { VIEWS } from '@n8n/frontend-constants/views';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { CustomRule, RuleFinding } from '@n8n/workflow-rules';
import { computed, onMounted, ref } from 'vue';

import type { RuleSetEditor } from './useRuleSetEditor';
import { ruleTitle } from '../rule-text';
import { createExemption } from '../workflow-rules.api';

const props = defineProps<{ editor: RuleSetEditor; customRules: readonly CustomRule[] }>();
const emit = defineEmits<{ exempted: [] }>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();

const report = computed(() => props.editor.report.value);

const pending = ref<{ workflow: WorkflowRulesScanWorkflow; finding: RuleFinding } | null>(null);
const reason = ref('');
const saving = ref(false);

const exemptOpen = computed({
	get: () => pending.value !== null,
	set: (open) => {
		if (!open) pending.value = null;
	},
});

function askExempt(workflow: WorkflowRulesScanWorkflow, finding: RuleFinding) {
	reason.value = '';
	pending.value = { workflow, finding };
}

/** A project admin may only exempt from a rule the instance lets projects relax. */
const canExempt = (finding: RuleFinding) =>
	!finding.exempted && (props.editor.projectId === null || finding.projectCanExempt);

async function confirmExempt() {
	if (!pending.value || !reason.value.trim()) return;
	saving.value = true;
	try {
		await createExemption(rootStore.restApiContext, props.editor.projectId, {
			workflowId: pending.value.workflow.id,
			ruleId: pending.value.finding.ruleId,
			reason: reason.value.trim(),
		});
		toast.showMessage({ type: 'success', title: i18n.baseText('workflowRules.exemptions.added') });
		pending.value = null;
		emit('exempted');
		await props.editor.runReport();
	} catch (error) {
		toast.showError(error, i18n.baseText('workflowRules.exemptions.addError'));
	} finally {
		saving.value = false;
	}
}

onMounted(() => {
	if (!props.editor.report.value) void props.editor.runReport();
});
</script>

<template>
	<div :class="$style.wrapper" data-test-id="workflow-rules-report">
		<div :class="$style.toolbar">
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('workflowRules.report.intro') }}
			</N8nText>
			<N8nButton
				variant="outline"
				icon="refresh-cw"
				:loading="editor.reportLoading.value"
				:label="i18n.baseText('workflowRules.report.refresh')"
				data-test-id="workflow-rules-report-refresh"
				@click="editor.runReport()"
			/>
		</div>

		<div v-if="report" :class="$style.stats" data-test-id="workflow-rules-report-totals">
			<div :class="$style.stat">
				<N8nText size="xlarge" bold>{{ report.totals.workflows }}</N8nText>
				<N8nText size="small" color="text-light">{{
					i18n.baseText('workflowRules.report.checked')
				}}</N8nText>
			</div>
			<div :class="[$style.stat, $style.danger]">
				<N8nText size="xlarge" bold>{{ report.totals.workflowsWithBlocking }}</N8nText>
				<N8nText size="small" color="text-light">{{
					i18n.baseText('workflowRules.report.withBlocking')
				}}</N8nText>
			</div>
			<div :class="[$style.stat, $style.danger]">
				<N8nText size="xlarge" bold>{{ report.totals.publishedWithBlocking }}</N8nText>
				<N8nText size="small" color="text-light">{{
					i18n.baseText('workflowRules.report.publishedBlocked')
				}}</N8nText>
			</div>
			<div :class="[$style.stat, $style.warning]">
				<N8nText size="xlarge" bold>{{ report.totals.workflowsWithWarnings }}</N8nText>
				<N8nText size="small" color="text-light">{{
					i18n.baseText('workflowRules.report.withWarnings')
				}}</N8nText>
			</div>
		</div>

		<N8nEmptyState
			v-if="report && report.workflows.length === 0"
			:icon="{ type: 'icon', value: 'circle-check' }"
			:heading="i18n.baseText('workflowRules.report.clean.heading')"
			:description="i18n.baseText('workflowRules.report.clean.description')"
		/>

		<ul v-if="report && report.workflows.length > 0" :class="$style.workflows">
			<li
				v-for="workflow in report.workflows"
				:key="workflow.id"
				:class="$style.workflow"
				data-test-id="workflow-rules-report-workflow"
			>
				<div :class="$style.workflowHeader">
					<RouterLink
						:to="{ name: VIEWS.WORKFLOW, params: { workflowId: workflow.id } }"
						:class="$style.workflowLink"
					>
						{{ workflow.name }}
					</RouterLink>
					<N8nBadge v-if="workflow.isPublished" variant="subtle" size="xsmall">
						{{ i18n.baseText('workflowRules.report.published') }}
					</N8nBadge>
					<N8nText v-if="workflow.projectName" size="xsmall" color="text-light">
						{{ workflow.projectName }}
					</N8nText>
				</div>
				<ul :class="$style.findings">
					<li
						v-for="(finding, index) in workflow.findings"
						:key="`${finding.ruleId}-${index}`"
						:class="[$style.finding, { [$style.exempted]: finding.exempted }]"
					>
						<N8nBadge
							:variant="
								finding.exempted ? 'subtle' : finding.severity === 'block' ? 'danger' : 'warning'
							"
							size="xsmall"
						>
							{{
								finding.exempted
									? i18n.baseText('workflowRules.panel.exempted')
									: finding.severity === 'block'
										? i18n.baseText('workflowRules.severity.block')
										: i18n.baseText('workflowRules.severity.warn')
							}}
						</N8nBadge>
						<N8nText size="small" bold>{{ ruleTitle(i18n, finding.ruleId, customRules) }}</N8nText>
						<N8nText size="small" color="text-base" :class="$style.message">
							{{ finding.message }}
						</N8nText>
						<N8nButton
							v-if="canExempt(finding)"
							variant="ghost"
							size="xsmall"
							:label="i18n.baseText('workflowRules.report.exempt')"
							data-test-id="workflow-rules-report-exempt"
							@click="askExempt(workflow, finding)"
						/>
					</li>
				</ul>
			</li>
		</ul>
		<N8nText v-if="report?.truncated" size="small" color="text-light">
			{{ i18n.baseText('workflowRules.report.truncated') }}
		</N8nText>

		<N8nDialog
			v-model:open="exemptOpen"
			:header="i18n.baseText('workflowRules.exemptions.addTitle')"
			size="medium"
		>
			<N8nDialogBody>
				<N8nText v-if="pending" size="small" tag="p">
					{{
						i18n.baseText('workflowRules.exemptions.addDescription', {
							interpolate: {
								workflow: pending.workflow.name,
								rule: ruleTitle(i18n, pending.finding.ruleId, customRules),
							},
						})
					}}
				</N8nText>
				<N8nInputLabel :label="i18n.baseText('workflowRules.exemptions.reason')" required>
					<N8nInput
						v-model="reason"
						type="textarea"
						:rows="3"
						:placeholder="i18n.baseText('workflowRules.exemptions.reasonPlaceholder')"
						data-test-id="workflow-rules-exempt-reason"
					/>
				</N8nInputLabel>
			</N8nDialogBody>
			<N8nDialogFooter>
				<N8nDialogClose as-child>
					<N8nButton variant="outline" :label="i18n.baseText('workflowRules.common.cancel')" />
				</N8nDialogClose>
				<N8nButton
					variant="solid"
					:loading="saving"
					:disabled="!reason.trim()"
					:label="i18n.baseText('workflowRules.exemptions.confirm')"
					data-test-id="workflow-rules-exempt-confirm"
					@click="confirmExempt"
				/>
			</N8nDialogFooter>
		</N8nDialog>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.stats {
	display: grid;
	// Four stat cards in one row on the settings page width; no token fits.
	grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
	gap: var(--spacing--sm);
}

.stat {
	font-variant-numeric: tabular-nums;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
}

.danger {
	border-top: var(--border-width) solid var(--color--danger);
	border-radius: 0 0 var(--radius--lg) var(--radius--lg);
}

.warning {
	border-top: var(--border-width) solid var(--color--warning);
	border-radius: 0 0 var(--radius--lg) var(--radius--lg);
}

.workflows {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.workflow {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
}

.workflowHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.workflowLink {
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1);
	text-decoration: none;

	&:hover {
		color: var(--color--primary);
	}
}

.findings {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.finding {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
}

.exempted {
	opacity: 0.6;
}

.message {
	flex: 1 1 240px;
}
</style>
