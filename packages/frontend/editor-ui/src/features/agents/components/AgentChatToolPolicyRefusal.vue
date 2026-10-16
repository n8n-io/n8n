<script setup lang="ts">
import { N8nLink } from '@n8n/design-system';
import {
	CONTACT_ADMIN_COPY,
	ContactAdminModal,
	getRestrictionContact,
	getViolationVerdict,
	type RestrictedTypeKind,
} from '@n8n/frontend-module-type-availability-policies';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref } from 'vue';

import type { ToolPolicyRefusal } from '@/features/ai/shared/agentsChat/toolPolicyRefusal';

import { useToolPolicyRefusalText } from '../composables/useToolPolicyRefusalText';

const props = defineProps<{
	refusal: ToolPolicyRefusal;
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
const adminAudience = computed(() =>
	getRestrictionContact(getViolationVerdict(firstViolation.value), firstViolation.value.projectId),
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
			{{ i18n.baseText(CONTACT_ADMIN_COPY[adminAudience].action) }}
		</N8nLink>
		<ContactAdminModal
			v-model:open="isContactAdminOpen"
			:node-type-name="adminSubject"
			:kind="adminSubjectKind"
			:audience="adminAudience"
		/>
	</span>
</template>
