<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type {
	DiscoverGitHubSkillsResponse,
	GitHubSkillCandidate,
	ImportGitHubSkillsResponse,
	SkillGitCheckLevel,
} from '@n8n/api-types';
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nCheckbox,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import AgentModal from '@/features/agents/components/modals/AgentModal.vue';
import type { AgentSkillModalScopeOption } from '@/features/agents/components/AgentSkillModal.vue';

import { useSkillsStore } from '../skills.store';
import {
	canPickCandidate,
	checkBadgeVariant,
	initialPicks,
	isImportedTo,
	picksNeedAcknowledgement,
	shortSha,
	validPicks,
} from '../skillsGitHub.utils';

type Step = 'link' | 'pick' | 'check';

const props = defineProps<{
	open: boolean;
	scopeOptions: AgentSkillModalScopeOption[];
	/** Turns a scope option value into the import target. */
	resolveScope: (value: string) => { scope: 'project' | 'instance'; projectId?: string };
}>();

const emit = defineEmits<{
	'update:open': [open: boolean];
	imported: [response: ImportGitHubSkillsResponse];
}>();

const i18n = useI18n();
const skillsStore = useSkillsStore();

const step = ref<Step>('link');
const url = ref('');
const linkError = ref('');
const busy = ref(false);
const found = ref<DiscoverGitHubSkillsResponse | null>(null);
const scopeValue = ref('');
const picks = ref<string[]>([]);
const acknowledged = ref(false);
const failed = ref<ImportGitHubSkillsResponse['failed']>([]);

watch(
	() => props.open,
	(open) => {
		if (!open) return;
		step.value = 'link';
		url.value = '';
		linkError.value = '';
		found.value = null;
		picks.value = [];
		acknowledged.value = false;
		failed.value = [];
		scopeValue.value = props.scopeOptions[0]?.value ?? '';
	},
	{ immediate: true },
);

const targetProjectId = computed(() => props.resolveScope(scopeValue.value).projectId ?? null);
const candidates = computed(() => found.value?.skills ?? []);
/** Every skill in the link is blocked or already synced into the chosen place. */
const nothingToPick = computed(
	() =>
		candidates.value.length > 0 &&
		!candidates.value.some((candidate) => canPickCandidate(candidate, targetProjectId.value)),
);
const pickedCandidates = computed(() =>
	candidates.value.filter((candidate) => picks.value.includes(candidate.path)),
);
const importable = computed(() =>
	pickedCandidates.value.filter((candidate) => candidate.check.result !== 'blocked'),
);
const needsAcknowledgement = computed(() =>
	picksNeedAcknowledgement(picks.value, candidates.value),
);
const selectedScopeIcon = computed(
	() => props.scopeOptions.find((option) => option.value === scopeValue.value)?.icon,
);
const selectedScopeLabel = computed(
	() => props.scopeOptions.find((option) => option.value === scopeValue.value)?.label ?? '',
);

// A scope where a folder is already synced takes that folder out of the picks.
watch(targetProjectId, (projectId) => {
	picks.value = validPicks(picks.value, candidates.value, projectId);
});

function errorMessage(error: unknown): string {
	return error instanceof Error && error.message
		? error.message
		: i18n.baseText('settings.context.skills.github.import.error.generic');
}

async function onFind() {
	if (!url.value.trim()) {
		linkError.value = i18n.baseText('settings.context.skills.github.import.link.empty');
		return;
	}
	busy.value = true;
	linkError.value = '';
	try {
		found.value = await skillsStore.discoverGitHubSkills(url.value.trim());
		picks.value = initialPicks(found.value.skills, targetProjectId.value);
		step.value = 'pick';
	} catch (error) {
		linkError.value = errorMessage(error);
	} finally {
		busy.value = false;
	}
}

function togglePick(candidate: GitHubSkillCandidate, checked: boolean) {
	picks.value = checked
		? [...new Set([...picks.value, candidate.path])]
		: picks.value.filter((path) => path !== candidate.path);
}

function goToCheck() {
	acknowledged.value = false;
	failed.value = [];
	step.value = 'check';
}

function onBack() {
	step.value = step.value === 'check' ? 'pick' : 'link';
}

async function onImport() {
	if (!found.value || importable.value.length === 0) return;
	busy.value = true;
	failed.value = [];
	try {
		const response = await skillsStore.importGitHubSkills({
			url: url.value.trim(),
			commitSha: found.value.commitSha,
			paths: importable.value.map((candidate) => candidate.path),
			...props.resolveScope(scopeValue.value),
			acknowledgeWarnings: acknowledged.value,
		});
		if (response.created.length === 0) {
			failed.value = response.failed;
			return;
		}
		emit('imported', response);
		emit('update:open', false);
	} catch (error) {
		failed.value = [{ path: '', message: errorMessage(error) }];
	} finally {
		busy.value = false;
	}
}

function candidateName(path: string): string {
	return candidates.value.find((candidate) => candidate.path === path)?.name ?? path;
}

function checkLabel(result: SkillGitCheckLevel): string {
	if (result === 'passed') return i18n.baseText('settings.context.skills.github.result.passed');
	if (result === 'review') return i18n.baseText('settings.context.skills.github.result.review');
	return i18n.baseText('settings.context.skills.github.result.blocked');
}

const title = computed(() => i18n.baseText('settings.context.skills.github.import.title'));
</script>

<template>
	<AgentModal
		:open="open"
		:title="title"
		:show-back="step !== 'link'"
		:busy="busy"
		size="large"
		@update:open="emit('update:open', $event)"
		@back="onBack"
	>
		<div :class="$style.body" data-test-id="skill-github-import-modal">
			<N8nText size="small" color="text-light" data-test-id="skill-github-import-step">
				{{
					i18n.baseText('settings.context.skills.github.import.step', {
						interpolate: { step: String(step === 'link' ? 1 : step === 'pick' ? 2 : 3) },
					})
				}}
			</N8nText>

			<template v-if="step === 'link'">
				<N8nInputLabel
					:label="i18n.baseText('settings.context.skills.github.import.link.label')"
					size="small"
				>
					<N8nInput
						v-model="url"
						:placeholder="i18n.baseText('settings.context.skills.github.import.link.placeholder')"
						:disabled="busy"
						data-test-id="skill-github-link-input"
						@update:model-value="linkError = ''"
						@keydown.enter.prevent="onFind"
					/>
				</N8nInputLabel>
				<N8nText
					v-if="linkError"
					size="small"
					color="danger"
					tag="p"
					:class="$style.help"
					data-test-id="skill-github-link-error"
				>
					{{ linkError }}
				</N8nText>
				<N8nText v-else size="small" color="text-light" tag="p" :class="$style.help">
					{{ i18n.baseText('settings.context.skills.github.import.link.help') }}
				</N8nText>
				<N8nCallout theme="info">
					{{ i18n.baseText('settings.context.skills.github.import.publicOnly') }}
				</N8nCallout>
			</template>

			<template v-else-if="step === 'pick' && found">
				<div :class="$style.repo" data-test-id="skill-github-repo">
					<N8nIcon icon="github" />
					<N8nText bold>{{ found.owner }}/{{ found.repo }}</N8nText>
					<N8nBadge variant="outline">{{ found.ref }}</N8nBadge>
					<N8nText size="small" color="text-light" :class="$style.mono">
						{{ shortSha(found.commitSha) }}
					</N8nText>
					<span :class="$style.spacer" />
					<N8nText size="small" color="text-light">
						{{
							i18n.baseText('settings.context.skills.github.import.found', {
								interpolate: { count: String(candidates.length) },
								adjustToNumber: candidates.length,
							})
						}}
					</N8nText>
				</div>
				<N8nCallout
					v-if="found.refType !== 'branch'"
					theme="info"
					data-test-id="skill-github-fixed"
				>
					{{
						i18n.baseText('settings.context.skills.github.import.fixedRef', {
							interpolate: { ref: found.ref },
						})
					}}
				</N8nCallout>
				<N8nCallout v-if="nothingToPick" theme="info" data-test-id="skill-github-nothing-to-pick">
					{{ i18n.baseText('settings.context.skills.github.import.nothingToPick') }}
				</N8nCallout>
				<ul :class="$style.list">
					<li
						v-for="candidate in candidates"
						:key="candidate.path"
						:class="[
							$style.row,
							!canPickCandidate(candidate, targetProjectId) && $style.rowDisabled,
						]"
						:data-path="candidate.path"
						data-test-id="skill-github-candidate"
					>
						<N8nCheckbox
							:model-value="picks.includes(candidate.path)"
							:disabled="!canPickCandidate(candidate, targetProjectId)"
							:aria-label="candidate.name"
							data-test-id="skill-github-pick"
							@update:model-value="togglePick(candidate, $event)"
						/>
						<div :class="$style.rowText">
							<N8nText bold>{{ candidate.name }}</N8nText>
							<N8nText v-if="candidate.description" size="small" color="text-light">
								{{ candidate.description }}
							</N8nText>
							<N8nText size="small" color="text-light" :class="$style.mono">
								{{ candidate.path || '/' }}
							</N8nText>
						</div>
						<N8nBadge v-if="isImportedTo(candidate, targetProjectId)" variant="outline">
							{{ i18n.baseText('settings.context.skills.github.import.alreadyHere') }}
						</N8nBadge>
						<N8nBadge v-else-if="candidate.check.result === 'blocked'" variant="danger">
							{{ i18n.baseText('settings.context.skills.github.result.blocked') }}
						</N8nBadge>
					</li>
				</ul>
				<N8nInputLabel
					:label="i18n.baseText('settings.context.skills.modal.scope.label')"
					size="small"
				>
					<N8nSelect
						v-model="scopeValue"
						size="large"
						:teleported="false"
						data-test-id="skill-github-scope"
					>
						<template v-if="selectedScopeIcon" #prefix>
							<N8nIcon :icon="selectedScopeIcon" />
						</template>
						<N8nOption
							v-for="option in scopeOptions"
							:key="option.value"
							:value="option.value"
							:label="option.label"
						/>
					</N8nSelect>
				</N8nInputLabel>
				<N8nText size="small" color="text-light" tag="p" :class="$style.help">
					{{ i18n.baseText('settings.context.skills.github.import.scopeHelp') }}
				</N8nText>
			</template>

			<template v-else-if="step === 'check'">
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('settings.context.skills.github.import.checkIntro') }}
				</N8nText>
				<ul :class="$style.list">
					<li
						v-for="candidate in pickedCandidates"
						:key="candidate.path"
						:class="$style.checkRow"
						data-test-id="skill-github-check-row"
					>
						<div :class="$style.rowText">
							<N8nText bold>{{ candidate.name }}</N8nText>
							<ul v-if="candidate.check.findings.length" :class="$style.findings">
								<li v-for="(finding, index) in candidate.check.findings" :key="index">
									<N8nText size="small">
										<strong>{{ finding.message }}.</strong>
										{{ [finding.file, finding.detail].filter(Boolean).join(': ') }}
									</N8nText>
								</li>
							</ul>
							<N8nText v-if="candidate.check.result === 'blocked'" size="small" color="danger">
								{{ i18n.baseText('settings.context.skills.github.import.blockedNote') }}
							</N8nText>
						</div>
						<N8nBadge :variant="checkBadgeVariant(candidate.check.result)">
							{{ checkLabel(candidate.check.result) }}
						</N8nBadge>
					</li>
				</ul>
				<N8nCheckbox
					v-if="needsAcknowledgement"
					v-model="acknowledged"
					:label="i18n.baseText('settings.context.skills.github.ack')"
					data-test-id="skill-github-ack"
				/>
				<N8nCallout v-if="failed.length" theme="danger" data-test-id="skill-github-import-error">
					<ul :class="$style.failures">
						<li v-for="failure in failed" :key="failure.path">
							<template v-if="failure.path">
								<strong>{{ candidateName(failure.path) }}:</strong>
							</template>
							{{ failure.message }}
						</li>
					</ul>
				</N8nCallout>
			</template>
		</div>

		<template #footerActions>
			<N8nButton
				v-if="step === 'link'"
				variant="solid"
				:loading="busy"
				data-test-id="skill-github-find"
				@click="onFind"
			>
				{{ i18n.baseText('settings.context.skills.github.import.find') }}
			</N8nButton>
			<N8nButton
				v-else-if="step === 'pick'"
				variant="solid"
				:disabled="picks.length === 0 || !scopeValue"
				data-test-id="skill-github-next"
				@click="goToCheck"
			>
				{{
					i18n.baseText('settings.context.skills.github.import.next', {
						interpolate: { count: String(picks.length) },
						adjustToNumber: picks.length,
					})
				}}
			</N8nButton>
			<N8nButton
				v-else
				variant="solid"
				:loading="busy"
				:disabled="importable.length === 0 || (needsAcknowledgement && !acknowledged)"
				data-test-id="skill-github-import-submit"
				@click="onImport"
			>
				{{
					i18n.baseText('settings.context.skills.github.import.submit', {
						interpolate: { count: String(importable.length), scope: selectedScopeLabel },
						adjustToNumber: importable.length,
					})
				}}
			</N8nButton>
		</template>
	</AgentModal>
</template>

<style module lang="scss">
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.help {
	margin: calc(var(--spacing--xs) * -1) 0 0;
}

.repo {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--color--background--light-3);
}

.spacer {
	flex: 1;
}

.mono {
	font-family: var(--font-family--monospace);
}

.list {
	list-style: none;
	margin: 0;
	padding: 0;
	border: var(--border);
	border-radius: var(--radius);
}

.row,
.checkRow {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs);

	& + & {
		border-top: var(--border);
	}
}

.rowDisabled {
	opacity: 0.6;
}

.rowText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	flex: 1;
	min-width: 0;
}

.findings,
.failures {
	margin: var(--spacing--4xs) 0 0;
	padding-left: var(--spacing--md);
}
</style>
