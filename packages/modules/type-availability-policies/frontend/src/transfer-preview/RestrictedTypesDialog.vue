<script setup lang="ts">
import type { PolicyViolation } from '@n8n/api-types';
import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogDescription,
	N8nDialogFooter,
	N8nText,
} from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed, ref } from 'vue';

import ContactAdminModal from '../components/ContactAdminModal.vue';

const { violations, projectName, labelOf } = defineProps<{
	violations: PolicyViolation[];
	projectName: string;
	labelOf: (violation: PolicyViolation) => string | undefined;
}>();

defineSlots<{ icon(props: { violation: PolicyViolation }): unknown }>();

const open = defineModel<boolean>('open', { default: false });

const i18n = useI18n();

const isContactAdminOpen = ref(false);

const NAME_KEY_BY_SUBJECT_TYPE: Record<string, BaseTextKey | undefined> = {
	nodeType: 'typeAvailabilityPolicies.violations.nodeType',
	credentialType: 'typeAvailabilityPolicies.violations.credentialType',
};

function nameOf(violation: PolicyViolation): string {
	return labelOf(violation) ?? violation.subject ?? violation.message;
}

function rowText(violation: PolicyViolation): string {
	const key = violation.subjectType ? NAME_KEY_BY_SUBJECT_TYPE[violation.subjectType] : undefined;
	return key ? i18n.baseText(key, { interpolate: { name: nameOf(violation) } }) : nameOf(violation);
}

const rows = computed(() =>
	violations.map((violation) => ({
		key: `${violation.subjectType ?? ''}:${violation.subject ?? violation.message}`,
		text: rowText(violation),
		violation,
	})),
);

const contactKind = computed(() =>
	violations.some((violation) => violation.subjectType === 'credentialType') &&
	!violations.some((violation) => violation.subjectType === 'nodeType')
		? 'credential'
		: 'node',
);
const contactTypeNames = computed(() => violations.map(nameOf));
</script>

<template>
	<N8nDialog
		v-model:open="open"
		:header="
			i18n.baseText('typeAvailabilityPolicies.transfer.dialog.title', {
				interpolate: { project: projectName },
			})
		"
		size="medium"
		stacked
		data-test-id="restricted-types-dialog"
	>
		<N8nDialogBody :class="$style.body">
			<N8nDialogDescription>
				{{
					i18n.baseText('typeAvailabilityPolicies.transfer.dialog.description', {
						interpolate: { project: projectName },
					})
				}}
			</N8nDialogDescription>
			<ul :class="$style.list" data-test-id="restricted-types-list">
				<li v-for="row in rows" :key="row.key" :class="$style.row">
					<span :class="$style.icon"><slot name="icon" :violation="row.violation" /></span>
					<N8nText size="medium" color="text-dark">{{ row.text }}</N8nText>
				</li>
			</ul>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton
				variant="outline"
				icon="mail"
				data-test-id="restricted-types-contact-admin"
				@click="isContactAdminOpen = true"
			>
				{{ i18n.baseText('typeAvailabilityPolicies.restrictedNode.contactAdmin') }}
			</N8nButton>
			<N8nButton variant="solid" data-test-id="restricted-types-close" @click="open = false">
				{{ i18n.baseText('generic.close') }}
			</N8nButton>
		</N8nDialogFooter>
		<ContactAdminModal
			v-model:open="isContactAdminOpen"
			:node-type-name="contactTypeNames"
			:kind="contactKind"
			audience="instance"
		/>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	max-height: 400px;
}

.list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) 0;
	border-bottom: var(--border);

	&:last-child {
		border-bottom: none;
	}
}

.icon {
	display: flex;
	flex-shrink: 0;
}
</style>
