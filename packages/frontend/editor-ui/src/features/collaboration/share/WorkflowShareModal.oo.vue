<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { N8nButton, N8nSelect, N8nText } from '@n8n/design-system';
import Modal from '@/app/components/Modal.vue';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { supabase } from '@/plugins/supabase';
import { useToast } from '@/app/composables/useToast';
import { useUIStore } from '@/app/stores/ui.store';

const props = defineProps<{
	name: string;
}>();

const usersStore = useUsersStore();
const workflowsStore = useWorkflowsStore();
const toast = useToast();
const uiStore = useUIStore();

const selectedUser = ref('');
const users = ref<any[]>([]);
const loading = ref(false);

const fetchUsers = async () => {
	try {
		loading.value = true;
		const { data, error } = await supabase.from('user').select('id, email, firstName, lastName');

		if (error) throw error;

		users.value = data
			.filter((u: any) => u.id !== usersStore.currentUserId)
			.map((u: any) => ({
				label: `${u.firstName || ''} ${u.lastName || ''} (${u.email})`.trim(),
				value: u.id,
			}));
	} catch (e) {
		console.error(e);
		toast.showError(e, 'Failed to fetch users from Supabase');
	} finally {
		loading.value = false;
	}
};

const share = async () => {
	if (!selectedUser.value) return;

	loading.value = true;
	try {
		// User requested 'workflow_entity' column usage for native workflow ID
		const { error } = await supabase.from('oo_shares').insert({
			workflow_entity: workflowsStore.workflowId,
			shared_user_id: selectedUser.value,
			primary_user_id: usersStore.currentUserId,
		});

		if (error) throw error;

		toast.showMessage({ title: 'Workflow shared successfully', type: 'success' });
		uiStore.closeModal(props.name);
	} catch (e: any) {
		console.error(e);
		toast.showError(e, 'Error sharing workflow');
	} finally {
		loading.value = false;
	}
};

onMounted(() => {
	fetchUsers();
});
</script>

<template>
	<Modal :name="name" title="Share Workflow">
		<template #content>
			<div class="share-content">
				<N8nText class="mb-s">Select a user to collaborate with on this workflow.</N8nText>
				<N8nSelect
					class="mb-m"
					v-model="selectedUser"
					:options="users"
					placeholder="Select user"
					filterable
				/>
				<div class="actions">
					<N8nButton @click="share" :loading="loading" size="large" label="Share Workflow" />
				</div>
			</div>
		</template>
	</Modal>
</template>

<style scoped>
.share-content {
	padding: 1rem 0;
}
.mb-s {
	margin-bottom: 0.5rem;
}
.mb-m {
	margin-bottom: 1rem;
}
.actions {
	display: flex;
	justify-content: flex-end;
}
</style>
