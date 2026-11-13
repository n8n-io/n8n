<script lang="ts" setup>
import {
	isGitHubSkillSourceCredentialType,
	type DiscoveredSkill,
	type GitHubSkillSourceCredentialType,
	type SkillSourceConnectResponse,
	type SkillSourceCredentialOption,
	type SkillSourceDiscovery,
	type SkillSourceRepositoryOption,
} from '@n8n/api-types';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nCallout,
	N8nCheckbox,
	N8nCombobox2,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nIcon,
	N8nInputLabel,
	N8nSelect2,
	N8nText,
	type ComboboxItem,
	type SelectItem,
} from '@n8n/design-system';
import { getResourcePermissions } from '@n8n/permissions';
import { ResponseError } from '@n8n/rest-api-client';

import { useUIStore } from '@/app/stores/ui.store';
import type { AgentSkillModalScopeOption } from '@/features/agents/components/AgentSkillModal.vue';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useCredentialOAuth } from '@/features/credentials/composables/useCredentialOAuth';

import SkillSourceReview from './SkillSourceReview.vue';
import { useSkillsStore } from '../skills.store';
import { isSelectableSkill, sourceLineOf } from '../skillSourceReview.utils';
import { parseScope, useSkillSourceReasons } from '../skills.utils';

/** What the page needs to confirm an import: the answer, and the names it shows in the toast. */
export type SkillSourceConnected = {
	response: SkillSourceConnectResponse;
	/** The repository and branch, such as `acme/skills · main`. */
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
	openSource: [sourceId: string];
}>();

/** A loose check only: the server reads the link and answers with the exact reason. */
const GITHUB_LINK = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+([/?#].*)?$/i;
/** A web link to another host, such as GitLab. */
const OTHER_HOST_LINK = /^https?:\/\/(?!(www\.)?github\.com([/?#:]|$))[^\s/?#]+/i;

/** GitHub OAuth2 has a fixed scope with write access to the repositories of the account. */
const OAUTH2_CREDENTIAL_TYPE: GitHubSkillSourceCredentialType = 'githubOAuth2Api';

/** The options of the credential select that create a credential instead of picking one. */
const NEW_CREDENTIAL_PREFIX = '__new__:';
const newCredentialValue = (type: GitHubSkillSourceCredentialType) =>
	`${NEW_CREDENTIAL_PREFIX}${type}`;
const NEW_OAUTH2_CREDENTIAL = newCredentialValue(OAUTH2_CREDENTIAL_TYPE);
/** "None, the repository is public". The select needs a value for it. */
const NO_CREDENTIAL = '__none__';

/** What a value of the credential select asks for. */
type CredentialSelectAction =
	| { kind: 'none' }
	| { kind: 'new'; type: GitHubSkillSourceCredentialType }
	| { kind: 'pick'; id: string };

function parseCredentialSelect(value: string): CredentialSelectAction {
	if (value === NO_CREDENTIAL) return { kind: 'none' };
	if (!value.startsWith(NEW_CREDENTIAL_PREFIX)) return { kind: 'pick', id: value };
	const type = value.slice(NEW_CREDENTIAL_PREFIX.length);
	return isGitHubSkillSourceCredentialType(type) ? { kind: 'new', type } : { kind: 'none' };
}

/** The repository field also takes a link. `github.com/…` without a protocol gets one. */
function asLink(text: string): string | null {
	const value = text.trim();
	if (/^https?:\/\//i.test(value)) return value;
	if (/^(www\.)?github\.com\//i.test(value)) return `https://${value}`;
	return null;
}

function repositoryKey(repository: SkillSourceRepositoryOption): string {
	return `${repository.owner}/${repository.name}`;
}

const i18n = useI18n();
const { showError } = useToast();
const skillsStore = useSkillsStore();
const { reasonText } = useSkillSourceReasons();
const projectsStore = useProjectsStore();
const uiStore = useUIStore();
const credentialsStore = useCredentialsStore();
const credentialOAuth = useCredentialOAuth();

const step = ref<'repository' | 'review'>('repository');
const scope = ref('');
const discovering = ref(false);
const connecting = ref(false);
const linkError = ref('');
const discovery = ref<SkillSourceDiscovery | null>(null);
const selected = ref<string[]>([]);
/** The link and credential that the shown discovery read, which connect sends again. */
const discovered = ref<{ url: string; credentialId?: string } | null>(null);

/** `''` is "None, the repository is public". */
const credentialId = ref('');
const credentials = ref<SkillSourceCredentialOption[]>([]);
const credentialsLoading = ref(false);
/** The credential that the user created from this dialog, for the success box. */
const createdCredential = ref<{ id: string; scopeLabel: string } | null>(null);

const repositories = ref<SkillSourceRepositoryOption[]>([]);
const repositoriesTruncated = ref(false);
const repositoriesLoading = ref(false);
/** `owner/name` of a listed repository, or a link. */
const repository = ref('');
/** The text in the repository field, to offer a typed link as an option. */
const repositorySearch = ref('');

/** "I have reviewed the warnings", for the picked skills that need review. */
const reviewed = ref(false);
/** Counts the reads, so the answer of a read from before a change or a close is dropped. */
let discoverRun = 0;
let credentialsRun = 0;
let repositoriesRun = 0;
/** Counts the opens and closes, so a credential made for an earlier session is dropped. */
let dialogSession = 0;
/** A GitHub sign-in is open. The OAuth helper holds one at a time, so the select waits. */
const signingIn = ref(false);

function resetRepositories() {
	repositoriesRun += 1;
	repositories.value = [];
	repositoriesTruncated.value = false;
	repositoriesLoading.value = false;
}

/** A repository picked from the list stays only while the list of the credential has it. */
function keepRepositoryIn(list: SkillSourceRepositoryOption[]) {
	if (asLink(repository.value)) return;
	if (!list.some((option) => repositoryKey(option) === repository.value)) repository.value = '';
}

/**
 * The quick-connect check reads the credential types, which the settings page may not have.
 * The credential select waits for them, so "Sign in with GitHub" never opens the form by mistake.
 */
const credentialTypesLoading = ref(false);
async function loadCredentialTypes() {
	credentialTypesLoading.value = true;
	try {
		await credentialsStore.fetchCredentialTypes(false);
	} catch {
		// Without the types, "Sign in with GitHub" opens the credential form instead.
	} finally {
		credentialTypesLoading.value = false;
	}
}

watch(
	() => props.open,
	(open) => {
		dialogSession += 1;
		signingIn.value = false;
		if (!open) {
			// A GitHub sign-in that is still open belongs to this session, so it stops here.
			credentialOAuth.cancelAuthorize();
			return;
		}
		void loadCredentialTypes();
		discoverRun += 1;
		credentialsRun += 1;
		discovering.value = false;
		step.value = 'repository';
		scope.value = props.scopeOptions[0]?.value ?? '';
		linkError.value = '';
		discovery.value = null;
		discovered.value = null;
		selected.value = [];
		credentialId.value = '';
		credentials.value = [];
		credentialsLoading.value = false;
		createdCredential.value = null;
		repository.value = '';
		repositorySearch.value = '';
		resetRepositories();
		reviewed.value = false;
		void loadCredentials();
	},
	{ immediate: true },
);

onBeforeUnmount(() => credentialOAuth.cancelAuthorize());

// A new scope, credential or repository needs a new read, so the old answer and its
// messages go.
watch([scope, credentialId, repository], () => {
	linkError.value = '';
	discovery.value = null;
});

const selectedScope = computed(() =>
	props.scopeOptions.find((option) => option.value === scope.value),
);

const scopeItems = computed<SelectItem[]>(() =>
	props.scopeOptions.map((option) => ({
		value: option.value,
		label: option.label,
		icon: option.icon,
	})),
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

const credentialItems = computed<SelectItem[]>(() => [
	{ value: NO_CREDENTIAL, label: i18n.baseText('settings.context.skills.connect.credential.none') },
	...credentials.value.map((credential) => ({ value: credential.id, label: credential.name })),
	...(canCreateCredential.value
		? [
				{ type: 'separator' as const },
				{
					value: newCredentialValue('githubApi'),
					label: i18n.baseText('settings.context.skills.connect.credential.new'),
				},
				{
					value: newCredentialValue('githubAppApi'),
					label: i18n.baseText('settings.context.skills.connect.credential.newApp'),
				},
				{
					value: NEW_OAUTH2_CREDENTIAL,
					label: i18n.baseText('settings.context.skills.connect.credential.newOAuth2'),
				},
			]
		: []),
]);

const oauth2Picked = computed(
	() =>
		credentials.value.find((credential) => credential.id === credentialId.value)?.type ===
		OAUTH2_CREDENTIAL_TYPE,
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
		const ids = list.map((credential) => credential.id);
		if (select && ids.includes(select)) credentialId.value = select;
		else if (!ids.includes(credentialId.value)) credentialId.value = '';
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
	if (!id) {
		keepRepositoryIn([]);
		return;
	}
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
		keepRepositoryIn(list.repositories);
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

// The repository field lists every repository of the chosen credential, of all owners.
watch([credentialId, scope], async () => await loadRepositories());

const selectedRepository = computed(() =>
	repositories.value.find((option) => repositoryKey(option) === repository.value),
);

/** A typed link, and a link picked before, show as the first options of the list. */
const repositoryItems = computed<ComboboxItem[]>(() => {
	const links = new Set<string>();
	const typed = asLink(repositorySearch.value);
	if (typed) links.add(typed);
	if (!selectedRepository.value && asLink(repository.value)) links.add(repository.value);
	return [
		...[...links].map((link) => ({ value: link, label: link, icon: 'link' as const })),
		...repositories.value.map((option) => ({
			value: repositoryKey(option),
			label: repositoryKey(option),
		})),
	];
});

const repositoryPlaceholder = computed(() =>
	credentialId.value
		? i18n.baseText('settings.context.skills.connect.repository.placeholder')
		: i18n.baseText('settings.context.skills.connect.repository.placeholder.link'),
);

const repositoryEmptyText = computed(() => {
	if (!credentialId.value) {
		return i18n.baseText('settings.context.skills.connect.repository.noCredential');
	}
	return repositories.value.length === 0
		? i18n.baseText('settings.context.skills.connect.repository.empty')
		: i18n.baseText('settings.context.skills.connect.repository.noMatch');
});

function isPrivateRepository(key: string): boolean {
	return repositories.value.some((option) => repositoryKey(option) === key && option.private);
}

/** A typed link is the value at once, so the user can go on without a pick. */
function onRepositorySearch(term: string) {
	repositorySearch.value = term;
	const link = asLink(term);
	if (link) repository.value = link;
}

function onRepositoryChange(value: unknown) {
	repository.value = typeof value === 'string' ? value : '';
}

/** The link that discover reads: the one of the picked repository, or the typed one. */
const sourceUrl = computed(() => selectedRepository.value?.url ?? asLink(repository.value) ?? '');

function onScopeChange(value: string) {
	// The credential and the repository stay when the new scope can use them.
	scope.value = value;
	createdCredential.value = null;
	void loadCredentials();
}

const credentialModalOpen = computed(
	() => uiStore.isModalActiveById?.[CREDENTIAL_EDIT_MODAL_KEY] ?? false,
);

/** Where a credential made from this dialog goes, and what its success box says. */
type NewCredentialTarget = {
	projectId: string;
	requestedScope: string;
	scopeLabel: string;
	session: number;
};

function newCredentialTarget(): NewCredentialTarget | null {
	const project = credentialProject.value;
	if (!project || !canCreateCredential.value) return null;
	const requestedScope = scope.value;
	const scopeLabel =
		parseScope(requestedScope).scope === 'instance'
			? i18n.baseText('settings.context.skills.connect.credential.created.personal')
			: (selectedScope.value?.label ?? '');
	return { projectId: project.id, requestedScope, scopeLabel, session: dialogSession };
}

function openCredentialModal(type: GitHubSkillSourceCredentialType, target: NewCredentialTarget) {
	uiStore.openNewCredential(type, false, false, target.projectId, undefined, undefined, undefined, {
		hideAskAssistant: true,
		appendToBody: true,
		closeOnSave: true,
		onCredentialCreated: (credential) => {
			void onCredentialCreated(credential.id, target);
		},
	});
}

async function onCredentialCreated(id: string, target: NewCredentialTarget) {
	// The user may have closed or reopened the dialog, or picked another scope, in the meantime.
	if (
		!props.open ||
		target.session !== dialogSession ||
		step.value !== 'repository' ||
		target.requestedScope !== scope.value
	) {
		return;
	}
	await loadCredentials(id);
	if (credentialId.value === id) createdCredential.value = { id, scopeLabel: target.scopeLabel };
}

/**
 * With a managed GitHub OAuth2 app on the instance, n8n creates the credential and opens the
 * GitHub sign-in at once, with no credential form. Call this in the select handler, so that the
 * browser allows the popup.
 */
async function signInWithGitHub(target: NewCredentialTarget) {
	if (signingIn.value) return;
	signingIn.value = true;
	try {
		const credential = await credentialOAuth.createAndAuthorize(OAUTH2_CREDENTIAL_TYPE, undefined, {
			projectId: target.projectId,
		});
		if (credential) await onCredentialCreated(credential.id, target);
	} finally {
		// A close or a new open already reset the flag for the next session.
		if (target.session === dialogSession) signingIn.value = false;
	}
}

function createCredential(type: GitHubSkillSourceCredentialType) {
	const target = newCredentialTarget();
	if (!target) return;
	if (
		type === OAUTH2_CREDENTIAL_TYPE &&
		credentialOAuth.canOAuthCredentialQuickConnect(OAUTH2_CREDENTIAL_TYPE)
	) {
		void signInWithGitHub(target);
	} else {
		openCredentialModal(type, target);
	}
}

function onCredentialSelect(value: string) {
	const action = parseCredentialSelect(value);
	if (action.kind === 'new') {
		createCredential(action.type);
		return;
	}
	credentialId.value = action.kind === 'pick' ? action.id : '';
	createdCredential.value = null;
}

const sourceLine = computed(() => (discovery.value ? sourceLineOf(discovery.value.source) : ''));

const duplicate = computed(() => discovery.value?.duplicate ?? { kind: 'none' as const });

const isBlocked = computed(() => duplicate.value.kind === 'blocked');
const duplicateSourceId = computed(() =>
	duplicate.value.kind === 'blocked' ? duplicate.value.sourceId : null,
);

/** A repository that is already connected in Global or in the scope is an error of the field. */
const duplicateError = computed(() => {
	const dup = duplicate.value;
	if (dup.kind !== 'blocked') return '';
	const repo = sourceLine.value;
	return dup.where === 'global'
		? i18n.baseText('settings.context.skills.connect.duplicate.global', {
				interpolate: { repo },
			})
		: i18n.baseText('settings.context.skills.connect.duplicate.scope', {
				interpolate: { repo, scope: selectedScope.value?.label ?? '' },
			});
});

const canGoNext = computed(
	() => !!sourceUrl.value && !!scope.value && !discovering.value && !isBlocked.value,
);

// The picked skills that the review shows as needing review. A tick covers only these.
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

const canImport = computed(
	() => selected.value.length > 0 && (!needsReview.value || reviewed.value),
);

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
		selected.value = result.skills.filter(isSelectableSkill).map((skill) => skill.key);
		reviewed.value = false;
		step.value = 'review';
	} catch (error) {
		if (isCurrent()) linkError.value = discoverErrorText(error, link);
	} finally {
		if (run === discoverRun) discovering.value = false;
	}
}

function onBack() {
	discoverRun += 1;
	discovering.value = false;
	step.value = 'repository';
}

/** The scope of a source in the other projects that the user can see. It does not block. */
const alsoConnected = computed(() => {
	const dup = duplicate.value;
	if (dup.kind !== 'warning') return '';
	return i18n.baseText('settings.context.skills.connect.duplicate.warning', {
		interpolate: { projects: dup.projects.map((project) => project.name).join(', ') },
	});
});

/** The import button names the scope, so the review needs no "Add to" line. */
const importLabel = computed(() => {
	const count = selected.value.length;
	return parseScope(scope.value).scope === 'instance'
		? i18n.baseText('settings.context.skills.connect.importGlobal', {
				interpolate: { count },
				adjustToNumber: count,
			})
		: i18n.baseText('settings.context.skills.connect.importProject', {
				interpolate: { count, project: selectedScope.value?.label ?? '' },
				adjustToNumber: count,
			});
});

/** A skill that n8n could not read has no name in the answer, so it gets the name in the list. */
function withSkillName(
	failure: SkillSourceConnectResponse['failed'][number],
): SkillSourceConnectResponse['failed'][number] {
	if (failure.name) return failure;
	const skill = discovery.value?.skills.find((item: DiscoveredSkill) => item.key === failure.key);
	return { ...failure, name: skill ? (skill.name ?? skill.location) : null };
}

async function onImport() {
	const target = discovered.value;
	if (!discovery.value || !target || !canImport.value) return;
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
			sourceLabel: sourceLine.value,
			scopeLabel: selectedScope.value?.label ?? '',
		});
		emit('update:open', false);
	} catch (error) {
		// A known reason gets its own text. The raw message of any other error stays out of the UI.
		showError(
			new Error(
				discoverErrorText(error, undefined, 'settings.context.skills.connect.error.connectFailed'),
			),
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
</script>

<template>
	<N8nDialog
		:open="open"
		:header="i18n.baseText('settings.context.skills.connect.title')"
		:size="step === 'review' ? 'full' : 'xlarge'"
		:container-class="step === 'review' ? $style.wide : undefined"
		:trap-focus="!credentialModalOpen"
		:disable-outside-pointer-events="!credentialModalOpen"
		data-test-id="skill-source-connect-dialog"
		@update:open="onOpenChange"
		@interact-outside="onInteractOutside"
	>
		<N8nDialogBody v-if="step === 'repository'" :class="$style.body">
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
					<N8nSelect2
						:model-value="scope"
						:items="scopeItems"
						size="large"
						data-test-id="skill-source-scope-select"
						@update:model-value="onScopeChange(String($event ?? ''))"
					/>
				</N8nInputLabel>
				<N8nText size="small" color="text-light" data-test-id="skill-source-scope-hint">
					{{ scopeHint }}
				</N8nText>
			</div>
			<div :class="$style.field">
				<N8nInputLabel
					:label="i18n.baseText('settings.context.skills.connect.credential.label')"
					color="text-dark"
				>
					<N8nSelect2
						:model-value="credentialId || NO_CREDENTIAL"
						:items="credentialItems"
						size="large"
						:disabled="credentialsLoading || credentialTypesLoading || signingIn"
						data-test-id="skill-source-credential-select"
						@update:model-value="onCredentialSelect(String($event ?? ''))"
					>
						<template #item-label="{ item }">
							<span v-if="item.value === NEW_OAUTH2_CREDENTIAL" :class="$style.itemStack">
								<span>{{ item.label }}</span>
								<N8nText tag="span" size="small" color="warning">
									{{ i18n.baseText('settings.context.skills.connect.credential.newOAuth2.note') }}
								</N8nText>
							</span>
							<span v-else>{{ item.label }}</span>
						</template>
					</N8nSelect2>
				</N8nInputLabel>
				<N8nText size="small" color="text-light" data-test-id="skill-source-credential-hint">
					{{ credentialHint }}
				</N8nText>
				<N8nCallout v-if="oauth2Picked" theme="warning" data-test-id="skill-source-oauth-warning">
					{{ i18n.baseText('settings.context.skills.connect.credential.oauth2Warning') }}
				</N8nCallout>
			</div>
			<div :class="$style.field">
				<N8nInputLabel
					:label="i18n.baseText('settings.context.skills.connect.repository.label')"
					color="text-dark"
				>
					<N8nCombobox2
						:model-value="repository || undefined"
						:items="repositoryItems"
						size="large"
						clearable
						:loading="repositoriesLoading"
						:placeholder="repositoryPlaceholder"
						:empty-text="repositoryEmptyText"
						:aria-invalid="duplicateError ? 'true' : undefined"
						data-test-id="skill-source-repository-select"
						@update:model-value="onRepositoryChange"
						@update:search-term="onRepositorySearch"
					>
						<template #item-trailing="{ item }">
							<N8nIcon
								v-if="isPrivateRepository(item.value)"
								icon="lock"
								size="small"
								:title="i18n.baseText('settings.context.skills.connect.repository.private')"
							/>
						</template>
					</N8nCombobox2>
				</N8nInputLabel>
				<!-- The error takes the place of the hint, so the field shows one line under it. -->
				<N8nText
					v-if="duplicateError"
					size="small"
					color="danger"
					data-test-id="skill-source-duplicate"
				>
					{{ duplicateError }}
					<N8nButton
						v-if="duplicateSourceId"
						variant="ghost"
						size="small"
						:label="i18n.baseText('settings.context.skills.sources.view')"
						data-test-id="skill-source-view-existing"
						@click="emit('openSource', duplicateSourceId)"
					/>
				</N8nText>
				<N8nText v-else size="small" color="text-light">
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
			<N8nCallout v-if="linkError" theme="danger" data-test-id="skill-source-link-error">
				{{ linkError }}
			</N8nCallout>
		</N8nDialogBody>

		<N8nDialogBody v-else-if="discovery" :class="$style.body">
			<div :class="$style.source">
				<N8nText bold data-test-id="skill-source-summary">{{ sourceLine }}</N8nText>
				<N8nText
					v-if="alsoConnected"
					size="small"
					color="text-light"
					data-test-id="skill-source-also-connected"
				>
					{{ alsoConnected }}
				</N8nText>
			</div>
			<SkillSourceReview
				v-model:selected="selected"
				:discovery="discovery"
				:scope-label="selectedScope?.label ?? ''"
			/>
		</N8nDialogBody>

		<N8nDialogFooter :class="$style.footer">
			<N8nButton
				v-if="step === 'review'"
				variant="ghost"
				:label="i18n.baseText('generic.back')"
				:disabled="connecting"
				data-test-id="skill-source-back"
				@click="onBack"
			/>
			<N8nCheckbox
				v-if="step === 'review' && needsReview"
				v-model="reviewed"
				:label="i18n.baseText('settings.context.skills.connect.check.reviewed')"
				data-test-id="skill-source-reviewed-warnings"
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
				v-else
				:label="importLabel"
				:disabled="!canImport"
				:loading="connecting"
				data-test-id="skill-source-import"
				@click="onImport"
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

/* The OAuth2 option has a second line for its note. */
.itemStack {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.source {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.footer {
	align-items: center;
}

/* The review shows the skill list and the files side by side. */
.wide {
	--dialog--max-width: min(1200px, calc(100dvw - var(--spacing--lg)));
}

.spacer {
	flex: 1;
}
</style>
