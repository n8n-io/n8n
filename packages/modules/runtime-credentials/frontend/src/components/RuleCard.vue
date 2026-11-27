<script setup lang="ts">
import {
	N8nActionToggle,
	N8nBadge,
	N8nCard,
	N8nStatusDot,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import RuleFlow from './RuleFlow.vue';
import type { RuntimeCredentialRule } from '../runtime-credentials.api';
import { useRuntimeCredentialsStore } from '../runtime-credentials.store';
import { findRuleIssue } from '../runtime-credentials.utils';
import type { RuleIssue, WizardStepId } from '../runtime-credentials.utils';

const { rule } = defineProps<{ rule: RuntimeCredentialRule }>();

const emit = defineEmits<{
	edit: [rule: RuntimeCredentialRule, step: WizardStepId];
	view: [rule: RuntimeCredentialRule];
	duplicate: [rule: RuntimeCredentialRule];
	delete: [rule: RuntimeCredentialRule];
}>();

type RowAction = 'edit' | 'duplicate' | 'delete';

const i18n = useI18n();
const store = useRuntimeCredentialsStore();

const isEnvironment = computed(() => rule.source === 'environment');
const issue = computed(() => findRuleIssue(rule, store.credentialTypes));

function issueText(found: RuleIssue): string {
	switch (found.kind) {
		case 'unknownType':
			return i18n.baseText('runtimeCredentials.rules.status.unknownType', {
				interpolate: { type: found.type },
			});
		case 'unknownField':
			return i18n.baseText('runtimeCredentials.rules.status.unknownField', {
				interpolate: { type: found.type, field: found.field },
			});
		case 'controlledField':
			return i18n.baseText('runtimeCredentials.rules.status.controlledField', {
				interpolate: { type: found.type, field: found.field },
			});
	}
}

const actions = computed<
	Array<{ label: string; value: RowAction; destructive?: boolean; divided?: boolean }>
>(() => [
	{ label: i18n.baseText('runtimeCredentials.rules.edit'), value: 'edit' },
	{ label: i18n.baseText('runtimeCredentials.rules.duplicate'), value: 'duplicate' },
	{
		label: i18n.baseText('runtimeCredentials.rules.delete'),
		value: 'delete',
		destructive: true,
		divided: true,
	},
]);

function onAction(action: RowAction) {
	if (action === 'edit') emit('edit', rule, issue.value ? 'credential' : 'source');
	else if (action === 'duplicate') emit('duplicate', rule);
	else emit('delete', rule);
}

function onName() {
	if (isEnvironment.value) emit('view', rule);
	else emit('edit', rule, issue.value ? 'credential' : 'source');
}
</script>

<template>
	<N8nCard :class="$style.card" :data-test-id="`runtime-rule-${rule.alias}`">
		<template #header>
			<div :class="$style.header">
				<button
					type="button"
					:class="$style.name"
					:data-test-id="`runtime-rule-open-${rule.alias}`"
					@click="onName"
				>
					<N8nText bold color="text-dark">{{ rule.alias }}</N8nText>
				</button>
				<N8nTooltip v-if="issue" :content="issueText(issue)">
					<span :class="$style.status" data-test-id="runtime-rule-status">
						<N8nStatusDot variant="danger" />
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('runtimeCredentials.rules.status.blocked') }}
						</N8nText>
					</span>
				</N8nTooltip>
				<N8nTooltip
					v-if="isEnvironment"
					:content="i18n.baseText('runtimeCredentials.rules.source.environment.tooltip')"
				>
					<N8nBadge
						variant="subtle"
						size="small"
						leading-icon="lock"
						data-test-id="runtime-rule-env-badge"
					>
						{{ i18n.baseText('runtimeCredentials.rules.source.environment') }}
					</N8nBadge>
				</N8nTooltip>
			</div>
		</template>
		<div :class="$style.body">
			<RuleFlow
				:rule="rule"
				:id-suffix="rule.alias"
				:interactive="!isEnvironment"
				@step="emit('edit', rule, $event)"
			/>
		</div>
		<template v-if="!isEnvironment" #append>
			<N8nActionToggle
				:actions="actions"
				:aria-label="
					i18n.baseText('runtimeCredentials.rules.actions.ariaLabel', {
						interpolate: { alias: rule.alias },
					})
				"
				@action="onAction"
			/>
		</template>
	</N8nCard>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/_focus.scss' as focus;

.card {
	align-items: flex-start;
}

.header {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--xs);
	min-width: 0;
}

.name {
	min-width: 0;
	padding: var(--spacing--5xs);
	border: none;
	border-radius: var(--radius);
	background: none;
	font: inherit;
	text-align: start;
	cursor: pointer;

	&:focus-visible {
		@include focus.focus-ring;
	}
}

.status {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.body {
	margin-block-start: var(--spacing--2xs);
}
</style>
