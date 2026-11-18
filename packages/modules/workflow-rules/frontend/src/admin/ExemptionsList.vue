<script setup lang="ts">
import type { WorkflowRuleExemptionResponse } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nEmptyState,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	N8nText,
} from '@n8n/design-system';
import { VIEWS } from '@n8n/frontend-constants/views';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { CustomRule } from '@n8n/workflow-rules';
import { onMounted, ref } from 'vue';

import { ruleTitle } from '../rule-text';
import { deleteExemption, listExemptions, type RuleScopeId } from '../workflow-rules.api';

const props = defineProps<{ projectId: RuleScopeId; customRules: readonly CustomRule[] }>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();

const exemptions = ref<WorkflowRuleExemptionResponse[]>([]);
const loading = ref(true);

async function load() {
	loading.value = true;
	try {
		exemptions.value = await listExemptions(rootStore.restApiContext, props.projectId);
	} catch (error) {
		toast.showError(error, i18n.baseText('workflowRules.exemptions.loadError'));
	} finally {
		loading.value = false;
	}
}

async function remove(exemption: WorkflowRuleExemptionResponse) {
	try {
		await deleteExemption(rootStore.restApiContext, props.projectId, exemption.id);
		exemptions.value = exemptions.value.filter((item) => item.id !== exemption.id);
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('workflowRules.exemptions.removed'),
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('workflowRules.exemptions.removeError'));
	}
}

defineExpose({ load });
onMounted(load);
</script>

<template>
	<div :class="$style.wrapper" data-test-id="workflow-rules-exemptions">
		<N8nText size="small" color="text-light">
			{{ i18n.baseText('workflowRules.exemptions.intro') }}
		</N8nText>
		<N8nEmptyState
			v-if="!loading && exemptions.length === 0"
			:icon="{ type: 'icon', value: 'shield-check' }"
			:heading="i18n.baseText('workflowRules.exemptions.empty.heading')"
			:description="i18n.baseText('workflowRules.exemptions.empty.description')"
		/>
		<N8nSettingsSection v-else-if="exemptions.length > 0">
			<N8nSettingsRowGroup>
				<N8nSettingsRow
					v-for="exemption in exemptions"
					:key="exemption.id"
					data-test-id="workflow-rules-exemption-row"
				>
					<template #info>
						<RouterLink
							:to="{ name: VIEWS.WORKFLOW, params: { workflowId: exemption.workflowId } }"
							:class="$style.workflowLink"
						>
							{{ exemption.workflowName }}
						</RouterLink>
						<N8nText size="small" color="text-dark" tag="p" :class="$style.line">
							{{ ruleTitle(i18n, exemption.ruleId, customRules) }} · {{ exemption.reason }}
						</N8nText>
						<N8nText size="xsmall" color="text-light" tag="p" :class="$style.line">
							{{
								i18n.baseText('workflowRules.exemptions.grantedBy', {
									interpolate: {
										name:
											exemption.createdBy?.name ??
											i18n.baseText('workflowRules.common.unknownUser'),
										date: new Date(exemption.createdAt).toLocaleDateString(),
									},
								})
							}}
							<template v-if="exemption.projectName"> · {{ exemption.projectName }}</template>
						</N8nText>
					</template>
					<template #action>
						<N8nButton
							variant="ghost"
							size="small"
							icon="trash-2"
							:label="i18n.baseText('workflowRules.exemptions.remove')"
							data-test-id="workflow-rules-exemption-remove"
							@click="remove(exemption)"
						/>
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.workflowLink {
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1);
	text-decoration: none;

	&:hover {
		color: var(--color--primary);
	}
}

.line {
	margin: var(--spacing--5xs) 0 0;
}
</style>
