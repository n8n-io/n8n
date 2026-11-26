<script setup lang="ts">
import { N8nBadge, N8nIcon, N8nNodeIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import PathChip from './PathChip.vue';
import { useTypeIcons } from '../composables/useTypeIcons';
import type { RuntimeCredentialTransform } from '../runtime-credentials.api';
import { parseAllowedDomains, parseTransform } from '../runtime-credentials.utils';
import type { WizardStepId } from '../runtime-credentials.utils';

type FlowRule = {
	nodeType: string;
	path: string;
	credentialType: string;
	transform?: RuntimeCredentialTransform;
	allowedDomains?: string;
};

const MAX_VISIBLE_HOSTS = 2;

const {
	rule,
	idSuffix = '',
	interactive = false,
} = defineProps<{
	rule: FlowRule;
	/** Added to the test ids of the endpoint cells. */
	idSuffix?: string;
	/** Turns the three groups into buttons that open the matching wizard step. */
	interactive?: boolean;
}>();

const emit = defineEmits<{ step: [step: WizardStepId] }>();

const i18n = useI18n();
const { credentialIcon, credentialLabel, nodeIcon, nodeLabel } = useTypeIcons();

const transformText = computed(() => {
	const { kind, fieldName } = parseTransform(rule.transform);
	// A rule with no transform uses the bearer transform at run time.
	if (kind === 'field') {
		return i18n.baseText('runtimeCredentials.rules.transform.field', {
			interpolate: { name: fieldName },
		});
	}
	return i18n.baseText('runtimeCredentials.rules.transform.bearer');
});

const hosts = computed(() => parseAllowedDomains(rule.allowedDomains));
const visibleHosts = computed(() => hosts.value.slice(0, MAX_VISIBLE_HOSTS));
const hiddenHosts = computed(() => hosts.value.slice(MAX_VISIBLE_HOSTS));

const groupTag = computed(() => (interactive ? 'button' : 'div'));
</script>

<template>
	<div :class="$style.flow" data-test-id="runtime-rule-flow">
		<component
			:is="groupTag"
			:class="[$style.group, interactive && $style.interactive]"
			v-bind="interactive ? { type: 'button' } : {}"
			data-test-id="runtime-rule-flow-source"
			@click="interactive && emit('step', 'source')"
		>
			<span :class="$style.node">
				<N8nNodeIcon v-bind="nodeIcon(rule.nodeType)" :size="16" />
				<N8nText size="small" bold>{{ nodeLabel(rule.nodeType) }}</N8nText>
			</span>
			<PathChip :path="rule.path" />
		</component>

		<N8nIcon :class="$style.arrow" icon="arrow-right" size="small" />

		<component
			:is="groupTag"
			:class="[$style.group, interactive && $style.interactive]"
			v-bind="interactive ? { type: 'button' } : {}"
			data-test-id="runtime-rule-flow-credential"
			@click="interactive && emit('step', 'credential')"
		>
			<span :class="$style.node">
				<N8nNodeIcon v-bind="credentialIcon(rule.credentialType)" :size="16" />
				<N8nText size="small" bold>{{ credentialLabel(rule.credentialType) }}</N8nText>
			</span>
			<N8nBadge variant="subtle" size="small" data-test-id="runtime-rule-transform">
				{{ transformText }}
			</N8nBadge>
		</component>

		<component
			:is="groupTag"
			:class="[$style.endpoints, interactive && $style.interactive]"
			v-bind="interactive ? { type: 'button' } : {}"
			:data-test-id="`runtime-rule-domains-${idSuffix}`"
			@click="interactive && emit('step', 'endpoints')"
		>
			<N8nText size="xsmall" color="text-light" :class="$style.endpointsLabel">
				{{ i18n.baseText('runtimeCredentials.rules.table.allowedDomains') }}
			</N8nText>
			<template v-if="hosts.length > 0">
				<N8nBadge
					v-for="host in visibleHosts"
					:key="host"
					variant="outline"
					size="small"
					leading-icon="globe"
					data-test-id="runtime-rule-domain"
				>
					{{ host }}
				</N8nBadge>
				<N8nTooltip v-if="hiddenHosts.length > 0" :content="hiddenHosts.join(', ')">
					<N8nBadge variant="subtle" size="small" data-test-id="runtime-rule-domains-more">
						{{
							i18n.baseText('runtimeCredentials.rules.endpoints.more', {
								interpolate: { count: String(hiddenHosts.length) },
							})
						}}
					</N8nBadge>
				</N8nTooltip>
			</template>
			<N8nText v-else size="small" color="text-light" data-test-id="runtime-rule-any-host">
				{{ i18n.baseText('runtimeCredentials.rules.allowedDomains.any') }}
			</N8nText>
		</component>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/_focus.scss' as focus;

.flow {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.group,
.endpoints {
	display: inline-flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
	min-width: 0;
	max-width: 100%;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border: var(--border-width) var(--border-style) var(--border-color--subtle);
	border-radius: var(--radius);
	background-color: var(--background--surface);
	font: inherit;
	color: inherit;
	text-align: start;
}

/* The endpoint cell sits outside the data flow, so it has no frame and its own row. */
.endpoints {
	flex-basis: 100%;
	padding-inline: var(--spacing--4xs);
	border-color: transparent;
	background-color: transparent;
	gap: var(--spacing--4xs);
}

.interactive {
	cursor: pointer;

	&:hover {
		border-color: var(--border-color--strong);
		background-color: var(--background--hover);
	}

	&:focus-visible {
		@include focus.focus-ring;
	}
}

.node {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.endpointsLabel {
	margin-inline-end: var(--spacing--3xs);
}

.arrow {
	flex-shrink: 0;
	color: var(--text-color--subtler);
}
</style>
