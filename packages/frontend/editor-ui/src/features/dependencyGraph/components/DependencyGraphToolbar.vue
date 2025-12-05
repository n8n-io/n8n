<script lang="ts" setup>
import { computed } from 'vue';
import { useDependencyGraphStore } from '../dependencyGraph.store';
import { N8nButton, N8nInput, N8nIcon, N8nIconButton } from '@n8n/design-system';

const store = useDependencyGraphStore();

const stats = computed(() => store.nodeStats);
const showWorkflows = computed(() => store.showWorkflows);
const showCredentials = computed(() => store.showCredentials);
const showActiveOnly = computed(() => store.showActiveOnly);
const searchQuery = computed(() => store.searchQuery);

function handleSearch(value: string) {
	store.setSearchQuery(value);
}

function refresh() {
	void store.fetchGraph();
}
</script>

<template>
	<div :class="$style.toolbar">
		<!-- Left: Title and Stats -->
		<div :class="$style.left">
			<div :class="$style.titleArea">
				<N8nIcon icon="waypoints" :class="$style.titleIcon" />
				<h1 :class="$style.title">Dependency Graph</h1>
			</div>
			<div :class="$style.stats">
				<span :class="$style.stat">
					<strong>{{ stats.totalWorkflows }}</strong> workflows
					<span v-if="stats.activeWorkflows > 0" :class="$style.active">
						({{ stats.activeWorkflows }} active)
					</span>
				</span>
				<span :class="$style.statDivider">•</span>
				<span :class="$style.stat">
					<strong>{{ stats.totalCredentials }}</strong> credentials
				</span>
				<span :class="$style.statDivider">•</span>
				<span :class="$style.stat">
					<strong>{{ stats.totalEdges }}</strong> connections
				</span>
			</div>
		</div>

		<!-- Right: Controls -->
		<div :class="$style.right">
			<!-- Search -->
			<div :class="$style.searchWrapper">
				<N8nInput
					:model-value="searchQuery"
					type="text"
					placeholder="Search nodes..."
					size="small"
					:class="$style.search"
					@update:model-value="handleSearch"
				>
					<template #prefix>
						<N8nIcon icon="search" size="small" />
					</template>
				</N8nInput>
			</div>

			<!-- Filters -->
			<div :class="$style.filters">
				<N8nButton
					:type="showWorkflows ? 'secondary' : 'tertiary'"
					size="small"
					@click="store.toggleWorkflows()"
				>
					<N8nIcon icon="waypoints" size="small" :class="$style.filterIcon" />
					Workflows
				</N8nButton>

				<N8nButton
					:type="showCredentials ? 'secondary' : 'tertiary'"
					size="small"
					@click="store.toggleCredentials()"
				>
					<N8nIcon icon="key-round" size="small" :class="$style.filterIcon" />
					Credentials
				</N8nButton>

				<N8nButton
					:type="showActiveOnly ? 'secondary' : 'tertiary'"
					size="small"
					@click="store.toggleActiveOnly()"
				>
					<N8nIcon icon="circle-check" size="small" :class="$style.filterIcon" />
					Active Only
				</N8nButton>
			</div>

			<!-- Refresh -->
			<N8nIconButton
				icon="refresh-cw"
				type="tertiary"
				size="small"
				text="Refresh"
				@click="refresh"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--l);
	padding: var(--spacing--s) var(--spacing--l);
	background: var(--color--background--light-1);
	border-bottom: 1px solid var(--color--foreground);
}

.left {
	display: flex;
	align-items: center;
	gap: var(--spacing--l);
}

.titleArea {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.titleIcon {
	color: var(--color--text--tint-1);
}

.title {
	font-size: var(--font-size--l);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1);
	margin: 0;
}

.stats {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.stat {
	font-size: var(--font-size--s);
	color: var(--color--text);

	strong {
		font-weight: var(--font-weight--bold);
	}
}

.active {
	color: var(--color--success);
}

.statDivider {
	color: var(--color--foreground--shade-1);
}

.right {
	display: flex;
	align-items: center;
	gap: var(--spacing--s);
}

.searchWrapper {
	width: 200px;
}

.search {
	width: 100%;
}

.filters {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.filterIcon {
	margin-right: var(--spacing--3xs);
}
</style>
