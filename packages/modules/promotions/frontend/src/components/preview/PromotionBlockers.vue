<script setup lang="ts">
import type {
	PromotionBindingConflict,
	PromotionBindingConsumer,
	PromotionDependencyWarning,
	PromotionMissingDependency,
	PromotionMissingDependencyReason,
	PromotionResourceType,
} from '@n8n/api-types';
import {
	N8nButton,
	N8nCallout,
	N8nHeading,
	N8nIcon,
	N8nText,
	N8nTooltip,
	type IconName,
} from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { usePromotionBindingCreation } from '../../composables/usePromotionBindingCreation';
import { usePromotionBindings } from '../../composables/usePromotionBindings';
import { usePromotionPreviewLabels } from '../../composables/usePromotionPreviewLabels';
import {
	PROMOTE_GROUP_STATUS,
	PROMOTE_STATUS_STYLES,
	type StatusStyle,
} from '../../promotionDependencyStatus';
import type { ApplyCheckResult, BlockedApplyResult } from '../../promotions.types';
import { resourceIcon } from '../../promotionPreview.tree';
import PromotionWorkflowLinks from './PromotionWorkflowLinks.vue';

const props = withDefaults(
	defineProps<{
		/**
		 * The Apply check, scoped to the workflows that the preview lists. Moved folders stay unscoped.
		 * `null` on Promote, which has no check.
		 */
		check: ApplyCheckResult | null;
		/**
		 * The missing dependencies that get a row of their own. Promote: what the selected workflows
		 * use and the branch does not hold after the Promote. Apply: the dependencies that the other
		 * lists of the check do not detail.
		 */
		missingDependencies?: PromotionMissingDependency[];
		/** Promote only: what the selected workflows reference and this instance does not have. */
		dependencyWarnings?: PromotionDependencyWarning[];
		busy: boolean;
	}>(),
	{ missingDependencies: () => [], dependencyWarnings: () => [] },
);

const emit = defineEmits<{
	/** A binding was created, so the preview and the check must load again. */
	refresh: [];
	inspect: [key: string];
}>();

const i18n = useI18n();
const labels = usePromotionPreviewLabels();

const asBlockedResult = ({
	environmentId,
	git,
	movedWorkflows,
	movedFolders,
	...check
}: ApplyCheckResult): BlockedApplyResult => ({ status: 'blocked', environmentId, git, check });

// The binding session lives as long as the commit. A later check for the same commit keeps the
// created bindings in the table as resolved.
const bindings = usePromotionBindings();
// Only Apply has a check, and so bindings to create. The page mounts this component again for
// each direction.
const creation = props.check
	? usePromotionBindingCreation(asBlockedResult(props.check), () => {})
	: undefined;
let sessionCommit: string | undefined;
watch(
	() => props.check,
	(check) => {
		if (!check || !creation) return;
		const result = asBlockedResult(check);
		creation.updateCheck(result.check);
		if (sessionCommit === check.git.commitSha) {
			bindings.reconcile(result);
			return;
		}
		sessionCommit = check.git.commitSha;
		bindings.start(result);
	},
	{ immediate: true },
);
onBeforeUnmount(bindings.end);

type BlockerRow = {
	key: string;
	icon: IconName;
	name: string;
	type: PromotionResourceType;
	usedBy: Array<{ key: string; name: string }>;
	status: { label: string } & StatusStyle;
	/** The next step for blockers that users resolve outside this page. */
	detail?: string;
	/** The button that adds a missing binding. */
	createLabel?: string;
	/** A button for an action that users cannot take, with the reason in its tooltip. */
	disabledAction?: { label: string; reason: string };
};

const usedBy = (consumers: PromotionBindingConsumer[]) =>
	consumers.flatMap(({ workflows }) =>
		workflows.map(({ id, name }) => ({ key: `workflow:${id}`, name })),
	);

type StatusKey =
	| 'missing'
	| 'resolved'
	| 'access'
	| 'conflict'
	| 'moved'
	| 'archived'
	| 'otherProject'
	| 'outside'
	| 'personal';

const WARNING_STYLE: StatusStyle = { tone: 'warning', icon: 'circle-alert' };
// A dependency that users cannot act on from this page has a neutral status.
const STATUS_STYLES: Partial<Record<StatusKey, StatusStyle>> = {
	resolved: { tone: 'success', icon: 'circle-check' },
	...PROMOTE_STATUS_STYLES,
};

const status = (key: StatusKey) => ({
	label: i18n.baseText(`promotions.preview.blockers.status.${key}`),
	...(STATUS_STYLES[key] ?? WARNING_STYLE),
});

type HardConflict = Exclude<
	PromotionBindingConflict,
	{ code: 'destructive-change' } | { code: 'project-deletion' }
>;

const conflictRow = (conflict: HardConflict, index: number): BlockerRow => {
	if (conflict.code === 'moved') return movedRow(conflict.kind, conflict);
	const row = {
		key: `conflict:${index}`,
		status: status('conflict'),
		detail: i18n.baseText(`promotions.bindings.conflicts.${conflict.code}`),
	};
	if (conflict.kind === 'project') {
		return {
			...row,
			icon: resourceIcon('project'),
			name: conflict.project.name,
			type: 'project',
			usedBy:
				'workflows' in conflict
					? conflict.workflows.map(({ id, name }) => ({ key: `workflow:${id}`, name }))
					: [],
		};
	}
	if (conflict.kind === 'workflow') {
		const workflows = usedBy(conflict.consumers);
		return {
			...row,
			icon: resourceIcon('workflow'),
			name: workflows.map(({ name }) => name).join(', '),
			type: 'workflow',
			usedBy: workflows,
		};
	}
	if (conflict.kind === 'data-table' || conflict.kind === 'tag') {
		const type = conflict.kind === 'tag' ? 'tag' : 'dataTable';
		return {
			...row,
			detail:
				conflict.kind === 'tag'
					? i18n.baseText(`promotions.bindings.conflicts.tag-conflict.${conflict.reason}`)
					: i18n.baseText(`promotions.bindings.conflicts.data-table-conflict.${conflict.reason}`),
			icon: resourceIcon(type),
			// An import-wide issue, such as a disabled module, names no table or tag.
			name:
				conflict.name ?? conflict.id ?? i18n.baseText(`promotions.preview.blockers.type.${type}`),
			type,
			usedBy: usedBy(conflict.consumers),
		};
	}
	return {
		...row,
		icon: resourceIcon(conflict.kind),
		name: conflict.name,
		type: conflict.kind,
		usedBy: usedBy(conflict.consumers),
	};
};

function movedRow(
	type: 'workflow' | 'folder',
	move: ApplyCheckResult['movedWorkflows'][number],
): BlockerRow {
	return {
		key: `moved:${type}:${move.id}`,
		icon: resourceIcon(type),
		name: move.name,
		type,
		usedBy: [],
		status: status('moved'),
		detail: labels.moveDetail(type, move),
	};
}

const blockerRows = computed<BlockerRow[]>(() => {
	if (!props.check) return [];
	const { accessRequirements, movedWorkflows, movedFolders } = props.check;
	return [
		...bindings.rows.value.map(({ key, binding, status: bindingStatus }) => ({
			key,
			icon: resourceIcon(binding.kind),
			name: binding.name,
			type: binding.kind,
			usedBy: usedBy(binding.consumers),
			status: status(bindingStatus === 'resolved' ? 'resolved' : 'missing'),
			createLabel:
				bindingStatus === 'missing'
					? i18n.baseText(`promotions.preview.blockers.create.${binding.kind}`)
					: undefined,
		})),
		...accessRequirements.map((access) => ({
			key: `access:${access.sourceId}`,
			icon: resourceIcon('credential'),
			name: access.name,
			type: 'credential' as const,
			usedBy: usedBy(access.consumers),
			status: status('access'),
			detail: i18n.baseText('promotions.preview.blockers.access'),
		})),
		...bindings.hardConflicts.value.map(conflictRow),
		...movedWorkflows.map((move) => movedRow('workflow', move)),
		...movedFolders.map((move) => movedRow('folder', move)),
	];
});

/** The sections of the missing dependencies, in the order that the page shows them. */
const DEPENDENCY_SECTIONS = [
	{
		group: 'other-project',
		id: 'otherProject',
		status: PROMOTE_GROUP_STATUS['other-project'],
		reason: 'promotions.preview.blockers.disabled.otherProject',
	},
	{
		group: 'outside-access',
		id: 'outsideAccess',
		status: PROMOTE_GROUP_STATUS['outside-access'],
		reason: 'promotions.preview.blockers.disabled.outside.promote',
	},
	{
		group: 'personal',
		id: 'notPromoted',
		status: PROMOTE_GROUP_STATUS.personal,
		reason: 'promotions.preview.blockers.disabled.personal',
	},
] as const;

type DependencySection = (typeof DEPENDENCY_SECTIONS)[number];

function dependencyDescription(
	id: DependencySection['id'],
	dependencies: PromotionMissingDependency[],
) {
	if (id === 'otherProject') {
		return i18n.baseText('promotions.preview.blockers.section.otherProject.description');
	}
	if (id === 'outsideAccess') {
		if (!props.check) {
			return i18n.baseText('promotions.preview.blockers.section.outsideAccess.description.promote');
		}
		return i18n.baseText(
			dependencies.some(({ blocking }) => blocking)
				? 'promotions.preview.blockers.section.outsideAccess.description.blocking'
				: 'promotions.preview.blockers.section.outsideAccess.description',
		);
	}
	// A user cannot move what is in a personal project that the user cannot access.
	if (dependencies.some(({ accessible }) => !accessible)) {
		return i18n.baseText('promotions.preview.blockers.section.notPromoted.description.noAccess');
	}
	return i18n.baseText(
		dependencies.every(({ kind }) => kind === 'credential')
			? 'promotions.preview.blockers.section.notPromoted.description'
			: 'promotions.preview.blockers.section.notPromoted.description.mixed',
	);
}

/** Why the workflows cannot use a sub-workflow or an error workflow on this instance after an Apply. */
const WORKFLOW_ISSUES: Partial<
	Record<PromotionMissingDependencyReason, { status: StatusKey; detail: BaseTextKey }>
> = {
	'not-on-instance': {
		status: 'missing',
		detail: 'promotions.preview.blockers.workflow.notOnInstance',
	},
	archived: { status: 'archived', detail: 'promotions.preview.blockers.workflow.archived' },
	'caller-policy': {
		status: 'conflict',
		detail: 'promotions.preview.blockers.workflow.callerPolicy',
	},
};

const workflowIssue = ({ kind, reason }: PromotionMissingDependency) =>
	kind === 'workflow' ? WORKFLOW_ISSUES[reason] : undefined;

// The row of a dependency of another project tells which project to promote it from.
const otherProjectDetail = ({ group, project }: PromotionMissingDependency) =>
	group === 'other-project' && project
		? i18n.baseText('promotions.preview.blockers.disabled.otherProject.named', {
				interpolate: { project: project.name },
			})
		: undefined;

// The row shows the name, the type and the workflows that use the dependency. The API sends no
// owner. It sends the project only for a dependency of another project that the user can access.
function dependencyRow(dependency: PromotionMissingDependency, sectionId: string) {
	const issue = workflowIssue(dependency);
	return {
		key: `${sectionId}:${dependency.kind}:${dependency.id ?? dependency.name}`,
		icon: resourceIcon(dependency.kind),
		name: dependency.name,
		type: dependency.kind,
		usedBy: usedBy(dependency.consumers),
		detail: issue ? i18n.baseText(issue.detail) : otherProjectDetail(dependency),
	};
}

// Promote cannot include the dependency yet, and Apply cannot add one that users cannot access.
// The button of the action only says why.
function disabledAction(
	{ kind, group, accessible, project }: PromotionMissingDependency,
	reason: DependencySection['reason'],
): BlockerRow['disabledAction'] {
	const interpolate = {
		type: i18n.baseText(`promotions.preview.blockers.type.${kind}`).toLowerCase(),
		project: project?.name ?? '',
	};
	if (props.check) {
		return {
			label: i18n.baseText(`promotions.preview.blockers.create.${kind}`),
			reason: i18n.baseText('promotions.preview.blockers.disabled.outside.apply', {
				interpolate,
			}),
		};
	}
	// The tooltip must not tell the user to move what the user cannot reach. It names the project
	// of the dependency when the API sends it.
	const namedReason =
		group === 'other-project' && project
			? 'promotions.preview.blockers.disabled.otherProject.named'
			: reason;
	const promoteReason =
		group === 'personal' && !accessible
			? 'promotions.preview.blockers.disabled.personal.noAccess'
			: namedReason;
	return {
		label: i18n.baseText('promotions.preview.blockers.include'),
		reason: i18n.baseText(promoteReason, { interpolate }),
	};
}

// The rows of "Needs your action", which only Apply has. A sub-workflow or an error workflow that
// users can access joins them. It does not stop the Apply, and this page cannot add it.
const needsActionRows = computed<BlockerRow[]>(() => [
	...blockerRows.value,
	...props.missingDependencies
		.filter(({ group }) => group === 'needs-action')
		.map((dependency) => ({
			...dependencyRow(dependency, 'blockers'),
			status: status(workflowIssue(dependency)?.status ?? 'missing'),
		})),
]);

// The kinds of issue, in the order that users read them.
const sections = computed(() =>
	[
		{
			id: 'blockers' as const,
			title: i18n.baseText('promotions.preview.blockers.section.blockers', {
				interpolate: { count: String(needsActionRows.value.length) },
			}),
			description: i18n.baseText('promotions.preview.blockers.section.blockers.description'),
			rows: needsActionRows.value,
		},
		...DEPENDENCY_SECTIONS.map((section) => {
			const dependencies = props.missingDependencies.filter(({ group }) => group === section.group);
			return {
				id: section.id,
				title: i18n.baseText(`promotions.preview.blockers.section.${section.id}`, {
					interpolate: { count: String(dependencies.length) },
				}),
				description: dependencyDescription(section.id, dependencies),
				rows: dependencies.map(
					(dependency): BlockerRow => ({
						...dependencyRow(dependency, section.id),
						status: status(section.status),
						disabledAction: disabledAction(dependency, section.reason),
					}),
				),
			};
		}),
	].filter(({ rows }) => rows.length > 0),
);

// What still stops the Apply. A missing dependency says itself whether it does.
const unresolvedCount = computed(() =>
	props.check
		? blockerRows.value.filter((row) => row.status.tone === 'warning').length +
			props.missingDependencies.filter(({ blocking }) => blocking).length
		: 0,
);

function removedColumns(
	changes: Extract<PromotionBindingConflict, { code: 'destructive-change' }>['changes'],
) {
	return changes
		.flatMap((change) =>
			change.kind === 'remove-column' || change.kind === 'change-column-type' ? change.column : [],
		)
		.join(', ');
}

const warnings = computed(() => props.check?.warnings ?? []);

// Data table changes and warnings do not block the operation, so they share one section.
const warningCount = computed(
	() =>
		bindings.destructiveChanges.value.length +
		warnings.value.length +
		props.dependencyWarnings.length,
);
const open = ref({
	blockers: true,
	otherProject: true,
	outsideAccess: true,
	notPromoted: true,
	warnings: true,
});

async function create(key: string) {
	if (!creation) return;
	await bindings.createBinding(key, creation.createBinding);
	if (bindings.rows.value.some((row) => row.key === key && row.status === 'resolved')) {
		emit('refresh');
	}
}

const isCreateDisabled = computed(() => props.busy || bindings.isBusy.value);
</script>

<template>
	<div :class="$style.blockers" data-test-id="promotion-preview-blockers">
		<slot />
		<N8nText tag="p" color="text-base">
			{{
				i18n.baseText(
					check ? 'promotions.preview.blockers.intro' : 'promotions.preview.blockers.intro.promote',
				)
			}}
		</N8nText>

		<N8nCallout
			v-if="check && unresolvedCount === 0 && missingDependencies.length === 0"
			theme="success"
			slim
			role="status"
			data-test-id="promotion-preview-blockers-status"
		>
			{{ i18n.baseText('promotions.preview.blockers.none') }}
		</N8nCallout>

		<N8nCallout v-if="bindings.error.value?.kind === 'creationMismatch'" theme="danger">
			{{ i18n.baseText('promotions.bindings.error.creationMismatch') }}
		</N8nCallout>

		<section
			v-for="section in sections"
			:key="section.id"
			:class="$style.section"
			data-test-id="promotion-preview-blockers-section"
		>
			<button
				type="button"
				:class="$style.sectionHeader"
				:aria-expanded="open[section.id]"
				@click="open[section.id] = !open[section.id]"
			>
				<N8nIcon :icon="open[section.id] ? 'chevron-down' : 'chevron-right'" size="small" />
				<N8nHeading tag="h2" size="medium">{{ section.title }}</N8nHeading>
			</button>
			<div v-show="open[section.id]">
				<N8nText v-if="section.description" tag="p" color="text-base" :class="$style.description">
					{{ section.description }}
				</N8nText>
				<table
					:class="[$style.table, $style.fixedColumns]"
					data-test-id="promotion-preview-blockers-table"
				>
					<colgroup>
						<col :class="$style.nameColumn" />
						<col />
						<col :class="$style.typeColumn" />
						<col :class="$style.statusColumn" />
						<col :class="$style.actionColumn" />
					</colgroup>
					<thead>
						<tr>
							<th scope="col">{{ i18n.baseText('promotions.preview.blockers.column.name') }}</th>
							<th scope="col">{{ i18n.baseText('promotions.preview.blockers.column.usedBy') }}</th>
							<th scope="col">{{ i18n.baseText('promotions.preview.blockers.column.type') }}</th>
							<th scope="col">{{ i18n.baseText('promotions.preview.blockers.column.status') }}</th>
							<th
								scope="col"
								:aria-label="i18n.baseText('promotions.preview.blockers.column.action')"
							/>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="row in section.rows"
							:key="row.key"
							data-test-id="promotion-preview-blocker-row"
							:data-blocker-key="row.key"
						>
							<td>
								<div :class="$style.name">
									<N8nIcon :icon="row.icon" size="small" :class="$style.icon" />
									<N8nText step="xs" color="text-dark">{{ row.name }}</N8nText>
								</div>
								<N8nText
									v-if="row.detail"
									tag="p"
									step="2xs"
									color="text-light"
									:class="$style.detail"
								>
									{{ row.detail }}
								</N8nText>
							</td>
							<td>
								<N8nText step="2xs" color="text-light">
									<PromotionWorkflowLinks
										:workflows="row.usedBy"
										list
										@inspect="emit('inspect', $event)"
									/>
								</N8nText>
							</td>
							<td>
								<N8nText step="xs" color="text-base">
									{{ i18n.baseText(`promotions.preview.blockers.type.${row.type}`) }}
								</N8nText>
							</td>
							<td aria-live="polite">
								<N8nText size="medium" :class="[$style.status, $style[row.status.tone]]">
									<N8nIcon :icon="row.status.icon" size="small" />
									{{ row.status.label }}
								</N8nText>
							</td>
							<td :class="$style.action">
								<N8nButton
									v-if="row.createLabel"
									variant="outline"
									size="small"
									:class="$style.createAction"
									:disabled="isCreateDisabled"
									data-test-id="promotion-preview-blocker-create"
									@click="create(row.key)"
								>
									{{ row.createLabel }}
								</N8nButton>
								<!-- A disabled button gets no pointer events and no focus, so its wrapper is the
								tooltip trigger. -->
								<N8nTooltip v-else-if="row.disabledAction" placement="left" as-child>
									<template #content>{{ row.disabledAction.reason }}</template>
									<span
										tabindex="0"
										role="group"
										:class="$style.disabledAction"
										:aria-label="`${row.disabledAction.label}. ${row.disabledAction.reason}`"
										data-test-id="promotion-preview-blocker-disabled-action"
									>
										<N8nButton variant="outline" size="small" disabled>
											{{ row.disabledAction.label }}
										</N8nButton>
									</span>
								</N8nTooltip>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</section>

		<section v-if="warningCount > 0" :class="$style.section">
			<button
				type="button"
				:class="$style.sectionHeader"
				:aria-expanded="open.warnings"
				@click="open.warnings = !open.warnings"
			>
				<N8nIcon :icon="open.warnings ? 'chevron-down' : 'chevron-right'" size="small" />
				<N8nHeading tag="h2" size="medium">
					{{
						i18n.baseText('promotions.preview.blockers.section.warnings', {
							adjustToNumber: warningCount,
							interpolate: { count: String(warningCount) },
						})
					}}
				</N8nHeading>
			</button>
			<div v-show="open.warnings" :class="$style.groups">
				<div v-if="bindings.destructiveChanges.value.length > 0" :class="$style.group">
					<N8nCallout theme="warning" :class="$style.callout">
						<N8nText bold tag="p">{{
							i18n.baseText('promotions.preview.blockers.destructive.title')
						}}</N8nText>
						{{
							i18n.baseText('promotions.bindings.destructive.confirmDescription', {
								adjustToNumber: bindings.destructiveChanges.value.length,
							})
						}}
					</N8nCallout>
					<table :class="$style.table">
						<thead>
							<tr>
								<th scope="col">
									{{ i18n.baseText('promotions.preview.blockers.column.dataTable') }}
								</th>
								<th scope="col">
									{{ i18n.baseText('promotions.preview.blockers.column.usedBy') }}
								</th>
								<th scope="col">
									{{ i18n.baseText('promotions.preview.blockers.column.columns') }}
								</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="table in bindings.destructiveChanges.value" :key="table.id">
								<td>
									<div :class="$style.name">
										<N8nIcon :icon="resourceIcon('dataTable')" size="small" :class="$style.icon" />
										<N8nText step="xs" color="text-dark">{{ table.name }}</N8nText>
									</div>
								</td>
								<td>
									<N8nText step="2xs" color="text-light">
										<PromotionWorkflowLinks
											:workflows="usedBy(table.consumers)"
											list
											@inspect="emit('inspect', $event)"
										/>
									</N8nText>
								</td>
								<td>
									<N8nText step="xs" color="text-base">{{ removedColumns(table.changes) }}</N8nText>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
				<div v-if="warnings.length > 0" :class="$style.group">
					<N8nCallout theme="info" :class="$style.callout">
						<N8nText bold tag="p">{{
							i18n.baseText('promotions.preview.blockers.shadowed.title')
						}}</N8nText>
						{{ i18n.baseText('promotions.preview.blockers.shadowed.description') }}
					</N8nCallout>
					<table :class="$style.table">
						<thead>
							<tr>
								<th scope="col">
									{{ i18n.baseText('promotions.preview.blockers.column.variable') }}
								</th>
								<th scope="col">
									{{ i18n.baseText('promotions.preview.blockers.column.usedBy') }}
								</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="warning in warnings" :key="warning.name">
								<td>
									<div :class="$style.name">
										<N8nIcon :icon="resourceIcon('variable')" size="small" :class="$style.icon" />
										<N8nText step="xs" color="text-dark">{{ warning.name }}</N8nText>
									</div>
								</td>
								<td>
									<N8nText step="2xs" color="text-light">
										<PromotionWorkflowLinks
											:workflows="usedBy(warning.consumers)"
											@inspect="emit('inspect', $event)"
										/>
									</N8nText>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
				<div v-if="dependencyWarnings.length > 0" :class="$style.group">
					<N8nCallout theme="warning" :class="$style.callout">
						<N8nText bold tag="p">{{
							i18n.baseText('promotions.preview.blockers.missingOnSource.title')
						}}</N8nText>
						{{ i18n.baseText('promotions.preview.blockers.missingOnSource.description') }}
					</N8nCallout>
					<table :class="$style.table">
						<thead>
							<tr>
								<th scope="col">{{ i18n.baseText('promotions.preview.blockers.column.name') }}</th>
								<th scope="col">
									{{ i18n.baseText('promotions.preview.blockers.column.usedBy') }}
								</th>
								<th scope="col">{{ i18n.baseText('promotions.preview.blockers.column.type') }}</th>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="warning in dependencyWarnings"
								:key="`${warning.kind}:${warning.id ?? warning.name}`"
								data-test-id="promotion-preview-dependency-warning"
							>
								<td>
									<div :class="$style.name">
										<N8nIcon :icon="resourceIcon(warning.kind)" size="small" :class="$style.icon" />
										<N8nText step="xs" color="text-dark">{{ warning.name }}</N8nText>
									</div>
									<N8nText tag="p" step="2xs" color="text-light" :class="$style.detail">
										{{
											i18n.baseText(`promotions.preview.blockers.missingOnSource.${warning.kind}`)
										}}
									</N8nText>
								</td>
								<td>
									<N8nText step="2xs" color="text-light">
										<PromotionWorkflowLinks
											:workflows="usedBy(warning.consumers)"
											list
											@inspect="emit('inspect', $event)"
										/>
									</N8nText>
								</td>
								<td>
									<N8nText step="xs" color="text-base">
										{{ i18n.baseText(`promotions.preview.blockers.type.${warning.kind}`) }}
									</N8nText>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</section>

		<N8nText
			v-if="unresolvedCount > 0"
			tag="p"
			step="xs"
			color="text-base"
			role="status"
			data-test-id="promotion-preview-blockers-status"
		>
			{{
				i18n.baseText('promotions.preview.blockers.unresolved', {
					adjustToNumber: unresolvedCount,
					interpolate: { count: String(unresolvedCount) },
				})
			}}
		</N8nText>
	</div>
</template>

<style module lang="scss">
.blockers {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	padding: var(--spacing--sm) var(--spacing--lg);
	overflow-y: auto;
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.sectionHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	align-self: flex-start;
	padding: 0;
	border: none;
	background: none;
	color: var(--text-color);
	cursor: pointer;

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--outline-color);
		outline-offset: var(--spacing--4xs);
	}
}

.groups {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.group {
	display: flex;
	flex-direction: column;
	border: var(--border);
	border-radius: var(--radius--xs);
	overflow: hidden;

	.table {
		border: none;
		border-top: var(--border);
		border-radius: 0;
	}
}

.callout {
	border: none;
	border-radius: 0;
}

.table {
	width: 100%;
	border: var(--border);
	border-radius: var(--radius--xs);
	border-collapse: separate;
	border-spacing: 0;
	overflow: hidden;

	th,
	td {
		padding: var(--spacing--xs) var(--spacing--sm);
		text-align: left;
		vertical-align: middle;
	}

	th {
		background-color: var(--background--subtle);
		color: var(--text-color--subtle);
		font-size: var(--font-size--2xs);
		font-weight: var(--font-weight--medium);
	}

	td {
		border-top: var(--border);
	}

	/* The actions sit at the right edge. This rule needs the weight of the cell rule above. */
	td.action {
		text-align: right;
	}
}

/* Fixed widths keep the columns in place when the last action button goes away. */
.fixedColumns {
	table-layout: fixed;
}

.nameColumn {
	width: 36%;
}

.typeColumn {
	width: 10%;
}

/* Wide enough for the longest status, so it never runs into the action. */
.statusColumn {
	width: 16%;
}

.actionColumn {
	width: 16%;
}

.name {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.icon {
	flex-shrink: 0;
	color: var(--icon-color);
}

.detail {
	margin-top: var(--spacing--4xs);
}

.status {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	white-space: nowrap;
}

.description {
	margin: 0 0 var(--spacing--2xs);
}

.neutral {
	color: var(--text-color--subtler);
}

.warning {
	color: var(--text-color--warning);
}

.success {
	color: var(--text-color--success);
}

.action {
	white-space: nowrap;
}

.disabledAction {
	display: inline-block;
}

/* The button is block-level, so the text alignment of the cell does not move it. */
.createAction {
	margin-left: auto;
}
</style>
