<script setup lang="ts">
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useToast } from '@/app/composables/useToast';
import DiffBadge from '@/features/workflows/workflowDiff/DiffBadge.vue';
import NodeDiff from '@/features/workflows/workflowDiff/NodeDiff.vue';
import WorkflowDiffContent from '@/features/workflows/workflowDiff/WorkflowDiffContent.vue';
import { useProvideViewportSync } from '@/features/workflows/workflowDiff/useViewportSync';
import { useWorkflowDiff } from '@/features/workflows/workflowDiff/useWorkflowDiff';
import { useWorkflowDiffUI } from '@/features/workflows/workflowDiff/useWorkflowDiffUI';
import type { IWorkflowDb } from '@/Interface';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { removeWorkflowExecutionData } from '@/app/utils/workflowUtils';
import type { BaseTextKey } from '@n8n/i18n';
import { useI18n } from '@n8n/i18n';
import { NodeDiffStatus } from 'n8n-workflow';
import { computed, useCssModule, onMounted } from 'vue';

import { ElDropdown, ElDropdownItem, ElDropdownMenu } from 'element-plus';
import {
	N8nButton,
	N8nCheckbox,
	N8nHeading,
	N8nIconButton,
	N8nRadioButtons,
	N8nText,
} from '@n8n/design-system';

const props = withDefaults(
	defineProps<{
		sourceWorkflow?: IWorkflowDb;
		targetWorkflow?: IWorkflowDb;
		sourceLabel?: string;
		targetLabel?: string;
		tidyUp?: boolean;
	}>(),
	{
		sourceLabel: 'Before',
		targetLabel: 'After',
	},
);

const { selectedDetailId, onNodeClick, syncIsEnabled } = useProvideViewportSync();

const $style = useCssModule();
const nodeTypesStore = useNodeTypesStore();
const i18n = useI18n();
const toast = useToast();

const { source, target, nodesDiff, connectionsDiff } = useWorkflowDiff(
	computed(() => removeWorkflowExecutionData(props.sourceWorkflow)),
	computed(() => removeWorkflowExecutionData(props.targetWorkflow)),
);

// Use shared composable for UI logic
const {
	settingsDiff,
	nodeChanges,
	nextNodeChange,
	previousNodeChange,
	activeTab,
	tabs,
	setActiveTab,
	selectedNode,
	nodeDiffs,
	changesCount,
	isSourceWorkflowNew,
	modifiers,
	setSelectedDetailId,
} = useWorkflowDiffUI({
	sourceWorkflow: computed(() => props.sourceWorkflow),
	targetWorkflow: computed(() => props.targetWorkflow),
	nodesDiff,
	connectionsDiff,
	selectedDetailId,
});

onNodeClick((nodeId: string) => {
	const node = nodesDiff.value.get(nodeId);
	if (!node) {
		return;
	}

	if (node.status !== NodeDiffStatus.Eq) {
		selectedDetailId.value = nodeId;
	}
});

onMounted(async () => {
	try {
		await nodeTypesStore.loadNodeTypesIfNotLoaded();
	} catch (error) {
		toast.showError(error, i18n.baseText('workflowDiff.error.loadNodeTypes'));
	}
});
</script>

<template>
	<div :class="$style.workflowDiffViewContainer">
		<div :class="$style.header">
			<div :class="$style.headerLeft">
				<N8nHeading tag="h4" size="medium">
					{{ sourceWorkflow?.name || targetWorkflow?.name }}
				</N8nHeading>
			</div>

			<div :class="$style.headerRight">
				<N8nCheckbox
					v-model="syncIsEnabled"
					label-size="small"
					label="Sync views"
					class="mb-0 mr-s"
				/>
				<ElDropdown
					trigger="click"
					:popper-options="{
						placement: 'bottom-end',
						modifiers,
					}"
					:popper-class="$style.popper"
					@visible-change="setActiveTab"
				>
					<N8nButton type="secondary" style="--button--radius: 4px 0 0 4px">
						<div v-if="changesCount" :class="$style.circleBadge">
							{{ changesCount }}
						</div>
						{{ i18n.baseText('workflowDiff.changes') }}
					</N8nButton>
					<template #dropdown>
						<ElDropdownMenu :hide-on-click="false">
							<div :class="$style.dropdownContent">
								<N8nRadioButtons
									v-model="activeTab"
									:options="tabs"
									:class="$style.tabs"
									class="mb-xs"
								>
									<template #option="{ label, data: optionData }">
										{{ label }}
										<span v-if="optionData?.count" class="ml-4xs"> ({{ optionData.count }}) </span>
									</template>
								</N8nRadioButtons>
								<div>
									<ul v-if="activeTab === 'nodes'">
										<template v-if="nodeChanges.length > 0">
											<ElDropdownItem
												v-for="change in nodeChanges"
												:key="change.node.id"
												:class="{
													[$style.clickableChange]: true,
													[$style.clickableChangeActive]: selectedDetailId === change.node.id,
												}"
												@click.prevent="setSelectedDetailId(change.node.id)"
											>
												<DiffBadge :type="change.status" />
												<NodeIcon :node-type="change.type" :size="16" class="ml-2xs mr-4xs" />
												<span :class="$style.nodeName">{{ change.node.name }}</span>
											</ElDropdownItem>
										</template>
										<li v-else :class="$style.emptyState">
											<N8nText color="text-base" size="small">{{
												i18n.baseText('workflowDiff.noChanges')
											}}</N8nText>
										</li>
									</ul>
									<ul v-if="activeTab === 'connectors'" :class="$style.changes">
										<template v-if="connectionsDiff.size > 0">
											<li v-for="change in connectionsDiff" :key="change[0]">
												<div>
													<DiffBadge :type="change[1].status" />
												</div>
												<div style="flex: 1">
													<ul :class="$style.changesNested">
														<ElDropdownItem
															:class="{
																[$style.clickableChange]: true,
																[$style.clickableChangeActive]:
																	selectedDetailId === change[1].connection.source?.id,
															}"
															@click.prevent="setSelectedDetailId(change[1].connection.source?.id)"
														>
															<NodeIcon
																:node-type="change[1].connection.sourceType"
																:size="16"
																class="ml-2xs mr-4xs"
															/>
															<span :class="$style.nodeName">{{
																change[1].connection.source?.name
															}}</span>
														</ElDropdownItem>
														<div :class="$style.separator"></div>
														<ElDropdownItem
															:class="{
																[$style.clickableChange]: true,
																[$style.clickableChangeActive]:
																	selectedDetailId === change[1].connection.target?.id,
															}"
															@click.prevent="setSelectedDetailId(change[1].connection.target?.id)"
														>
															<NodeIcon
																:node-type="change[1].connection.targetType"
																:size="16"
																class="ml-2xs mr-4xs"
															/>
															<span :class="$style.nodeName">{{
																change[1].connection.target?.name
															}}</span>
														</ElDropdownItem>
													</ul>
												</div>
											</li>
										</template>
										<li v-else :class="$style.emptyState">
											<N8nText color="text-base" size="small">{{
												i18n.baseText('workflowDiff.noChanges')
											}}</N8nText>
										</li>
									</ul>
									<ul v-if="activeTab === 'settings'">
										<template v-if="settingsDiff.length > 0">
											<li v-for="setting in settingsDiff" :key="setting.name">
												<N8nText color="text-dark" size="medium" tag="div" bold>{{
													i18n.baseText(`workflowSettings.${setting.name}` as BaseTextKey)
												}}</N8nText>
												<NodeDiff
													:old-string="setting.before"
													:new-string="setting.after"
													:class="$style.noNumberDiff"
												/>
											</li>
										</template>
										<li v-else :class="$style.emptyState">
											<N8nText color="text-base" size="small">{{
												i18n.baseText('workflowDiff.noChanges')
											}}</N8nText>
										</li>
									</ul>
								</div>
							</div>
						</ElDropdownMenu>
					</template>
				</ElDropdown>
				<N8nIconButton
					icon="chevron-left"
					type="secondary"
					:class="$style.navigationButton"
					style="--button--radius: 0; margin: 0 -1px"
					@click="previousNodeChange"
				/>
				<N8nIconButton
					icon="chevron-right"
					type="secondary"
					:class="$style.navigationButton"
					style="--button--radius: 0 4px 4px 0"
					@click="nextNodeChange"
				/>
			</div>
		</div>

		<WorkflowDiffContent
			:source-nodes="source.nodes"
			:source-connections="source.connections"
			:target-nodes="target.nodes"
			:target-connections="target.connections"
			:source-label="sourceLabel"
			:target-label="targetLabel"
			:source-exists="!!sourceWorkflow"
			:target-exists="!!targetWorkflow"
			:selected-node="selectedNode"
			:node-diffs="nodeDiffs"
			:is-source-workflow-new="isSourceWorkflowNew"
			:apply-layout="tidyUp"
			:nodes-diff="nodesDiff"
			:connections-diff="connectionsDiff"
			@close-aside="selectedDetailId = undefined"
		/>
	</div>
</template>

<style module lang="scss">
.workflowDiffViewContainer {
	display: flex;
	flex-direction: column;
	height: 100%;
}

.tabs {
	display: flex;
	flex-direction: row;
	:global(.n8n-radio-button) {
		flex: 1;
	}
	:global(.n8n-radio-button > div) {
		justify-content: center;
	}
}

.popper {
	box-shadow: 0 6px 16px 0 rgba(68, 28, 23, 0.06);
	:global(.el-popper__arrow) {
		display: none;
	}
}

.changes {
	> li {
		display: flex;
		align-items: flex-start;
		gap: var(--spacing--2xs);
		padding: 10px 0 var(--spacing--3xs) var(--spacing--2xs);

		> div {
			min-width: 0;
		}

		.clickableChange {
			padding: var(--spacing--3xs) var(--spacing--xs) var(--spacing--3xs) 0;
			margin-left: -4px;
		}
	}

	.changesNested {
		margin-top: -3px;
		width: 100%;
		min-width: 0;
	}
}

.clickableChange {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	border-radius: 4px;
	padding: var(--spacing--xs) var(--spacing--2xs);
	margin-right: var(--spacing--xs);
	line-height: unset;
	min-width: 0;
	transition: background-color 0.2s ease;

	&:hover {
		background-color: var(--color--background--light-3);
	}
}

.clickableChangeActive {
	background-color: var(--color--background--light-3);
}

.nodeName {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
}

.separator {
	width: 1px;
	height: 10px;
	background-color: var(--color--foreground--shade-2);
	margin: 0 0 -5px var(--spacing--xs);
	position: relative;
	z-index: 1;
}

.circleBadge {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 16px;
	height: 16px;
	border-radius: 50%;
	background-color: var(--color--primary);
	color: var(--color--text--tint-3);
	font-size: 10px;
	font-weight: bold;
	line-height: 1;
}

.dropdownContent {
	min-width: 320px;
	padding: 0 12px;

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		max-height: 400px;
		overflow-x: hidden;
		overflow-y: auto;
	}

	.noNumberDiff {
		min-height: 41px;
		margin: 0 12px 10px 0;
		overflow: hidden;
		:global(.blob-num) {
			display: none;
		}
	}
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 11px 16px;
	border-bottom: 1px solid var(--color--foreground);

	.navigationButton {
		height: 34px;
		width: 34px;
	}
}

.headerLeft,
.headerRight {
	display: flex;
	align-items: center;
}

.emptyState {
	display: flex;
	justify-content: center;
	align-items: center;
	padding: var(--spacing--md) var(--spacing--xs);
}
</style>
