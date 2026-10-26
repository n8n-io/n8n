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
import { getProject, type Project } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, shallowReactive, shallowRef, watch } from 'vue';

import ContactAdminModal from '../components/ContactAdminModal.vue';
import RestrictedNodePopover from '../components/RestrictedNodePopover.vue';
import {
	getViolationVerdict,
	resolveRestrictionContact,
	sharedRestrictionContact,
} from '../composables/useNodeTypeRestriction';
import {
	RESTRICTION_CONTACT_COPY,
	type ContactAudience,
	type RestrictedTypeKind,
} from '../type-availability-policies.constants';

const { violations, projectId, projectName, labelOf } = defineProps<{
	violations: PolicyViolation[];
	/** The move destination. Its type and admins decide whom to contact. */
	projectId: string;
	projectName: string;
	labelOf: (violation: PolicyViolation) => string | undefined;
}>();

defineSlots<{ icon(props: { violation: PolicyViolation }): unknown }>();

const open = defineModel<boolean>('open', { default: false });

const i18n = useI18n();

const isContactAdminOpen = ref(false);

// Loaded on mount, so the contact copy is right when the dialog opens. Until it loads, or if
// it fails, the copy names the instance admin.
const destination = shallowRef<Project | null>(null);
watch(
	() => projectId,
	async (id) => {
		destination.value = null;
		const project = await getProject(useRootStore().restApiContext, id).catch(() => null);
		if (id === projectId) destination.value = project;
	},
	{ immediate: true },
);
const destinationType = computed(() => destination.value?.type ?? null);

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

function kindOf(violation: PolicyViolation): RestrictedTypeKind {
	return violation.subjectType === 'credentialType' ? 'credential' : 'node';
}

const rows = computed(() =>
	violations.map((violation) => ({
		key: `${violation.subjectType ?? ''}:${violation.subject ?? violation.message}`,
		text: rowText(violation),
		name: nameOf(violation),
		kind: kindOf(violation),
		verdict: getViolationVerdict(violation),
		violation,
	})),
);

const rowElements = shallowReactive(new Map<string, HTMLElement>());
function setRowElement(key: string, element: unknown) {
	if (element instanceof HTMLElement) rowElements.set(key, element);
	else rowElements.delete(key);
}

const sharedContactCopy = computed(
	() =>
		RESTRICTION_CONTACT_COPY[
			sharedRestrictionContact(
				rows.value.map((row) => resolveRestrictionContact(row.verdict, destinationType.value)),
			)
		],
);

const allKind = computed<RestrictedTypeKind>(() =>
	rows.value.every((row) => row.kind === 'credential') ? 'credential' : 'node',
);

/** Whom the contact dialog writes to, and about what: every row from the footer, one from a row. */
const contact = ref<{ audience: ContactAudience; names: string[]; kind: RestrictedTypeKind }>({
	audience: 'instance',
	names: [],
	kind: 'node',
});

function openContact(target: typeof contact.value) {
	contact.value = target;
	isContactAdminOpen.value = true;
}

function contactForAll() {
	openContact({
		audience: sharedContactCopy.value.audience,
		names: rows.value.map((row) => row.name),
		kind: allKind.value,
	});
}
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
				<li
					v-for="row in rows"
					:key="row.key"
					:ref="(element) => setRowElement(row.key, element)"
					:class="$style.row"
				>
					<span :class="$style.icon"><slot name="icon" :violation="row.violation" /></span>
					<N8nText size="medium" color="text-dark" :class="$style.name">{{ row.text }}</N8nText>
					<RestrictedNodePopover
						:node-type-name="row.name"
						:restriction="row.verdict"
						:kind="row.kind"
						:project-type="destinationType"
						:anchor="rowElements.get(row.key)"
						side="right"
						@contact-admin="
							(audience) => openContact({ audience, names: [row.name], kind: row.kind })
						"
					/>
				</li>
			</ul>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton
				variant="outline"
				icon="mail"
				data-test-id="restricted-types-contact-admin"
				@click="contactForAll"
			>
				{{ i18n.baseText(sharedContactCopy.action) }}
			</N8nButton>
			<N8nButton variant="solid" data-test-id="restricted-types-close" @click="open = false">
				{{ i18n.baseText('generic.close') }}
			</N8nButton>
		</N8nDialogFooter>
		<ContactAdminModal
			v-model:open="isContactAdminOpen"
			:node-type-name="contact.names"
			:kind="contact.kind"
			:audience="contact.audience"
			:project="destination"
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

.name {
	flex: 1;
}
</style>
