<script setup lang="ts">
import { useRolesStore } from '@/app/stores/roles.store';
import { N8nDialog, N8nIconButton, N8nLoading, N8nText, N8nUserInfo } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ref, watch } from 'vue';

import type { RoleProjectMembersResponse } from '@n8n/api-types';

const props = defineProps<{
	open: boolean;
	projectId: string;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
}>();

const rolesStore = useRolesStore();
const i18n = useI18n();

const membersData = ref<RoleProjectMembersResponse>({ members: [] });
const isLoading = ref(false);

watch(
	() => props.open,
	async (isOpen) => {
		if (!isOpen) return;

		isLoading.value = true;
		try {
			membersData.value = await rolesStore.fetchRoleProjectMembers(
				'project:admin',
				props.projectId,
			);
		} finally {
			isLoading.value = false;
		}
	},
	{ immediate: true },
);
</script>

<template>
	<N8nDialog
		:open="open"
		size="medium"
		:show-close-button="false"
		@update:open="emit('update:open', $event)"
	>
		<div :class="$style.header">
			<N8nIconButton
				icon="chevron-left"
				variant="ghost"
				size="small"
				:aria-label="i18n.baseText('generic.back')"
				@click="emit('update:open', false)"
			/>
			<N8nText tag="h2" size="large" bold>
				{{ i18n.baseText('workflowSettings.redactionMembersModal.title') }}
			</N8nText>
		</div>

		<div :class="$style.content">
			<N8nText color="text-base" size="small" :class="$style.description">
				{{ i18n.baseText('workflowSettings.redactionMembersModal.description') }}
			</N8nText>
			<N8nLoading v-if="isLoading" :rows="3" />
			<div v-else :class="$style.memberList">
				<div v-for="member in membersData.members" :key="member.userId" :class="$style.memberRow">
					<N8nUserInfo
						:first-name="member.firstName"
						:last-name="member.lastName"
						:email="member.email"
					/>
				</div>
			</div>
		</div>
	</N8nDialog>
</template>

<style lang="css" module>
.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding-bottom: var(--spacing--xs);
}

.content {
	max-height: 400px;
	overflow-y: auto;
}

.description {
	display: block;
	margin-bottom: var(--spacing--sm);
}

.memberList {
	display: flex;
	flex-direction: column;
}

.memberRow {
	display: flex;
	align-items: center;
	padding: var(--spacing--xs) 0;
	border-bottom: var(--border);
}

.memberRow:last-child {
	border-bottom: none;
}
</style>
