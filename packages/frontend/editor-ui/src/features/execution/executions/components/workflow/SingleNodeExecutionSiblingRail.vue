<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nText } from '@n8n/design-system';

import { useExecutionsStore } from '../../executions.store';
import type { ExecutionSummaryWithScopes } from '../../executions.types';
import { VIEWS } from '@/app/constants';

const props = defineProps<{
	sessionId: string;
	currentExecutionId: string | undefined;
}>();

const locale = useI18n();
const router = useRouter();
const executionsStore = useExecutionsStore();

const siblings = ref<ExecutionSummaryWithScopes[]>([]);
const loading = ref(true);
const failed = ref(false);

/**
 * Fetch every execution sharing this `caller.sessionId`. The store helper
 * already sorts ascending by `startedAt`, so the timeline reads top→bottom
 * in chronological order (oldest first, newest last). The current execution
 * is included and highlighted; no entries are filtered out.
 */
watch(
	() => props.sessionId,
	async (sessionId) => {
		if (!sessionId) {
			siblings.value = [];
			loading.value = false;
			return;
		}
		loading.value = true;
		failed.value = false;
		try {
			const result = await executionsStore.fetchSessionExecutions(sessionId);
			siblings.value = Array.isArray(result) ? result : [];
		} catch (error) {
			failed.value = true;
			siblings.value = [];
			console.error('[SingleNodeExecutionSiblingRail] Failed to fetch session timeline', error);
		} finally {
			loading.value = false;
		}
	},
	{ immediate: true },
);

function statusIcon(status: ExecutionSummaryWithScopes['status']) {
	if (status === 'success') return 'circle-check';
	if (status === 'error' || status === 'crashed') return 'circle-x';
	return 'circle-ellipsis';
}

function statusColor(status: ExecutionSummaryWithScopes['status']) {
	if (status === 'success') return 'success';
	if (status === 'error' || status === 'crashed') return 'danger';
	return 'secondary';
}

function navigateTo(exec: ExecutionSummaryWithScopes) {
	if (!exec.id || exec.id === props.currentExecutionId) return;
	void router.push({
		name: VIEWS.EXECUTION_PREVIEW,
		params: { workflowId: exec.workflowId, executionId: exec.id },
	});
}

const heading = computed(() =>
	locale.baseText('executionDetails.singleNode.timelineHeading', {
		interpolate: { count: String(siblings.value.length) },
	}),
);
</script>

<template>
	<aside :class="$style.rail" data-test-id="single-node-execution-rail">
		<N8nText :class="$style.title" size="xsmall" color="text-light" bold>
			{{ heading }}
		</N8nText>
		<template v-if="loading">
			<N8nText size="small" color="text-light">…</N8nText>
		</template>
		<template v-else-if="failed">
			<!-- silent shell: empty body, error already logged -->
		</template>
		<template v-else-if="siblings.length === 0">
			<N8nText size="small" color="text-light">
				{{ locale.baseText('executionDetails.singleNode.railEmpty') }}
			</N8nText>
		</template>
		<ol v-else :class="$style.items">
			<li
				v-for="exec in siblings"
				:key="exec.id"
				:class="[$style.item, exec.id === currentExecutionId ? $style.active : '']"
				data-test-id="single-node-execution-rail-item"
				@click="navigateTo(exec)"
			>
				<N8nIcon :icon="statusIcon(exec.status)" size="small" :color="statusColor(exec.status)" />
				<N8nText size="small" :class="$style.label">
					{{ exec.actionDisplayName ?? exec.nodeType ?? exec.id }}
				</N8nText>
			</li>
		</ol>
	</aside>
</template>

<style lang="scss" module>
.rail {
	width: 240px;
	padding: var(--spacing--sm) var(--spacing--xs);
	background: var(--color--background--xlight);
	border-right: var(--border-width--base) solid var(--color--foreground--shade-1);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	overflow-y: auto;
	flex-shrink: 0;
}

.title {
	text-transform: uppercase;
	letter-spacing: 0.5px;
	padding: 0 var(--spacing--2xs);
}

.items {
	list-style: none;
	padding: 0;
	margin: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-radius: var(--radius);
	cursor: pointer;
	position: relative;
	border-left: 3px solid transparent;

	&:hover {
		background: var(--color--background--shade-1);
	}
}

.active {
	background: var(--color--primary--tint-3);
	border-left-color: var(--color--primary);
	font-weight: var(--font-weight--bold);
	cursor: default;

	.label {
		color: var(--color--primary--shade-1);
	}

	&:hover {
		background: var(--color--primary--tint-3);
	}
}

.label {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
