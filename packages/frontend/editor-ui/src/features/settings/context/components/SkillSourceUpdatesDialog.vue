<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { SkillPendingUpdate, SkillSourceUpdates } from '@n8n/api-types';
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nCheckbox,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nIcon,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { ResponseError } from '@n8n/rest-api-client';

import SkillDiffCount from '@/features/agents/components/skillVersions/SkillDiffCount.vue';
import { diffSkills } from '@/features/agents/components/skillVersions/skillVersionDiff';
import TimeAgo from '@/app/components/TimeAgo.vue';

import SkillScopeBadge from './SkillScopeBadge.vue';
import { useSkillSourceReasons } from '../skills.utils';
import { useSkillsStore } from '../skills.store';

const props = defineProps<{ open: boolean; sourceId: string | null }>();

const emit = defineEmits<{
	'update:open': [open: boolean];
	/** Opens the review of one update. */
	review: [skillId: string];
	/** Updates came in, so the lists reload. */
	changed: [];
}>();

const i18n = useI18n();
const { showError, showMessage } = useToast();
const skillsStore = useSkillsStore();
const { reasonText } = useSkillSourceReasons();

const data = ref<SkillSourceUpdates | null>(null);
const loading = ref(false);
const accepting = ref(false);
const reviewedWarnings = ref(false);

async function load() {
	if (!props.sourceId) return;
	loading.value = true;
	reviewedWarnings.value = false;
	try {
		data.value = await skillsStore.fetchSourceUpdates(props.sourceId);
	} catch (error) {
		showError(error, i18n.baseText('settings.context.skills.updates.error.load'));
		emit('update:open', false);
	} finally {
		loading.value = false;
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

/** The updates that can come in: every update the security check did not block. */
const ready = computed(() =>
	(data.value?.updates ?? []).filter(
		(update) => update.check.verdict !== 'blocked' && update.nameClash === null,
	),
);
const needsReview = computed(() =>
	ready.value.some((update) => update.check.verdict === 'needs_review'),
);
const canReview = computed(() => data.value?.source.canReview === true);

const readOnlyText = computed(() => {
	const source = data.value?.source;
	if (!source || source.canReview) return '';
	if (source.projectId === null) {
		return i18n.baseText('settings.context.skills.updates.readOnly.global');
	}
	return i18n.baseText('settings.context.skills.updates.readOnly.project', {
		interpolate: { scope: source.projectName ?? '' },
	});
});

/** The lines that each update adds and removes, over every file, worked out once per load. */
const counts = computed(
	() => new Map((data.value?.updates ?? []).map((update) => [update.skillId, countOf(update)])),
);

function countOf(update: SkillPendingUpdate) {
	if (!update.update) return undefined;
	return diffSkills(update.current, update.update).reduce(
		(total, section) => ({
			added: total.added + section.added,
			removed: total.removed + section.removed,
		}),
		{ added: 0, removed: 0 },
	);
}

const commitLine = computed(() => {
	const commit = data.value?.commit;
	if (!commit) return '';
	return [commit.message, commit.author].filter(Boolean).join(' · ');
});

async function onUpdateAll() {
	if (!props.sourceId || !data.value) return;
	accepting.value = true;
	try {
		const result = await skillsStore.acceptSourceUpdates(props.sourceId, {
			updates: ready.value.map(({ skillId, contentHash }) => ({ skillId, contentHash })),
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
		const reason = error instanceof ResponseError ? error.meta?.reason : undefined;
		showError(
			reason !== undefined ? new Error(reasonText(reason)) : error,
			i18n.baseText('settings.context.skills.updates.error.accept'),
		);
	} finally {
		accepting.value = false;
	}
}

function openInGitHub() {
	if (data.value) window.open(data.value.source.webUrl, '_blank', 'noopener');
}
</script>

<template>
	<N8nDialog
		:open="open"
		:header="
			data
				? i18n.baseText('settings.context.skills.updates.title', {
						interpolate: { label: data.source.label },
					})
				: ''
		"
		size="medium"
		data-test-id="skill-source-updates-dialog"
		@update:open="emit('update:open', $event)"
	>
		<N8nDialogBody :class="$style.body">
			<template v-if="data">
				<div :class="$style.source">
					<N8nIcon icon="github" size="small" />
					<N8nText size="small" color="text-light">
						{{ [data.source.label, data.source.ref].filter(Boolean).join(' · ') }}
					</N8nText>
					<SkillScopeBadge
						:skill="{
							scope: data.source.projectId ? 'project' : 'instance',
							projectId: data.source.projectId,
							projectName: data.source.projectName,
							projectType: data.source.projectType,
							agentName: null,
						}"
					/>
				</div>
				<N8nText
					v-if="commitLine"
					size="small"
					color="text-light"
					data-test-id="skill-source-updates-commit"
				>
					{{
						i18n.baseText('settings.context.skills.updates.latestCommit', {
							interpolate: { commit: commitLine },
						})
					}}
					<template v-if="data.commit?.date"> · <TimeAgo :date="data.commit.date" /></template>
				</N8nText>
				<N8nText v-if="canReview" tag="p" size="small">
					{{ i18n.baseText('settings.context.skills.updates.description') }}
				</N8nText>
				<N8nCallout v-else theme="info" data-test-id="skill-source-updates-read-only">
					{{ readOnlyText }}
				</N8nCallout>

				<N8nText v-if="data.updates.length === 0" color="text-light">
					{{ i18n.baseText('settings.context.skills.updates.empty') }}
				</N8nText>
				<ul :class="$style.rows">
					<li
						v-for="update in data.updates"
						:key="update.skillId"
						:class="$style.row"
						data-test-id="skill-source-update-row"
						@click="emit('review', update.skillId)"
					>
						<div :class="$style.rowText">
							<N8nText size="medium" color="text-dark">{{ update.name }}</N8nText>
							<N8nText size="small" color="text-light">{{ update.location }}</N8nText>
						</div>
						<N8nBadge v-if="update.check.verdict === 'needs_review'" variant="warning">
							{{ i18n.baseText('settings.context.skills.updates.tag.needsReview') }}
						</N8nBadge>
						<N8nBadge v-else-if="update.check.verdict === 'blocked'" variant="danger">
							{{ i18n.baseText('settings.context.skills.updates.tag.blocked') }}
						</N8nBadge>
						<SkillDiffCount :count="counts.get(update.skillId)" hide-zero />
						<N8nIcon icon="chevron-right" size="small" />
					</li>
				</ul>

				<N8nCheckbox
					v-if="canReview && needsReview"
					v-model="reviewedWarnings"
					:label="i18n.baseText('settings.context.skills.updates.reviewedWarnings')"
					data-test-id="skill-source-updates-reviewed"
				/>
			</template>
		</N8nDialogBody>

		<N8nDialogFooter>
			<N8nButton
				variant="ghost"
				icon="external-link"
				:label="i18n.baseText('settings.context.skills.sources.actions.openInGitHub')"
				:disabled="!data"
				@click="openInGitHub"
			/>
			<span :class="$style.spacer" />
			<template v-if="canReview && ready.length > 0">
				<N8nButton
					variant="outline"
					:label="i18n.baseText('settings.context.skills.updates.later')"
					:disabled="accepting"
					data-test-id="skill-source-updates-later"
					@click="emit('update:open', false)"
				/>
				<N8nButton
					:label="
						i18n.baseText('settings.context.skills.updates.updateAll', {
							interpolate: { count: ready.length },
						})
					"
					:disabled="needsReview && !reviewedWarnings"
					:loading="accepting"
					data-test-id="skill-source-updates-update-all"
					@click="onUpdateAll"
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
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.source {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.rows {
	display: flex;
	flex-direction: column;
	margin: 0;
	padding: 0;
	list-style: none;
	border: var(--border);
	border-radius: var(--radius);
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	cursor: pointer;

	& + & {
		border-top: var(--border);
	}

	&:hover {
		background: var(--color--background--light-2);
	}
}

.rowText {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-width: 0;
}

.spacer {
	flex: 1;
}
</style>
