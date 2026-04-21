<script setup lang="ts">
import type { WorkflowAuthoringCheckSeverity, WorkflowCheckConfigDto } from '@n8n/api-types';
import { N8nHeading, N8nSelect, N8nOption, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ElSwitch } from 'element-plus';
import { storeToRefs } from 'pinia';
import { onMounted } from 'vue';

import { useToast } from '@/app/composables/useToast';
import { useWorkflowAuthoringChecksStore } from '@/features/workflows/authoringChecks/authoringChecks.store';

const store = useWorkflowAuthoringChecksStore();
const { checks, isLoading } = storeToRefs(store);
const { fetchChecks, updateCheck } = store;
const i18n = useI18n();
const { showError } = useToast();

onMounted(async () => {
	try {
		await fetchChecks();
	} catch (error) {
		showError(error, i18n.baseText('settings.workflowAuthoringChecks.fetchError'));
	}
});

function severityLabel(severity: WorkflowAuthoringCheckSeverity) {
	return severity === 'blocking'
		? i18n.baseText('workflowAuthoringChecks.severity.blocking')
		: i18n.baseText('workflowAuthoringChecks.severity.warning');
}

async function onToggleEnabled(check: WorkflowCheckConfigDto, value: string | number | boolean) {
	const enabled = typeof value === 'boolean' ? value : Boolean(value);
	try {
		await updateCheck(check.checkId, { enabled });
	} catch (error) {
		showError(error, i18n.baseText('settings.workflowAuthoringChecks.updateError'));
	}
}

async function onSeverityChange(
	check: WorkflowCheckConfigDto,
	value: WorkflowAuthoringCheckSeverity | 'default',
) {
	const severityOverride = value === 'default' ? null : value;
	try {
		await updateCheck(check.checkId, { severityOverride });
	} catch (error) {
		showError(error, i18n.baseText('settings.workflowAuthoringChecks.updateError'));
	}
}
</script>

<template>
	<div class="pb-3xl" data-test-id="workflow-authoring-checks-settings">
		<div :class="$style.headerTitle">
			<N8nHeading tag="h1" size="2xlarge">
				{{ i18n.baseText('settings.workflowAuthoringChecks.title') }}
			</N8nHeading>
			<N8nText color="text-base" size="medium">
				{{ i18n.baseText('settings.workflowAuthoringChecks.description') }}
			</N8nText>
		</div>

		<div v-if="isLoading && checks.length === 0" :class="$style.emptyState">
			<N8nText color="text-light">
				{{ i18n.baseText('settings.workflowAuthoringChecks.loading') }}
			</N8nText>
		</div>

		<div
			v-else-if="checks.length === 0"
			:class="$style.emptyState"
			data-test-id="workflow-authoring-checks-empty-state"
		>
			<N8nText color="text-light">
				{{ i18n.baseText('settings.workflowAuthoringChecks.empty') }}
			</N8nText>
		</div>

		<div
			v-for="check in checks"
			v-else
			:key="check.checkId"
			:class="$style.settingsSection"
			:data-test-id="`workflow-authoring-check-row-${check.checkId}`"
		>
			<div :class="$style.settingsContainer">
				<div :class="$style.settingsContainerInfo">
					<N8nText :bold="true">{{ check.title }}</N8nText>
					<N8nText v-if="check.description" size="small" color="text-light">
						{{ check.description }}
					</N8nText>
					<N8nText size="small" color="text-light">
						{{
							i18n.baseText('settings.workflowAuthoringChecks.defaultSeverity', {
								interpolate: { severity: severityLabel(check.defaultSeverity) },
							})
						}}
					</N8nText>
				</div>
				<div :class="$style.settingsContainerAction">
					<N8nSelect
						:model-value="check.severityOverride ?? 'default'"
						size="small"
						:class="$style.severitySelect"
						:data-test-id="`workflow-authoring-check-severity-${check.checkId}`"
						:disabled="!check.enabled"
						@update:model-value="
							(value: WorkflowAuthoringCheckSeverity | 'default') => onSeverityChange(check, value)
						"
					>
						<N8nOption
							value="default"
							:label="
								i18n.baseText('settings.workflowAuthoringChecks.severity.useDefault', {
									interpolate: { severity: severityLabel(check.defaultSeverity) },
								})
							"
						/>
						<N8nOption
							value="warning"
							:label="i18n.baseText('workflowAuthoringChecks.severity.warning')"
						/>
						<N8nOption
							value="blocking"
							:label="i18n.baseText('workflowAuthoringChecks.severity.blocking')"
						/>
					</N8nSelect>
					<ElSwitch
						:model-value="check.enabled"
						size="large"
						:data-test-id="`workflow-authoring-check-toggle-${check.checkId}`"
						@update:model-value="(value) => onToggleEnabled(check, value)"
					/>
				</div>
			</div>
		</div>
	</div>
</template>

<style module>
.headerTitle {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--xl);
}

.settingsSection {
	border-radius: var(--radius);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	margin-bottom: var(--spacing--sm);
}

.settingsContainer {
	display: flex;
	align-items: center;
	padding-left: var(--spacing--sm);
	justify-content: space-between;
	flex-shrink: 0;
	gap: var(--spacing--sm);
}

.settingsContainerInfo {
	display: flex;
	padding: var(--spacing--sm) 0;
	flex-direction: column;
	justify-content: center;
	align-items: flex-start;
	gap: var(--spacing--5xs);
	flex: 1;
	min-width: 0;
}

.settingsContainerAction {
	display: flex;
	padding: var(--spacing--sm);
	justify-content: flex-end;
	align-items: center;
	gap: var(--spacing--sm);
	flex-shrink: 0;
}

.severitySelect {
	width: 240px;
}

.emptyState {
	display: flex;
	justify-content: center;
	padding: var(--spacing--xl);
	border-radius: var(--radius);
	border: var(--border-width) var(--border-style) var(--color--foreground);
}
</style>
