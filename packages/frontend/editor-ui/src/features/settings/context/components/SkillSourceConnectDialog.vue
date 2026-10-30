<script lang="ts" setup>
import type {
	DiscoveredSkill,
	SkillSourceConnectResponse,
	SkillSourceCredentialOption,
	SkillSourceDiscovery,
	SkillSourceRepositoryOption,
} from '@n8n/api-types';
import { computed, ref, watch } from 'vue';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nCheckbox,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { getResourcePermissions } from '@n8n/permissions';
import { ResponseError } from '@n8n/rest-api-client';

import { useUIStore } from '@/app/stores/ui.store';
import type { AgentSkillModalScopeOption } from '@/features/agents/components/AgentSkillModal.vue';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';

import { useSkillsStore } from '../skills.store';
import { parseScope, useSkillSourceReasons } from '../skills.utils';

/** What the page needs to confirm an import: the answer, and the names it shows in the toast. */
export type SkillSourceConnected = {
	response: SkillSourceConnectResponse;
	sourceLabel: string;
	scopeLabel: string;
};

const props = defineProps<{
	open: boolean;
	/** The scopes where the user may create skills, as the create modal lists them. */
	scopeOptions: AgentSkillModalScopeOption[];
}>();

const emit = defineEmits<{
	'update:open': [open: boolean];
	connected: [result: SkillSourceConnected];
}>();

/** A loose check only: the server reads the link and answers with the exact reason. */
const GITHUB_LINK = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+([/?#].*)?$/i;
/** A web link to another host, such as GitLab. */
const OTHER_HOST_LINK = /^https?:\/\/(?!(www\.)?github\.com([/?#:]|$))[^\s/?#]+/i;

/** A source reads a private repository with a token only, never with OAuth. */
const TOKEN_CREDENTIAL_TYPES = ['githubApi', 'githubAppApi'] as const;
type TokenCredentialType = (typeof TOKEN_CREDENTIAL_TYPES)[number];

/** The options of the credential select that open the credential modal instead of picking. */
const NEW_CREDENTIAL_PREFIX = '__new__:';

type Mode = 'account' | 'url';

const i18n = useI18n();
const { showError } = useToast();
const skillsStore = useSkillsStore();
const { reasonText, findingsText, linkedDomainsText } = useSkillSourceReasons();
const projectsStore = useProjectsStore();
const uiStore = useUIStore();

const step = ref<'start' | 'repository' | 'choose'>('start');
const mode = ref<Mode>('url');
const url = ref('');
const scope = ref('');
const discovering = ref(false);
const connecting = ref(false);
const linkError = ref('');
const discovery = ref<SkillSourceDiscovery | null>(null);
const selected = ref<string[]>([]);
/** The link and credential that the shown discovery read, which connect sends again. */
const discovered = ref<{ url: string; credentialId?: string } | null>(null);

/** `''` is "None, the repository is public", which only the link mode offers. */
const credentialId = ref('');
const credentials = ref<SkillSourceCredentialOption[]>([]);
const credentialsLoading = ref(false);
/** The credential that the user created from this dialog, for the success box. */
const createdCredential = ref<{ id: string; scopeLabel: string } | null>(null);

const repositories = ref<SkillSourceRepositoryOption[]>([]);
const repositoriesTruncated = ref(false);
const repositoriesLoading = ref(false);
const owner = ref('');
const repositoryName = ref('');

/** "I reviewed the warnings", for the picked skills that need review. */
const reviewed = ref(false);
/** Counts the reads of a link, so the answer of a read from before a close is dropped. */
let discoverRun = 0;
let credentialsRun = 0;
let repositoriesRun = 0;

function resetRepositories() {
	repositoriesRun += 1;
	repositories.value = [];
	repositoriesTruncated.value = false;
	repositoriesLoading.value = false;
	owner.value = '';
	repositoryName.value = '';
}

watch(
	() => props.open,
	(open) => {
		if (!open) return;
		discoverRun += 1;
		credentialsRun += 1;
		discovering.value = false;
		step.value = 'start';
		mode.value = 'url';
		url.value = '';
		scope.value = props.scopeOptions[0]?.value ?? '';
		linkError.value = '';
		discovery.value = null;
		discovered.value = null;
		selected.value = [];
		credentialId.value = '';
		credentials.value = [];
		credentialsLoading.value = false;
		createdCredential.value = null;
		resetRepositories();
		reviewed.value = false;
	},
	{ immediate: true },
);

// A new link, scope, credential or repository needs a new read, so the old answer and its
// messages go.
watch([url, scope, credentialId, owner, repositoryName, mode], () => {
	linkError.value = '';
	discovery.value = null;
});

const selectedScope = computed(() =>
	props.scopeOptions.find((option) => option.value === scope.value),
);

const scopeHint = computed(() => {
	const option = selectedScope.value;
	if (!option || option.value === 'instance') {
		return i18n.baseText('settings.context.skills.connect.scope.hint.instance');
	}
	if (option.icon === 'user') {
		return i18n.baseText('settings.context.skills.connect.scope.hint.personal');
	}
	return i18n.baseText('settings.context.skills.connect.scope.hint.project', {
		interpolate: { project: option.label },
	});
});

/**
 * Each reason has its own text. With a credential picked, `not_found` means the credential cannot
 * read the repository. An error without a reason, such as a 404 when skill sync is off, gets
 * `fallback`.
 */
function discoverErrorText(
	error: unknown,
	link?: string,
	fallback: BaseTextKey = 'settings.context.skills.connect.error.discover',
): string {
	const reason = error instanceof ResponseError ? error.meta?.reason : undefined;
	if (reason === undefined) return i18n.baseText(fallback);
	return reasonText(reason, link, { withCredential: !!credentialId.value });
}

const credentialHint = computed(() => {
	const option = selectedScope.value;
	if (!option || option.value === 'instance') {
		return i18n.baseText('settings.context.skills.connect.credential.hint.instance');
	}
	if (option.icon === 'user') {
		return i18n.baseText('settings.context.skills.connect.credential.hint.personal');
	}
	return i18n.baseText('settings.context.skills.connect.credential.hint.project', {
		interpolate: { project: option.label },
	});
});

/**
 * Where a credential made from this dialog lives: the project of a project source, or the
 * personal project of the admin for a Global source, since Global uses credentials that
 * admins own.
 */
const credentialProject = computed(() => {
	const target = parseScope(scope.value);
	const projectId =
		target.scope === 'instance' ? projectsStore.personalProject?.id : target.projectId;
	if (!projectId) return null;
	if (projectsStore.personalProject?.id === projectId) return projectsStore.personalProject;
	return projectsStore.myProjects.find((project) => project.id === projectId) ?? null;
});

const canCreateCredential = computed(
	() =>
		!!credentialProject.value &&
		!!getResourcePermissions(credentialProject.value.scopes).credential.create,
);

const newCredentialOptions = computed(() =>
	canCreateCredential.value
		? [
				{
					value: `${NEW_CREDENTIAL_PREFIX}githubApi`,
					label: i18n.baseText('settings.context.skills.connect.credential.new'),
				},
				{
					value: `${NEW_CREDENTIAL_PREFIX}githubAppApi`,
					label: i18n.baseText('settings.context.skills.connect.credential.newApp'),
				},
			]
		: [],
);

/** Reads the credentials of the scope; `select` picks one, such as a credential just made. */
async function loadCredentials(select?: string) {
	const requestedScope = scope.value;
	const run = ++credentialsRun;
	credentialsLoading.value = true;
	try {
		const list = await skillsStore.fetchSourceCredentials(parseScope(requestedScope));
		if (run !== credentialsRun) return;
		// The server lists only the credential types that its source clients read.
		credentials.value = list;
		const ids = credentials.value.map((credential) => credential.id);
		if (select && ids.includes(select)) {
			credentialId.value = select;
		} else if (!ids.includes(credentialId.value)) {
			// The account mode needs a credential, so it starts on the first one, as the prototype.
			credentialId.value = mode.value === 'account' ? (ids[0] ?? '') : '';
		}
	} catch (error) {
		if (run !== credentialsRun) return;
		credentials.value = [];
		credentialId.value = '';
		showError(error, i18n.baseText('settings.context.skills.connect.credential.error.load'));
	} finally {
		if (run === credentialsRun) credentialsLoading.value = false;
	}
}

async function loadRepositories() {
	resetRepositories();
	const id = credentialId.value;
	if (mode.value !== 'account' || step.value !== 'repository' || !id) return;
	const requestedScope = scope.value;
	const run = repositoriesRun;
	repositoriesLoading.value = true;
	try {
		const list = await skillsStore.fetchSourceRepositories({
			...parseScope(requestedScope),
			credentialId: id,
		});
		if (run !== repositoriesRun) return;
		repositories.value = list.repositories;
		repositoriesTruncated.value = list.truncated;
	} catch (error) {
		if (run !== repositoriesRun) return;
		linkError.value = discoverErrorText(
			error,
			undefined,
			'settings.context.skills.connect.repository.error.load',
		);
	} finally {
		if (run === repositoriesRun) repositoriesLoading.value = false;
	}
}

// The account mode lists the repositories of the chosen credential.
watch([credentialId, scope, mode, step], (next, previous) => {
	const nextStep = next[3];
	const prevStep = previous[3];
	// Going back from the skills to the repository keeps the owner and repository.
	if (nextStep === 'choose' || (prevStep === 'choose' && nextStep === 'repository')) return;
	void loadRepositories();
});

const owners = computed(() => [
	...new Set(repositories.value.map((repository) => repository.owner)),
]);

const ownerRepositories = computed(() =>
	repositories.value.filter((repository) => repository.owner === owner.value),
);

const selectedRepository = computed(() =>
	ownerRepositories.value.find((repository) => repository.name === repositoryName.value),
);

function onOwnerChange(value: string) {
	owner.value = value;
	repositoryName.value = '';
}

/** The link that discover reads: the pasted one, or the one of the picked repository. */
const sourceUrl = computed(() =>
	mode.value === 'url' ? url.value.trim() : (selectedRepository.value?.url ?? ''),
);

function startMode(next: Mode) {
	mode.value = next;
	step.value = 'repository';
	credentialId.value = '';
	createdCredential.value = null;
	void loadCredentials();
}

function onScopeChange(value: string) {
	scope.value = value;
	credentialId.value = '';
	createdCredential.value = null;
	if (step.value === 'repository') void loadCredentials();
}

const credentialModalOpen = computed(
	() => uiStore.isModalActiveById?.[CREDENTIAL_EDIT_MODAL_KEY] ?? false,
);

function openCredentialModal(type: TokenCredentialType) {
	const project = credentialProject.value;
	if (!project || !canCreateCredential.value) return;
	const requestedScope = scope.value;
	const scopeLabel =
		parseScope(requestedScope).scope === 'instance'
			? i18n.baseText('settings.context.skills.connect.credential.created.personal')
			: (selectedScope.value?.label ?? '');
	uiStore.openNewCredential(type, false, false, project.id, undefined, undefined, undefined, {
		hideAskAssistant: true,
		appendToBody: true,
		closeOnSave: true,
		onCredentialCreated: (credential) => {
			void onCredentialCreated(credential.id, requestedScope, scopeLabel);
		},
	});
}

async function onCredentialCreated(id: string, requestedScope: string, scopeLabel: string) {
	// The user may have closed the dialog or picked another scope while the modal was open.
	if (!props.open || step.value !== 'repository' || requestedScope !== scope.value) return;
	await loadCredentials(id);
	if (credentialId.value === id) createdCredential.value = { id, scopeLabel };
}

function onCredentialSelect(value: string) {
	if (value.startsWith(NEW_CREDENTIAL_PREFIX)) {
		const type = TOKEN_CREDENTIAL_TYPES.find(
			(known) => known === value.slice(NEW_CREDENTIAL_PREFIX.length),
		);
		if (type) openCredentialModal(type);
		return;
	}
	credentialId.value = value;
	createdCredential.value = null;
}

const duplicate = computed(() => discovery.value?.duplicate ?? { kind: 'none' as const });

const duplicateMessage = computed(() => {
	const dup = duplicate.value;
	const repo = discovery.value?.source.label ?? '';
	if (dup.kind === 'blocked') {
		return dup.where === 'global'
			? i18n.baseText('settings.context.skills.connect.duplicate.global', {
					interpolate: { repo },
				})
			: i18n.baseText('settings.context.skills.connect.duplicate.scope', {
					interpolate: { repo, scope: selectedScope.value?.label ?? '' },
				});
	}
	if (dup.kind === 'warning') {
		return i18n.baseText('settings.context.skills.connect.duplicate.warning', {
			interpolate: { repo, projects: dup.projects.map((project) => project.name).join(', ') },
		});
	}
	return '';
});

const isBlocked = computed(() => duplicate.value.kind === 'blocked');

const canGoNext = computed(
	() =>
		!!sourceUrl.value &&
		!!scope.value &&
		(mode.value === 'url' || !!credentialId.value) &&
		!discovering.value &&
		!isBlocked.value,
);

function isSelectable(skill: DiscoveredSkill): boolean {
	return !skill.nameTaken && !skill.error && skill.check?.verdict !== 'blocked';
}

// The picked skills that the picker shows as needing review. A tick covers only these.
const needsReviewKeys = computed(
	() =>
		discovery.value?.skills
			.filter(
				(skill) => selected.value.includes(skill.key) && skill.check?.verdict === 'needs_review',
			)
			.map((skill) => skill.key) ?? [],
);

const needsReview = computed(() => needsReviewKeys.value.length > 0);

// A tick covers the warnings that the user saw, so it goes when no picked skill needs review.
watch(needsReview, (needed) => {
	if (!needed) reviewed.value = false;
});

const canAdd = computed(() => selected.value.length > 0 && (!needsReview.value || reviewed.value));

const CHECK_BADGES = {
	pass: { variant: 'success', label: 'settings.context.skills.connect.check.pass' },
	needs_review: { variant: 'warning', label: 'settings.context.skills.connect.check.needsReview' },
	blocked: { variant: 'danger', label: 'settings.context.skills.connect.check.blocked' },
} as const;

/**
 * The findings line of a skill. A SKILL.md that n8n cannot read is blocked, and its findings
 * name the cause, so they replace the read error.
 */
function checkFindings(skill: DiscoveredSkill): string {
	if (!skill.check || skill.nameTaken) return '';
	return findingsText(skill.check.findings);
}

/** The domains of a skill that can come in. A blocked row shows only why it is blocked. */
function linkedDomains(skill: DiscoveredSkill): string {
	if (!skill.check || skill.nameTaken || skill.check.verdict === 'blocked') return '';
	return linkedDomainsText(skill.check.findings);
}

async function onNext() {
	const link = sourceUrl.value;
	if (!GITHUB_LINK.test(link)) {
		linkError.value = reasonText(
			OTHER_HOST_LINK.test(link) ? 'unsupported_provider' : 'invalid_url',
		);
		return;
	}
	const requestedScope = scope.value;
	const requestedCredential = credentialId.value;
	const run = ++discoverRun;
	// The user may have changed the link, the scope or the credential, or closed the dialog,
	// while n8n read it.
	const isCurrent = () =>
		run === discoverRun &&
		link === sourceUrl.value &&
		requestedScope === scope.value &&
		requestedCredential === credentialId.value;
	const target = {
		url: link,
		...(requestedCredential ? { credentialId: requestedCredential } : {}),
	};
	discovering.value = true;
	try {
		const result = await skillsStore.discoverSource({ ...target, ...parseScope(requestedScope) });
		if (!isCurrent()) return;
		discovery.value = result;
		discovered.value = target;
		if (result.duplicate.kind === 'blocked') return;
		selected.value = result.skills.filter(isSelectable).map((skill) => skill.key);
		reviewed.value = false;
		step.value = 'choose';
	} catch (error) {
		if (isCurrent()) linkError.value = discoverErrorText(error, link);
	} finally {
		if (run === discoverRun) discovering.value = false;
	}
}

function onBack() {
	// A read still running answers for a step the user left, so it is dropped.
	discoverRun += 1;
	discovering.value = false;
	step.value = step.value === 'choose' ? 'repository' : 'start';
}

function toggle(key: string, checked: boolean) {
	selected.value = checked
		? [...selected.value, key]
		: selected.value.filter((selectedKey) => selectedKey !== key);
}

const sourceLine = computed(() => {
	const source = discovery.value?.source;
	if (!source) return '';
	return [source.label, source.ref, source.path].filter(Boolean).join(' · ');
});

function nameTakenReason(skill: DiscoveredSkill): string {
	return i18n.baseText('settings.context.skills.connect.nameTaken.reason', {
		interpolate: { name: skill.name ?? skill.location, scope: selectedScope.value?.label ?? '' },
	});
}

/** How many skipped paths the list names before it only counts the rest. */
const SKIPPED_FILES_SHOWN = 3;

function skippedFilesText(skill: DiscoveredSkill): string {
	const count = skill.skippedFiles.length;
	const shown = skill.skippedFiles.slice(0, SKIPPED_FILES_SHOWN).join(', ');
	const files =
		count > SKIPPED_FILES_SHOWN
			? i18n.baseText('settings.context.skills.connect.skippedFiles.more', {
					interpolate: { files: shown, count: count - SKIPPED_FILES_SHOWN },
				})
			: shown;
	return i18n.baseText('settings.context.skills.connect.skippedFiles', {
		interpolate: { count, files },
		adjustToNumber: count,
	});
}

const addLabel = computed(() =>
	selected.value.length > 0
		? i18n.baseText('settings.context.skills.connect.addCount', {
				interpolate: { count: selected.value.length },
			})
		: i18n.baseText('generic.add'),
);

/** A skill that n8n could not read has no name in the answer, so it gets the name in the list. */
function withSkillName(
	failure: SkillSourceConnectResponse['failed'][number],
): SkillSourceConnectResponse['failed'][number] {
	if (failure.name) return failure;
	const skill = discovery.value?.skills.find((item) => item.key === failure.key);
	return { ...failure, name: skill ? (skill.name ?? skill.location) : null };
}

async function onAdd() {
	const source = discovery.value?.source;
	const target = discovered.value;
	if (!source || !target || !canAdd.value) return;
	connecting.value = true;
	try {
		const response = await skillsStore.connectSource({
			...target,
			...parseScope(scope.value),
			skillKeys: selected.value,
			...(needsReview.value ? { reviewedSkillKeys: needsReviewKeys.value } : {}),
		});
		emit('connected', {
			response: { ...response, failed: response.failed.map(withSkillName) },
			sourceLabel: source.label,
			scopeLabel: selectedScope.value?.label ?? '',
		});
		emit('update:open', false);
	} catch (error) {
		// A known reason gets its own text, as on discover. Other errors keep their message.
		const hasReason = error instanceof ResponseError && error.meta?.reason !== undefined;
		showError(
			hasReason ? new Error(discoverErrorText(error)) : error,
			i18n.baseText('settings.context.skills.connect.error.connect'),
		);
	} finally {
		connecting.value = false;
	}
}

/**
 * The import runs on the server until it answers, so the dialog stays open until then. It
 * also stays open under the credential modal, which an Escape or a click there must not close.
 */
function onOpenChange(open: boolean) {
	if (!open && (connecting.value || credentialModalOpen.value)) return;
	emit('update:open', open);
}

function onInteractOutside(event: Event) {
	if (credentialModalOpen.value) event.preventDefault();
}

const title = computed(() => {
	if (step.value === 'start') return i18n.baseText('settings.context.skills.connect.start.title');
	if (step.value === 'choose') return i18n.baseText('settings.context.skills.connect.choose.title');
	return mode.value === 'account'
		? i18n.baseText('settings.context.skills.connect.repository.title')
		: i18n.baseText('settings.context.skills.connect.link.title');
});
</script>

<template>
	<N8nDialog
		:open="open"
		:header="title"
		size="large"
		:trap-focus="!credentialModalOpen"
		:disable-outside-pointer-events="!credentialModalOpen"
		data-test-id="skill-source-connect-dialog"
		@update:open="onOpenChange"
		@interact-outside="onInteractOutside"
	>
		<N8nDialogBody v-if="step === 'start'" :class="$style.body">
			<N8nText tag="p">
				{{ i18n.baseText('settings.context.skills.connect.start.description') }}
			</N8nText>
			<div :class="$style.start">
				<N8nButton
					icon="git-branch"
					:label="i18n.baseText('settings.context.skills.connect.start.github')"
					data-test-id="skill-source-mode-account"
					@click="startMode('account')"
				/>
				<N8nText color="text-light">
					{{ i18n.baseText('settings.context.skills.connect.start.or') }}
				</N8nText>
				<N8nButton
					variant="ghost"
					:label="i18n.baseText('settings.context.skills.connect.start.url')"
					data-test-id="skill-source-mode-url"
					@click="startMode('url')"
				/>
			</div>
		</N8nDialogBody>

		<N8nDialogBody v-else-if="step === 'repository'" :class="$style.body">
			<N8nCallout
				v-if="createdCredential && createdCredential.id === credentialId"
				theme="success"
				data-test-id="skill-source-credential-created"
			>
				{{
					i18n.baseText('settings.context.skills.connect.credential.created', {
						interpolate: { scope: createdCredential.scopeLabel },
					})
				}}
			</N8nCallout>
			<div :class="$style.field">
				<N8nInputLabel
					:label="i18n.baseText('settings.context.skills.connect.scope.label')"
					color="text-dark"
				>
					<N8nSelect
						:model-value="scope"
						size="large"
						:teleported="false"
						data-test-id="skill-source-scope-select"
						@update:model-value="onScopeChange"
					>
						<template v-if="selectedScope" #prefix>
							<N8nIcon :icon="selectedScope.icon" />
						</template>
						<N8nOption
							v-for="option in scopeOptions"
							:key="option.value"
							:value="option.value"
							:label="option.label"
						>
							<div :class="$style.option">
								<N8nIcon :icon="option.icon" />
								<span>{{ option.label }}</span>
							</div>
						</N8nOption>
					</N8nSelect>
				</N8nInputLabel>
				<N8nText size="small" color="text-light" data-test-id="skill-source-scope-hint">
					{{ scopeHint }}
				</N8nText>
			</div>
			<div v-if="mode === 'url'" :class="$style.field">
				<N8nInputLabel
					:label="i18n.baseText('settings.context.skills.connect.url.label')"
					color="text-dark"
				>
					<N8nInput
						v-model="url"
						size="large"
						:placeholder="i18n.baseText('settings.context.skills.connect.url.placeholder')"
						data-test-id="skill-source-url-input"
						@keydown.enter="canGoNext && onNext()"
					/>
				</N8nInputLabel>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('settings.context.skills.connect.url.hint') }}
				</N8nText>
			</div>
			<div :class="$style.field">
				<N8nInputLabel
					:label="i18n.baseText('settings.context.skills.connect.credential.label')"
					color="text-dark"
				>
					<N8nSelect
						:model-value="credentialId"
						size="large"
						:teleported="false"
						:loading="credentialsLoading"
						:placeholder="i18n.baseText('settings.context.skills.connect.credential.placeholder')"
						data-test-id="skill-source-credential-select"
						@update:model-value="onCredentialSelect"
					>
						<N8nOption
							v-if="mode === 'url'"
							value=""
							:label="i18n.baseText('settings.context.skills.connect.credential.none')"
						/>
						<N8nOption
							v-for="credential in credentials"
							:key="credential.id"
							:value="credential.id"
							:label="credential.name"
						/>
						<N8nOption
							v-for="option in newCredentialOptions"
							:key="option.value"
							:value="option.value"
							:label="option.label"
						/>
					</N8nSelect>
				</N8nInputLabel>
				<N8nText size="small" color="text-light" data-test-id="skill-source-credential-hint">
					{{ credentialHint }}
				</N8nText>
			</div>
			<template v-if="mode === 'account'">
				<div :class="$style.field">
					<N8nInputLabel
						:label="i18n.baseText('settings.context.skills.connect.owner.label')"
						color="text-dark"
					>
						<N8nSelect
							:model-value="owner"
							size="large"
							:teleported="false"
							:loading="repositoriesLoading"
							:disabled="!credentialId"
							:placeholder="i18n.baseText('settings.context.skills.connect.owner.placeholder')"
							:no-data-text="i18n.baseText('settings.context.skills.connect.repository.empty')"
							data-test-id="skill-source-owner-select"
							@update:model-value="onOwnerChange"
						>
							<N8nOption v-for="name in owners" :key="name" :value="name" :label="name" />
						</N8nSelect>
					</N8nInputLabel>
				</div>
				<div :class="$style.field">
					<N8nInputLabel
						:label="i18n.baseText('settings.context.skills.connect.repository.label')"
						color="text-dark"
					>
						<N8nSelect
							v-model="repositoryName"
							size="large"
							:teleported="false"
							:disabled="!owner"
							:placeholder="i18n.baseText('settings.context.skills.connect.repository.placeholder')"
							data-test-id="skill-source-repository-select"
						>
							<N8nOption
								v-for="repository in ownerRepositories"
								:key="repository.url"
								:value="repository.name"
								:label="repository.name"
							>
								<div :class="$style.option">
									<span>{{ repository.name }}</span>
									<N8nIcon
										v-if="repository.private"
										icon="lock"
										size="small"
										:title="i18n.baseText('settings.context.skills.connect.repository.private')"
									/>
								</div>
							</N8nOption>
						</N8nSelect>
					</N8nInputLabel>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('settings.context.skills.connect.repository.hint') }}
					</N8nText>
					<N8nText
						v-if="repositoriesTruncated"
						size="small"
						color="text-light"
						data-test-id="skill-source-repositories-truncated"
					>
						{{ i18n.baseText('settings.context.skills.connect.repository.truncated') }}
					</N8nText>
				</div>
			</template>
			<N8nCallout v-if="linkError" theme="danger" data-test-id="skill-source-link-error">
				{{ linkError }}
			</N8nCallout>
			<N8nCallout
				v-if="duplicateMessage"
				:theme="isBlocked ? 'danger' : 'warning'"
				data-test-id="skill-source-duplicate"
			>
				{{ duplicateMessage }}
			</N8nCallout>
		</N8nDialogBody>

		<N8nDialogBody v-else-if="discovery" :class="$style.body">
			<div :class="$style.source" data-test-id="skill-source-summary">
				<N8nIcon icon="git-branch" size="small" />
				<N8nText size="small" color="text-light">{{ sourceLine }}</N8nText>
			</div>
			<N8nCallout v-if="duplicateMessage" theme="warning" data-test-id="skill-source-duplicate">
				{{ duplicateMessage }}
			</N8nCallout>
			<ul :class="$style.list" data-test-id="skill-source-skills">
				<li
					v-for="item in discovery.skills"
					:key="item.key"
					:class="[$style.item, !isSelectable(item) && $style.disabled]"
					:data-test-id="`skill-source-skill-${item.key}`"
				>
					<N8nCheckbox
						:model-value="isSelectable(item) && selected.includes(item.key)"
						:disabled="!isSelectable(item)"
						:aria-label="item.name ?? item.location"
						data-test-id="skill-source-skill-checkbox"
						@update:model-value="toggle(item.key, $event)"
					/>
					<div :class="$style.itemText">
						<N8nText bold>{{ item.name ?? item.location }}</N8nText>
						<N8nText v-if="item.description" size="small" color="text-light">
							{{ item.description }}
						</N8nText>
						<N8nText
							v-if="item.skippedFiles.length > 0"
							size="small"
							color="text-light"
							data-test-id="skill-source-skill-skipped"
						>
							{{ skippedFilesText(item) }}
						</N8nText>
						<N8nText
							v-if="checkFindings(item)"
							size="small"
							:color="item.check?.verdict === 'blocked' ? 'danger' : 'warning'"
							data-test-id="skill-source-skill-findings"
						>
							{{ checkFindings(item) }}
						</N8nText>
						<N8nText
							v-if="linkedDomains(item)"
							size="small"
							color="text-light"
							data-test-id="skill-source-skill-domains"
						>
							{{ linkedDomains(item) }}
						</N8nText>
						<N8nText
							v-if="item.nameTaken"
							size="small"
							color="text-light"
							data-test-id="skill-source-skill-reason"
						>
							{{ nameTakenReason(item) }}
						</N8nText>
						<N8nText
							v-else-if="item.error && !checkFindings(item)"
							size="small"
							color="danger"
							data-test-id="skill-source-skill-reason"
						>
							{{ reasonText(item.error.reason) }}
						</N8nText>
					</div>
					<N8nBadge
						v-if="item.nameTaken"
						variant="subtle"
						data-test-id="skill-source-skill-name-taken"
					>
						{{ i18n.baseText('settings.context.skills.connect.nameTaken.tag') }}
					</N8nBadge>
					<N8nBadge
						v-else-if="item.check"
						:variant="CHECK_BADGES[item.check.verdict].variant"
						data-test-id="skill-source-skill-check"
					>
						{{ i18n.baseText(CHECK_BADGES[item.check.verdict].label) }}
					</N8nBadge>
				</li>
			</ul>
			<N8nText
				v-if="discovery.truncated"
				size="small"
				color="text-light"
				data-test-id="skill-source-truncated"
			>
				{{ reasonText('too_many_skills') }}
			</N8nText>
			<N8nText
				v-if="discovery.tooDeep"
				size="small"
				color="text-light"
				data-test-id="skill-source-too-deep"
			>
				{{ reasonText('too_deep') }}
			</N8nText>
			<div :class="$style.addTo">
				<N8nText size="small" bold>
					{{ i18n.baseText('settings.context.skills.connect.addTo') }}
				</N8nText>
				<N8nBadge v-if="selectedScope" variant="outline" data-test-id="skill-source-add-to">
					<template #leading>
						<N8nIcon :icon="selectedScope.icon" size="small" />
					</template>
					{{ selectedScope.label }}
				</N8nBadge>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('settings.context.skills.connect.addTo.hint') }}
				</N8nText>
			</div>
			<N8nCheckbox
				v-if="needsReview"
				v-model="reviewed"
				:label="i18n.baseText('settings.context.skills.connect.check.reviewed')"
				data-test-id="skill-source-reviewed-warnings"
			/>
		</N8nDialogBody>

		<N8nDialogFooter>
			<N8nButton
				v-if="step !== 'start'"
				variant="ghost"
				:label="i18n.baseText('generic.back')"
				:disabled="connecting"
				data-test-id="skill-source-back"
				@click="onBack"
			/>
			<span :class="$style.spacer" />
			<N8nButton
				variant="outline"
				:label="i18n.baseText('generic.cancel')"
				:disabled="connecting"
				data-test-id="skill-source-cancel"
				@click="onOpenChange(false)"
			/>
			<N8nButton
				v-if="step === 'repository'"
				:label="i18n.baseText('generic.next')"
				:disabled="!canGoNext"
				:loading="discovering"
				data-test-id="skill-source-next"
				@click="onNext"
			/>
			<N8nButton
				v-else-if="step === 'choose'"
				:label="addLabel"
				:disabled="!canAdd"
				:loading="connecting"
				data-test-id="skill-source-add"
				@click="onAdd"
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

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.start {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
}

.option {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.source {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	color: var(--color--text--tint-1);
}

.list {
	display: flex;
	flex-direction: column;
	max-height: 50vh;
	margin: 0;
	padding: 0;
	overflow-y: auto;
	list-style: none;
	border: var(--border);
	border-radius: var(--radius);
}

.item {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) var(--spacing--sm);

	& + & {
		border-top: var(--border);
	}
}

.disabled {
	opacity: 0.7;
}

.itemText {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.addTo {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
}

.spacer {
	flex: 1;
}
</style>
