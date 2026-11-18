<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { DocPageSummary } from '@n8n/api-types';
import { N8nBadge, N8nEmptyState, N8nHeading, N8nLoading, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import PageViewLayout from '@/app/components/layouts/PageViewLayout.vue';
import ProjectHeader from '@/features/collaboration/projects/components/ProjectHeader.vue';

import DocKindBadge from '../components/DocKindBadge.vue';
import { DOC_PAGE_VIEW } from '../constants';
import { groupByKind } from '../docPages.utils';
import { useDocPagesStore } from '../docPages.store';
import { useOpenDocPage } from '../composables/useOpenDocPage';

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const docPagesStore = useDocPagesStore();
const { openDocPage } = useOpenDocPage();

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

async function openItem(item: DocPageSummary) {
	if (item.id) {
		await router.push({
			name: DOC_PAGE_VIEW,
			params: { projectId: item.projectId, pageId: item.id },
		});
		return;
	}
	await openDocPage(item.resourceType, item.resourceId);
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
					<N8nHeading tag="h2" size="small" bold color="text-light">
						{{ i18n.baseText(`docPages.group.${group.kind}`) }}
					</N8nHeading>
					<ul :class="$style.list">
						<li v-for="item in group.items" :key="`${item.resourceType}-${item.resourceId}`">
							<button
								type="button"
								:class="$style.item"
								data-testid="project-docs-item"
								@click="openItem(item)"
							>
								<span :class="$style.itemTitle">
									<N8nText bold>{{ item.name }}</N8nText>
									<DocKindBadge :kind="item.kind" />
									<N8nBadge v-if="!item.isPublished" variant="outline" size="xsmall">
										{{ i18n.baseText('docPages.unpublished') }}
									</N8nBadge>
									<N8nBadge v-if="item.isStale" variant="warning" size="xsmall">
										{{ i18n.baseText('docPages.stale.badge') }}
									</N8nBadge>
								</span>
								<N8nText size="small" color="text-light" :class="$style.excerpt">
									{{ item.excerpt || i18n.baseText('docPages.noExcerpt') }}
								</N8nText>
							</button>
						</li>
					</ul>
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
	gap: var(--spacing--2xs);
}

.list {
	display: flex;
	flex-direction: column;
	margin: 0;
	padding: 0;
	list-style: none;
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--background--surface);
	overflow: hidden;

	li + li {
		border-top: var(--border);
	}
}

.item {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	width: 100%;
	padding: var(--spacing--sm) var(--spacing--md);
	border: none;
	background: none;
	text-align: left;
	cursor: pointer;
	color: var(--text-color);

	&:hover,
	&:focus-visible {
		background-color: var(--background--hover);
	}
}

.itemTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.excerpt {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
