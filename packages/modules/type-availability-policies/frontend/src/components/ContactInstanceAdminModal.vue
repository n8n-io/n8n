<script lang="ts" setup>
import { ROLE } from '@n8n/api-types';
import { N8nAvatar, N8nDialog, N8nLink, N8nLoading, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUsersStore } from '@n8n/stores/users.store';
import { computed, ref, watch } from 'vue';

const { nodeTypeName } = defineProps<{
	nodeTypeName: string;
}>();

const open = defineModel<boolean>('open', { default: false });

const i18n = useI18n();
const usersStore = useUsersStore();

const isLoading = ref(false);
let lookupId = 0;

const description = computed(() =>
	i18n.baseText('typeAvailabilityPolicies.contactAdmin.description', {
		interpolate: { nodeType: nodeTypeName },
	}),
);
const mailSubject = computed(() =>
	i18n.baseText('typeAvailabilityPolicies.contactAdmin.mailSubject', {
		interpolate: { nodeType: nodeTypeName },
	}),
);

const owners = computed(() =>
	usersStore.allUsers.filter(
		(user) => user.role === ROLE.Owner && !user.isPendingUser && Boolean(user.email),
	),
);

watch(
	open,
	async (isOpen) => {
		if (!isOpen) return;

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
		:header="i18n.baseText('typeAvailabilityPolicies.contactAdmin.title')"
		:description="description"
		size="medium"
		data-test-id="contact-instance-admin-modal"
	>
		<N8nLoading v-if="isLoading" :rows="2" variant="p" :class="$style.body" />
		<ul
			v-else-if="owners.length"
			:class="[$style.body, $style.list]"
			data-test-id="contact-instance-admin-list"
		>
			<li v-for="owner in owners" :key="owner.id" :class="$style.owner">
				<N8nAvatar :first-name="owner.firstName" :last-name="owner.lastName" size="small" />
				<div :class="$style.identity">
					<N8nText size="medium" color="text-dark">{{ owner.fullName }}</N8nText>
					<N8nLink :to="mailtoHref(owner.email ?? '')" size="small" theme="text">
						{{ owner.email }}
					</N8nLink>
				</div>
			</li>
		</ul>
		<N8nText
			v-else
			tag="p"
			size="small"
			color="text-base"
			:class="$style.body"
			data-test-id="contact-instance-admin-empty"
		>
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
	gap: var(--spacing--lg);
}

.body {
	margin-top: var(--spacing--lg);
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
