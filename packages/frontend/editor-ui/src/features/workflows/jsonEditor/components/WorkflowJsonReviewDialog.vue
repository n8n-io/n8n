<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { NodeDiffStatus } from 'n8n-workflow';
import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nText,
} from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import DiffBadge from '@/features/workflows/workflowDiff/DiffBadge.vue';
import NodeDiff from '@/features/workflows/workflowDiff/NodeDiff.vue';

import type { WorkflowJson, WorkflowJsonIssue } from '../workflowJson.types';
import type { ConnectionChange, NodeUpdate, WorkflowJsonApplyPlan } from '../workflowJsonChanges';
import { orderWorkflowJson, stringifyWorkflowJson } from '../workflowJsonDocument';

type Entry = {
	key: string;
	status: NodeDiffStatus;
	text: string;
	details?: string;
	nodeId?: string;
};

type Section = { title: string; entries: Entry[] };

const props = defineProps<{
	plan: WorkflowJsonApplyPlan;
	current: WorkflowJson;
	warnings: WorkflowJsonIssue[];
	applying: boolean;
	/** False after Apply, so the canvas keeps the keyboard and its undo shortcut works */
	returnFocus: boolean;
}>();

const open = defineModel<boolean>('open', { required: true });

const emit = defineEmits<{ apply: [] }>();

const i18n = useI18n();
const selectedNodeId = ref<string>();

watch(open, (isOpen) => {
	if (isOpen) selectedNodeId.value = undefined;
});

function onCloseAutoFocus(event: Event) {
	if (!props.returnFocus) event.preventDefault();
}

const text = (
	key: BaseTextKey,
	interpolate: Record<string, string | number> = {},
	adjustToNumber?: number,
) => i18n.baseText(key, { interpolate, adjustToNumber });

function updateDetails(update: NodeUpdate): string {
	const fieldKeys = update.changedFieldKeys.filter(
		(key) => key !== 'typeVersion' && key !== 'credentials',
	);
	const credentialNames = Object.values(update.fields.credentials ?? {}).map(
		(credential) => credential.name,
	);
	const credentials = update.changedFieldKeys.includes('credentials')
		? credentialNames.length > 0
			? text('workflowJsonPanel.review.credentials', { names: credentialNames.join(', ') })
			: text('workflowJsonPanel.review.credentialsRemoved')
		: undefined;

	return [
		update.changedParameterKeys.length > 0
			? text('workflowJsonPanel.review.parameters', {
					keys: update.changedParameterKeys.join(', '),
				})
			: undefined,
		update.typeVersion
			? text('workflowJsonPanel.review.version', {
					from: update.typeVersion.from,
					to: update.typeVersion.to,
				})
			: undefined,
		credentials,
		fieldKeys.length > 0
			? text('workflowJsonPanel.review.fields', { keys: fieldKeys.join(', ') })
			: undefined,
		update.position ? text('workflowJsonPanel.review.moved') : undefined,
		update.disabled === true ? text('workflowJsonPanel.review.disabled') : undefined,
		update.disabled === false ? text('workflowJsonPanel.review.enabled') : undefined,
	]
		.filter((detail) => detail !== undefined)
		.join(' · ');
}

function connectionText(change: ConnectionChange) {
	const typeSuffix = change.type === 'main' ? '' : ` (${change.type})`;
	return change.outputIndex > 0
		? text('workflowJsonPanel.review.connectionOutput', {
				source: change.sourceName,
				output: change.outputIndex + 1,
				target: change.targetName + typeSuffix,
			})
		: text('workflowJsonPanel.review.connection', {
				source: change.sourceName,
				target: change.targetName + typeSuffix,
			});
}

const sections = computed<Section[]>(() => {
	const { plan } = props;
	const nodes: Entry[] = [
		...plan.added.map((node) => ({
			key: `add-${node.id}`,
			status: NodeDiffStatus.Added,
			text: text('workflowJsonPanel.review.addNode', { name: node.name }),
			details: node.type,
			nodeId: node.id,
		})),
		...plan.removed.map((node) => ({
			key: `remove-${node.id}`,
			status: NodeDiffStatus.Deleted,
			text: text('workflowJsonPanel.review.removeNode', { name: node.name }),
			nodeId: node.id,
		})),
		...plan.replaced.map(({ before, after }) => ({
			key: `replace-${after.id}`,
			status: NodeDiffStatus.Modified,
			text: text('workflowJsonPanel.review.replaceNode', { name: before.name, type: after.type }),
			nodeId: after.id,
		})),
		...plan.renames.map((rename) => ({
			key: `rename-${rename.id}`,
			status: NodeDiffStatus.Modified,
			text: text('workflowJsonPanel.review.renameNode', { from: rename.from, to: rename.to }),
			details: text('workflowJsonPanel.review.renameNode.details'),
			nodeId: rename.id,
		})),
		...plan.updates.map((update) => ({
			key: `update-${update.id}`,
			status: NodeDiffStatus.Modified,
			text: text('workflowJsonPanel.review.updateNode', { name: update.name }),
			details: updateDetails(update),
			nodeId: update.id,
		})),
	];

	const connections: Entry[] = [
		...plan.connectionsToRemove.map((change) => ({
			key: `remove-${change.connection.id}`,
			status: NodeDiffStatus.Deleted,
			text: connectionText(change),
		})),
		...plan.connectionsToAdd.map((change) => ({
			key: `add-${change.connection.id}`,
			status: NodeDiffStatus.Added,
			text: connectionText(change),
		})),
	];

	const pinData: Entry[] = plan.pinData.map((change) => ({
		key: `pin-${change.id}`,
		status:
			change.action === 'add'
				? NodeDiffStatus.Added
				: change.action === 'remove'
					? NodeDiffStatus.Deleted
					: NodeDiffStatus.Modified,
		text: text(
			`workflowJsonPanel.review.pinData.${change.action}`,
			{ name: change.name, count: change.data?.length ?? 0 },
			change.data?.length ?? 0,
		),
		nodeId: change.id,
	}));

	const workflow: Entry[] = [
		...(plan.name
			? [
					{
						key: 'name',
						status: NodeDiffStatus.Modified,
						text: text('workflowJsonPanel.review.name', plan.name),
					},
				]
			: []),
		...(plan.settings
			? [
					{
						key: 'settings',
						status: NodeDiffStatus.Modified,
						text: text('workflowJsonPanel.review.settings', {
							keys: plan.settings.changedKeys.join(', '),
						}),
					},
				]
			: []),
	];

	return [
		{ title: text('workflowJsonPanel.review.section.nodes'), entries: nodes },
		{ title: text('workflowJsonPanel.review.section.connections'), entries: connections },
		{ title: text('workflowJsonPanel.review.section.pinData'), entries: pinData },
		{ title: text('workflowJsonPanel.review.section.workflow'), entries: workflow },
	].filter((section) => section.entries.length > 0);
});

const notes = computed(() => [
	...props.plan.droppedReferences.map((reference) =>
		text(`workflowJsonPanel.review.dropped.${reference.section}`, { name: reference.name }),
	),
	...props.warnings.map((warning) => warning.message),
]);

const changeCount = computed(() =>
	sections.value.reduce((count, section) => count + section.entries.length, 0),
);

const nodeJson = (json: WorkflowJson, id: string) => {
	const node = orderWorkflowJson(json).nodes.find((n) => n.id === id);
	const pinned = node ? json.pinData?.[node.name] : undefined;
	return node ? JSON.stringify(pinned ? { ...node, pinData: pinned } : node, null, 2) : '';
};

const diff = computed(() =>
	selectedNodeId.value
		? {
				oldString: nodeJson(props.current, selectedNodeId.value),
				newString: nodeJson(props.plan.edited, selectedNodeId.value),
			}
		: {
				oldString: stringifyWorkflowJson(orderWorkflowJson(props.current)),
				newString: stringifyWorkflowJson(orderWorkflowJson(props.plan.edited)),
			},
);

function onOpenChange(value: boolean) {
	if (!value && !props.applying) open.value = false;
}
</script>

<template>
	<N8nDialog
		:open="open"
		size="cover"
		data-test-id="workflow-json-review-dialog"
		@update:open="onOpenChange"
		@close-auto-focus="onCloseAutoFocus"
	>
		<N8nDialogHeader>
			<N8nDialogTitle>{{ i18n.baseText('workflowJsonPanel.review.title') }}</N8nDialogTitle>
		</N8nDialogHeader>
		<N8nDialogBody :class="$style.body">
			<aside :class="$style.list">
				<button
					type="button"
					:class="[$style.row, $style.wholeRow, { [$style.active]: !selectedNodeId }]"
					@click="selectedNodeId = undefined"
				>
					<N8nText size="small" bold>
						{{
							i18n.baseText('workflowJsonPanel.review.wholeWorkflow', {
								interpolate: { count: changeCount },
								adjustToNumber: changeCount,
							})
						}}
					</N8nText>
				</button>
				<section v-for="section in sections" :key="section.title" :class="$style.section">
					<N8nText size="xsmall" color="text-light" bold :class="$style.sectionTitle">
						{{ section.title }}
					</N8nText>
					<button
						v-for="entry in section.entries"
						:key="entry.key"
						type="button"
						:class="[
							$style.row,
							{ [$style.active]: entry.nodeId && entry.nodeId === selectedNodeId },
						]"
						data-test-id="workflow-json-review-entry"
						@click="selectedNodeId = entry.nodeId"
					>
						<DiffBadge :type="entry.status" />
						<span :class="$style.entryText">
							<N8nText size="small">{{ entry.text }}</N8nText>
							<N8nText v-if="entry.details" size="xsmall" color="text-light">
								{{ entry.details }}
							</N8nText>
						</span>
					</button>
				</section>
				<section v-if="notes.length > 0" :class="$style.section">
					<N8nText size="xsmall" color="text-light" bold :class="$style.sectionTitle">
						{{ i18n.baseText('workflowJsonPanel.review.section.warnings') }}
					</N8nText>
					<N8nText
						v-for="(note, index) in notes"
						:key="index"
						size="small"
						color="warning"
						:class="$style.note"
					>
						{{ note }}
					</N8nText>
				</section>
			</aside>
			<div :class="$style.diff">
				<NodeDiff v-bind="diff" :context="4" />
			</div>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nText size="small" color="text-light" :class="$style.undoHint">
				{{ i18n.baseText('workflowJsonPanel.review.undoHint') }}
			</N8nText>
			<N8nButton
				variant="outline"
				:disabled="applying"
				:label="i18n.baseText('generic.cancel')"
				@click="open = false"
			/>
			<N8nButton
				:loading="applying"
				:disabled="changeCount === 0"
				:label="i18n.baseText('workflowJsonPanel.review.apply')"
				data-test-id="workflow-json-review-apply"
				@click="emit('apply')"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	display: grid;
	grid-template-columns: minmax(240px, 320px) minmax(0, 1fr);
	gap: var(--spacing--sm);
	min-height: 0;
	height: 100%;
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	overflow-y: auto;
	padding: var(--spacing--3xs);
	border: var(--border);
	border-radius: var(--radius);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.sectionTitle {
	padding: 0 var(--spacing--2xs);
	text-transform: uppercase;
}

.row {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border: none;
	border-radius: var(--radius);
	background: transparent;
	text-align: left;
	color: inherit;
	cursor: pointer;

	&:hover {
		background: var(--background--hover);
	}
}

.wholeRow {
	align-items: center;
}

.active {
	background: var(--background--hover);
}

.entryText {
	display: flex;
	flex-direction: column;
	min-width: 0;
	word-break: break-word;
}

.note {
	padding: 0 var(--spacing--2xs);
}

.diff {
	min-height: 0;
	overflow: auto;
	border: var(--border);
	border-radius: var(--radius);
}

.undoHint {
	margin-right: auto;
}
</style>
