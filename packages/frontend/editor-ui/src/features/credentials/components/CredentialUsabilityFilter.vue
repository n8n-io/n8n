<script setup lang="ts">
import { N8nCheckbox } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed } from 'vue';

import {
	CREDENTIAL_TYPE_USABILITY_REASONS,
	type CredentialTypeUsabilityReason,
} from '../composables/useCredentialTypeUsability';

const selected = defineModel<CredentialTypeUsabilityReason[]>({ required: true });

const i18n = useI18n();

const REASON_LABEL_KEY: Record<CredentialTypeUsabilityReason, BaseTextKey> = {
	typeRestricted: 'credentials.filters.cannotBeUsed.typeRestricted',
	nodesRestricted: 'credentials.filters.cannotBeUsed.nodesRestricted',
};

const allSelected = computed(() =>
	CREDENTIAL_TYPE_USABILITY_REASONS.every((reason) => selected.value.includes(reason)),
);
const someSelected = computed(() => selected.value.length > 0 && !allSelected.value);

function onToggleAll(checked: boolean) {
	selected.value = checked ? [...CREDENTIAL_TYPE_USABILITY_REASONS] : [];
}

function onToggleReason(reason: CredentialTypeUsabilityReason, checked: boolean) {
	selected.value = CREDENTIAL_TYPE_USABILITY_REASONS.filter((option) =>
		option === reason ? checked : selected.value.includes(option),
	);
}
</script>

<template>
	<div data-test-id="credential-filter-cannot-be-used">
		<N8nCheckbox
			:label="i18n.baseText('credentials.filters.cannotBeUsed')"
			:model-value="allSelected"
			:indeterminate="someSelected"
			data-test-id="credential-filter-cannot-be-used-all"
			@update:model-value="onToggleAll"
		/>
		<div :class="$style.reasons">
			<N8nCheckbox
				v-for="reason in CREDENTIAL_TYPE_USABILITY_REASONS"
				:key="reason"
				:label="i18n.baseText(REASON_LABEL_KEY[reason])"
				:model-value="selected.includes(reason)"
				:data-test-id="`credential-filter-cannot-be-used-${reason}`"
				@update:model-value="onToggleReason(reason, $event)"
			/>
		</div>
	</div>
</template>

<style module lang="scss">
.reasons {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	margin-top: var(--spacing--3xs);
	padding-left: var(--spacing--lg);
}
</style>
