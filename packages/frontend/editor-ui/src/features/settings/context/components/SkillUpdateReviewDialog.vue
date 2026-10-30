<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { SkillUpdateReview } from '@n8n/api-types';
import {
	N8nButton,
	N8nCallout,
	N8nCheckbox,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { ResponseError } from '@n8n/rest-api-client';

import TimeAgo from '@/app/components/TimeAgo.vue';
import SkillDiffCount from '@/features/agents/components/skillVersions/SkillDiffCount.vue';
import SkillVersionDiff from '@/features/agents/components/skillVersions/SkillVersionDiff.vue';
import {
	SKILL_FILE,
	countsByFile,
	diffLines,
	diffSkills,
} from '@/features/agents/components/skillVersions/skillVersionDiff';

import { useSkillScopeDisplay, useSkillSourceReasons } from '../skills.utils';
import { useSkillsStore } from '../skills.store';

const props = defineProps<{ open: boolean; skillId: string | null }>();

const emit = defineEmits<{
	'update:open': [open: boolean];
	/** The update was accepted or skipped, so the lists reload. */
	changed: [];
	/** Stop syncing, from the footer as in the skill modal. The view asks first. */
	stopSyncing: [skillId: string];
}>();

const i18n = useI18n();
const { showError, showMessage } = useToast();
const skillsStore = useSkillsStore();
const { reasonText, findingsText } = useSkillSourceReasons();
const { scopeDisplay } = useSkillScopeDisplay();

const review = ref<SkillUpdateReview | null>(null);
const loading = ref(false);
const acting = ref<'accept' | 'skip' | null>(null);
const reviewedWarnings = ref(false);
const selectedPath = ref(SKILL_FILE);

/** Counts the loads, so an answer that arrives after a newer load is dropped. */
let loadId = 0;

async function load() {
	if (!props.skillId) return;
	const id = ++loadId;
	loading.value = true;
	reviewedWarnings.value = false;
	selectedPath.value = SKILL_FILE;
	try {
		const loaded = await skillsStore.fetchSkillUpdate(props.skillId);
		if (id === loadId) review.value = loaded;
	} catch (error) {
		if (id !== loadId) return;
		showError(errorOf(error), i18n.baseText('settings.context.skills.review.error.load'));
		// The update can be gone, decided by another user: the lists catch up.
		emit('changed');
		emit('update:open', false);
	} finally {
		if (id === loadId) loading.value = false;
	}
}

watch(
	() => [props.open, props.skillId] as const,
	async ([open]) => {
		if (open) await load();
		else review.value = null;
	},
	{ immediate: true },
);

const update = computed(() => review.value?.update);
const verdict = computed(() => update.value?.check.verdict);
const canReview = computed(() => review.value?.source.canReview === true);

const FRONTMATTER = 'frontmatter';

/** The frontmatter as one `key: value` line per key, sorted, so a diff shows each change. */
function frontmatterText(frontmatter: Record<string, unknown> | null): string {
	return Object.keys(frontmatter ?? {})
		.sort()
		.map((key) => `${key}: ${JSON.stringify(frontmatter?.[key])}`)
		.join('\n');
}

const sections = computed(() => {
	const current = update.value;
	if (!current?.update) return [];
	const lines = diffLines(
		frontmatterText(current.currentFrontmatter),
		frontmatterText(current.updateFrontmatter),
	);
	const added = lines.filter((line) => line.type === 'added').length;
	const removed = lines.filter((line) => line.type === 'removed').length;
	return [
		...diffSkills(current.current, current.update),
		// Accept stores the frontmatter too, so a change to it shows as its own entry.
		...(added + removed > 0 ? [{ key: FRONTMATTER, lines, added, removed }] : []),
	];
});
const counts = computed(() => countsByFile(sections.value));
/** SKILL.md, then the references of the current version and of the update. */
const files = computed(() => [
	SKILL_FILE,
	...Object.keys(counts.value).filter((p) => p !== SKILL_FILE),
]);

const scopeLabel = computed(() => {
	const source = review.value?.source;
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
	const source = review.value?.source;
	if (!source || source.canReview) return '';
	if (source.projectId === null)
		return i18n.baseText('settings.context.skills.review.readOnly.global');
	return i18n.baseText('settings.context.skills.review.readOnly.project', {
		interpolate: { scope: scopeLabel.value },
	});
});

const checkText = computed(() => {
	const check = update.value?.check;
	if (!check) return '';
	const findings = findingsText(check.findings);
	if (check.verdict === 'pass') return i18n.baseText('settings.context.skills.review.check.pass');
	return i18n.baseText(
		check.verdict === 'blocked'
			? 'settings.context.skills.review.check.blocked'
			: 'settings.context.skills.review.check.review',
		{ interpolate: { findings } },
	);
});

/** "f02b1aa…a91c0e2 (2 commits)", with short revisions as GitHub shows them. */
const rangeText = computed(() => {
	const commit = review.value?.commit;
	if (!commit) return '';
	const from = commit.baseRevision.slice(0, 7);
	const to = commit.revision.slice(0, 7);
	if (commit.commits === null || commit.commits <= 1) {
		return i18n.baseText('settings.context.skills.review.commit.range', {
			interpolate: { from, to },
		});
	}
	return i18n.baseText('settings.context.skills.review.commit.rangeCount', {
		interpolate: { from, to, count: commit.commits },
		adjustToNumber: commit.commits,
	});
});

const canAccept = computed(
	() =>
		canReview.value &&
		verdict.value !== 'blocked' &&
		update.value?.nameClash === null &&
		(verdict.value !== 'needs_review' || reviewedWarnings.value),
);

function errorOf(error: unknown) {
	const reason = error instanceof ResponseError ? error.meta?.reason : undefined;
	return reason !== undefined ? new Error(reasonText(reason)) : error;
}

async function onAccept() {
	if (!props.skillId || !update.value) return;
	acting.value = 'accept';
	try {
		const result = await skillsStore.acceptSkillUpdate(props.skillId, {
			contentHash: update.value.contentHash,
			reviewedWarnings: reviewedWarnings.value,
		});
		showMessage({
			title: i18n.baseText('settings.context.skills.review.accepted', {
				interpolate: { name: result.name, version: result.version },
			}),
			type: 'success',
		});
		emit('changed');
		emit('update:open', false);
	} catch (error) {
		showError(errorOf(error), i18n.baseText('settings.context.skills.review.error.accept'));
		// A newer update replaced the reviewed one: show the latest change.
		if (error instanceof ResponseError && error.meta?.reason === 'stale') await load();
	} finally {
		acting.value = null;
	}
}

async function onSkip() {
	if (!props.skillId || !update.value) return;
	acting.value = 'skip';
	try {
		await skillsStore.skipSkillUpdate(props.skillId, { contentHash: update.value.contentHash });
		showMessage({
			title: i18n.baseText('settings.context.skills.review.skipped'),
			type: 'success',
		});
		emit('changed');
		emit('update:open', false);
	} catch (error) {
		showError(errorOf(error), i18n.baseText('settings.context.skills.review.error.skip'));
		if (error instanceof ResponseError && error.meta?.reason === 'stale') await load();
	} finally {
		acting.value = null;
	}
}

function openInGitHub() {
	if (update.value) window.open(update.value.webUrl, '_blank', 'noopener');
}
</script>

<template>
	<N8nDialog
		:open="open"
		:header="update?.name ?? ''"
		size="2xlarge"
		data-test-id="skill-update-review-dialog"
		@update:open="emit('update:open', $event)"
	>
		<N8nDialogBody v-if="review && update" :class="$style.body">
			<N8nCallout theme="secondary" icon="git-branch" data-test-id="skill-update-banner">
				{{
					i18n.baseText('settings.context.skills.review.banner', {
						interpolate: { label: review.source.label, path: update.location },
					})
				}}
			</N8nCallout>

			<div :class="$style.columns">
				<nav :class="$style.files" data-test-id="skill-update-files">
					<button
						v-for="path in files"
						:key="path"
						type="button"
						:class="[$style.file, { [$style.selected]: path === selectedPath }]"
						@click="selectedPath = path"
					>
						<N8nText size="small">{{
							path === FRONTMATTER
								? i18n.baseText('settings.context.skills.review.frontmatter')
								: path
						}}</N8nText>
						<SkillDiffCount :count="counts[path]" hide-zero />
					</button>
				</nav>

				<div :class="$style.main">
					<SkillVersionDiff
						v-if="sections.length > 0"
						:sections="sections"
						:selected-path="selectedPath"
						data-test-id="skill-update-diff"
					/>
					<N8nCallout v-else theme="warning" data-test-id="skill-update-unreadable">
						{{ i18n.baseText('settings.context.skills.review.unreadable') }}
					</N8nCallout>

					<div v-if="review.commit" :class="$style.commit" data-test-id="skill-update-commit">
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('settings.context.skills.review.commit.title') }}
						</N8nText>
						<N8nText size="small" bold :class="$style.mono">
							{{ review.commit.revision.slice(0, 7) }}
						</N8nText>
						<N8nText v-if="review.commit.message" size="small" bold>
							{{ review.commit.message }}
						</N8nText>
						<N8nText size="small" color="text-light">
							<template v-if="review.commit.author">{{ review.commit.author }} · </template>
							<template v-if="review.commit.date"
								><TimeAgo :date="review.commit.date" /> ·
							</template>
							{{ review.source.label }} ·
							<a :href="review.commit.webUrl" target="_blank" rel="noopener">{{ rangeText }}</a>
						</N8nText>
					</div>

					<N8nCallout
						:theme="
							verdict === 'blocked' ? 'danger' : verdict === 'needs_review' ? 'warning' : 'success'
						"
						data-test-id="skill-update-check"
					>
						{{ checkText }}
					</N8nCallout>

					<N8nCallout v-if="update.nameClash" theme="danger" data-test-id="skill-update-name-clash">
						{{
							i18n.baseText(
								update.nameClash.where === 'agent'
									? 'settings.context.skills.review.nameClash.agent'
									: 'settings.context.skills.review.nameClash',
								{ interpolate: { name: update.nameClash.name, scope: scopeLabel } },
							)
						}}
					</N8nCallout>

					<div v-if="verdict !== 'blocked'" :class="$style.next" data-test-id="skill-update-next">
						<N8nText size="small" bold>
							{{ i18n.baseText('settings.context.skills.review.next.title') }}
						</N8nText>
						<N8nText size="small">
							{{
								i18n.baseText('settings.context.skills.review.next.version', {
									interpolate: { version: update.impact.nextVersion },
								})
							}}
						</N8nText>
						<N8nText size="small">
							{{
								update.impact.followingAgents > 0
									? i18n.baseText('settings.context.skills.review.next.following', {
											interpolate: { count: update.impact.followingAgents },
											adjustToNumber: update.impact.followingAgents,
										})
									: i18n.baseText('settings.context.skills.review.next.noFollowing')
							}}
						</N8nText>
						<N8nText v-if="update.impact.publishedAgents > 0" size="small">
							{{ i18n.baseText('settings.context.skills.review.next.published') }}
						</N8nText>
					</div>

					<N8nCallout v-if="!canReview" theme="info" data-test-id="skill-update-read-only">
						{{ readOnlyText }}
					</N8nCallout>
					<N8nCheckbox
						v-else-if="verdict === 'needs_review'"
						v-model="reviewedWarnings"
						:label="i18n.baseText('settings.context.skills.updates.reviewedWarnings')"
						data-test-id="skill-update-reviewed"
					/>
				</div>
			</div>
		</N8nDialogBody>

		<N8nDialogFooter>
			<N8nButton
				variant="ghost"
				icon="external-link"
				:label="i18n.baseText('settings.context.skills.sources.actions.openInGitHub')"
				:disabled="!update"
				@click="openInGitHub"
			/>
			<N8nButton
				v-if="canReview && skillId"
				variant="ghost"
				icon="unlink"
				:label="i18n.baseText('settings.context.skills.stopSyncing.action')"
				:disabled="acting !== null"
				data-test-id="skill-update-stop-syncing"
				@click="emit('stopSyncing', skillId)"
			/>
			<span :class="$style.spacer" />
			<template v-if="canReview">
				<N8nButton
					variant="outline"
					:label="i18n.baseText('settings.context.skills.review.later')"
					:disabled="acting !== null"
					data-test-id="skill-update-later"
					@click="emit('update:open', false)"
				/>
				<N8nButton
					variant="outline"
					:label="i18n.baseText('settings.context.skills.review.skip')"
					:loading="acting === 'skip'"
					:disabled="acting !== null"
					data-test-id="skill-update-skip"
					@click="onSkip"
				/>
				<N8nButton
					v-if="verdict !== 'blocked' && update"
					:label="
						i18n.baseText('settings.context.skills.review.accept', {
							interpolate: { version: update.impact.nextVersion },
						})
					"
					:disabled="!canAccept || acting !== null"
					:loading="acting === 'accept'"
					data-test-id="skill-update-accept"
					@click="onAccept"
				/>
			</template>
			<N8nButton
				v-else
				:label="i18n.baseText('settings.context.skills.updates.done')"
				:disabled="loading"
				data-test-id="skill-update-done"
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

.columns {
	display: grid;
	grid-template-columns: 14rem 1fr;
	gap: var(--spacing--md);
	min-height: 0;
}

.files {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.file {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border: none;
	border-radius: var(--radius);
	background: none;
	text-align: left;
	cursor: pointer;

	&:hover {
		background: var(--color--background--light-2);
	}
}

.selected {
	background: var(--color--background--light-2);
}

.main {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	min-width: 0;
}

.commit,
.next {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

/* A box, as in the prototype: what Accept changes stands apart from the details above. */
.next {
	padding: var(--spacing--xs) var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius);
}

.mono {
	font-family: var(--font-family--monospace);
}

.spacer {
	flex: 1;
}
</style>
