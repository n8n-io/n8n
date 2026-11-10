<script lang="ts" setup>
import type {
	AgentSkill,
	DiscoveredSkill,
	SkillSourceConnectResponse,
	SkillSourceCredentialOption,
	SkillSourceDiscovery,
	SkillSourceMoreDiscovery,
	SkillSourceRepositoryOption,
} from '@n8n/api-types';
import { computed, ref, watch } from 'vue';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { I18nT } from 'vue-i18n';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nCallout,
	N8nCheckbox,
	N8nCombobox2,
	N8nDialog,
	N8nDialogBody,
	N8nDialogDescription,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nIcon,
	N8nInputLabel,
	N8nLink,
	N8nSelect2,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import type { ComboboxItem, IconOrEmoji, SelectItem, TabOptions } from '@n8n/design-system';
import { getResourcePermissions } from '@n8n/permissions';
import { ResponseError } from '@n8n/rest-api-client';

import { useUIStore } from '@/app/stores/ui.store';
import type { AgentSkillModalScopeOption } from '@/features/agents/components/AgentSkillModal.vue';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';

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
import { useSkillsStore } from '../skills.store';
import {
	PROJECT_SCOPE_PREFIX,
	parseScope,
	useSkillScopeDisplay,
	useSkillSourceReasons,
} from '../skills.utils';

/** What the page needs to confirm an import: the answer, and the names it shows in the toast. */
export type SkillSourceConnected = {
	response: SkillSourceConnectResponse;
	sourceLabel: string;
	scopeLabel: string;
};

const props = defineProps<{
	open: boolean;
	/** A connected source: the dialog adds more skills from it, in its own scope. */
	sourceId?: string;
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
/** The select cannot hold an empty value, so "None" uses this one. */
const NO_CREDENTIAL = '__none__';

/** The repository field takes a typed link too. `github.com/…` without a protocol gets one. */
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
const { reasonText, findingsText } = useSkillSourceReasons();
const projectsStore = useProjectsStore();
const uiStore = useUIStore();

const step = ref<'repository' | 'choose'>('repository');
const scope = ref('');
const discovering = ref(false);
const connecting = ref(false);
const linkError = ref('');
const discovery = ref<SkillSourceDiscovery | SkillSourceMoreDiscovery | null>(null);
/** Set while the dialog adds more skills from a connected source. */
const activeSourceId = ref<string>();
const { scopeDisplay } = useSkillScopeDisplay();
/** The decision for each skill that can come in, by key. */
const decisions = ref<Record<string, SkillDecision>>({});
/** The link and credential that the shown discovery read, which connect sends again. */
const discovered = ref<{ url: string; credentialId?: string } | null>(null);

/** `''` is "None": n8n reads a public repository without a credential. */
const credentialId = ref('');
const credentials = ref<SkillSourceCredentialOption[]>([]);
const credentialsLoading = ref(false);
/** The credential that the user created from this dialog, for the success box. */
const createdCredential = ref<{ id: string; scopeLabel: string } | null>(null);

const repositories = ref<SkillSourceRepositoryOption[]>([]);
const repositoriesTruncated = ref(false);
const repositoriesLoading = ref(false);
/** The `owner/name` of a listed repository, or a link that the user typed or pasted. */
const repository = ref('');
/** The text in the repository field, so a typed link can show as an option. */
const repositorySearch = ref('');

/** "I have reviewed the warnings", for the picked skills that need review. */
const reviewed = ref(false);
/** The picker tab, and the skill that the preview shows. */
const activeTab = ref<PickerTab>('review');
const previewKey = ref<string | null>(null);
/** Counts the reads of a link, so the answer of a read from before a close is dropped. */
let discoverRun = 0;
let credentialsRun = 0;
let repositoriesRun = 0;

function resetRepositories() {
	repositoriesRun += 1;
	repositories.value = [];
	repositoriesTruncated.value = false;
	repositoriesLoading.value = false;
	// A typed link does not depend on the list, so it stays.
	if (!asLink(repository.value)) repository.value = '';
}

watch(
	() => [props.open, props.sourceId] as const,
	([open, sourceId]) => {
		if (!open) return;
		activeSourceId.value = undefined;
		discoverRun += 1;
		credentialsRun += 1;
		discovering.value = false;
		step.value = 'repository';
		scope.value = props.scopeOptions[0]?.value ?? '';
		linkError.value = '';
		discovery.value = null;
		discovered.value = null;
		decisions.value = {};
		credentialId.value = '';
		credentials.value = [];
		credentialsLoading.value = false;
		createdCredential.value = null;
		repository.value = '';
		repositorySearch.value = '';
		resetRepositories();
		reviewed.value = false;
		previewKey.value = null;
		if (sourceId) void openMore(sourceId);
		else void loadCredentials();
	},
	{ immediate: true },
);

// A new scope, credential or repository needs a new read, so the old answer and its
// messages go.
watch([scope, credentialId, repository], () => {
	// Add more keeps the scope of its source, which it sets itself.
	if (activeSourceId.value) return;
	linkError.value = '';
	discovery.value = null;
});

/** The chosen scope. Add more shows the scope of its source, which the user may not create in. */
const selectedScope = computed(() => {
	const source = discovery.value?.source;
	if (source && 'scope' in source) {
		return {
			value: scope.value,
			...scopeDisplay(source),
		};
	}
	return props.scopeOptions.find((option) => option.value === scope.value);
});

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

/** Only an empty list needs to say which credentials the scope can use. */
const credentialHint = computed(() => {
	if (credentialsLoading.value || credentials.value.length > 0) return '';
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
			// The first credential lists the repositories at once. "None" is the fallback.
			credentialId.value = ids[0] ?? '';
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
	if (step.value !== 'repository' || !id) return;
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

// The repository field lists the repositories of the chosen credential.
watch([credentialId, scope, step], (next, previous) => {
	const nextStep = next[2];
	const prevStep = previous[2];
	// Going back from the skills to the repository keeps the repository.
	if (nextStep === 'choose' || (prevStep === 'choose' && nextStep === 'repository')) return;
	void loadRepositories();
});

const selectedRepository = computed(() =>
	repositories.value.find((option) => repositoryKey(option) === repository.value),
);

/** A typed link, and a link picked before, show as the first option of the list. */
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

/** A typed link is the value at once, so the user can go to Next without a pick. */
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

const scopeItems = computed<SelectItem[]>(() =>
	props.scopeOptions.map((option) => ({
		value: option.value,
		label: option.label,
		icon: option.icon,
	})),
);

function onScopeChange(value: string) {
	scope.value = value;
	credentialId.value = '';
	createdCredential.value = null;
	void loadCredentials();
}

const credentialItems = computed<SelectItem[]>(() => [
	{
		value: NO_CREDENTIAL,
		label: i18n.baseText('settings.context.skills.connect.credential.none'),
	},
	...credentials.value.map((credential) => ({ value: credential.id, label: credential.name })),
	...(newCredentialOptions.value.length > 0 ? [{ type: 'separator' as const }] : []),
	...newCredentialOptions.value,
]);

const credentialSelectValue = computed(() => credentialId.value || NO_CREDENTIAL);

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
	if (value === NO_CREDENTIAL) value = '';
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

const duplicate = computed(() =>
	discovery.value && 'duplicate' in discovery.value
		? discovery.value.duplicate
		: { kind: 'none' as const },
);

const duplicateMessage = computed(() => {
	const dup = duplicate.value;
	const repo = discovery.value?.source.label ?? '';
	if (dup.kind === 'warning') {
		return i18n.baseText('settings.context.skills.connect.duplicate.warning', {
			interpolate: { repo, projects: dup.projects.map((project) => project.name).join(', ') },
		});
	}
	return '';
});

const isBlocked = computed(() => duplicate.value.kind === 'blocked');

/** A repository that is already connected is an error of the repository field. */
const repositoryError = computed(() => {
	if (!isBlocked.value) return '';
	// The label is `owner/name`, and the field names the repository only.
	const label = discovery.value?.source.label ?? '';
	return i18n.baseText('settings.context.skills.connect.duplicate.blocked', {
		interpolate: { repo: label.split('/').pop() ?? label },
	});
});

const canGoNext = computed(
	() => !!sourceUrl.value && !!scope.value && !discovering.value && !isBlocked.value,
);

function isSelectable(skill: DiscoveredSkill): boolean {
	return !skill.nameTaken && !skill.error && skill.check?.verdict !== 'blocked';
}

/** The keys of the skills to import: the accepted ones that can come in. */
const selected = computed(
	() =>
		discovery.value?.skills
			.filter((skill) => isSelectable(skill) && decisions.value[skill.key] === 'accept')
			.map((skill) => skill.key) ?? [],
);

/** Every skill that can come in starts as accepted. */
function acceptSelectable(skills: DiscoveredSkill[]) {
	decisions.value = acceptAll(skills.filter(isSelectable).map((skill) => ({ id: skill.key })));
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

/**
 * The findings line of a skill. A SKILL.md that n8n cannot read is blocked, and its findings
 * name the cause, so they replace the read error.
 */
function checkFindings(skill: DiscoveredSkill): string {
	if (!skill.check || skill.nameTaken) return '';
	return findingsText(skill.check.findings);
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
		acceptSelectable(result.skills);
		selectTab(PICKER_TABS.find((tab) => skillsByTab.value[tab].length > 0) ?? 'ready');
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
	step.value = 'repository';
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

/**
 * Where the add button puts the skills, with the icon and name that the user knows: the globe for
 * Global, and the project's own icon and name for a project. A project without an icon keeps the
 * icon of its scope option.
 */
const addTarget = computed<{ icon: IconOrEmoji; project: string | null }>(() => {
	const fallback: IconOrEmoji = { type: 'icon', value: selectedScope.value?.icon ?? 'layers' };
	const target = parseScope(scope.value);
	if (target.scope === 'instance') return { icon: fallback, project: null };
	const label = selectedScope.value?.label ?? '';
	// The personal project is named after its owner, so the button uses the scope label.
	if (projectsStore.personalProject?.id === target.projectId) {
		return { icon: fallback, project: label };
	}
	const project = projectsStore.myProjects.find(({ id }) => id === target.projectId);
	return { icon: project?.icon ?? fallback, project: project?.name ?? label };
});

/** The import button names the scope, so the picker needs no separate "Add to" line. */
const addLabel = computed(() => {
	const count = selected.value.length;
	const { project } = addTarget.value;
	return project === null
		? i18n.baseText('settings.context.skills.connect.importGlobal', {
				interpolate: { count },
				adjustToNumber: count,
			})
		: i18n.baseText('settings.context.skills.connect.importProject', {
				interpolate: { count, project },
				adjustToNumber: count,
			});
});

/** A skill that n8n could not read has no name in the answer, so it gets the name in the list. */
function withSkillName(
	failure: SkillSourceConnectResponse['failed'][number],
): SkillSourceConnectResponse['failed'][number] {
	if (failure.name) return failure;
	const skill = discovery.value?.skills.find((item) => item.key === failure.key);
	return { ...failure, name: skill ? (skill.name ?? skill.location) : null };
}

/** Lists the skills of a connected source that are not imported yet. */
async function openMore(sourceId: string) {
	activeSourceId.value = sourceId;
	step.value = 'choose';
	discovery.value = null;
	decisions.value = {};
	reviewed.value = false;
	linkError.value = '';
	const run = ++discoverRun;
	discovering.value = true;
	try {
		const result = await skillsStore.discoverMore(sourceId);
		if (run !== discoverRun || !props.open) return;
		const { source } = result;
		scope.value =
			source.scope === 'instance' ? 'instance' : `${PROJECT_SCOPE_PREFIX}${source.projectId}`;
		discovery.value = result;
		acceptSelectable(result.skills);
		selectTab(PICKER_TABS.find((tab) => skillsByTab.value[tab].length > 0) ?? 'ready');
	} catch (error) {
		if (run === discoverRun && props.open) linkError.value = discoverErrorText(error);
	} finally {
		if (run === discoverRun) discovering.value = false;
	}
}

/** How many skills of the connected source are imported already. */
const alreadyAdded = computed(() => {
	const source = discovery.value?.source;
	return source && 'skillCount' in source ? source.skillCount : 0;
});

async function onAdd() {
	const source = discovery.value?.source;
	const target = discovered.value;
	const sourceId = activeSourceId.value;
	if (!source || (!target && !sourceId) || !canAdd.value) return;
	const picked = {
		skillKeys: selected.value,
		...(needsReview.value ? { reviewedSkillKeys: needsReviewKeys.value } : {}),
	};
	connecting.value = true;
	try {
		// A connected source adds to itself. A new link connects first.
		const response = sourceId
			? await skillsStore.addSourceSkills(sourceId, picked)
			: target
				? await skillsStore.connectSource({ ...target, ...parseScope(scope.value), ...picked })
				: null;
		if (!response) return;
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
	if (activeSourceId.value) return i18n.baseText('settings.context.skills.more.title');
	return step.value === 'choose'
		? i18n.baseText('settings.context.skills.connect.choose.title')
		: i18n.baseText('settings.context.skills.connect.start.title');
});

type PickerTab = 'review' | 'ready' | 'unavailable';

const PICKER_TABS: PickerTab[] = ['review', 'ready', 'unavailable'];

const PICKER_TAB_LABELS = {
	review: 'settings.context.skills.connect.tab.review',
	ready: 'settings.context.skills.connect.tab.ready',
	unavailable: 'settings.context.skills.connect.tab.unavailable',
} satisfies Record<PickerTab, BaseTextKey>;

function tabOf(skill: DiscoveredSkill): PickerTab {
	if (!isSelectable(skill)) return 'unavailable';
	return skill.check?.verdict === 'needs_review' ? 'review' : 'ready';
}

const skillsByTab = computed(() => {
	const tabs: Record<PickerTab, DiscoveredSkill[]> = { review: [], ready: [], unavailable: [] };
	for (const skill of discovery.value?.skills ?? []) tabs[tabOf(skill)].push(skill);
	return tabs;
});

/** A tab with no skills is not shown. */
const pickerTabs = computed<Array<TabOptions<PickerTab>>>(() =>
	PICKER_TABS.filter((tab) => skillsByTab.value[tab].length > 0).map((tab) => ({
		value: tab,
		label: i18n.baseText(PICKER_TAB_LABELS[tab], {
			interpolate: { count: skillsByTab.value[tab].length },
		}),
	})),
);

/** Marketplace entries in other repositories. n8n cannot import them, so the picker only names them. */
const externalPlugins = computed(() => discovery.value?.externalPlugins ?? []);

/** One entry for each name. The picker links a name to its repository when the entry has a link. */
const externalPluginLinks = computed(() => [
	...new Map(externalPlugins.value.map((plugin) => [plugin.name, plugin])).values(),
]);

/** A repository with no skills of its own, only entries that point to other repositories. */
const onlyExternalPlugins = computed(
	() =>
		!activeSourceId.value &&
		(discovery.value?.skills.length ?? 0) === 0 &&
		externalPlugins.value.length > 0,
);

/** A new tab previews its first skill, so the preview is never empty when a tab has skills. */
function selectTab(tab: PickerTab) {
	activeTab.value = tab;
	previewKey.value = skillsByTab.value[tab][0]?.key ?? null;
}

const previewSkill = computed(
	() => discovery.value?.skills.find((skill) => skill.key === previewKey.value) ?? null,
);

/** A skill that n8n cannot read has no name, so the row names its folder, not the full path. */
function skillTitle(skill: DiscoveredSkill): string {
	return skill.name ?? skill.location.split('/').filter(Boolean).pop() ?? skill.location;
}

type SkillGroup = { id: string; name: string; skills: DiscoveredSkill[] };

/**
 * The skills of the active tab by plugin, in the order the source lists them. A source without
 * plugins gives one group with no name, so the list shows no headers. Skills outside every
 * plugin come last, under "Other skills".
 */
const tabGroups = computed<SkillGroup[]>(() => {
	const skills = skillsByTab.value[activeTab.value];
	const hasPlugins = discovery.value?.skills.some((skill) => skill.group) ?? false;
	if (!hasPlugins) return skills.length > 0 ? [{ id: '', name: '', skills }] : [];
	const groups = new Map<string, SkillGroup>();
	const other: SkillGroup = {
		id: '',
		name: i18n.baseText('settings.context.skills.connect.ungrouped'),
		skills: [],
	};
	for (const skill of skills) {
		if (!skill.group) {
			other.skills.push(skill);
			continue;
		}
		const group = groups.get(skill.group.id) ?? { ...skill.group, skills: [] };
		group.skills.push(skill);
		groups.set(skill.group.id, group);
	}
	return [...groups.values(), ...(other.skills.length > 0 ? [other] : [])];
});

/** The skills of the active tab, as the review picker lists them. */
const groups = computed<SkillReviewGroup[]>(() =>
	tabGroups.value.map((group) => ({
		id: group.id,
		name: group.name,
		items: group.skills.map((skill) => ({
			id: skill.key,
			title: skillTitle(skill),
			subtitle: skill.description ?? undefined,
			// A skill that cannot come in has no menu to explain why, so its row says it.
			reason: activeTab.value === 'unavailable' ? unavailableReason(skill) || undefined : undefined,
			decidable: isSelectable(skill),
			statuses: skill.nameTaken
				? [{ kind: 'error', count: 1 }]
				: statusesOf(skill.check?.findings ?? [], !!skill.error),
		})),
	})),
);

const SEVERITY_ORDER = { blocked: 0, needs_review: 1, info: 2 } as const;

/** The most severe findings first. */
const previewFindings = computed(() =>
	[...(previewSkill.value?.check?.findings ?? [])].sort(
		(a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
	),
);

/** The findings without the left-out files, which the files view lists after the kept files. */
const previewChecks = computed(() =>
	previewFindings.value.filter((finding) => !isSkippedFileFinding(finding)),
);

const previewSkippedFiles = computed(() =>
	skippedFilesOf(
		previewSkill.value?.check?.findings ?? [],
		previewSkill.value?.skippedFiles,
		i18n.baseText('settings.context.skills.connect.skippedFiles.hint'),
	),
);

/** The previewed skill in the shape of the skill modal: the instructions without the frontmatter. */
const previewAgentSkill = computed<AgentSkill | null>(() => {
	const skill = previewSkill.value;
	if (!skill) return null;
	const main = skill.previewFiles.find((file) => file.path === 'SKILL.md');
	const text = main?.text ?? '';
	const instructions = main?.instructionsLine
		? text
				.split('\n')
				.slice(main.instructionsLine - 1)
				.join('\n')
		: text.replace(/^---\n[\s\S]*?\n---\n?/, '');
	return {
		name: skill.name ?? skill.location,
		description: skill.description ?? '',
		instructions: instructions.trim(),
		references: skill.previewFiles
			.filter((file) => file.path !== 'SKILL.md')
			.map((file) => ({ path: file.path, content: file.text })),
	};
});

/** Findings that are not in a file of the preview, such as a file that n8n leaves out. */
const outsideFindings = computed(() => {
	const files = new Set([
		'SKILL.md',
		...(previewAgentSkill.value?.references ?? []).map((reference) => reference.path),
	]);
	return previewChecks.value.filter((finding) => !finding.file || !files.has(finding.file));
});

/** The reason line of a row that cannot come in. */
function unavailableReason(skill: DiscoveredSkill): string {
	if (skill.nameTaken) return nameTakenReason(skill);
	return checkFindings(skill) || (skill.error ? reasonText(skill.error.reason) : '');
}
</script>

<template>
	<N8nDialog
		:open="open"
		:size="step === 'choose' ? 'full' : 'large'"
		:container-class="step === 'choose' ? $style.wideDialog : undefined"
		:trap-focus="!credentialModalOpen"
		:disable-outside-pointer-events="!credentialModalOpen"
		data-test-id="skill-source-connect-dialog"
		@update:open="onOpenChange"
		@interact-outside="onInteractOutside"
	>
		<SkillReviewHeader
			v-if="step === 'choose' && discovery"
			:title="title"
			:source="sourceLine"
			:tabs="pickerTabs"
			:active-tab="activeTab"
			@update:active-tab="selectTab"
		>
			<template v-if="activeSourceId" #details>
				<span aria-hidden="true">·</span>
				<span data-test-id="skill-source-already-added">
					{{
						i18n.baseText('settings.context.skills.more.alreadyAdded', {
							interpolate: { count: alreadyAdded },
						})
					}}
				</span>
			</template>
		</SkillReviewHeader>
		<N8nDialogHeader v-else>
			<div :class="$style.headerMain">
				<N8nDialogTitle>{{ title }}</N8nDialogTitle>
				<N8nDialogDescription v-if="step === 'repository'" :class="$style.description">
					{{ i18n.baseText('settings.context.skills.connect.start.description') }}
				</N8nDialogDescription>
			</div>
		</N8nDialogHeader>

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
						:model-value="credentialSelectValue"
						:items="credentialItems"
						size="large"
						:disabled="credentialsLoading"
						:placeholder="i18n.baseText('settings.context.skills.connect.credential.placeholder')"
						data-test-id="skill-source-credential-select"
						@update:model-value="onCredentialSelect(String($event ?? ''))"
					/>
				</N8nInputLabel>
				<N8nText
					v-if="credentialHint"
					size="small"
					color="text-light"
					data-test-id="skill-source-credential-hint"
				>
					{{ credentialHint }}
				</N8nText>
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
						:class="repositoryError && $style.inputInvalid"
						:aria-invalid="repositoryError ? 'true' : undefined"
						:aria-errormessage="repositoryError ? 'skill-source-repository-error' : undefined"
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
					v-if="repositoryError"
					id="skill-source-repository-error"
					size="small"
					color="danger"
					data-test-id="skill-source-duplicate"
				>
					{{ repositoryError }}
					<template v-if="duplicate.kind === 'blocked' && duplicate.sourceId">
						<span aria-hidden="true">·</span>
						<button
							type="button"
							:class="$style.inlineAction"
							data-test-id="skill-source-duplicate-add-more"
							@click="openMore(duplicate.sourceId)"
						>
							{{ i18n.baseText('settings.context.skills.more.title') }}
						</button>
					</template>
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
			<N8nCallout v-if="duplicateMessage" theme="warning" data-test-id="skill-source-duplicate">
				{{ duplicateMessage }}
			</N8nCallout>
		</N8nDialogBody>

		<!-- Add more reads the connected source before the picker can show. -->
		<N8nDialogBody
			v-else-if="activeSourceId && (discovering || linkError)"
			:class="[$style.body, $style.bodyWithTabs]"
		>
			<N8nText v-if="discovering" color="text-light" data-test-id="skill-source-more-loading">
				{{ i18n.baseText('settings.context.skills.more.loading') }}
			</N8nText>
			<template v-else>
				<N8nCallout theme="danger" data-test-id="skill-source-link-error">{{
					linkError
				}}</N8nCallout>
				<div>
					<N8nButton
						variant="outline"
						:label="i18n.baseText('generic.retry')"
						data-test-id="skill-source-more-retry"
						@click="openMore(activeSourceId)"
					/>
				</div>
			</template>
		</N8nDialogBody>

		<SkillReviewPicker
			v-else-if="discovery"
			v-model:preview-id="previewKey"
			v-model:decisions="decisions"
			:groups="groups"
			:can-decide="true"
		>
			<template v-if="duplicateMessage || discovery.groupingWarnings?.length" #before>
				<N8nCallout
					v-if="duplicateMessage"
					theme="warning"
					slim
					icon-size="small"
					data-test-id="skill-source-duplicate"
				>
					{{ duplicateMessage }}
				</N8nCallout>
				<N8nCallout
					v-if="discovery.groupingWarnings?.length"
					theme="warning"
					slim
					icon-size="small"
					data-test-id="skill-source-grouping-warning"
				>
					{{ i18n.baseText('settings.context.skills.connect.groupingWarning.title') }}.
					{{ i18n.baseText('settings.context.skills.connect.groupingWarning.description') }}.
					<N8nTooltip placement="bottom">
						<template #content>
							<p :class="$style.tooltipText">
								{{ i18n.baseText('settings.context.skills.connect.groupingWarning.details') }}
							</p>
							<ul :class="$style.tooltipList">
								<li v-for="path in discovery.groupingWarnings" :key="path">{{ path }}</li>
							</ul>
						</template>
						<span :class="$style.detailsTrigger" tabindex="0">
							{{ i18n.baseText('settings.context.skills.connect.viewDetails') }}
						</span>
					</N8nTooltip>
				</N8nCallout>
			</template>
			<template #empty>
				<N8nText size="small" color="text-light">
					<I18nT
						v-if="onlyExternalPlugins"
						keypath="settings.context.skills.connect.externalPlugins.only"
						scope="global"
					>
						<template #names>
							<template v-for="(plugin, index) in externalPluginLinks" :key="plugin.name">
								<template v-if="index > 0">, </template>
								<N8nLink
									v-if="plugin.url"
									:to="plugin.url"
									new-window
									size="small"
									theme="text"
									data-test-id="skill-source-external-plugin-link"
									>{{ plugin.name }}</N8nLink
								>
								<template v-else>{{ plugin.name }}</template>
							</template>
						</template>
					</I18nT>
					<template v-else>
						{{
							i18n.baseText(
								!activeSourceId
									? 'settings.context.skills.connect.noLocalSkills'
									: discovery.truncated || discovery.tooDeep
										? 'settings.context.skills.more.emptyLimited'
										: 'settings.context.skills.more.empty',
							)
						}}
					</template>
				</N8nText>
			</template>
			<!-- The same preview as the updates dialog: the files, with the left-out files at the
			     end, then the findings that are not in a file. -->
			<template v-if="previewSkill">
				<N8nCallout v-if="previewSkill.nameTaken" theme="info" slim icon-size="small">
					{{ nameTakenReason(previewSkill) }}
				</N8nCallout>
				<N8nCallout
					v-else-if="previewSkill.error && previewChecks.length === 0"
					theme="danger"
					slim
					icon-size="small"
				>
					{{ reasonText(previewSkill.error.reason) }}
				</N8nCallout>
				<SkillFilesView
					:skill="previewAgentSkill"
					:location="previewSkill.location"
					:web-url="previewSkill.webUrl"
					:skipped-files="previewSkippedFiles"
					:findings="previewChecks"
				/>
				<N8nCallout
					v-if="previewSkill.previewTruncated"
					theme="info"
					icon-size="small"
					slim
					data-test-id="skill-source-preview-truncated"
				>
					{{ i18n.baseText('settings.context.skills.connect.preview.truncated') }}
				</N8nCallout>
				<!-- A finding in a file shows in that file. The rest show here. -->
				<SkillFindingsList v-if="outsideFindings.length > 0" :findings="outsideFindings" />
				<div
					v-if="previewChecks.length === 0 && !previewSkill.error && !previewSkill.nameTaken"
					:class="$style.noIssues"
				>
					<N8nIcon icon="circle-check" color="success" size="small" />
					<N8nText size="small">
						{{ i18n.baseText('settings.context.skills.connect.preview.noIssues') }}
					</N8nText>
				</div>
			</template>
			<N8nText v-else-if="!onlyExternalPlugins" size="small" color="text-light">
				{{ i18n.baseText('settings.context.skills.connect.preview.empty') }}
			</N8nText>
			<template v-if="discovery.truncated || discovery.tooDeep" #after>
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
			</template>
		</SkillReviewPicker>

		<N8nDialogFooter>
			<N8nButton
				v-if="step === 'choose' && !activeSourceId"
				variant="ghost"
				:label="i18n.baseText('generic.back')"
				:disabled="connecting"
				data-test-id="skill-source-back"
				@click="onBack"
			/>
			<span :class="$style.spacer" />
			<!-- The close button cancels this step, so the review tick takes the place of Cancel. -->
			<N8nCheckbox
				v-if="step === 'choose' && needsReview"
				v-model="reviewed"
				:label="i18n.baseText('settings.context.skills.connect.check.reviewed')"
				:class="$style.reviewed"
				data-test-id="skill-source-reviewed-warnings"
			/>
			<N8nButton
				v-if="step === 'repository'"
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
				:disabled="!canAdd"
				:loading="connecting"
				data-test-id="skill-source-add"
				@click="onAdd"
			>
				<template #icon>
					<span v-if="addTarget.icon.type === 'emoji'" :class="$style.buttonEmoji">
						{{ addTarget.icon.value }}
					</span>
					<N8nIcon v-else :icon="addTarget.icon.value" :size="16" />
				</template>
				{{ addLabel }}
			</N8nButton>
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

/* One column, so the title, the description and the tabs stack beside the close button. */
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

/* A link-styled action inside an error line. */
.inlineAction {
	padding: 0;
	border: 0;
	background: transparent;
	color: inherit;
	font: inherit;
	text-decoration: underline;
	cursor: pointer;

	&:focus-visible {
		outline: var(--focus--border-width, 2px) solid var(--color--primary);
		outline-offset: 2px;
		border-radius: var(--radius);
	}
}

/* The class lands on the field box. It is doubled so it wins over the border of the field. */
.inputInvalid.inputInvalid {
	--input--border-color: var(--color--danger);
	--input--border-color--hover: var(--color--danger);
}

.bodyWithTabs {
	padding-block-start: var(--n8n-dialog-region--padding, var(--spacing--md));
}

/* The picker needs room for the list and a readable snippet. The class is doubled so it wins
   over the width of the `full` size, whatever order the styles load in. */
.wideDialog.wideDialog {
	--dialog--max-width: min(75rem, calc(100dvw - var(--spacing--lg)));
}

.previewHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
}

.previewPath {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.findings {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	margin: 0;
	padding: 0;
	list-style: none;
}

.finding {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);

	& + & {
		padding-top: var(--spacing--sm);
		border-top: var(--border);
	}
}

/* A finding with a line in the full view. Pointing at it marks its line. */
.findingLink {
	border-radius: var(--radius);
	cursor: pointer;

	&:focus-visible {
		outline: var(--focus--border-width, 2px) solid var(--color--primary);
		outline-offset: 2px;
	}
}

.findingActive {
	box-shadow: 0 0 0 1px var(--border-color--stronger);
}

.findingLine {
	white-space: nowrap;
}

.file {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding-top: var(--spacing--xs);
	border-top: var(--border);
}

.fileHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.fileBody {
	padding-block: 0;
}

/* The line of the finding that the user points at, in the list or in the full view. */
.lineActive {
	box-shadow: inset 2px 0 0 var(--text-color--subtler);
}

.line-needs_review.lineActive {
	box-shadow: inset 2px 0 0 var(--callout--icon-color--warning);
}

.line-blocked.lineActive {
	box-shadow: inset 2px 0 0 var(--callout--icon-color--danger);
}

.snippet {
	margin: 0;
	padding: var(--spacing--2xs) 0;
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);
	background-color: var(--background--subtle);
	border-radius: var(--radius);

	code {
		display: flex;
		flex-direction: column;
	}
}

.snippetLine {
	display: flex;
	padding-inline-end: var(--spacing--xs);
	color: var(--color--text--tint-1);
}

/* The line of the finding takes the colour of its callout, so the two read as one. */
.snippetLineMatch {
	color: var(--color--text);
}

.line-needs_review {
	background-color: var(--callout--color--background--warning);
}

.line-blocked {
	background-color: var(--callout--color--background--danger);
}

.line-info {
	background-color: var(--background--active);
}

.lineNumber {
	flex-shrink: 0;
	width: var(--spacing--xl);
	padding-inline-end: var(--spacing--2xs);
	color: var(--color--text--tint-1);
	text-align: right;
	user-select: none;
}

/* Long lines wrap. A run of hidden-character markers has no spaces, so it can break anywhere. */
.lineText {
	flex: 1;
	min-width: 0;
	padding-inline-start: var(--spacing--2xs);
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.mark {
	padding: 0 var(--spacing--5xs);
	color: inherit;
	border-radius: var(--radius--sm, 2px);
}

/* The match itself is stronger than its line. The callout border colours exist in both themes. */
.mark-needs_review {
	background-color: var(--callout--border-color--warning);
}

.mark-blocked {
	background-color: var(--callout--border-color--danger);
}

.mark-info {
	background-color: var(--color--foreground);
}

.tooltipList {
	margin: 0;
	padding-inline-start: var(--spacing--sm);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtle);
	overflow-wrap: anywhere;
}

.noIssues {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.tooltipText {
	margin: 0 0 var(--spacing--3xs);
}

.detailsTrigger {
	text-decoration: underline;
	cursor: help;
}

.reviewed {
	align-self: center;
	margin-inline-end: var(--spacing--xs);
}

.buttonEmoji {
	font-size: var(--font-size--sm);
	line-height: 1;
}

.spacer {
	flex: 1;
}
</style>
