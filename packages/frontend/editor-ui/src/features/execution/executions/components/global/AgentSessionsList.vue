<script lang="ts" setup>
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@/app/composables/useToast';
import { MODAL_CONFIRM } from '@/app/constants';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import { useAgentSessionsStore } from '@/features/agents/agentSessions.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useI18n } from '@n8n/i18n';
import { computed, onBeforeUnmount, onMounted } from 'vue';

import { N8nActionDropdown, N8nButton, N8nTableBase } from '@n8n/design-system';
import { ElSkeletonItem } from 'element-plus';

const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const sessionsStore = useAgentSessionsStore();
const projectsStore = useProjectsStore();

const projectId = computed(
	() => projectsStore.currentProjectId ?? projectsStore.personalProject?.id ?? '',
);

onMounted(async () => {
	if (projectId.value) {
		try {
			await sessionsStore.fetchThreads(projectId.value);
			sessionsStore.startAutoRefresh();
		} catch (error) {
			toast.showError(error, i18n.baseText('agentSessions.showError.load'));
		}
	}
});

onBeforeUnmount(() => {
	sessionsStore.stopAutoRefresh();
});

function formatDate(fullDate: string) {
	const { date, time } = convertToDisplayDate(fullDate);
	return `${date} ${time}`;
}

function formatTokens(count: number): string {
	return count.toLocaleString();
}

const deleteActions = [
	{ id: 'delete', label: i18n.baseText('generic.delete'), icon: 'trash' as const },
];

async function onAction(actionId: string, threadId: string) {
	if (actionId !== 'delete') return;

	const confirmed = await message.confirm(
		i18n.baseText('agentSessions.deleteConfirm.message'),
		i18n.baseText('agentSessions.deleteConfirm.headline'),
		{
			type: 'warning',
			confirmButtonText: i18n.baseText('agentSessions.deleteConfirm.confirmButtonText'),
			cancelButtonText: '',
		},
	);

	if (confirmed !== MODAL_CONFIRM) return;

	try {
		await sessionsStore.deleteThread(projectId.value, threadId);
		toast.showMessage({
			title: i18n.baseText('agentSessions.showMessage.deleted'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('agentSessions.showError.delete'));
	}
}

async function loadMore() {
	try {
		await sessionsStore.loadMore(projectId.value);
	} catch (error) {
		toast.showError(error, i18n.baseText('agentSessions.showError.load'));
	}
}
</script>

<template>
	<div :class="$style.sessionsList">
		<div :class="$style.sessionsTable">
			<N8nTableBase>
				<thead>
					<tr>
						<th>{{ i18n.baseText('agentSessions.session') }}</th>
						<th>{{ i18n.baseText('agentSessions.agentName') }}</th>
						<th>{{ i18n.baseText('agentSessions.lastMessage') }}</th>
						<th>{{ i18n.baseText('agentSessions.tokenUsage') }}</th>
						<th style="width: 50px"></th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="thread in sessionsStore.threads"
						:key="thread.id"
						data-test-id="agent-session-list-item"
					>
						<td :class="$style.sessionNumber">#{{ thread.sessionNumber }}</td>
						<td>{{ thread.agentName }}</td>
						<td>{{ formatDate(thread.updatedAt) }}</td>
						<td>{{ formatTokens(thread.totalPromptTokens + thread.totalCompletionTokens) }}</td>
						<td>
							<N8nActionDropdown
								:items="deleteActions"
								activator-icon="ellipsis"
								data-test-id="agent-session-actions"
								@select="onAction($event, thread.id)"
							/>
						</td>
					</tr>
					<template v-if="sessionsStore.loading && !sessionsStore.threads.length">
						<tr v-for="item in 5" :key="item">
							<td v-for="col in 5" :key="col">
								<ElSkeletonItem />
							</td>
						</tr>
					</template>
					<tr>
						<td colspan="5" style="text-align: center">
							<template v-if="!sessionsStore.threads.length && !sessionsStore.loading">
								<span data-test-id="agent-sessions-empty">
									{{ i18n.baseText('agentSessions.empty') }}
								</span>
							</template>
							<template v-else-if="sessionsStore.nextCursor">
								<N8nButton
									icon="refresh-cw"
									:title="i18n.baseText('agentSessions.loadMore')"
									:label="i18n.baseText('agentSessions.loadMore')"
									:loading="sessionsStore.loading"
									data-test-id="agent-sessions-load-more"
									@click="loadMore()"
								/>
							</template>
							<template v-else-if="sessionsStore.threads.length">
								{{ i18n.baseText('agentSessions.loadedAll') }}
							</template>
						</td>
					</tr>
				</tbody>
			</N8nTableBase>
		</div>
	</div>
</template>

<style module lang="scss">
.sessionsList {
	flex-shrink: 1;
	max-height: 100%;
	overflow: auto;
}

.sessionsTable {
	height: 100%;
	flex: 0 1 auto;
}

.sessionNumber {
	font-weight: var(--font-weight--bold);
}
</style>
