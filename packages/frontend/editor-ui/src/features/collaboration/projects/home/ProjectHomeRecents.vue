<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { N8nBadge, N8nHeading, N8nText } from '@n8n/design-system';
import { VIEWS } from '@/app/constants';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';

interface RecentWorkflow {
	id: string;
	name: string;
	active: boolean;
	updatedAt: string;
}

const props = defineProps<{
	projectId: string;
}>();

const i18n = useI18n();
const router = useRouter();
const workflowsListStore = useWorkflowsListStore();

const recents = ref<RecentWorkflow[]>([]);
const loading = ref(true);

onMounted(async () => {
	try {
		const resources = await workflowsListStore.fetchWorkflowsPage(
			props.projectId,
			1,
			6,
			'updatedAt:desc',
			{ isArchived: false },
		);
		recents.value = resources
			.filter((resource) => resource.resource !== 'folder')
			.map((workflow) => ({
				id: workflow.id,
				name: workflow.name,
				active: 'active' in workflow ? Boolean(workflow.active) : false,
				updatedAt: String(workflow.updatedAt ?? ''),
			}));
	} finally {
		loading.value = false;
	}
});

function timeAgo(date: string): string {
	if (!date) return '';
	const diffMs = Date.now() - new Date(date).getTime();
	const minutes = Math.round(diffMs / 60000);
	if (minutes < 60) return `${Math.max(minutes, 1)}m ago`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	return `${Math.round(hours / 24)}d ago`;
}

function openWorkflow(workflowId: string) {
	void router.push({ name: VIEWS.WORKFLOW, params: { name: workflowId } });
}

function openAllWorkflows() {
	void router.push({ name: VIEWS.PROJECTS_WORKFLOWS, params: { projectId: props.projectId } });
}
</script>

<template>
	<section :class="$style.section" data-test-id="project-home-recents">
		<div :class="$style.sectionHeader">
			<N8nHeading tag="h2" size="medium" bold>
				{{ i18n.baseText('projectHome.recents.title') }}
			</N8nHeading>
			<button :class="$style.viewAll" @click="openAllWorkflows">
				{{ i18n.baseText('projectHome.recents.viewAll') }}
			</button>
		</div>

		<N8nText v-if="!loading && recents.length === 0" color="text-light">
			{{ i18n.baseText('projectHome.recents.empty') }}
		</N8nText>

		<div v-else :class="$style.list">
			<button
				v-for="workflow in recents"
				:key="workflow.id"
				:class="$style.item"
				@click="openWorkflow(workflow.id)"
			>
				<div :class="$style.itemMain">
					<N8nText bold :class="$style.itemTitle">{{ workflow.name }}</N8nText>
					<N8nText size="small" color="text-light">
						{{
							i18n.baseText('projectHome.recents.updated', {
								interpolate: { time: timeAgo(workflow.updatedAt) },
							})
						}}
					</N8nText>
				</div>
				<N8nBadge :theme="workflow.active ? 'success' : 'tertiary'">
					{{ workflow.active ? 'Active' : 'Inactive' }}
				</N8nBadge>
			</button>
		</div>
	</section>
</template>

<style lang="scss" module>
.section {
	margin-bottom: var(--spacing--lg);
}

.sectionHeader {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	margin-bottom: var(--spacing--xs);
}

.viewAll {
	background: none;
	border: none;
	padding: 0;
	color: var(--color--primary);
	font-size: var(--font-size--2xs);
	cursor: pointer;
}

.list {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
	gap: var(--spacing--2xs);
}

.item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
	background: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius--lg);
	padding: var(--spacing--2xs) var(--spacing--sm);
	cursor: pointer;
	text-align: left;

	&:hover {
		border-color: var(--color--foreground--shade-1);
	}
}

.itemMain {
	min-width: 0;
}

.itemTitle {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
