<script setup lang="ts">
import {
	N8nBadge,
	N8nButton,
	N8nEmptyState,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { CustomRule } from '@n8n/workflow-rules';
import { computed } from 'vue';

import RuleSeverityControl from './RuleSeverityControl.vue';
import type { RuleSetEditor } from './useRuleSetEditor';
import { SEVERITY_TEXT } from '../workflow-rules.constants';

const props = defineProps<{ editor: RuleSetEditor }>();
const emit = defineEmits<{ create: []; edit: [rule: CustomRule] }>();

const i18n = useI18n();

const ownRules = computed(() => props.editor.draft.value.customRules);
const inheritedRules = computed(() =>
	props.editor.projectId === null ? [] : (props.editor.instanceRuleSet.value?.customRules ?? []),
);
</script>

<template>
	<div :class="$style.wrapper">
		<div :class="$style.toolbar">
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('workflowRules.custom.intro') }}
			</N8nText>
			<N8nButton
				icon="plus"
				:label="i18n.baseText('workflowRules.custom.add')"
				data-test-id="workflow-rules-custom-add"
				@click="emit('create')"
			/>
		</div>

		<N8nEmptyState
			v-if="ownRules.length === 0 && inheritedRules.length === 0"
			:icon="{ type: 'icon', value: 'list-checks' }"
			:heading="i18n.baseText('workflowRules.custom.empty.heading')"
			:description="i18n.baseText('workflowRules.custom.empty.description')"
			:button-text="i18n.baseText('workflowRules.custom.add')"
			button-icon="plus"
			@click:button="emit('create')"
		/>

		<N8nSettingsSection
			v-if="inheritedRules.length > 0"
			:title="i18n.baseText('workflowRules.custom.inherited')"
		>
			<N8nSettingsRowGroup>
				<N8nSettingsRow
					v-for="rule in inheritedRules"
					:key="rule.id"
					:title="rule.name"
					:description="rule.description ?? rule.message ?? ''"
					:data-test-id="`workflow-rules-custom-inherited-${rule.id}`"
				>
					<template #action>
						<RuleSeverityControl
							:model-value="editor.effectiveSeverity(rule.id)"
							:minimum="editor.minimumSeverity(rule.id)"
							@update:model-value="(severity) => editor.setSeverity(rule.id, severity)"
						/>
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>

		<N8nSettingsSection v-if="ownRules.length > 0">
			<N8nSettingsRowGroup>
				<N8nSettingsRow
					v-for="rule in ownRules"
					:key="rule.id"
					:title="rule.name"
					:description="rule.description ?? rule.message ?? ''"
					:data-test-id="`workflow-rules-custom-row-${rule.id}`"
				>
					<template #action>
						<div :class="$style.actions">
							<N8nBadge
								:variant="
									rule.severity === 'block'
										? 'danger'
										: rule.severity === 'warn'
											? 'warning'
											: 'subtle'
								"
								size="small"
							>
								{{ i18n.baseText(SEVERITY_TEXT[rule.severity]) }}
							</N8nBadge>
							<N8nButton
								variant="ghost"
								size="small"
								icon="pencil"
								:label="i18n.baseText('workflowRules.common.edit')"
								:data-test-id="`workflow-rules-custom-edit-${rule.id}`"
								@click="emit('edit', rule)"
							/>
							<N8nButton
								variant="ghost"
								size="small"
								icon="trash-2"
								:aria-label="i18n.baseText('workflowRules.common.remove')"
								icon-only
								:data-test-id="`workflow-rules-custom-remove-${rule.id}`"
								@click="editor.removeCustomRule(rule.id)"
							/>
						</div>
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
	gap: var(--spacing--md);
}

.toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}
</style>
