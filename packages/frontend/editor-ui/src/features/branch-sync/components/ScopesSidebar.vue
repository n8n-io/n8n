<script lang="ts" setup>
import { N8nBadge, N8nButton, N8nLoading, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { ScopeSummary } from '@/features/branch-sync/branchSync.types';
import { shortSha } from '@/features/branch-sync/branchSync.utils';

defineProps<{
	scopes: ScopeSummary[];
	selectedScopeKey: string | null;
	loading: boolean;
}>();

const emit = defineEmits<{
	select: [scopeKey: string];
	connect: [];
}>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style.sidebar" data-test-id="branch-sync-sidebar">
		<div :class="$style.header">
			<N8nText bold size="medium">
				{{ i18n.baseText('branchSync.sidebar.title') }}
			</N8nText>
			<N8nButton
				size="small"
				icon="plus"
				data-test-id="branch-sync-connect-button"
				:label="i18n.baseText('branchSync.sidebar.connect')"
				@click="emit('connect')"
			/>
		</div>

		<N8nLoading v-if="loading" :loading="true" :rows="3" variant="p" />

		<div v-else-if="scopes.length === 0" :class="$style.empty">
			<N8nText color="text-light" size="small">
				{{ i18n.baseText('branchSync.sidebar.empty') }}
			</N8nText>
		</div>

		<ul v-else :class="$style.list">
			<li v-for="scope in scopes" :key="scope.scopeKey">
				<button
					type="button"
					:class="[$style.card, scope.scopeKey === selectedScopeKey && $style.selected]"
					data-test-id="branch-sync-scope-card"
					@click="emit('select', scope.scopeKey)"
				>
					<div :class="$style.cardTop">
						<N8nText bold size="small" :class="$style.cardTitle">{{ scope.scopeKey }}</N8nText>
						<N8nBadge :theme="scope.role === 'source' ? 'primary' : 'secondary'" size="small">
							{{
								i18n.baseText(
									scope.role === 'source'
										? 'branchSync.role.source'
										: 'branchSync.role.destination',
								)
							}}
						</N8nBadge>
					</div>
					<div :class="$style.cardBottom">
						<N8nText color="text-light" size="xsmall">{{ scope.branch }}</N8nText>
						<N8nText color="text-light" size="xsmall" :class="$style.sha">
							{{ shortSha(scope.baseCommit) }} → {{ shortSha(scope.head) }}
						</N8nText>
						<N8nText
							v-if="scope.aheadOfBase"
							color="text-light"
							size="xsmall"
							:class="$style.ahead"
						>
							{{
								i18n.baseText('branchSync.sidebar.ahead', {
									interpolate: { count: String(scope.aheadOfBase) },
								})
							}}
						</N8nText>
					</div>
				</button>
			</li>
		</ul>
	</div>
</template>

<style lang="scss" module>
.sidebar {
	display: flex;
	flex-direction: column;
	width: 340px;
	flex-shrink: 0;
	min-height: 0;
	border-right: var(--border);
	padding-right: var(--spacing--sm);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	min-height: var(--spacing--2xl);
	padding-bottom: var(--spacing--sm);
}

.empty {
	padding: var(--spacing--sm) 0;
}

.list {
	list-style: none;
	margin: 0;
	padding: 0;
	overflow-y: auto;
	min-height: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	width: 100%;
	padding: var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--color--background--light-3);
	cursor: pointer;
	text-align: left;

	&:hover {
		border-color: var(--color--foreground--shade-1);
	}
}

.selected {
	border-color: var(--color--primary);
	background-color: var(--color--primary--tint-3);
}

.cardTop {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.cardTitle {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
}

.cardBottom {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	flex-wrap: wrap;
}

.sha {
	font-family: var(--font-family--monospace);
	white-space: nowrap;
}

.ahead {
	margin-left: auto;
	white-space: nowrap;
}
</style>
