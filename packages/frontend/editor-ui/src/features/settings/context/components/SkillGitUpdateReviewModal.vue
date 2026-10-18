<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type {
	AgentSkill,
	SkillDetail,
	SkillGitCheckLevel,
	SkillGitUpdateDetail,
} from '@n8n/api-types';
import { N8nBadge, N8nButton, N8nCheckbox, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';

import TimeAgo from '@/app/components/TimeAgo.vue';
import AgentModal from '@/features/agents/components/modals/AgentModal.vue';
import SkillVersionDiff from '@/features/agents/components/skillVersions/SkillVersionDiff.vue';

import { useSkillsStore } from '../skills.store';
import { checkBadgeVariant, shortSha } from '../skillsGitHub.utils';

const props = defineProps<{
	open: boolean;
	skillId: string | null;
}>();

const emit = defineEmits<{
	'update:open': [open: boolean];
	/** The update was accepted or skipped, so the list must reload. */
	decided: [];
}>();

const i18n = useI18n();
const skillsStore = useSkillsStore();
const { showError, showMessage } = useToast();

const update = ref<SkillGitUpdateDetail | null>(null);
const detail = ref<SkillDetail | null>(null);
const latest = ref<AgentSkill | null>(null);
const loading = ref(false);
const deciding = ref<'accept' | 'skip' | null>(null);
const acknowledged = ref(false);

async function load(skillId: string) {
	loading.value = true;
	update.value = null;
	latest.value = null;
	acknowledged.value = false;
	try {
		const [pending, skill] = await Promise.all([
			skillsStore.fetchSkillGitUpdate(skillId),
			skillsStore.fetchSkill(skillId),
		]);
		const version = await skillsStore.fetchSkillVersion(skillId, pending.latestVersion);
		update.value = pending;
		detail.value = skill;
		latest.value = version.skill;
	} catch (error) {
		showError(error, i18n.baseText('settings.context.skills.github.review.loadError'));
		emit('update:open', false);
	} finally {
		loading.value = false;
	}
}

watch(
	() => [props.open, props.skillId] as const,
	([open, skillId]) => {
		if (open && skillId) void load(skillId);
	},
	{ immediate: true },
);

const nextVersion = computed(() => (update.value?.latestVersion ?? 0) + 1);
const isBlocked = computed(() => update.value?.status === 'blocked');
const needsAcknowledgement = computed(() => update.value?.checkResult.result === 'review');
const canAccept = computed(
	() =>
		!!update.value &&
		!isBlocked.value &&
		(!needsAcknowledgement.value || acknowledged.value) &&
		deciding.value === null,
);

/** What an accept changes, from the usage the skill detail already has. */
const impact = computed(() => {
	const usedBy = detail.value?.usedBy;
	const drafts = usedBy?.drafts ?? [];
	return {
		following: drafts.filter((draft) => !draft.pinned).length,
		pinned: drafts.filter((draft) => draft.pinned).length,
		published: (usedBy?.pins ?? []).filter((pin) => pin.version !== null).length,
	};
});

const title = computed(() =>
	i18n.baseText('settings.context.skills.github.review.title', {
		interpolate: { name: detail.value?.name ?? '' },
	}),
);

function checkLabel(result: SkillGitCheckLevel): string {
	if (result === 'passed') return i18n.baseText('settings.context.skills.github.result.passed');
	if (result === 'review') return i18n.baseText('settings.context.skills.github.result.review');
	return i18n.baseText('settings.context.skills.github.result.blocked');
}

async function onAccept() {
	if (!props.skillId || !update.value || !canAccept.value) return;
	deciding.value = 'accept';
	try {
		const result = await skillsStore.acceptSkillGitUpdate(props.skillId, {
			toCommitSha: update.value.toCommitSha,
			acknowledgeWarnings: acknowledged.value,
		});
		showMessage({
			title: i18n.baseText('settings.context.skills.github.review.accepted', {
				interpolate: { version: String(result.version) },
			}),
			message: i18n.baseText('settings.context.skills.versions.saved.toastDescription', {
				interpolate: { version: String(result.version) },
			}),
			type: 'success',
		});
		emit('decided');
		emit('update:open', false);
	} catch (error) {
		showError(error, i18n.baseText('settings.context.skills.github.review.acceptError'));
	} finally {
		deciding.value = null;
	}
}

async function onSkip() {
	if (!props.skillId || !update.value) return;
	deciding.value = 'skip';
	try {
		await skillsStore.skipSkillGitUpdate(props.skillId, update.value.toCommitSha);
		showMessage({
			title: i18n.baseText('settings.context.skills.github.review.skipped'),
			type: 'success',
		});
		emit('decided');
		emit('update:open', false);
	} catch (error) {
		showError(error, i18n.baseText('settings.context.skills.github.review.skipError'));
	} finally {
		deciding.value = null;
	}
}
</script>

<template>
	<AgentModal
		:open="open"
		:title="title"
		:busy="deciding !== null"
		:cancel-label="i18n.baseText('settings.context.skills.github.review.later')"
		size="2xlarge"
		body-flush
		@update:open="emit('update:open', $event)"
	>
		<template v-if="update" #headerActions>
			<N8nBadge variant="info" data-test-id="skill-github-review-range">
				{{ shortSha(update.fromCommitSha) }} → {{ shortSha(update.toCommitSha) }}
			</N8nBadge>
		</template>

		<div :class="$style.layout" data-test-id="skill-github-review-modal">
			<div :class="$style.diff">
				<SkillVersionDiff
					v-if="update && latest"
					:from="latest"
					:to="update.skill"
					:from-label="
						i18n.baseText('settings.context.skills.github.review.fromLabel', {
							interpolate: { version: String(update.latestVersion) },
						})
					"
					:to-label="i18n.baseText('settings.context.skills.github.review.toLabel')"
				/>
				<N8nText v-else size="small" color="text-light">
					{{ i18n.baseText('settings.context.skills.versions.compare.loading') }}
				</N8nText>
			</div>

			<aside v-if="update" :class="$style.side">
				<section :class="$style.section">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('settings.context.skills.github.review.check') }}
					</N8nText>
					<div>
						<N8nBadge
							:variant="checkBadgeVariant(update.checkResult.result)"
							data-test-id="skill-github-review-check"
						>
							{{ checkLabel(update.checkResult.result) }}
						</N8nBadge>
					</div>
					<ul v-if="update.checkResult.findings.length" :class="$style.list">
						<li v-for="(finding, index) in update.checkResult.findings" :key="index">
							<N8nText size="small">
								<strong>{{ finding.message }}.</strong>
								{{ [finding.file, finding.detail].filter(Boolean).join(': ') }}
							</N8nText>
						</li>
					</ul>
					<N8nText v-if="isBlocked" size="small" color="danger">
						{{ i18n.baseText('settings.context.skills.github.review.blockedNote') }}
					</N8nText>
				</section>

				<section v-if="update.skippedFiles.length" :class="$style.section">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('settings.context.skills.github.review.skippedFiles') }}
					</N8nText>
					<ul :class="$style.list">
						<li v-for="file in update.skippedFiles" :key="file.path">
							<N8nText size="small" :class="$style.mono">{{ file.path }}</N8nText>
						</li>
					</ul>
				</section>

				<section :class="$style.section">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('settings.context.skills.github.review.commit') }}
					</N8nText>
					<div :class="$style.commit">
						<N8nText size="small">{{ update.commitMessage ?? '' }}</N8nText>
						<N8nText size="small" color="text-light">
							{{ update.commitAuthor ?? '' }}
							<template v-if="update.committedAt">
								· <TimeAgo :date="update.committedAt" />
							</template>
							· <span :class="$style.mono">{{ shortSha(update.toCommitSha) }}</span>
						</N8nText>
					</div>
				</section>

				<section v-if="!isBlocked" :class="$style.section">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('settings.context.skills.github.review.impact') }}
					</N8nText>
					<ul :class="$style.impact" data-test-id="skill-github-review-impact">
						<li>
							<N8nIcon icon="arrow-up" size="small" />
							<N8nText size="small">
								{{
									i18n.baseText('settings.context.skills.github.review.impact.version', {
										interpolate: { version: String(nextVersion) },
									})
								}}
							</N8nText>
						</li>
						<li>
							<N8nIcon icon="bot" size="small" />
							<N8nText size="small">
								{{
									i18n.baseText('settings.context.skills.github.review.impact.following', {
										interpolate: {
											count: String(impact.following),
											version: String(nextVersion),
										},
										adjustToNumber: impact.following,
									})
								}}
							</N8nText>
						</li>
						<li>
							<N8nIcon icon="check" size="small" />
							<N8nText size="small">
								{{ i18n.baseText('settings.context.skills.github.review.impact.published') }}
							</N8nText>
						</li>
						<li v-if="impact.pinned > 0">
							<N8nIcon icon="pin" size="small" />
							<N8nText size="small">
								{{
									i18n.baseText('settings.context.skills.github.review.impact.pinned', {
										interpolate: { count: String(impact.pinned) },
										adjustToNumber: impact.pinned,
									})
								}}
							</N8nText>
						</li>
					</ul>
				</section>

				<N8nCheckbox
					v-if="needsAcknowledgement && !isBlocked"
					v-model="acknowledged"
					:label="i18n.baseText('settings.context.skills.github.ack')"
					data-test-id="skill-github-review-ack"
				/>
			</aside>
		</div>

		<template #footerLeft>
			<N8nButton
				variant="outline"
				:disabled="!update || deciding !== null"
				:loading="deciding === 'skip'"
				data-test-id="skill-github-review-skip"
				@click="onSkip"
			>
				{{ i18n.baseText('settings.context.skills.github.review.skip') }}
			</N8nButton>
		</template>
		<template #footerActions>
			<N8nButton
				variant="solid"
				:disabled="!canAccept"
				:loading="deciding === 'accept'"
				data-test-id="skill-github-review-accept"
				@click="onAccept"
			>
				{{
					i18n.baseText('settings.context.skills.github.review.accept', {
						interpolate: { version: String(nextVersion) },
					})
				}}
			</N8nButton>
		</template>
	</AgentModal>
</template>

<style module lang="scss">
.layout {
	display: grid;
	grid-template-columns: minmax(0, 1fr) 20rem;
	min-height: 0;
}

.diff {
	padding: var(--spacing--md);
	overflow: auto;
	min-width: 0;
}

.side {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	padding: var(--spacing--md);
	border-left: var(--border);
	background-color: var(--color--background--light-2);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.list {
	margin: 0;
	padding-left: var(--spacing--md);
}

.commit {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--color--background--light-3);
}

.impact {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);

	li {
		display: flex;
		gap: var(--spacing--2xs);
		align-items: flex-start;
	}
}

.mono {
	font-family: var(--font-family--monospace);
}
</style>
