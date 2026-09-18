<script lang="ts" setup>
import { ROLE } from '@n8n/api-types';
import { N8nAvatar, N8nDialog, N8nLink, N8nLoading, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUsersStore } from '@n8n/stores/users.store';
import { computed, ref, watch } from 'vue';

const props = defineProps<{
	description: string;
	mailSubject?: string;
}>();

const open = defineModel<boolean>('open', { default: false });

const i18n = useI18n();
const usersStore = useUsersStore();

const isLoading = ref(false);

const owners = computed(() =>
	usersStore.allUsers.filter(
		(user) => user.role === ROLE.Owner && !user.isPendingUser && Boolean(user.email),
	),
);

watch(
	open,
	async (isOpen) => {
		if (!isOpen) return;

		isLoading.value = true;
		await usersStore.fetchUsers({ filter: { isOwner: true } }).catch(() => undefined);
		isLoading.value = false;
	},
	{ immediate: true },
);

function mailtoHref(email: string): string {
	const subject = props.mailSubject ? `?subject=${encodeURIComponent(props.mailSubject)}` : '';
	return `mailto:${email}${subject}`;
}
</script>

<template>
	<N8nDialog
		v-model:open="open"
		:header="i18n.baseText('typeAvailabilityPolicies.contactAdmin.title')"
		:description="description"
		size="small"
		data-test-id="contact-instance-admin-modal"
	>
		<N8nLoading v-if="isLoading" :rows="2" variant="p" />
		<ul v-else-if="owners.length" :class="$style.list" data-test-id="contact-instance-admin-list">
			<li v-for="owner in owners" :key="owner.id" :class="$style.owner">
				<N8nAvatar :first-name="owner.firstName" :last-name="owner.lastName" size="small" />
				<div :class="$style.identity">
					<N8nText size="small" color="text-dark" bold>{{ owner.fullName }}</N8nText>
					<N8nLink :to="mailtoHref(owner.email ?? '')" size="small" theme="text">
						{{ owner.email }}
					</N8nLink>
				</div>
			</li>
		</ul>
		<N8nText v-else size="small" color="text-base" data-test-id="contact-instance-admin-empty">
			{{ i18n.baseText('typeAvailabilityPolicies.contactAdmin.empty') }}
		</N8nText>
	</N8nDialog>
</template>

<style lang="scss" module>
.list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.owner {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.identity {
	display: flex;
	flex-direction: column;
	min-width: 0;
}
</style>
