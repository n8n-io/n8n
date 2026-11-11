<script setup lang="ts">
import type {
	DiscoveredSkill,
	SkillPendingUpdate,
	SkillSourceListItem,
	SkillUpdateCommit,
	SkillUpdateReview,
} from '@n8n/api-types';
import { computed, ref, watch } from 'vue';
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
const updates = ref<SkillPendingUpdate[]>([]);
const selected = ref<string[]>([]);
const reviewed = ref(false);
const loading = ref(true);
const saving = ref(false);
const error = ref('');
const previewKey = ref<string | null>(null);
const detail = ref<SkillUpdateReview | null>(null);
const detailLoading = ref(false);
const detailError = ref('');
const commit = ref<SkillUpdateCommit | null>(null);
let previewRequest = 0;
let listRequest = 0;
let closed = false;

const acceptable = (update: SkillPendingUpdate) =>
	update.check.verdict !== 'blocked' && !update.nameClash;
const selectedUpdates = computed(() =>
	updates.value.filter((update) => selected.value.includes(update.skillId) && acceptable(update)),
);
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
			description: null,
			location: update.location,
			webUrl: update.webUrl,
			check: update.check,
			skippedFiles: update.check.findings.flatMap((finding) =>
				(finding.rule === 'file_skipped' || finding.rule === 'file_unstorable') && finding.file
					? [finding.file]
					: [],
			),
			previewFiles: [],
			previewTruncated: false,
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
const impact = computed(() => {
	if (!detail.value) return '';
	const { agents, hiddenAgentCount } = detail.value;
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
});

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
		updates.value = result.updates;
		selected.value = result.updates.filter(acceptable).map(({ skillId }) => skillId);
		commit.value = result.commit;
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
	if (!update) return;
	detailLoading.value = true;
	commit.value = {
		revision: update.revision,
		webUrl: update.revisionUrl,
		message: null,
		author: null,
		date: null,
	};
	// This independent request must not hold up the stored diff or its actions.
	void store
		.fetchSourceCommit(props.source.id, update.revision)
		.then((result) => {
			if (!closed && request === previewRequest) commit.value = result;
		})
		.catch(() => undefined);
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
watch(selected, () => {
	reviewed.value = false;
});

function close() {
	if (saving.value) return;
	closed = true;
	++previewRequest;
	++listRequest;
	emit('close');
}

async function skip(skillId: string) {
	const update = byId.value.get(skillId);
	if (!update || saving.value) return;
	saving.value = true;
	error.value = '';
	try {
		await store.skipSourceUpdate(props.source.id, skillId, update.contentHash);
		emit('changed');
		await load();
	} catch (cause) {
		error.value = errorText(cause);
		if (isStale(cause)) await load();
	} finally {
		saving.value = false;
	}
}

async function accept() {
	if (saving.value || !selectedUpdates.value.length || (needsReview.value && !reviewed.value))
		return;
	saving.value = true;
	error.value = '';
	try {
		const result = await store.acceptSourceUpdates(props.source.id, {
			updates: selectedUpdates.value.map(({ skillId, contentHash, baseVersionId }) => ({
				skillId,
				contentHash,
				baseVersionId,
			})),
			reviewedWarnings: reviewed.value,
		});
		const names = result.agents.map(({ name }) => name).join(', ');
		const description = [
			names
				? i18n.baseText('settings.context.skills.updates.followers', {
						interpolate: { agents: names },
					})
				: '',
			result.hiddenAgentCount
				? i18n.baseText('settings.context.skills.updates.hiddenFollowers', {
						interpolate: { count: result.hiddenAgentCount },
						adjustToNumber: result.hiddenAgentCount,
					})
				: '',
			!names && !result.hiddenAgentCount
				? i18n.baseText('settings.context.skills.updates.noFollowers')
				: '',
			i18n.baseText('settings.context.skills.updates.publishedUnchanged'),
		]
			.filter(Boolean)
			.join(' ');
		showMessage({
			type: 'success',
			dangerouslyUseHTMLString: false,
			title: i18n.baseText('settings.context.skills.updates.success', {
				interpolate: { count: result.updatedCount },
				adjustToNumber: result.updatedCount,
			}),
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
					<span aria-hidden="true">·</span>
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
					<N8nText v-else size="small" color="text-light">{{ commitTitle }}</N8nText>
					<N8nText v-if="commit.author || commitDate" size="small" color="text-light">
						· {{ [commit.author, commitDate].filter(Boolean).join(' · ') }}
					</N8nText>
				</div>
			</div>
		</N8nDialogHeader>
		<N8nDialogBody :class="$style.body">
			<N8nCallout v-if="error" theme="warning" data-test-id="skill-updates-error">{{
				error
			}}</N8nCallout>
			<N8nText v-if="loading">{{ i18n.baseText('generic.loading') }}</N8nText>
			<SkillSourceReview
				v-else-if="updates.length"
				v-model:selected="selected"
				:discovery="discovery"
				:scope-label="scopeLabel"
				:disabled="saving"
				@preview="previewKey = $event"
			>
				<template #row-details="{ skill }">
					<N8nText size="small" color="text-light" data-test-id="skill-update-counts">{{
						i18n.baseText('settings.context.skills.updates.lines', {
							interpolate: {
								added: byId.get(skill.key)?.changes.added ?? 0,
								removed: byId.get(skill.key)?.changes.removed ?? 0,
							},
						})
					}}</N8nText>
				</template>
				<template #row-action="{ skill }">
					<N8nButton
						variant="ghost"
						size="small"
						:disabled="saving"
						:label="i18n.baseText('settings.context.skills.updates.skip')"
						data-test-id="skill-update-skip"
						@click="skip(skill.key)"
					/>
				</template>
				<template #preview="{ skill }">
					<div :class="$style.detailHeader">
						<N8nText size="small" bold>{{
							i18n.baseText('settings.context.skills.updates.nextVersion', {
								interpolate: {
									name: skill.name ?? '',
									version: byId.get(skill.key)?.nextVersion ?? '',
								},
							})
						}}</N8nText>
						<N8nText v-if="detail" size="small" color="text-light"
							>{{ impact }}
							{{ i18n.baseText('settings.context.skills.updates.publishedUnchanged') }}</N8nText
						>
					</div>
					<N8nText v-if="detailLoading">{{ i18n.baseText('generic.loading') }}</N8nText>
					<N8nCallout v-else-if="detailError" theme="warning"
						>{{ detailError }}
						<N8nButton variant="ghost" :label="i18n.baseText('generic.retry')" @click="loadPreview"
					/></N8nCallout>
					<N8nCallout
						v-else-if="skill.check?.verdict === 'blocked'"
						theme="danger"
						data-test-id="skill-update-blocked"
						>{{ i18n.baseText('settings.context.skills.updates.blocked') }}</N8nCallout
					>
					<SkillSourceFilesView v-else-if="detail" :skill="skill" :diff-files="detail.files" />
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
		<N8nDialogFooter>
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
				:loading="saving"
				:disabled="loading || saving || selectedUpdates.length === 0 || (needsReview && !reviewed)"
				:label="
					i18n.baseText('settings.context.skills.updates.accept', {
						interpolate: { count: selectedUpdates.length },
						adjustToNumber: selectedUpdates.length,
					})
				"
				data-test-id="skill-updates-accept"
				@click="accept"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.body,
.detailHeader {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.header {
	flex-direction: column;
	align-items: stretch;
	gap: var(--spacing--3xs);
	padding-bottom: var(--spacing--xs);
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
	flex-wrap: wrap;
	row-gap: var(--spacing--4xs);
	min-width: 0;
	color: var(--text-color--subtler);
}

.commitLink {
	min-width: 0;
	overflow-wrap: anywhere;

	&:hover {
		text-decoration: underline;
	}
}

.source {
	overflow-wrap: anywhere;
}

.detailHeader {
	gap: var(--spacing--4xs);
	padding: var(--spacing--sm) var(--spacing--sm) 0;
}
.wide {
	--dialog--max-width: min(1200px, calc(100dvw - var(--spacing--lg)));
}
</style>
