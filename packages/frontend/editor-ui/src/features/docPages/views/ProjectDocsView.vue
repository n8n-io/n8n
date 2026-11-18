<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import type { DocPageSummary } from '@n8n/api-types';
import { N8nEmptyState, N8nHeading, N8nLoading } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import PageViewLayout from '@/app/components/layouts/PageViewLayout.vue';
import ProjectHeader from '@/features/collaboration/projects/components/ProjectHeader.vue';

import DocTable from '../components/DocTable.vue';
import { groupByKind } from '../docPages.utils';
import { useDocPagesStore } from '../docPages.store';

const i18n = useI18n();
const route = useRoute();
const toast = useToast();
const docPagesStore = useDocPagesStore();

const loading = ref(true);
const items = ref<DocPageSummary[]>([]);

const projectId = computed(() => String(route.params.projectId ?? ''));
const groups = computed(() => groupByKind(items.value));

async function load(id: string) {
	if (!id) return;
	loading.value = true;
	try {
		items.value = await docPagesStore.fetchProjectPages(id);
	} catch (error) {
		items.value = [];
		toast.showError(error, i18n.baseText('docPages.project.error'));
	} finally {
		loading.value = false;
	}
}

watch(projectId, load, { immediate: true });
</script>

<template>
	<PageViewLayout>
		<template #header>
			<ProjectHeader />
		</template>

		<div :class="$style.content" data-testid="project-docs">
			<N8nLoading v-if="loading" :rows="6" />
			<N8nEmptyState
				v-else-if="groups.length === 0"
				:icon="{ type: 'icon', value: 'book-open' }"
				:heading="i18n.baseText('docPages.project.empty.heading')"
				:description="i18n.baseText('docPages.project.empty.description')"
				data-testid="project-docs-empty"
			/>
			<template v-else>
				<section
					v-for="group in groups"
					:key="group.kind"
					:class="$style.group"
					:data-testid="`project-docs-group-${group.kind}`"
				>
					<div :class="$style.groupHeader">
						<N8nHeading tag="h2" size="medium" bold>
							{{ i18n.baseText(`docPages.group.${group.kind}`) }}
						</N8nHeading>
						<span :class="$style.count">{{ group.items.length }}</span>
					</div>
					<DocTable :kind="group.kind" :items="group.items" />
				</section>
			</template>
		</div>
	</PageViewLayout>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	padding: var(--spacing--sm) 0 var(--spacing--2xl);
}

.group {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.groupHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.count {
	padding: 0 var(--spacing--3xs);
	border-radius: var(--radius--full);
	background: var(--background--hover);
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--xl);
	font-variant-numeric: tabular-nums;
}
</style>
