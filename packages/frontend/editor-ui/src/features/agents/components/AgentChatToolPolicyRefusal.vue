<script setup lang="ts">
import type { AgentToolPolicyRefusal } from '@n8n/api-types';
import { N8nLink } from '@n8n/design-system';
import {
	ContactInstanceAdminModal,
	type RestrictedTypeKind,
} from '@n8n/frontend-module-type-availability-policies';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref } from 'vue';

import { useToolPolicyRefusalText } from '../composables/useToolPolicyRefusalText';

const props = defineProps<{
	refusal: AgentToolPolicyRefusal;
	/** Names the subject when a violation does not. */
	fallbackName: string;
}>();

const i18n = useI18n();
const { subjectName, reason, loadSubjectTypes } = useToolPolicyRefusalText();

const isContactAdminOpen = ref(false);

const reasonText = computed(() =>
	[...new Set(props.refusal.violations.map((v) => reason(v, props.fallbackName)))].join(' '),
);

const firstViolation = computed(() => props.refusal.violations[0]);
const adminSubject = computed(() => subjectName(firstViolation.value) ?? props.fallbackName);
const adminSubjectKind = computed<RestrictedTypeKind>(() =>
	firstViolation.value.subjectType === 'credentialType' ? 'credential' : 'node',
);

onMounted(() => {
	void loadSubjectTypes(props.refusal).catch(() => undefined);
});
</script>

<template>
	<span data-test-id="agent-chat-tool-policy-refusal">
		{{ reasonText }}
		<N8nLink
			underline
			size="small"
			data-test-id="agent-chat-tool-policy-refusal-contact-admin"
			@click.prevent="isContactAdminOpen = true"
		>
			{{ i18n.baseText('typeAvailabilityPolicies.restrictedNode.contactAdmin') }}
		</N8nLink>
		<ContactInstanceAdminModal
			v-model:open="isContactAdminOpen"
			:node-type-name="adminSubject"
			:kind="adminSubjectKind"
		/>
	</span>
</template>
