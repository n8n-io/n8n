<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { SourceControlledFile } from '@n8n/api-types';
import { SOURCE_CONTROL_FILE_TYPE } from '@n8n/api-types';
import { VIEWS } from '@/app/constants';
import Modal from '@/app/components/Modal.vue';
import { N8nButton, N8nHeading, N8nText, N8nInfoTip } from '@n8n/design-system';
import { useUIStore } from '@/app/stores/ui.store';

type TabType = 'failed' | 'published';

const props = defineProps<{
	modalName: string;
	data: {
		workflows: SourceControlledFile[];
	};
}>();

const i18n = useI18n();
const uiStore = useUIStore();

const publishedWorkflows = computed(() => {
	return props.data.workflows.filter(
		(w) => w.type === SOURCE_CONTROL_FILE_TYPE.workflow && !w.publishingError,
	);
});

const failedWorkflows = computed(() => {
	return props.data.workflows.filter(
		(w) => w.type === SOURCE_CONTROL_FILE_TYPE.workflow && w.publishingError,
	);
});

// Default to 'failed' tab if there are failures, otherwise 'published'
const activeTab = ref<TabType>(failedWorkflows.value.length > 0 ? 'failed' : 'published');

const tabs = computed(() => {
	const tabsList: Array<{ label: string; value: TabType; total: number }> = [];

	// Only show failed tab if there are failures
	if (failedWorkflows.value.length > 0) {
		tabsList.push({
			label: i18n.baseText('settings.sourceControl.modals.pullResult.tabs.failed'),
			value: 'failed',
			total: failedWorkflows.value.length,
		});
	}

	// Always show published tab
	tabsList.push({
		label: i18n.baseText('settings.sourceControl.modals.pullResult.tabs.published'),
		value: 'published',
		total: publishedWorkflows.value.length,
	});

	return tabsList;
});

const activeWorkflows = computed(() => {
	return activeTab.value === 'failed' ? failedWorkflows.value : publishedWorkflows.value;
});

function close() {
	uiStore.closeModal(props.modalName);
}
</script>

<template>
	<Modal
		:name="modalName"
		width="812px"
		height="min(80vh, 850px)"
		:custom-class="$style.pullResultModal"
		@close="close"
	>
		<template #header>
			<N8nHeading tag="h1" size="xlarge">
				{{ i18n.baseText('settings.sourceControl.modals.pullResult.title') }}
			</N8nHeading>
		</template>

		<template #content>
			<div style="display: flex; flex-direction: column; height: 100%">
				<div style="display: flex; flex: 1; min-height: 0">
					<div :class="$style.tabs">
						<template v-for="tab in tabs" :key="tab.value">
							<button
								type="button"
								:class="[$style.tab, { [$style.tabActive]: activeTab === tab.value }]"
								:data-test-id="`pull-result-modal-tab-${tab.value}`"
								@click="activeTab = tab.value"
							>
								<div>{{ tab.label }}</div>
								<N8nText tag="div" color="text-light">
									{{
										i18n.baseText('settings.sourceControl.modals.pullResult.itemCount', {
											adjustToNumber: tab.total,
											interpolate: { count: `${tab.total}` },
										})
									}}
								</N8nText>
							</button>
						</template>
					</div>
					<div style="flex: 1">
						<div :class="[$style.table]">
							<div :class="[$style.tableHeader]">
								<div :class="$style.headerTitle">
									<N8nText>{{
										i18n.baseText('settings.sourceControl.modals.pullResult.tableHeader.title')
									}}</N8nText>
								</div>
							</div>
							<div :class="$style.tableContent">
								<N8nInfoTip v-if="!activeWorkflows.length" class="p-xs" :bold="false">
									{{ i18n.baseText('settings.sourceControl.modals.pullResult.noWorkflows') }}
								</N8nInfoTip>
								<div v-if="activeWorkflows.length" :class="$style.scrollContent">
									<div
										v-for="workflow in activeWorkflows"
										:key="workflow.id"
										:class="$style.listItem"
									>
										<div :class="[$style.itemContent]">
											<N8nText tag="div" bold color="text-dark" :class="[$style.listItemName]">
												<RouterLink
													target="_blank"
													rel="noopener noreferrer"
													:to="{ name: VIEWS.WORKFLOW, params: { name: workflow.id } }"
												>
													{{ workflow.name }}
												</RouterLink>
											</N8nText>
											<N8nText
												v-if="workflow.publishingError"
												tag="p"
												class="mt-4xs"
												color="danger"
												size="small"
											>
												{{ workflow.publishingError }}
											</N8nText>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<N8nButton type="primary" @click="close">
					{{ i18n.baseText('settings.sourceControl.modals.pullResult.buttons.close') }}
				</N8nButton>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.pullResultModal {
	&:global(.el-dialog) {
		margin: 0;
	}

	:global(.el-dialog__header) {
		padding-bottom: var(--spacing--xs);
	}
}

.headerTitle {
	flex-shrink: 0;
	margin-bottom: 0;
	padding: 10px 16px;
}

.scrollContent {
	max-height: 100%;
	overflow-y: auto;
	scrollbar-color: var(--color--foreground) transparent;
}

.listItem {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 10px 16px;
	margin: 0;
	border-bottom: var(--border);
	gap: 30px;

	&:last-child {
		border-bottom: 0;
	}
}

.itemContent {
	flex: 1;
	min-width: 0;
}

.listItemName {
	line-clamp: 2;
	-webkit-line-clamp: 2;
	text-overflow: ellipsis;
	overflow: hidden;
	display: -webkit-box;
	-webkit-box-orient: vertical;
	word-wrap: break-word;

	a {
		color: inherit;
		text-decoration: none;
		&:hover {
			text-decoration: underline;
		}
	}
}

.footer {
	display: flex;
	flex-direction: row;
	justify-content: flex-end;
	margin-top: 8px;
}

.table {
	height: 100%;
	overflow: hidden;
	display: flex;
	flex-direction: column;
	border: var(--border);
	border-top-right-radius: 8px;
	border-bottom-right-radius: 8px;
}

.tableHeader {
	border-bottom: var(--border);
	display: flex;
	flex-direction: column;
}

.tableContent {
	flex: 1;
	overflow: hidden;
	display: flex;
	flex-direction: column;
}

.tabs {
	display: flex;
	flex-direction: column;
	gap: 4px;
	width: 165px;
	padding: var(--spacing--2xs);
	border: var(--border);
	border-right: 0;
	border-top-left-radius: 8px;
	border-bottom-left-radius: 8px;
}

.tab {
	color: var(--color--text);
	background-color: transparent;
	border: 1px solid transparent;
	padding: var(--spacing--2xs);
	cursor: pointer;
	border-radius: 4px;
	text-align: left;
	display: flex;
	flex-direction: column;
	gap: 2px;
	&:hover {
		border-color: var(--color--background);
	}
}

.tabActive {
	background-color: var(--color--background);
	color: var(--color--text--shade-1);
}
</style>
