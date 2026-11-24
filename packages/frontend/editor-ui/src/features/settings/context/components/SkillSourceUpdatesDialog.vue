<script setup lang="ts">
import type {
	DiscoveredSkill,
	SkillPendingUpdate,
	SkillNewUpdate,
	SkillSourceListItem,
	SkillUpdateAgents,
	SkillUpdateCommit,
	SkillUpdateReview,
} from '@n8n/api-types';
import { computed, ref, watch } from 'vue';
import {
	N8nButton,
	N8nBadge,
	N8nCallout,
	N8nCheckbox,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nIcon,
	N8nLink,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { ResponseError } from '@n8n/rest-api-client';
import SkillSourceReview from './SkillSourceReview.vue';
import SkillSourceFilesView from './SkillSourceFilesView.vue';
import { useSkillsStore } from '../skills.store';
import { useSkillSourceReasons } from '../skills.utils';

const props = defineProps<{ source: SkillSourceListItem }>();
const emit = defineEmits<{ close: []; changed: [] }>();
const i18n = useI18n();
const store = useSkillsStore();
const { showMessage } = useToast();
const { reasonText } = useSkillSourceReasons();
type ReviewItem = SkillPendingUpdate & { newSkill?: SkillNewUpdate };
const updates = ref<ReviewItem[]>([]);
const selected = ref<string[]>([]);
const reviewed = ref(false);
const loading = ref(true);
const saving = ref(false);
const hiding = ref(false);
const error = ref('');
/** Why the new skills did not load. The stored updates still show. */
const newSkillsError = ref('');
const previewKey = ref<string | null>(null);
const detail = ref<SkillUpdateReview | null>(null);
const detailLoading = ref(false);
const detailError = ref('');
const commit = ref<SkillUpdateCommit | null>(null);
let previewRequest = 0;
let listRequest = 0;
let loaded = false;
let closed = false;

const acceptable = (update: ReviewItem) =>
	update.check.verdict !== 'blocked' &&
	!update.nameClash &&
	(!update.newSkill || props.source.canImport);
const disabledImportKeys = computed(() =>
	props.source.canImport
		? []
		: updates.value.filter((update) => update.newSkill).map(({ skillId }) => skillId),
);
const selectedUpdates = computed(() =>
	updates.value.filter((update) => selected.value.includes(update.skillId) && acceptable(update)),
);
const selectedNew = computed(() => selectedUpdates.value.filter((update) => update.newSkill));
const needsReview = computed(() =>
	selectedUpdates.value.some((update) => update.check.verdict === 'needs_review'),
);
const focused = computed(() => updates.value.find((update) => update.skillId === previewKey.value));
const byId = computed(() => new Map(updates.value.map((update) => [update.skillId, update])));
const discovery = computed(() => ({
	skills: updates.value.map(
		(update): DiscoveredSkill => ({
			key: update.skillId,
			name: update.name,
			description: update.newSkill?.description ?? null,
			location: update.location,
			webUrl: update.webUrl,
			check: update.check,
			skippedFiles: update.check.findings.flatMap((finding) =>
				(finding.rule === 'file_skipped' || finding.rule === 'file_unstorable') && finding.file
					? [finding.file]
					: [],
			),
			previewFiles: update.newSkill?.previewFiles ?? [],
			previewTruncated: update.newSkill?.previewTruncated ?? false,
			nameTaken: update.nameClash?.where === 'scope',
			error: update.nameClash?.where === 'agent' ? { reason: 'name_clash', message: '' } : null,
		}),
	),
	truncated: false,
}));
const scopeLabel = computed(
	() => props.source.projectName ?? i18n.baseText('settings.context.skills.scope.instance'),
);
const commitDate = computed(() => {
	if (!commit.value?.date) return '';
	const date = new Date(commit.value.date);
	return Number.isNaN(date.getTime())
		? ''
		: date.toLocaleString(i18n.locale, { dateStyle: 'medium', timeStyle: 'short' });
});
const commitTitle = computed(
	() => commit.value?.message?.split('\n')[0] || commit.value?.revision.slice(0, 12),
);
const sourceLine = computed(() =>
	[props.source.label, props.source.ref].filter(Boolean).join(' · '),
);
const impact = computed(() => (detail.value ? impactText(detail.value) : ''));

function impactText({ agents, hiddenAgentCount }: SkillUpdateAgents): string {
	if (!agents.length && !hiddenAgentCount)
		return i18n.baseText('settings.context.skills.updates.noFollowers');
	return [
		agents.length
			? i18n.baseText('settings.context.skills.updates.followers', {
					interpolate: { agents: agents.map(({ name }) => name).join(', ') },
				})
			: '',
		hiddenAgentCount
			? i18n.baseText('settings.context.skills.updates.hiddenFollowers', {
					interpolate: { count: hiddenAgentCount },
					adjustToNumber: hiddenAgentCount,
				})
			: '',
	]
		.filter(Boolean)
		.join(' ');
}

function isStale(cause: unknown) {
	return cause instanceof ResponseError && cause.meta?.reason === 'stale';
}
function errorText(cause: unknown) {
	if (cause instanceof ResponseError && typeof cause.meta?.reason === 'string') {
		return reasonText(cause.meta.reason) || i18n.baseText('settings.context.skills.updates.error');
	}
	return i18n.baseText('settings.context.skills.updates.error');
}

async function load() {
	const request = ++listRequest;
	++previewRequest;
	loading.value = true;
	detail.value = null;
	reviewed.value = false;
	try {
		const result = await store.fetchSourceUpdates(props.source.id);
		if (closed || request !== listRequest) return;
		updates.value = [
			...result.updates,
			...(result.newSkills ?? []).map(
				(skill): ReviewItem => ({
					skillId: skill.key,
					name: skill.name ?? skill.location,
					location: skill.location,
					webUrl: skill.webUrl,
					contentHash: skill.contentHash,
					baseVersionId: '',
					revision: skill.revision,
					revisionUrl: null,
					check: skill.check ?? { verdict: 'blocked', findings: [] },
					nameClash: skill.nameTaken ? { name: skill.name ?? '', where: 'scope' } : null,
					changes: { added: 0, removed: 0 },
					nextVersion: 1,
					newSkill: skill,
				}),
			),
		];
		selected.value = updates.value
			.filter(
				(update) =>
					acceptable(update) &&
					((!loaded && !update.newSkill) || selected.value.includes(update.skillId)),
			)
			.map(({ skillId }) => skillId);
		loaded = true;
		newSkillsError.value = result.newSkillsError
			? [
					i18n.baseText('settings.context.skills.updates.newSkillsError'),
					result.newSkillsError.reason ? reasonText(result.newSkillsError.reason) : '',
				]
					.filter(Boolean)
					.join(' ')
			: '';
		if (commit.value?.revision !== result.commit?.revision) commit.value = result.commit;
	} catch (cause) {
		if (!closed && request === listRequest) error.value = errorText(cause);
	} finally {
		if (request === listRequest) loading.value = false;
	}
}

async function loadPreview() {
	const update = focused.value;
	const request = ++previewRequest;
	detail.value = null;
	detailError.value = '';
	detailLoading.value = false;
	if (!update) return;
	if (update.newSkill) {
		detail.value = {
			files: update.newSkill.previewFiles.map(({ path, text }) => ({
				path,
				before: '',
				after: text,
				status: 'added',
			})),
			agents: [],
			hiddenAgentCount: 0,
		};
		return;
	}
	detailLoading.value = true;
	try {
		const result = await store.fetchSourceUpdate(props.source.id, update.skillId, {
			contentHash: update.contentHash,
			baseVersionId: update.baseVersionId,
		});
		if (!closed && request === previewRequest) detail.value = result;
	} catch (cause) {
		if (closed || request !== previewRequest) return;
		if (isStale(cause)) {
			error.value = reasonText('stale');
			await load();
		} else detailError.value = errorText(cause);
	} finally {
		if (request === previewRequest) detailLoading.value = false;
	}
}
watch(focused, loadPreview);
// Commit metadata is shared by every skill at this revision and does not block the diff.
watch(
	() => focused.value?.revision,
	async (revision) => {
		if (!revision) return;
		commit.value = {
			revision,
			webUrl: focused.value?.revisionUrl ?? null,
			message: null,
			author: null,
			date: null,
		};
		try {
			const result = await store.fetchSourceCommit(props.source.id, revision);
			if (!closed && focused.value?.revision === revision) commit.value = result;
		} catch {
			// The revision link remains available when metadata cannot be read.
		}
	},
);
watch(
	selected,
	() => {
		reviewed.value = false;
	},
	{ deep: true },
);

function close() {
	if (saving.value) return;
	closed = true;
	++previewRequest;
	++listRequest;
	emit('close');
}

async function accept() {
	if (saving.value || !selectedUpdates.value.length || (needsReview.value && !reviewed.value))
		return;
	saving.value = true;
	error.value = '';
	try {
		const result = await store.acceptSourceUpdates(props.source.id, {
			updates: selectedUpdates.value
				.filter((update) => !update.newSkill)
				.map(({ skillId, contentHash, baseVersionId }) => ({
					skillId,
					contentHash,
					baseVersionId,
				})),
			newSkills: selectedNew.value.flatMap(({ newSkill, contentHash }) =>
				newSkill ? [{ key: newSkill.key, contentHash }] : [],
			),
			skippedNewSkills: [],
			reviewedWarnings: reviewed.value,
		});
		const description = result.updatedCount
			? [
					impactText(result),
					i18n.baseText('settings.context.skills.updates.publishedUnchanged'),
				].join(' ')
			: '';
		showMessage({
			type: 'success',
			dangerouslyUseHTMLString: false,
			title: [
				result.importedCount
					? i18n.baseText('settings.context.skills.updates.imported', {
							interpolate: { count: result.importedCount },
							adjustToNumber: result.importedCount,
						})
					: '',
				result.updatedCount
					? i18n.baseText('settings.context.skills.updates.success', {
							interpolate: { count: result.updatedCount },
							adjustToNumber: result.updatedCount,
						})
					: '',
			]
				.filter(Boolean)
				.join('; '),
			message: description,
		});
		emit('changed');
		saving.value = false;
		close();
	} catch (cause) {
		error.value = errorText(cause);
		if (cause instanceof ResponseError && cause.httpStatusCode === 409) await load();
	} finally {
		saving.value = false;
	}
}

async function hideNewSkill() {
	const update = focused.value;
	if (!update?.newSkill || saving.value) return;
	saving.value = true;
	hiding.value = true;
	error.value = '';
	try {
		await store.acceptSourceUpdates(props.source.id, {
			updates: [],
			newSkills: [],
			skippedNewSkills: [{ key: update.newSkill.key, contentHash: update.contentHash }],
			reviewedWarnings: false,
		});
		update.newSkill.skipped = true;
		if (selected.value.includes(update.skillId))
			selected.value = selected.value.filter((id) => id !== update.skillId);
		showMessage({
			type: 'success',
			title: i18n.baseText('settings.context.skills.updates.hiddenNew'),
		});
		emit('changed');
	} catch (cause) {
		error.value = errorText(cause);
		if (cause instanceof ResponseError && cause.httpStatusCode === 409) await load();
	} finally {
		saving.value = false;
		hiding.value = false;
	}
}
void load();
</script>

<template>
	<N8nDialog
		:open="true"
		:aria-description="i18n.baseText('settings.context.skills.updates.description')"
		size="full"
		:container-class="$style.wide"
		data-test-id="skill-source-updates-dialog"
		@update:open="!$event && close()"
	>
		<N8nDialogHeader :class="$style.header">
			<N8nDialogTitle>{{ i18n.baseText('settings.context.skills.updates.title') }}</N8nDialogTitle>
			<div :class="$style.metadata">
				<N8nText size="small" color="text-light" :class="$style.source">
					<N8nIcon icon="git-branch" size="small" />
					{{ sourceLine }}
				</N8nText>
				<div v-if="commit" :class="$style.commit" data-test-id="skill-update-commit">
					<N8nLink
						v-if="commit.webUrl"
						:href="commit.webUrl"
						:title="commitTitle"
						size="small"
						theme="text"
						:underline="false"
						:class="$style.commitLink"
						new-window
						>{{ commitTitle }}</N8nLink
					>
					<N8nText
						v-else
						size="small"
						color="text-light"
						:class="$style.commitLink"
						:title="commitTitle"
						>{{ commitTitle }}</N8nText
					>
					<N8nText
						v-if="commit.author || commitDate"
						size="small"
						color="text-light"
						:class="$style.commitDetails"
					>
						· {{ [commit.author, commitDate].filter(Boolean).join(' · ') }}
					</N8nText>
				</div>
			</div>
		</N8nDialogHeader>
		<N8nDialogBody :class="$style.body">
			<N8nCallout v-if="error" theme="warning" data-test-id="skill-updates-error">{{
				error
			}}</N8nCallout>
			<N8nCallout
				v-if="newSkillsError && !loading"
				theme="warning"
				data-test-id="skill-updates-new-error"
				>{{ newSkillsError }}</N8nCallout
			>
			<N8nText v-if="loading">{{ i18n.baseText('generic.loading') }}</N8nText>
			<SkillSourceReview
				v-else-if="updates.length"
				v-model:selected="selected"
				:discovery="discovery"
				:scope-label="scopeLabel"
				:disabled="saving"
				:disabled-skill-keys="disabledImportKeys"
				@preview="previewKey = $event"
			>
				<template #row-details="{ skill }">
					<N8nBadge
						v-if="byId.get(skill.key)?.newSkill"
						variant="secondary"
						data-test-id="skill-update-new"
						>{{ i18n.baseText('settings.context.skills.updates.new') }}</N8nBadge
					>
					<N8nText v-else size="small" color="text-light" data-test-id="skill-update-counts">{{
						i18n.baseText('settings.context.skills.updates.lines', {
							interpolate: {
								added: byId.get(skill.key)?.changes.added ?? 0,
								removed: byId.get(skill.key)?.changes.removed ?? 0,
							},
						})
					}}</N8nText>
				</template>
				<template #preview="{ skill }">
					<N8nText v-if="detailLoading" :class="$style.detailNotice">{{
						i18n.baseText('generic.loading')
					}}</N8nText>
					<!-- The findings of the skill come with the list, so they show when the files fail to load. -->
					<SkillSourceFilesView
						v-else
						:skill="{ ...skill, ...detail?.preview }"
						:diff-files="detail?.preview ? undefined : (detail?.files ?? [])"
					>
						<template #footer>
							<N8nCallout
								v-if="detailError"
								theme="warning"
								data-test-id="skill-update-detail-error"
								>{{ detailError }}
								<N8nButton
									variant="ghost"
									:label="i18n.baseText('generic.retry')"
									@click="loadPreview"
							/></N8nCallout>
							<N8nText
								v-if="detail && !focused?.newSkill && skill.check?.verdict !== 'blocked'"
								size="small"
								color="text-light"
								data-test-id="skill-update-impact"
							>
								{{ impact }}
								{{ i18n.baseText('settings.context.skills.updates.publishedUnchanged') }}
							</N8nText>
							<N8nCallout
								v-if="skill.check?.verdict === 'blocked' && !skill.check.findings.length"
								theme="danger"
								data-test-id="skill-update-blocked"
								>{{ i18n.baseText('settings.context.skills.updates.blocked') }}</N8nCallout
							>
							<div v-if="focused?.newSkill" :class="$style.detailActions">
								<N8nText v-if="!source.canImport" size="small" color="text-light">{{
									i18n.baseText('settings.context.skills.updates.importNotAllowed')
								}}</N8nText>
								<N8nText size="small" color="text-light">{{
									i18n.baseText('settings.context.skills.updates.newHint')
								}}</N8nText>
								<N8nButton
									variant="ghost"
									:loading="hiding"
									:disabled="saving || focused.newSkill.skipped"
									:label="
										i18n.baseText(
											focused.newSkill.skipped
												? 'settings.context.skills.updates.hiddenNew'
												: 'settings.context.skills.updates.hideNew',
										)
									"
									data-test-id="skill-new-hide"
									data-attr="skill-new-hide"
									@click="hideNewSkill"
								/>
							</div>
						</template>
					</SkillSourceFilesView>
				</template>
			</SkillSourceReview>
			<N8nText v-else-if="!error">{{
				i18n.baseText('settings.context.skills.updates.empty')
			}}</N8nText>
			<N8nButton
				v-else
				variant="ghost"
				:label="i18n.baseText('generic.retry')"
				@click="
					error = '';
					load();
				"
			/>
		</N8nDialogBody>
		<N8nDialogFooter :class="$style.footer">
			<N8nCheckbox
				v-if="needsReview"
				v-model="reviewed"
				:disabled="saving"
				:label="i18n.baseText('settings.context.skills.connect.check.reviewed')"
				data-test-id="skill-update-reviewed-warnings"
			/>
			<N8nButton
				variant="outline"
				:disabled="saving"
				:label="i18n.baseText('generic.cancel')"
				@click="close"
			/>
			<N8nButton
				:loading="saving && !hiding"
				:disabled="loading || saving || selectedUpdates.length === 0 || (needsReview && !reviewed)"
				:label="
					i18n.baseText(
						selectedNew.length
							? selectedNew.length === selectedUpdates.length
								? 'settings.context.skills.updates.import'
								: 'settings.context.skills.updates.apply'
							: 'settings.context.skills.updates.accept',
						{
							interpolate: { count: selectedUpdates.length },
							adjustToNumber: selectedUpdates.length,
						},
					)
				"
				data-test-id="skill-updates-accept"
				@click="accept"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.body,
.detailActions {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.header {
	flex-direction: column;
	align-items: stretch;
	gap: var(--spacing--xs);
	padding-bottom: var(--spacing--sm);
}

.metadata,
.commit,
.source {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.metadata,
.commit {
	min-width: 0;
	color: var(--text-color--subtler);
}

.metadata {
	flex-wrap: wrap;
	column-gap: var(--spacing--md);
}

.commit {
	flex: 1 1 50%;
}

.commitLink {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;

	&:hover {
		text-decoration: underline;
	}
}

.commitDetails {
	flex-shrink: 0;
}

.source {
	overflow-wrap: anywhere;
}

.footer {
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--sm);
	border-top: var(--border);
}

.detailActions {
	gap: var(--spacing--4xs);
	align-items: flex-start;
	padding-top: var(--spacing--xs);
	border-top: var(--border);
}
.detailNotice {
	margin: var(--spacing--sm);
}
.wide {
	--dialog--max-width: min(1200px, calc(100dvw - var(--spacing--lg)));
}
</style>
