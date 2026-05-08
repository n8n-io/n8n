<script lang="ts" setup>
import { truncate } from '@n8n/utils';
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@/app/composables/useToast';
import { MODAL_CONFIRM } from '@/app/constants';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import { useAgentSessionsStore } from '@/features/agents/agentSessions.store';
import { AGENT_SESSION_DETAIL_VIEW } from '@/features/agents/constants';
import { useThreadTitle } from '@/features/agents/utils/thread-title';
import { useI18n } from '@n8n/i18n';
import { computed, onBeforeUnmount, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { N8nActionDropdown, N8nButton, N8nTableBase } from '@n8n/design-system';
import { ElSkeletonItem } from 'element-plus';

const i18n = useI18n();
const threadTitleOf = useThreadTitle();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const message = useMessage();
const sessionsStore = useAgentSessionsStore();

const projectId = computed(() => route.params.projectId as string);
const agentId = computed(() => route.params.agentId as string);

function onVisibilityChange() {
	// Refresh as soon as the user returns to the tab — auto-refresh is
	// throttled while the document is hidden, so a silent merge-refresh on
	// return closes the gap before the next interval tick without flashing
	// the load-more button or dropping paginated pages.
	if (document.visibilityState !== 'visible') return;
	if (!projectId.value || !agentId.value) return;
	void sessionsStore.refreshThreads(projectId.value, agentId.value);
}

onMounted(async () => {
	if (projectId.value && agentId.value) {
		try {
			await sessionsStore.fetchThreads(projectId.value, agentId.value);
			sessionsStore.startAutoRefresh();
		} catch (error) {
			toast.showError(error, i18n.baseText('agentSessions.showError.load'));
		}
	}
	document.addEventListener('visibilitychange', onVisibilityChange);
});

onBeforeUnmount(() => {
	document.removeEventListener('visibilitychange', onVisibilityChange);
	sessionsStore.stopAutoRefresh();
});

function formatDate(fullDate: string) {
	const { date, time } = convertToDisplayDate(fullDate);
	return `${date} ${time}`;
}

function formatTokens(count: number): string {
	return count.toLocaleString();
}

function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	return `${(ms / 1000).toFixed(1)}s`;
}

const deleteActions = [
	{ id: 'delete', label: i18n.baseText('generic.delete'), icon: 'trash-2' as const },
];

function onRowClick(threadId: string) {
	void router.push({
		name: AGENT_SESSION_DETAIL_VIEW,
		params: { projectId: projectId.value, agentId: agentId.value, threadId },
	});
}

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
		await sessionsStore.loadMore(projectId.value, agentId.value);
	} catch (error) {
		toast.showError(error, i18n.baseText('agentSessions.showError.load'));
	}
}
</script>

<template>
	<div :class="$style.wrapper">
		<div :class="$style.tableContainer">
			<N8nTableBase>
				<thead>
					<tr>
						<th>{{ i18n.baseText('agentSessions.sessionName') }}</th>
						<th>{{ i18n.baseText('agentSessions.lastMessage') }}</th>
						<th>{{ i18n.baseText('agentSessions.duration') }}</th>
						<th>{{ i18n.baseText('agentSessions.tokenUsage') }}</th>
						<th>{{ i18n.baseText('agentSessions.sessionId') }}</th>
						<th style="width: 50px"></th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="thread in sessionsStore.threads"
						:key="thread.id"
						:class="$style.clickableRow"
						data-test-id="agent-session-list-item"
						@click="onRowClick(thread.id)"
					>
						<td>{{ truncate(threadTitleOf(thread), 24) }}</td>
						<td>{{ formatDate(thread.updatedAt) }}</td>
						<td>{{ formatDuration(thread.totalDuration) }}</td>
						<td>{{ formatTokens(thread.totalPromptTokens + thread.totalCompletionTokens) }}</td>
						<td>{{ thread.sessionNumber }}</td>
						<td @click.stop>
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
							<td v-for="col in 6" :key="col">
								<ElSkeletonItem />
							</td>
						</tr>
					</template>
					<tr>
						<td colspan="6" style="text-align: center">
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
.wrapper {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--lg);
	height: 100%;
	min-height: 0;
	overflow-y: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
}

.tableContainer {
	width: 100%;
	overflow-x: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
}

.clickableRow {
	cursor: pointer;

	&:hover {
		background-color: var(--background--hover);
	}
}
</style>
