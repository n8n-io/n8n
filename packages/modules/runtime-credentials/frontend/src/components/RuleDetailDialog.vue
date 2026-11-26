<script setup lang="ts">
import {
	N8nButton,
	N8nCallout,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import RuleFlow from './RuleFlow.vue';
import type { RuntimeCredentialRule } from '../runtime-credentials.api';

const { open, rule = undefined } = defineProps<{
	open: boolean;
	/** A rule that the environment sets. The dialog only shows it. */
	rule?: RuntimeCredentialRule;
}>();

const emit = defineEmits<{ 'update:open': [open: boolean] }>();

const i18n = useI18n();
</script>

<template>
	<N8nDialog
		:open="open"
		:header="
			i18n.baseText('runtimeCredentials.rules.detail.title', {
				interpolate: { alias: rule?.alias ?? '' },
			})
		"
		size="large"
		data-test-id="runtime-rule-detail"
		@update:open="emit('update:open', $event)"
	>
		<N8nDialogBody>
			<div :class="$style.body">
				<N8nCallout theme="info" slim icon="lock" data-test-id="runtime-rule-detail-note">
					{{ i18n.baseText('runtimeCredentials.rules.detail.description') }}
				</N8nCallout>
				<RuleFlow v-if="rule" :rule="rule" :id-suffix="rule.alias" />
			</div>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton
				variant="outline"
				:label="i18n.baseText('generic.close')"
				@click="emit('update:open', false)"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
</style>
