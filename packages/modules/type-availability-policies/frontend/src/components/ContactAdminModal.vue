<script lang="ts" setup>
import { ROLE } from '@n8n/api-types';
import {
	N8nAvatar,
	N8nDialog,
	N8nDialogBody,
	N8nDialogDescription,
	N8nLink,
	N8nLoading,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { PROJECT_ADMIN_ROLE_SLUG } from '@n8n/permissions';
import type { IUserResponse } from '@n8n/rest-api-client';
import { useUsersStore } from '@n8n/stores/users.store';
import { computed, ref, watch } from 'vue';

import {
	CONTACT_DIALOG_COPY,
	RESTRICTED_TYPE_COPY,
	type ContactAudience,
	type RestrictedTypeKind,
} from '../type-availability-policies.constants';
import { useTypeAvailabilityPoliciesStore } from '../type-availability-policies.store';

const {
	nodeTypeName,
	kind = 'node',
	audience = 'instance',
} = defineProps<{
	nodeTypeName: string;
	kind?: RestrictedTypeKind;
	audience?: ContactAudience;
}>();

const open = defineModel<boolean>('open', { default: false });

const i18n = useI18n();
const usersStore = useUsersStore();
const policiesStore = useTypeAvailabilityPoliciesStore();

const isLoading = ref(false);
let lookupId = 0;

const copy = computed(() => CONTACT_DIALOG_COPY[audience]);
const description = computed(() =>
	i18n.baseText(copy.value.description[kind], {
		interpolate: { nodeType: nodeTypeName },
	}),
);
const mailSubject = computed(() =>
	i18n.baseText(RESTRICTED_TYPE_COPY[kind].mailSubject, {
		interpolate: { nodeType: nodeTypeName },
	}),
);

type Admin = Pick<IUserResponse, 'id' | 'firstName' | 'lastName'> & { email: string };

function hasEmail<T extends { email?: string | null }>(person: T): person is T & { email: string } {
	return Boolean(person.email);
}

function displayName({ firstName, lastName, email }: Admin): string {
	return [firstName, lastName].filter(Boolean).join(' ') || email;
}

const instanceAdmins = computed<Admin[]>(() =>
	usersStore.allUsers
		.filter((user) => user.role === ROLE.Owner && !user.isPendingUser)
		.filter(hasEmail),
);

const projectAdmins = computed<Admin[]>(() => {
	const project = policiesStore.policyProject;
	const explicitAdmins = (project?.relations ?? [])
		.filter((relation) => relation.role === PROJECT_ADMIN_ROLE_SLUG)
		.filter(hasEmail);
	return explicitAdmins.length ? explicitAdmins : (project?.implicitMembers ?? []).filter(hasEmail);
});

const admins = computed(() =>
	audience === 'project' ? projectAdmins.value : instanceAdmins.value,
);

watch(
	open,
	async (isOpen) => {
		if (!isOpen || audience === 'project') return;

		// A reopen can start a second lookup before the first resolves; only the latest one ends loading.
		const id = ++lookupId;
		isLoading.value = true;
		await usersStore.fetchUsers({ filter: { isOwner: true } }).catch(() => undefined);
		if (id === lookupId) isLoading.value = false;
	},
	{ immediate: true },
);

function mailtoHref(email: string): string {
	return `mailto:${email}?subject=${encodeURIComponent(mailSubject.value)}`;
}
</script>

<template>
	<N8nDialog
		v-model:open="open"
		:header="i18n.baseText(copy.title)"
		size="medium"
		stacked
		data-test-id="contact-admin-modal"
	>
		<N8nDialogBody :class="$style.body">
			<N8nDialogDescription>{{ description }}</N8nDialogDescription>
			<N8nLoading v-if="isLoading" :rows="2" variant="p" />
			<ul v-else-if="admins.length" :class="$style.list" data-test-id="contact-admin-list">
				<li v-for="admin in admins" :key="admin.id" :class="$style.admin">
					<N8nAvatar :first-name="admin.firstName" :last-name="admin.lastName" size="small" />
					<div :class="$style.identity">
						<N8nText size="medium" color="text-dark">{{ displayName(admin) }}</N8nText>
						<N8nLink :to="mailtoHref(admin.email)" size="small" theme="text">
							{{ admin.email }}
						</N8nLink>
					</div>
				</li>
			</ul>
			<N8nText v-else tag="p" size="small" color="text-base" data-test-id="contact-admin-empty">
				{{ i18n.baseText(copy.empty) }}
			</N8nText>
		</N8nDialogBody>
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

.admin {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) 0;
	border-bottom: var(--border);

	&:last-child {
		border-bottom: none;
	}
}

.identity {
	display: flex;
	flex-direction: column;
	min-width: 0;
}
</style>
