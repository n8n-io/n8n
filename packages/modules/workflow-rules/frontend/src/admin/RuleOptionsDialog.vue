<script setup lang="ts">
import {
	N8nButton,
	N8nCallout,
	N8nDialog,
	N8nDialogBody,
	N8nDialogClose,
	N8nDialogFooter,
	N8nInput,
	N8nInputLabel,
	N8nInputNumber,
	N8nSwitch2,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { isRecord } from '@n8n/utils/is-record';
import { getCatalogueRule } from '@n8n/workflow-rules';
import { computed, ref, watch } from 'vue';

import { CONFIGURABLE_RULE_IDS } from './rule-options';
import { CATALOGUE_RULE_TEXT } from '../workflow-rules.constants';

const props = defineProps<{
	ruleId: string | null;
	options: Record<string, unknown> | undefined;
	/** Instance only: whether projects may lower or turn off this rule. */
	adjustable?: boolean;
	showAdjustable: boolean;
}>();

const emit = defineEmits<{
	save: [ruleId: string, options: Record<string, unknown> | undefined, adjustable: boolean];
	close: [];
}>();

const i18n = useI18n();

const open = computed({
	get: () => props.ruleId !== null,
	set: (value) => {
		if (!value) emit('close');
	},
});

const domains = ref('');
const allowExpressions = ref(true);
const limit = ref<number | undefined>(undefined);
const pattern = ref('');
const hint = ref('');
const ignoreCase = ref(false);
const error = ref<string | undefined>(undefined);
const relaxable = ref(false);

const hasOptions = computed(() => props.ruleId !== null && CONFIGURABLE_RULE_IDS.has(props.ruleId));

const lines = (value: unknown) =>
	Array.isArray(value) ? value.filter((item) => typeof item === 'string').join('\n') : '';

watch(
	() => props.ruleId,
	(ruleId) => {
		if (!ruleId) return;
		const defaults = getCatalogueRule(ruleId)?.defaultOptions;
		const current = { ...(isRecord(defaults) ? defaults : {}), ...props.options };
		error.value = undefined;
		relaxable.value = props.adjustable ?? false;
		domains.value = lines(
			ruleId === 'http-request-credential' ? current.exceptDomains : current.domains,
		);
		allowExpressions.value = current.allowExpressions !== false;
		limit.value =
			typeof current.maxSeconds === 'number'
				? current.maxSeconds
				: typeof current.max === 'number'
					? current.max
					: undefined;
		const [first] = Array.isArray(current.patterns) ? current.patterns : [];
		pattern.value = isRecord(first) && typeof first.pattern === 'string' ? first.pattern : '';
		hint.value = isRecord(first) && typeof first.hint === 'string' ? first.hint : '';
		ignoreCase.value = isRecord(first) && first.flags === 'i';
	},
	{ immediate: true },
);

const domainList = () =>
	domains.value
		.split(/[\n,]/)
		.map((domain) => domain.trim())
		.filter(Boolean);

function buildOptions(ruleId: string): Record<string, unknown> {
	switch (ruleId) {
		case 'http-request-credential':
			return { exceptDomains: domainList() };
		case 'allowed-http-domains':
			return { domains: domainList(), allowExpressions: allowExpressions.value };
		case 'execution-timeout':
			return limit.value ? { maxSeconds: limit.value } : {};
		case 'max-nodes':
			return { max: limit.value ?? 50 };
		case 'workflow-name-pattern':
			return {
				patterns: [
					{
						pattern: pattern.value,
						flags: ignoreCase.value ? 'i' : '',
						...(hint.value.trim() ? { hint: hint.value.trim() } : {}),
					},
				],
			};
		default:
			return {};
	}
}

function onSave() {
	if (!props.ruleId) return;
	if (!hasOptions.value) {
		emit('save', props.ruleId, undefined, relaxable.value);
		return;
	}
	const options = buildOptions(props.ruleId);
	error.value = getCatalogueRule(props.ruleId)?.validateOptions(options);
	if (error.value) return;
	emit('save', props.ruleId, options, relaxable.value);
}

const description = computed(() =>
	props.ruleId && CATALOGUE_RULE_TEXT[props.ruleId]
		? i18n.baseText(CATALOGUE_RULE_TEXT[props.ruleId].description)
		: '',
);

const title = computed(() =>
	props.ruleId && CATALOGUE_RULE_TEXT[props.ruleId]
		? i18n.baseText(CATALOGUE_RULE_TEXT[props.ruleId].title)
		: '',
);
</script>

<template>
	<N8nDialog v-model:open="open" :header="title" size="medium">
		<N8nDialogBody>
			<div :class="$style.form" data-test-id="workflow-rule-options">
				<N8nText size="small" color="text-light" tag="p" :class="$style.intro">
					{{ description }}
				</N8nText>
				<template v-if="ruleId === 'http-request-credential' || ruleId === 'allowed-http-domains'">
					<N8nInputLabel
						:label="
							ruleId === 'http-request-credential'
								? i18n.baseText('workflowRules.options.exceptDomains')
								: i18n.baseText('workflowRules.options.domains')
						"
					>
						<N8nInput
							v-model="domains"
							type="textarea"
							:rows="5"
							placeholder="example.com"
							data-test-id="workflow-rule-options-domains"
						/>
					</N8nInputLabel>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('workflowRules.options.domainsHint') }}
					</N8nText>
					<label v-if="ruleId === 'allowed-http-domains'" :class="$style.toggle">
						<N8nSwitch2 v-model="allowExpressions" />
						<N8nText size="small">{{
							i18n.baseText('workflowRules.options.allowExpressions')
						}}</N8nText>
					</label>
				</template>

				<N8nInputLabel
					v-else-if="ruleId === 'execution-timeout' || ruleId === 'max-nodes'"
					:label="
						ruleId === 'execution-timeout'
							? i18n.baseText('workflowRules.options.maxSeconds')
							: i18n.baseText('workflowRules.options.maxNodes')
					"
				>
					<N8nInputNumber
						v-model="limit"
						:min="1"
						:precision="0"
						data-test-id="workflow-rule-options-number"
					/>
				</N8nInputLabel>

				<template v-else-if="ruleId === 'workflow-name-pattern'">
					<N8nInputLabel :label="i18n.baseText('workflowRules.options.pattern')">
						<N8nInput
							v-model="pattern"
							placeholder="^\[[a-z]+\] "
							data-test-id="workflow-rule-options-pattern"
						/>
					</N8nInputLabel>
					<N8nInputLabel :label="i18n.baseText('workflowRules.options.hint')">
						<N8nInput
							v-model="hint"
							:placeholder="i18n.baseText('workflowRules.options.hintPlaceholder')"
						/>
					</N8nInputLabel>
					<label :class="$style.toggle">
						<N8nSwitch2 v-model="ignoreCase" />
						<N8nText size="small">{{ i18n.baseText('workflowRules.options.ignoreCase') }}</N8nText>
					</label>
				</template>

				<section v-if="showAdjustable" :class="$style.relax">
					<label :class="$style.toggle">
						<N8nSwitch2 v-model="relaxable" data-test-id="workflow-rule-options-adjustable" />
						<N8nText size="small" bold>{{
							i18n.baseText('workflowRules.rules.adjustable')
						}}</N8nText>
					</label>
					<N8nText size="small" color="text-light" tag="p" :class="$style.intro">
						{{ i18n.baseText('workflowRules.rules.adjustableTooltip') }}
					</N8nText>
				</section>

				<N8nCallout v-if="error" theme="danger" slim data-test-id="workflow-rule-options-error">
					{{ error }}
				</N8nCallout>
			</div>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nDialogClose as-child>
				<N8nButton variant="outline" :label="i18n.baseText('workflowRules.common.cancel')" />
			</N8nDialogClose>
			<N8nButton
				variant="solid"
				:label="i18n.baseText('workflowRules.common.apply')"
				data-test-id="workflow-rule-options-apply"
				@click="onSave"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.intro {
	margin: 0;
}

.relax {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding-top: var(--spacing--sm);
	border-top: var(--border);
}

.toggle {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
	cursor: pointer;
}
</style>
