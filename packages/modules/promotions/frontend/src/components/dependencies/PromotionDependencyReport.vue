<script setup lang="ts">
import type { PromotionDependencyReport, PromotionDirection, PromotionGap } from '@n8n/api-types';
import { N8nCallout, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import { usePromotionDependencyLabels } from '../../composables/usePromotionDependencyLabels';
import {
	groupGaps,
	type ApplyConfirmations,
	type GapTargetRow,
	type PromotionOwnerRequester,
} from '../../promotionDependencies';
import type { ResourceKey } from '../../promotionPreview.selection';
import PromotionWorkflowLinks from '../preview/PromotionWorkflowLinks.vue';
import PromotionApplyConfirmations from './PromotionApplyConfirmations.vue';
import PromotionDependencySection from './PromotionDependencySection.vue';
import PromotionDependencyTarget from './PromotionDependencyTarget.vue';
import PromotionGapRow, { type OwnerRequestState } from './PromotionGapRow.vue';

/**
 * The Dependencies tab of the preview page: every reference of the operation that will not
 * resolve, grouped by what the user can do about it, and what an Apply does for the others.
 */
const props = defineProps<{
	report: PromotionDependencyReport;
	direction: PromotionDirection;
	confirmations: ApplyConfirmations;
	/** True while the operation runs. */
	locked?: boolean;
	/** The names of the projects that the user can access, by id. */
	projectNames: ReadonlyMap<string, string>;
	/** The deleted workflows that the user can take out of the selection, by id. */
	removableDeletions: ReadonlySet<string>;
	environmentId?: string;
	/** Sends "Ask the owner". Without it the action shows and is not available. */
	ownerRequester?: PromotionOwnerRequester;
	/** True for a request that this session already sent, so a refreshed report still says so. */
	isRequestSent?: (gap: PromotionGap) => boolean;
	/** True when the server sent no report. The page then shows only what it knows without one. */
	unchecked?: boolean;
	/** True while the server checks a new selection. The list then shows the page's own view. */
	checking?: boolean;
	/** A confirmation that the operation still waits for, as a sentence. */
	pending?: string;
}>();

const emit = defineEmits<{
	include: [row: GapTargetRow];
	removeDeletion: [workflowId: string];
	inspect: [key: ResourceKey];
	grant: [id: string, accepted: boolean];
	deletionCallers: [accepted: boolean];
	credentialHome: [credentialId: string, projectId: string];
}>();

const i18n = useI18n();
const {
	groupTitle,
	groupDescription,
	usageLabel,
	warningText,
	resourceName,
	resourceWarningText,
	noteText,
	hardBlockText,
	hardBlockDetails,
} = usePromotionDependencyLabels();

const groups = computed(() => groupGaps(props.report.gaps));
const gapCount = computed(() => props.report.gaps.length);

type Status = {
	theme: 'danger' | 'success' | 'info' | 'warning';
	key: 'hardBlocks' | 'none' | 'gaps';
};
const status = computed((): Status => {
	if (props.report.hardBlocks.length > 0) return { theme: 'danger', key: 'hardBlocks' };
	if (gapCount.value === 0) return { theme: props.pending ? 'warning' : 'success', key: 'none' };
	return { theme: 'info', key: 'gaps' };
});
const statusText = computed(() => {
	// Without a gap, a pending confirmation is the only thing that the user must read.
	if (status.value.key === 'none' && props.pending) return props.pending;
	const text = i18n.baseText(
		`promotions.dependencies.status.${status.value.key}.${props.direction}`,
		{ adjustToNumber: gapCount.value, interpolate: { count: String(gapCount.value) } },
	);
	return props.pending && status.value.key === 'gaps' ? `${text} ${props.pending}` : text;
});

// The state of each request to an owner, by target. It lasts while the page is open. After a
// refresh the report itself says that the request was sent.
const ownerRequests = ref(new Map<string, OwnerRequestState>());

async function askOwner(row: GapTargetRow) {
	const requester = props.ownerRequester;
	const [gap] = row.gaps;
	if (!requester || !gap || !props.environmentId) return;
	ownerRequests.value.set(row.key, 'sending');
	let sent = false;
	try {
		sent = await requester({
			environmentId: props.environmentId,
			target: { kind: row.target.kind, id: row.target.id },
			consumerWorkflowId: gap.consumer.id,
			gap,
		});
	} catch {
		sent = false;
	}
	ownerRequests.value.set(row.key, sent ? 'sent' : 'failed');
}

/** One request covers every consumer of the target, so the first reference stands for the row. */
function ownerRequestOf(row: GapTargetRow): OwnerRequestState | undefined {
	const state = ownerRequests.value.get(row.key);
	if (state) return state;
	return row.gaps.some((gap) => props.isRequestSent?.(gap)) ? 'sent' : undefined;
}

/** The project that gets the empty credential of a credential gap: the project of its consumer. */
function emptyCredentialProject(row: GapTargetRow): string | undefined {
	if (!row.createsEmptyCredential || props.direction !== 'apply') {
		return undefined;
	}
	return props.projectNames.get(row.gaps[0].consumer.projectId) ?? '';
}

/** Promote: the sentence of the spec for one caller of a deleted workflow. */
function deletionCallerText(
	target: { name: string },
	caller: { name: string; projectId: string; projectName?: string },
): string {
	// A newer server can send the name on the row. Else the page knows it, or the sentence has none.
	const project = caller.projectName ?? props.projectNames.get(caller.projectId);
	return project
		? i18n.baseText('promotions.dependencies.deletions.promote.caller', {
				interpolate: { caller: caller.name, project, target: target.name },
			})
		: i18n.baseText('promotions.dependencies.deletions.promote.caller.noProject', {
				interpolate: { caller: caller.name, target: target.name },
			});
}

const resourceWarnings = computed(() => props.report.resourceWarnings ?? []);
const warningCount = computed(() => props.report.warnings.length + resourceWarnings.value.length);

const consumerLink = (consumer: { id: string; name: string }) => [
	{ key: `workflow:${consumer.id}`, name: consumer.name },
];
</script>

<template>
	<div :class="$style.report" data-test-id="promotion-dependency-report">
		<slot />

		<N8nCallout
			v-if="!unchecked"
			:theme="status.theme"
			slim
			role="status"
			data-test-id="promotion-dependency-status"
		>
			{{ statusText }}
		</N8nCallout>

		<PromotionDependencySection
			v-if="report.hardBlocks.length > 0"
			:title="
				i18n.baseText('promotions.dependencies.hardBlocks.title', {
					adjustToNumber: report.hardBlocks.length,
					interpolate: { count: String(report.hardBlocks.length) },
				})
			"
			:description="i18n.baseText('promotions.dependencies.hardBlocks.description')"
			tone="danger"
			icon="circle-x"
			data-test-id="promotion-dependency-hard-blocks"
		>
			<li
				v-for="(block, index) in report.hardBlocks"
				:key="`${block.code}:${block.target.id}:${index}`"
				:class="$style.row"
				data-test-id="promotion-dependency-hard-block"
			>
				<PromotionDependencyTarget :target="block.target" />
				<N8nText tag="p" step="xs" color="text-dark" :class="$style.indented">
					{{ hardBlockText(block) }}
				</N8nText>
				<N8nText
					v-for="line in hardBlockDetails(block)"
					:key="line"
					tag="p"
					step="2xs"
					color="text-base"
					:class="$style.indented"
					data-test-id="promotion-dependency-hard-block-detail"
				>
					{{ line }}
				</N8nText>
				<N8nText
					v-if="block.consumer"
					tag="p"
					step="2xs"
					color="text-light"
					:class="$style.indented"
				>
					{{ i18n.baseText('promotions.dependencies.usage.credential') }}
					<PromotionWorkflowLinks
						:workflows="consumerLink(block.consumer)"
						@inspect="emit('inspect', $event)"
					/>
				</N8nText>
			</li>
		</PromotionDependencySection>

		<PromotionDependencySection
			v-for="group in groups"
			:key="group.id"
			:title="groupTitle(group.id, direction)"
			:description="groupDescription(group.id, direction)"
			data-test-id="promotion-gap-group"
			:data-gap-group="group.id"
		>
			<template #action>
				<N8nText step="2xs" color="text-light" :class="$style.count">
					{{
						i18n.baseText('promotions.dependencies.references', {
							adjustToNumber: group.gapCount,
							interpolate: { count: String(group.gapCount) },
						})
					}}
				</N8nText>
			</template>
			<PromotionGapRow
				v-for="row in group.rows"
				:key="row.key"
				:row="row"
				:group="group.id"
				:direction="direction"
				:locked="locked"
				:can-ask-owner="!!ownerRequester && !!environmentId"
				:owner-request="ownerRequestOf(row)"
				:empty-credential-project="emptyCredentialProject(row)"
				@include="emit('include', row)"
				@ask-owner="askOwner(row)"
				@remove-deletion="emit('removeDeletion', row.target.id)"
				@inspect="emit('inspect', $event)"
			/>
		</PromotionDependencySection>

		<slot name="moves" />

		<PromotionApplyConfirmations
			v-if="direction === 'apply'"
			:report="report"
			:confirmations="confirmations"
			:locked="locked"
			:project-names="projectNames"
			:removable-deletions="removableDeletions"
			@grant="(id, accepted) => emit('grant', id, accepted)"
			@deletion-callers="emit('deletionCallers', $event)"
			@credential-home="(id, projectId) => emit('credentialHome', id, projectId)"
			@keep="emit('removeDeletion', $event)"
			@inspect="emit('inspect', $event)"
		/>

		<!-- Promote: the source has the same broken reference, so the list only informs. -->
		<PromotionDependencySection
			v-if="direction === 'promote' && report.deletionCallers.length > 0"
			:title="i18n.baseText('promotions.dependencies.deletions.title')"
			:description="i18n.baseText('promotions.dependencies.deletions.description.promote')"
			tone="quiet"
			icon="triangle-alert"
			data-test-id="promotion-dependency-promote-deletions"
		>
			<li
				v-for="{ target, callers, hiddenCallerCount } in report.deletionCallers"
				:key="target.id"
				:class="$style.row"
			>
				<PromotionDependencyTarget
					:target="{ kind: 'workflow', id: target.id, name: target.name }"
				/>
				<N8nText
					v-for="caller in callers"
					:key="caller.id"
					tag="p"
					step="xs"
					color="text-base"
					:class="$style.indented"
					data-test-id="promotion-dependency-promote-deletion-caller"
				>
					{{ deletionCallerText(target, caller) }}
				</N8nText>
				<N8nText
					v-if="hiddenCallerCount > 0"
					tag="p"
					step="xs"
					color="text-base"
					:class="$style.indented"
					data-test-id="promotion-dependency-hidden-callers"
				>
					{{
						i18n.baseText('promotions.dependencies.deletions.hidden', {
							adjustToNumber: hiddenCallerCount,
							interpolate: { count: String(hiddenCallerCount) },
						})
					}}
				</N8nText>
			</li>
		</PromotionDependencySection>

		<PromotionDependencySection
			v-if="warningCount > 0"
			:title="
				i18n.baseText('promotions.dependencies.warnings.title', {
					adjustToNumber: warningCount,
					interpolate: { count: String(warningCount) },
				})
			"
			:description="i18n.baseText(`promotions.dependencies.warnings.description.${direction}`)"
			tone="quiet"
			icon="triangle-alert"
			data-test-id="promotion-dependency-warnings"
		>
			<li v-for="warning in report.warnings" :key="warning.id" :class="$style.row">
				<PromotionDependencyTarget :target="warning.target" />
				<N8nText tag="p" step="xs" color="text-base" :class="$style.indented">
					{{ warningText(warning) }}
				</N8nText>
				<N8nText tag="p" step="2xs" color="text-light" :class="$style.indented">
					{{ usageLabel(warning.usage) }}
					<PromotionWorkflowLinks
						:workflows="consumerLink(warning.consumer)"
						@inspect="emit('inspect', $event)"
					/>
				</N8nText>
			</li>
			<!-- A data table or a variable of another project. The operation does not copy it. -->
			<li
				v-for="(warning, index) in resourceWarnings"
				:key="`${warning.code}:${warning.consumer.id}:${warning.resource.id ?? warning.resource.name ?? index}`"
				:class="$style.row"
				data-test-id="promotion-dependency-resource-warning"
			>
				<PromotionDependencyTarget
					:target="{
						kind: warning.resource.kind,
						id: warning.resource.id ?? '',
						name: resourceName(warning),
						project: warning.resource.project,
					}"
					:hide-id="!warning.resource.id"
				/>
				<N8nText tag="p" step="xs" color="text-base" :class="$style.indented">
					{{ resourceWarningText(warning) }}
				</N8nText>
				<N8nText tag="p" step="2xs" color="text-light" :class="$style.indented">
					{{ i18n.baseText('promotions.dependencies.usage.resource') }}
					<PromotionWorkflowLinks
						:workflows="consumerLink(warning.consumer)"
						@inspect="emit('inspect', $event)"
					/>
				</N8nText>
			</li>
		</PromotionDependencySection>

		<PromotionDependencySection
			v-if="report.notes.length > 0"
			:title="i18n.baseText('promotions.dependencies.notes.title')"
			tone="quiet"
			icon="info"
			data-test-id="promotion-dependency-notes"
		>
			<li
				v-for="(note, index) in report.notes"
				:key="`${note.code}:${note.consumer.id}:${note.target?.id ?? index}`"
				:class="$style.row"
			>
				<PromotionDependencyTarget v-if="note.target" :target="note.target" />
				<N8nText tag="p" step="xs" color="text-base" :class="note.target ? $style.indented : ''">
					{{ noteText(note) }}
				</N8nText>
				<N8nText tag="p" step="2xs" color="text-light" :class="note.target ? $style.indented : ''">
					{{ usageLabel(note.usage) }}
					<PromotionWorkflowLinks
						:workflows="consumerLink(note.consumer)"
						@inspect="emit('inspect', $event)"
					/>
				</N8nText>
			</li>
		</PromotionDependencySection>

		<div :class="$style.footnotes">
			<N8nText
				v-if="checking"
				tag="p"
				step="2xs"
				color="text-light"
				:class="$style.footnote"
				role="status"
				data-test-id="promotion-dependency-checking"
			>
				<N8nIcon icon="refresh-cw" size="small" />
				{{ i18n.baseText('promotions.dependencies.checking') }}
			</N8nText>
			<N8nText
				tag="p"
				step="2xs"
				color="text-light"
				:class="$style.footnote"
				data-test-id="promotion-dependency-footnote"
			>
				<N8nIcon icon="info" size="small" />
				{{ i18n.baseText('promotions.dependencies.footnote') }}
			</N8nText>
		</div>
	</div>
</template>

<style module lang="scss">
.report {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	padding: var(--spacing--sm) var(--spacing--lg) var(--spacing--lg);
	overflow-y: auto;
}

.row {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--xs) var(--spacing--sm);

	&:not(:first-child) {
		border-top: var(--border);
	}
}

.indented {
	margin: 0;
	padding-left: calc(var(--spacing--xs) + var(--spacing--2xs));
}

.count {
	white-space: nowrap;
}

.footnotes {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.footnote {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	margin: 0;
}
</style>
