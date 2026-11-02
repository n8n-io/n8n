<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { SkillPendingUpdate, SkillScanFinding, SkillSourceUpdates } from '@n8n/api-types';
import {
	N8nButton,
	N8nCallout,
	N8nCheckbox,
	N8nDialog,
	N8nDialogBody,
	N8nDialogDescription,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nIcon,
	N8nLoading,
	N8nTabs,
	N8nText,
} from '@n8n/design-system';
import type { TabOptions } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { ResponseError } from '@n8n/rest-api-client';

import TimeAgo from '@/app/components/TimeAgo.vue';
import SkillDiffCount from '@/features/agents/components/skillVersions/SkillDiffCount.vue';
import {
	countsByFile,
	diffSkills,
	type DiffSection,
} from '@/features/agents/components/skillVersions/skillVersionDiff';

import SkillFilesView from './SkillFilesView.vue';
import SkillFindingsList from './SkillFindingsList.vue';
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
const accepting = ref(false);
const skipping = ref<string | null>(null);
const reviewedWarnings = ref(false);
/** The skill ids of the updates to accept. */
const selected = ref<string[]>([]);
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
		// Every update that can come in starts picked, as in the import picker.
		selected.value = loaded.updates.filter(isAcceptable).map((update) => update.skillId);
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

function toggle(skillId: string, checked: boolean) {
	selected.value = checked
		? [...new Set([...selected.value, skillId])]
		: selected.value.filter((id) => id !== skillId);
}

const selectedUpdates = computed(() =>
	(data.value?.updates ?? []).filter(
		(update) => isAcceptable(update) && selected.value.includes(update.skillId),
	),
);
const needsReview = computed(() =>
	selectedUpdates.value.some((update) => update.check.verdict === 'needs_review'),
);
const canAccept = computed(
	() =>
		canReview.value &&
		selectedUpdates.value.length > 0 &&
		(!needsReview.value || reviewedWarnings.value),
);

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

/** A left-out file is not a risk, so it shows with the files, not with the findings. */
function isSkippedFile(finding: SkillScanFinding): boolean {
	return finding.rule === 'file_skipped' && Boolean(finding.file);
}

function skippedFiles(update: SkillPendingUpdate) {
	return update.check.findings
		.filter(isSkippedFile)
		.map((finding) => ({ path: finding.file ?? '', detail: finding.detail }));
}

function checkFindings(update: SkillPendingUpdate): SkillScanFinding[] {
	return update.check.findings.filter((finding) => !isSkippedFile(finding));
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

function countOf(skillId: string) {
	return (sections.value.get(skillId) ?? []).reduce(
		(total, section) => ({
			added: total.added + section.added,
			removed: total.removed + section.removed,
		}),
		{ added: 0, removed: 0 },
	);
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

async function onAccept() {
	if (!props.sourceId || !data.value) return;
	accepting.value = true;
	try {
		const result = await skillsStore.acceptSourceUpdates(props.sourceId, {
			updates: selectedUpdates.value.map(({ skillId, contentHash }) => ({ skillId, contentHash })),
			reviewedWarnings: reviewedWarnings.value,
		});
		const nameOf = (skillId: string) =>
			data.value?.updates.find((update) => update.skillId === skillId)?.name ?? skillId;
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
		emit('changed');
		emit('update:open', false);
	} catch (error) {
		showError(errorOf(error), i18n.baseText('settings.context.skills.updates.error.accept'));
	} finally {
		accepting.value = false;
	}
}

/** Skip hides this content until the source changes again. The dialog stays open on the rest. */
async function onSkip(update: SkillPendingUpdate) {
	skipping.value = update.skillId;
	try {
		await skillsStore.skipSkillUpdate(update.skillId, { contentHash: update.contentHash });
		showMessage({
			title: i18n.baseText('settings.context.skills.review.skipped'),
			type: 'success',
		});
		emit('changed');
		await load();
		if (data.value?.updates.length === 0) emit('update:open', false);
	} catch (error) {
		showError(errorOf(error), i18n.baseText('settings.context.skills.review.error.skip'));
		if (error instanceof ResponseError && error.meta?.reason === 'stale') await load();
	} finally {
		skipping.value = null;
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
		<N8nDialogHeader :class="$style.headerWithTabs">
			<div :class="$style.headerMain">
				<N8nDialogTitle>
					{{
						i18n.baseText('settings.context.skills.updates.title', {
							interpolate: { label: data?.source.label ?? props.label ?? '' },
						})
					}}
				</N8nDialogTitle>
				<N8nDialogDescription :class="[$style.description, $style.source]">
					<N8nIcon icon="git-branch" size="small" />
					<span>{{ sourceLine }}</span>
					<template v-if="commitLine">
						<span aria-hidden="true">·</span>
						<span data-test-id="skill-source-updates-commit">
							{{
								i18n.baseText('settings.context.skills.updates.latestCommit', {
									interpolate: { commit: commitLine },
								})
							}}
							<template v-if="data?.commit?.date">
								· <TimeAgo :date="data.commit.date" />
							</template>
						</span>
					</template>
				</N8nDialogDescription>
				<N8nTabs
					v-if="data && tabs.length > 0"
					:model-value="activeTab"
					:options="tabs"
					:class="$style.tabs"
					data-test-id="skill-source-updates-tabs"
					@update:model-value="selectTab"
				/>
			</div>
		</N8nDialogHeader>

		<N8nDialogBody :class="[$style.body, $style.bodyWithTabs]">
			<!-- The commit details come from GitHub, so the first load can take a moment. -->
			<N8nLoading
				v-if="loading && !data"
				variant="p"
				:rows="6"
				data-test-id="skill-source-updates-loading"
			/>
			<template v-else-if="data">
				<N8nCallout
					v-if="!canReview"
					theme="info"
					slim
					icon-size="small"
					data-test-id="skill-source-updates-read-only"
				>
					{{ readOnlyText }}
				</N8nCallout>
				<N8nText v-if="data.updates.length === 0" color="text-light">
					{{ i18n.baseText('settings.context.skills.updates.empty') }}
				</N8nText>
				<div v-else :class="$style.picker">
					<ul :class="$style.list" data-test-id="skill-source-updates-list">
						<li
							v-for="update in byTab[activeTab]"
							:key="update.skillId"
							:class="[
								$style.item,
								previewId === update.skillId && $style.itemActive,
								!isAcceptable(update) && $style.disabled,
							]"
							role="button"
							tabindex="0"
							:aria-pressed="previewId === update.skillId"
							data-test-id="skill-source-update-row"
							@click="previewId = update.skillId"
							@keydown.enter.self.prevent="previewId = update.skillId"
							@keydown.space.self.prevent="previewId = update.skillId"
						>
							<!-- The checkbox picks the update. The rest of the row only previews it. -->
							<span v-if="canReview" :class="$style.checkboxCell" @click.stop @keydown.stop>
								<N8nCheckbox
									:model-value="isAcceptable(update) && selected.includes(update.skillId)"
									:disabled="!isAcceptable(update)"
									:aria-label="update.name"
									data-test-id="skill-source-update-checkbox"
									@update:model-value="toggle(update.skillId, $event)"
								/>
							</span>
							<div :class="$style.itemText">
								<N8nText bold>{{ update.name }}</N8nText>
								<N8nText size="small" color="text-light" :class="$style.clamp">
									{{ update.location }}
								</N8nText>
							</div>
							<SkillDiffCount :count="countOf(update.skillId)" hide-zero />
						</li>
					</ul>

					<section :class="$style.preview" data-test-id="skill-source-update-preview">
						<template v-if="preview">
							<!-- The list and the file headers name the skill, and each file links to GitHub. -->
							<div v-if="canReview" :class="$style.previewHeader">
								<N8nButton
									variant="ghost"
									size="medium"
									:loading="skipping === preview.skillId"
									:disabled="skipping !== null || accepting"
									data-test-id="skill-source-update-skip"
									@click="onSkip(preview)"
								>
									<template #icon><N8nIcon icon="eye-off" :size="16" /></template>
									{{ i18n.baseText('settings.context.skills.review.skip') }}
								</N8nButton>
							</div>
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
					</section>
				</div>
			</template>
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
					:label="
						i18n.baseText('settings.context.skills.updates.updateSelected', {
							interpolate: { count: selectedUpdates.length },
							adjustToNumber: selectedUpdates.length,
						})
					"
					:disabled="!canAccept || skipping !== null"
					:loading="accepting"
					data-test-id="skill-source-updates-accept"
					@click="onAccept"
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
/* The same frame as the import picker. */
.wideDialog.wideDialog {
	--dialog--max-width: min(75rem, calc(100dvw - var(--spacing--lg)));
}

.headerWithTabs {
	border-bottom: var(--border);
	padding-block-end: 0;
}

.headerMain {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
	width: 100%;
}

.description {
	margin: 0;
}

.source {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	color: var(--text-color--subtler);
}

.tabs {
	margin-top: var(--spacing--2xs);
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.bodyWithTabs {
	padding-block-start: var(--n8n-dialog-region--padding, var(--spacing--md));
}

.picker {
	display: grid;
	grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
	height: min(65vh, 44rem);
	min-height: 0;
}

.list {
	display: flex;
	flex-direction: column;
	min-height: 0;
	margin: 0;
	padding: 0;
	overflow-y: auto;
	list-style: none;
	border: var(--border);
	border-radius: var(--radius) 0 0 var(--radius);
	/* The list is grey, and the active row is white, as the skill beside it. */
	background-color: var(--background--subtle);
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
}

.item {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	cursor: pointer;

	& + & {
		border-top: var(--border);
	}

	&:hover {
		background-color: var(--background--hover);
	}

	&:focus-visible {
		outline: var(--focus--border-width, 2px) solid var(--color--primary);
		outline-offset: -2px;
	}
}

.itemActive,
.itemActive:hover {
	background-color: var(--background--surface);
}

.checkboxCell {
	display: flex;
	padding-top: var(--spacing--5xs);
}

.disabled .itemText {
	opacity: 0.7;
}

.itemText {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.clamp {
	display: -webkit-box;
	overflow: hidden;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
}

.preview {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	min-height: 0;
	padding: var(--spacing--sm);
	overflow-y: auto;
	border: var(--border);
	border-inline-start: 0;
	border-radius: 0 var(--radius) var(--radius) 0;
	background-color: var(--background--surface);
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
}

.previewHeader {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: var(--spacing--xs);
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
