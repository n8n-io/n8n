<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { SkillPendingUpdate, SkillScanFinding, SkillSourceUpdates } from '@n8n/api-types';
import {
	N8nButton,
	N8nCallout,
	N8nCheckbox,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nIcon,
	N8nLoading,
	N8nText,
} from '@n8n/design-system';
import type { TabOptions } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { ResponseError } from '@n8n/rest-api-client';

import TimeAgo from '@/app/components/TimeAgo.vue';
import {
	countsByFile,
	diffSkills,
	type DiffSection,
} from '@/features/agents/components/skillVersions/skillVersionDiff';

import SkillFilesView from './SkillFilesView.vue';
import SkillFindingsList from './SkillFindingsList.vue';
import SkillReviewHeader from './SkillReviewHeader.vue';
import SkillReviewPicker from './SkillReviewPicker.vue';
import {
	acceptAll,
	isSkippedFileFinding,
	skippedFilesOf,
	statusesOf,
	type SkillDecision,
	type SkillReviewGroup,
} from './skillReview.types';
import { frontmatterDiff, useSkillScopeDisplay, useSkillSourceReasons } from '../skills.utils';
import { useSkillsStore } from '../skills.store';

const props = defineProps<{
	open: boolean;
	sourceId: string | null;
	/** The label of the source, such as `owner/repository`, so the title shows while it loads. */
	label?: string;
}>();

const emit = defineEmits<{
	'update:open': [open: boolean];
	/** Updates came in or were skipped, so the lists reload. */
	changed: [];
}>();

const i18n = useI18n();
const { showError, showMessage } = useToast();
const skillsStore = useSkillsStore();
const { reasonText } = useSkillSourceReasons();
const { scopeDisplay } = useSkillScopeDisplay();

const data = ref<SkillSourceUpdates | null>(null);
const loading = ref(false);
const applying = ref(false);
const reviewedWarnings = ref(false);

/** The decision for each update that can come in, by skill id. */
const decisions = ref<Record<string, SkillDecision>>({});
const previewId = ref<string | null>(null);

type UpdateTab = 'review' | 'ready' | 'unavailable';

const TABS: UpdateTab[] = ['review', 'ready', 'unavailable'];

const TAB_LABELS = {
	review: 'settings.context.skills.connect.tab.review',
	ready: 'settings.context.skills.connect.tab.ready',
	unavailable: 'settings.context.skills.connect.tab.unavailable',
} satisfies Record<UpdateTab, BaseTextKey>;

const activeTab = ref<UpdateTab>('review');

/** Counts the loads, so an answer that arrives after a newer load is dropped. */
let loadId = 0;

async function load() {
	if (!props.sourceId) return;
	const id = ++loadId;
	loading.value = true;
	try {
		const loaded = await skillsStore.fetchSourceUpdates(props.sourceId);
		if (id !== loadId) return;
		data.value = loaded;
		reviewedWarnings.value = false;
		// Every update that can come in starts as accepted, as in the import picker.
		decisions.value = acceptAll(
			loaded.updates.filter(isAcceptable).map((update) => ({ id: update.skillId })),
		);
		const tab = TABS.find((candidate) => byTab.value[candidate].length > 0) ?? 'review';
		selectTab(tab);
	} catch (error) {
		if (id !== loadId) return;
		showError(error, i18n.baseText('settings.context.skills.updates.error.load'));
		emit('update:open', false);
	} finally {
		if (id === loadId) loading.value = false;
	}
}

watch(
	() => [props.open, props.sourceId] as const,
	async ([open]) => {
		if (open) await load();
		else data.value = null;
	},
	{ immediate: true },
);

const canReview = computed(() => data.value?.source.canReview === true);

/** An update that the check did not block and whose name is free. */
function isAcceptable(update: SkillPendingUpdate): boolean {
	return update.check.verdict !== 'blocked' && update.nameClash === null;
}

function tabOf(update: SkillPendingUpdate): UpdateTab {
	if (!isAcceptable(update)) return 'unavailable';
	return update.check.verdict === 'needs_review' ? 'review' : 'ready';
}

const byTab = computed(() => {
	const tabs: Record<UpdateTab, SkillPendingUpdate[]> = { review: [], ready: [], unavailable: [] };
	for (const update of data.value?.updates ?? []) tabs[tabOf(update)].push(update);
	return tabs;
});

/** A tab with no updates is not shown. */
const tabs = computed<Array<TabOptions<UpdateTab>>>(() =>
	TABS.filter((tab) => byTab.value[tab].length > 0).map((tab) => ({
		value: tab,
		label: i18n.baseText(TAB_LABELS[tab], { interpolate: { count: byTab.value[tab].length } }),
	})),
);

/** A new tab previews its first update, so the preview is never empty when a tab has updates. */
function selectTab(tab: UpdateTab) {
	activeTab.value = tab;
	previewId.value = byTab.value[tab][0]?.skillId ?? null;
}

const preview = computed(
	() => data.value?.updates.find((update) => update.skillId === previewId.value) ?? null,
);

/** The updates of the active tab, as the review picker lists them. */
const groups = computed<SkillReviewGroup[]>(() => [
	{
		id: '',
		name: '',
		items: byTab.value[activeTab.value].map((update) => ({
			id: update.skillId,
			title: update.name,
			subtitle: update.location,
			decidable: isAcceptable(update),
			statuses: update.nameClash
				? [{ kind: 'error', count: 1 }]
				: statusesOf(update.check.findings, !update.update),
		})),
	},
]);

function updatesWith(decision: SkillDecision) {
	return (data.value?.updates ?? []).filter(
		(update) => isAcceptable(update) && decisions.value[update.skillId] === decision,
	);
}

const acceptedUpdates = computed(() => updatesWith('accept'));
const rejectedUpdates = computed(() => updatesWith('reject'));
const needsReview = computed(() =>
	acceptedUpdates.value.some((update) => update.check.verdict === 'needs_review'),
);
const canApply = computed(
	() =>
		canReview.value &&
		acceptedUpdates.value.length + rejectedUpdates.value.length > 0 &&
		(!needsReview.value || reviewedWarnings.value),
);

const applyLabel = computed(() => {
	const accepted = acceptedUpdates.value.length;
	const rejected = rejectedUpdates.value.length;
	if (accepted === 0 && rejected > 0) {
		return i18n.baseText('settings.context.skills.updates.rejectSelected', {
			interpolate: { count: rejected },
			adjustToNumber: rejected,
		});
	}
	return i18n.baseText('settings.context.skills.updates.updateSelected', {
		interpolate: { count: accepted },
		adjustToNumber: accepted,
	});
});

/** The diff of an update, as the version compare shows it. The name shows only when it changes. */
function sectionsOf(update: SkillPendingUpdate): DiffSection[] {
	if (!update.update) return [];
	const frontmatter = frontmatterDiff(update.currentFrontmatter, update.updateFrontmatter);
	return [
		...diffSkills(update.current, update.update).filter(
			(section) => section.key !== 'name' || section.added + section.removed > 0,
		),
		...(frontmatter ? [{ key: 'frontmatter', ...frontmatter }] : []),
	];
}

const sections = computed(
	() => new Map((data.value?.updates ?? []).map((u) => [u.skillId, sectionsOf(u)])),
);

function skippedFiles(update: SkillPendingUpdate) {
	return skippedFilesOf(update.check.findings);
}

function checkFindings(update: SkillPendingUpdate): SkillScanFinding[] {
	return update.check.findings.filter((finding) => !isSkippedFileFinding(finding));
}

/** The files that the files view lists for an update: its kept files, from the diff. */
function filesOf(update: SkillPendingUpdate): Set<string> {
	return new Set(Object.keys(countsByFile(sections.value.get(update.skillId) ?? [])));
}

/** Findings in a file that the files view shows, so they sit at the top of that file. */
function fileFindings(update: SkillPendingUpdate): SkillScanFinding[] {
	if (!update.update) return [];
	const files = filesOf(update);
	return checkFindings(update).filter((finding) => finding.file && files.has(finding.file));
}

function otherFindings(update: SkillPendingUpdate): SkillScanFinding[] {
	const inFiles = new Set(fileFindings(update));
	return checkFindings(update).filter((finding) => !inFiles.has(finding));
}

const sourceLine = computed(() => {
	const source = data.value?.source;
	return source ? [source.label, source.ref].filter(Boolean).join(' · ') : (props.label ?? '');
});

const commitLine = computed(() => {
	const commit = data.value?.commit;
	if (!commit) return '';
	return [commit.message, commit.author].filter(Boolean).join(' · ');
});

const scopeLabel = computed(() => {
	const source = data.value?.source;
	if (!source) return '';
	return scopeDisplay({
		scope: source.projectId ? 'project' : 'instance',
		projectId: source.projectId,
		projectName: source.projectName,
		projectType: source.projectType,
		agentName: null,
	}).label;
});

const readOnlyText = computed(() => {
	const source = data.value?.source;
	if (!source || source.canReview) return '';
	if (source.projectId === null) {
		return i18n.baseText('settings.context.skills.updates.readOnly.global');
	}
	return i18n.baseText('settings.context.skills.updates.readOnly.project', {
		interpolate: { scope: scopeLabel.value },
	});
});

function errorOf(error: unknown) {
	const reason = error instanceof ResponseError ? error.meta?.reason : undefined;
	return reason !== undefined ? new Error(reasonText(reason)) : error;
}

async function acceptUpdates(updates: SkillPendingUpdate[]) {
	if (!props.sourceId || updates.length === 0) return;
	const result = await skillsStore.acceptSourceUpdates(props.sourceId, {
		updates: updates.map(({ skillId, contentHash }) => ({ skillId, contentHash })),
		reviewedWarnings: reviewedWarnings.value,
	});
	const nameOf = (skillId: string) =>
		updates.find((update) => update.skillId === skillId)?.name ?? skillId;
	if (result.accepted.length > 0) {
		showMessage({
			title: i18n.baseText('settings.context.skills.updates.updated', {
				interpolate: { count: result.accepted.length },
				adjustToNumber: result.accepted.length,
			}),
			type: 'success',
		});
	}
	if (result.failed.length > 0) {
		showMessage({
			title: i18n.baseText('settings.context.skills.updates.failed', {
				interpolate: {
					count: result.failed.length,
					names: result.failed.map(({ skillId }) => nameOf(skillId)).join(', '),
				},
				adjustToNumber: result.failed.length,
			}),
			message: [...new Set(result.failed.map(({ reason }) => reasonText(reason)))].join(' '),
			type: 'warning',
		});
	}
}

/** Reject skips the update: it stays hidden until the source changes again. */
async function rejectUpdates(updates: SkillPendingUpdate[]) {
	if (updates.length === 0) return;
	const results = await Promise.allSettled(
		updates.map(async ({ skillId, contentHash }) => {
			await skillsStore.skipSkillUpdate(skillId, { contentHash });
		}),
	);
	const rejected = results.filter((result) => result.status === 'fulfilled').length;
	if (rejected > 0) {
		showMessage({
			title: i18n.baseText('settings.context.skills.updates.rejected', {
				interpolate: { count: rejected },
				adjustToNumber: rejected,
			}),
			type: 'success',
		});
	}
	const failure = results.find((result) => result.status === 'rejected');
	if (failure) {
		showError(
			errorOf(failure.reason),
			i18n.baseText('settings.context.skills.updates.error.reject'),
		);
	}
}

async function onApply() {
	if (!props.sourceId || !data.value) return;
	applying.value = true;
	try {
		await acceptUpdates(acceptedUpdates.value);
		await rejectUpdates(rejectedUpdates.value);
		emit('changed');
		emit('update:open', false);
	} catch (error) {
		showError(errorOf(error), i18n.baseText('settings.context.skills.updates.error.accept'));
	} finally {
		applying.value = false;
	}
}
</script>

<template>
	<N8nDialog
		:open="open"
		size="full"
		:container-class="$style.wideDialog"
		data-test-id="skill-source-updates-dialog"
		@update:open="emit('update:open', $event)"
	>
		<SkillReviewHeader
			v-if="data && data.updates.length > 0"
			:title="i18n.baseText('settings.context.skills.updates.title')"
			:source="sourceLine"
			:tabs="tabs"
			:active-tab="activeTab"
			@update:active-tab="selectTab"
		>
			<template v-if="commitLine" #details>
				<span aria-hidden="true">·</span>
				<span data-test-id="skill-source-updates-commit">
					{{
						i18n.baseText('settings.context.skills.updates.latestCommit', {
							interpolate: { commit: commitLine },
						})
					}}
					<template v-if="data?.commit?.date"> · <TimeAgo :date="data.commit.date" /> </template>
				</span>
			</template>
		</SkillReviewHeader>
		<N8nDialogHeader v-else>
			<N8nDialogTitle>{{ i18n.baseText('settings.context.skills.updates.title') }}</N8nDialogTitle>
		</N8nDialogHeader>

		<SkillReviewPicker
			v-if="data && data.updates.length > 0"
			v-model:preview-id="previewId"
			v-model:decisions="decisions"
			:groups="groups"
			:can-decide="canReview"
		>
			<template v-if="!canReview" #before>
				<N8nCallout
					theme="info"
					slim
					icon-size="small"
					data-test-id="skill-source-updates-read-only"
				>
					{{ readOnlyText }}
				</N8nCallout>
			</template>
			<template v-if="preview">
				<N8nCallout
					v-if="preview.nameClash"
					theme="danger"
					slim
					icon-size="small"
					data-test-id="skill-update-name-clash"
				>
					{{
						i18n.baseText(
							preview.nameClash.where === 'agent'
								? 'settings.context.skills.review.nameClash.agent'
								: 'settings.context.skills.review.nameClash',
							{ interpolate: { name: preview.nameClash.name, scope: scopeLabel } },
						)
					}}
				</N8nCallout>
				<N8nCallout
					v-if="!preview.update"
					theme="warning"
					slim
					icon-size="small"
					data-test-id="skill-update-unreadable"
				>
					{{ i18n.baseText('settings.context.skills.review.unreadable') }}
				</N8nCallout>
				<!-- The skill comes first: the change, as the version compare shows it, one file after
				     the other, then the files that n8n leaves out. The check follows. -->
				<SkillFilesView
					v-else
					:skill="preview.update"
					:compare-from="preview.current"
					:sections="sections.get(preview.skillId) ?? []"
					:location="preview.location"
					:web-url="preview.webUrl"
					:skipped-files="skippedFiles(preview)"
					:findings="fileFindings(preview)"
					data-test-id="skill-update-diff"
				/>
				<!-- A finding in a file shows in that file. The rest, such as a finding about the
					     whole skill, show here. -->
				<SkillFindingsList
					v-if="otherFindings(preview).length > 0"
					:findings="otherFindings(preview)"
				/>
				<div v-if="checkFindings(preview).length === 0" :class="$style.noIssues">
					<N8nIcon icon="circle-check" color="success" size="small" />
					<N8nText size="small">
						{{ i18n.baseText('settings.context.skills.connect.preview.noIssues') }}
					</N8nText>
				</div>
			</template>
		</SkillReviewPicker>
		<N8nDialogBody v-else :class="$style.body">
			<!-- The commit details come from GitHub, so the first load can take a moment. -->
			<N8nLoading
				v-if="loading && !data"
				variant="p"
				:rows="6"
				data-test-id="skill-source-updates-loading"
			/>
			<N8nText v-else-if="data" color="text-light">
				{{ i18n.baseText('settings.context.skills.updates.empty') }}
			</N8nText>
		</N8nDialogBody>

		<N8nDialogFooter>
			<span :class="$style.spacer" />
			<template v-if="canReview && (data?.updates.length ?? 0) > 0">
				<N8nCheckbox
					v-if="needsReview"
					v-model="reviewedWarnings"
					:label="i18n.baseText('settings.context.skills.updates.reviewedWarnings')"
					:class="$style.reviewed"
					data-test-id="skill-source-updates-reviewed"
				/>
				<N8nButton
					:label="applyLabel"
					:disabled="!canApply"
					:loading="applying"
					data-test-id="skill-source-updates-accept"
					@click="onApply"
				/>
			</template>
			<N8nButton
				v-else
				:label="i18n.baseText('settings.context.skills.updates.done')"
				:disabled="loading"
				data-test-id="skill-source-updates-done"
				@click="emit('update:open', false)"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
/* The same frame as the import picker. The class is doubled so it wins over the `full` size. */
.wideDialog.wideDialog {
	--dialog--max-width: min(75rem, calc(100dvw - var(--spacing--lg)));
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.noIssues {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.reviewed {
	align-self: center;
	margin-inline-end: var(--spacing--xs);
}

.spacer {
	flex: 1;
}
</style>
