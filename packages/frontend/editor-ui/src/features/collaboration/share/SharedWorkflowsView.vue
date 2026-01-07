<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { supabase } from '@/plugins/supabase';
import { useUsersStore } from '@/features/settings/users/users.store';
import { N8nCard, N8nText, N8nButton, N8nHeading } from '@n8n/design-system';
import { useRouter } from 'vue-router';
import { useWorkflowsStore } from '@/app/stores/workflows.store'; // To open workflow

const usersStore = useUsersStore();
const router = useRouter();
const loading = ref(true);
const shares = ref<any[]>([]);

const fetchSharedWorkflows = async () => {
	loading.value = true;
	try {
		const { data, error } = await supabase
			.from('oo_shares')
			.select('*')
			.eq('shared_user_id', usersStore.currentUserId);

		if (error) throw error;
		shares.value = data || [];
	} catch (e) {
		console.error(e);
	} finally {
		loading.value = false;
	}
};

const openWorkflow = (workflowId: string) => {
	router.push({ name: 'workflow', params: { name: workflowId } }); // Usually route is 'workflow' with id
};

onMounted(() => {
	fetchSharedWorkflows();
});
</script>

<template>
	<div class="shared-workflows-view">
		<div class="header">
			<N8nHeading tag="h1" size="2xlarge">My OO Share</N8nHeading>
			<N8nText>Workflows shared with you for collaboration.</N8nText>
		</div>

		<div v-if="loading" class="loading">Loading...</div>

		<div v-else-if="shares.length === 0" class="empty">
			<N8nText>No workflows shared with you yet.</N8nText>
		</div>

		<div v-else class="grid">
			<N8nCard
				v-for="share in shares"
				:key="share.id"
				class="share-card"
				@click="openWorkflow(share.workflow_id)"
			>
				<template #header>
					<N8nHeading tag="h3" size="medium">Workflow ID: {{ share.workflow_id }}</N8nHeading>
				</template>
				<div class="card-content">
					<N8nText size="small" color="text-light">Shared by: {{ share.primary_user_id }}</N8nText>
					<br />
					<N8nText size="small" color="text-light"
						>Date: {{ new Date(share.created_at).toLocaleDateString() }}</N8nText
					>
				</div>
			</N8nCard>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.shared-workflows-view {
	padding: var(--spacing--m);
	height: 100%;
	overflow-y: auto;
}
.header {
	margin-bottom: var(--spacing--l);
}
.grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
	gap: var(--spacing--m);
}
.share-card {
	cursor: pointer;
	transition: transform 0.2s;
	&:hover {
		transform: translateY(-2px);
	}
}
</style>
