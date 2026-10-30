<script lang="ts" setup>
import type {
	DiscoveredSkill,
	SkillScanFinding,
	SkillScanLocation,
	SkillScanPart,
	SkillSourceConnectResponse,
	SkillSourceCredentialOption,
	SkillSourceDiscovery,
	SkillSourceRepositoryOption,
} from '@n8n/api-types';
import { computed, ref, watch } from 'vue';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
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
	N8nInput,
	N8nInputLabel,
	N8nSelect2,
	N8nTabs,
	N8nText,
} from '@n8n/design-system';
import type { ComboboxItem, IconOrEmoji, SelectItem, TabOptions } from '@n8n/design-system';
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
/** The select cannot hold an empty value, so "None, the repository is public" uses this one. */
const NO_CREDENTIAL = '__none__';

type Mode = 'account' | 'url';

const i18n = useI18n();
const { showError } = useToast();
const skillsStore = useSkillsStore();
const { reasonText, findingsText, ruleText } = useSkillSourceReasons();
const projectsStore = useProjectsStore();
const uiStore = useUIStore();

const step = ref<'repository' | 'choose'>('repository');
const mode = ref<Mode>('account');
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
		step.value = 'repository';
		mode.value = 'account';
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
		previewKey.value = null;
		void loadCredentials();
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

const ownerItems = computed<ComboboxItem[]>(() =>
	owners.value.map((name) => ({ value: name, label: name })),
);

const ownerRepositories = computed(() =>
	repositories.value.filter((repository) => repository.owner === owner.value),
);

const repositoryItems = computed<ComboboxItem[]>(() =>
	ownerRepositories.value.map((repository) => ({
		value: repository.name,
		label: repository.name,
	})),
);

function isPrivateRepository(name: string): boolean {
	return ownerRepositories.value.some(
		(repository) => repository.name === name && repository.private,
	);
}

function comboboxValue(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

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

const modeTabs = computed<Array<TabOptions<Mode>>>(() => [
	{ label: i18n.baseText('settings.context.skills.connect.tab.github'), value: 'account' },
	{ label: i18n.baseText('settings.context.skills.connect.tab.url'), value: 'url' },
]);

/** Both tabs share the scope and the credential. Only the GitHub tab needs a credential. */
function onModeChange(next: Mode) {
	mode.value = next;
	if (next === 'account' && !credentialId.value) {
		credentialId.value = credentials.value[0]?.id ?? '';
	}
}

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
	...(mode.value === 'url'
		? [
				{
					value: NO_CREDENTIAL,
					label: i18n.baseText('settings.context.skills.connect.credential.none'),
				},
			]
		: []),
	...credentials.value.map((credential) => ({ value: credential.id, label: credential.name })),
	...(newCredentialOptions.value.length > 0 ? [{ type: 'separator' as const }] : []),
	...newCredentialOptions.value,
]);

const credentialSelectValue = computed(() => {
	if (credentialId.value) return credentialId.value;
	return mode.value === 'url' ? NO_CREDENTIAL : undefined;
});

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
		selected.value = result.skills.filter(isSelectable).map((skill) => skill.key);
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

const title = computed(() =>
	step.value === 'choose'
		? i18n.baseText('settings.context.skills.connect.choose.title')
		: i18n.baseText('settings.context.skills.connect.start.title'),
);

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

/** A new tab previews its first skill, so the preview is never empty when a tab has skills. */
function selectTab(tab: PickerTab) {
	activeTab.value = tab;
	previewKey.value = skillsByTab.value[tab][0]?.key ?? null;
}

const previewSkill = computed(
	() => discovery.value?.skills.find((skill) => skill.key === previewKey.value) ?? null,
);

const SEVERITY_ORDER = { blocked: 0, needs_review: 1, info: 2 } as const;

/** The callout of a finding. The icon repeats the severity, so it does not rely on colour alone. */
const SEVERITY_CALLOUTS = {
	blocked: { theme: 'danger', icon: 'circle-x' },
	needs_review: { theme: 'warning', icon: 'triangle-alert' },
	info: { theme: 'info', icon: 'circle-alert' },
} as const;

/** The most severe findings first. */
const previewFindings = computed(() =>
	[...(previewSkill.value?.check?.findings ?? [])].sort(
		(a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
	),
);

const PART_LABELS = {
	name: 'settings.context.skills.connect.preview.part.name',
	description: 'settings.context.skills.connect.preview.part.description',
	frontmatter: 'settings.context.skills.connect.preview.part.frontmatter',
	instructions: 'settings.context.skills.connect.preview.part.instructions',
} satisfies Record<SkillScanPart, BaseTextKey>;

/** Only multi-line texts have useful line numbers: the instructions and the reference files. */
function hasLineNumbers(location: SkillScanLocation): boolean {
	return !location.part || location.part === 'instructions';
}

/**
 * Where a finding is, such as "SKILL.md (instructions)". The snippet gutter already shows the
 * line, so this text does not repeat it.
 */
function locationText(finding: SkillScanFinding): string {
	const file = finding.file ?? '';
	const part = finding.location?.part;
	if (!part) return file;
	return i18n.baseText('settings.context.skills.connect.preview.locationPartOnly', {
		interpolate: { file, part: i18n.baseText(PART_LABELS[part]) },
	});
}

/** The callout text of a finding, such as "Hidden Unicode characters in references/files.md". */
function findingTitle(finding: SkillScanFinding): string {
	const name = ruleText(finding.rule);
	if (!finding.file) return name;
	return i18n.baseText('settings.context.skills.connect.check.findingInFile', {
		interpolate: { finding: name, file: locationText(finding) },
	});
}

/** The snippet lines, with the finding split out of its line so the template can mark it. */
function snippetRows(location: SkillScanLocation) {
	return location.snippet.map(({ line, text }) =>
		line === location.line
			? {
					line,
					isMatch: true,
					before: text.slice(0, location.start),
					match: text.slice(location.start, location.end),
					after: text.slice(location.end),
				}
			: { line, isMatch: false, before: text, match: '', after: '' },
	);
}

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
		<N8nDialogHeader :class="$style.headerWithTabs">
			<div :class="$style.headerMain">
				<N8nDialogTitle>{{ title }}</N8nDialogTitle>
				<template v-if="step === 'choose' && discovery">
					<N8nDialogDescription :class="[$style.description, $style.source]">
						<N8nIcon icon="git-branch" size="small" />
						<span data-test-id="skill-source-summary">{{ sourceLine }}</span>
					</N8nDialogDescription>
					<N8nTabs
						:model-value="activeTab"
						:options="pickerTabs"
						:class="$style.tabs"
						data-test-id="skill-source-picker-tabs"
						@update:model-value="selectTab"
					/>
				</template>
				<template v-else-if="step === 'repository'">
					<N8nDialogDescription :class="$style.description">
						{{ i18n.baseText('settings.context.skills.connect.start.description') }}
					</N8nDialogDescription>
					<N8nTabs
						:model-value="mode"
						:options="modeTabs"
						:class="$style.tabs"
						data-test-id="skill-source-mode-tabs"
						@update:model-value="onModeChange"
					/>
				</template>
			</div>
		</N8nDialogHeader>

		<N8nDialogBody v-if="step === 'repository'" :class="[$style.body, $style.bodyWithTabs]">
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
				<N8nText size="small" color="text-light" data-test-id="skill-source-credential-hint">
					{{ credentialHint }}
				</N8nText>
			</div>
			<!-- Both panels share one grid cell, so the dialog keeps the height of the taller tab. -->
			<div :class="$style.panels">
				<div
					:class="[$style.panel, mode !== 'account' && $style.panelHidden]"
					data-test-id="skill-source-panel-account"
				>
					<div :class="$style.field">
						<N8nInputLabel
							:label="i18n.baseText('settings.context.skills.connect.owner.label')"
							color="text-dark"
						>
							<N8nCombobox2
								:model-value="owner || undefined"
								:items="ownerItems"
								size="large"
								:loading="repositoriesLoading"
								:disabled="!credentialId"
								:placeholder="i18n.baseText('settings.context.skills.connect.owner.placeholder')"
								:empty-text="i18n.baseText('settings.context.skills.connect.repository.empty')"
								data-test-id="skill-source-owner-select"
								@update:model-value="onOwnerChange(comboboxValue($event))"
							/>
						</N8nInputLabel>
					</div>
					<div :class="$style.field">
						<N8nInputLabel
							:label="i18n.baseText('settings.context.skills.connect.repository.label')"
							color="text-dark"
						>
							<N8nCombobox2
								:model-value="repositoryName || undefined"
								:items="repositoryItems"
								size="large"
								:disabled="!owner"
								:placeholder="
									i18n.baseText('settings.context.skills.connect.repository.placeholder')
								"
								data-test-id="skill-source-repository-select"
								@update:model-value="repositoryName = comboboxValue($event)"
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
				</div>
				<div
					:class="[$style.panel, mode !== 'url' && $style.panelHidden]"
					data-test-id="skill-source-panel-url"
				>
					<div :class="$style.field">
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
				</div>
			</div>
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

		<N8nDialogBody v-else-if="discovery" :class="[$style.body, $style.bodyWithTabs]">
			<N8nCallout v-if="duplicateMessage" theme="warning" data-test-id="skill-source-duplicate">
				{{ duplicateMessage }}
			</N8nCallout>
			<div :class="$style.picker">
				<ul :class="$style.list" data-test-id="skill-source-skills">
					<li
						v-for="item in skillsByTab[activeTab]"
						:key="item.key"
						:class="[
							$style.item,
							previewKey === item.key && $style.itemActive,
							!isSelectable(item) && $style.disabled,
						]"
						role="button"
						tabindex="0"
						:aria-pressed="previewKey === item.key"
						:data-test-id="`skill-source-skill-${item.key}`"
						@click="previewKey = item.key"
						@keydown.enter.self.prevent="previewKey = item.key"
						@keydown.space.self.prevent="previewKey = item.key"
					>
						<!-- The checkbox picks the skill. The rest of the row only previews it. -->
						<span :class="$style.checkboxCell" @click.stop @keydown.stop>
							<N8nCheckbox
								:model-value="isSelectable(item) && selected.includes(item.key)"
								:disabled="!isSelectable(item)"
								:aria-label="item.name ?? item.location"
								data-test-id="skill-source-skill-checkbox"
								@update:model-value="toggle(item.key, $event)"
							/>
						</span>
						<div :class="$style.itemText">
							<N8nText bold>{{ item.name ?? item.location }}</N8nText>
							<N8nText
								v-if="item.description"
								size="small"
								color="text-light"
								:class="$style.clamp"
							>
								{{ item.description }}
							</N8nText>
							<!-- A skill that cannot come in has no checkbox to explain why, so its row says it. -->
							<N8nText
								v-if="activeTab === 'unavailable' && unavailableReason(item)"
								size="small"
								color="danger"
								data-test-id="skill-source-skill-reason"
							>
								{{ unavailableReason(item) }}
							</N8nText>
						</div>
					</li>
				</ul>

				<section :class="$style.preview" data-test-id="skill-source-preview">
					<template v-if="previewSkill">
						<!-- The highlighted row names the skill, so the preview names only its folder. -->
						<div :class="$style.previewHeader">
							<div :class="$style.previewPath">
								<N8nIcon icon="folder-open" size="medium" color="text-light" />
								<N8nText size="medium" color="text-light">{{ previewSkill.location }}</N8nText>
							</div>
							<N8nButton
								variant="ghost"
								size="medium"
								:href="previewSkill.webUrl"
								target="_blank"
								data-test-id="skill-source-preview-open"
							>
								<template #icon><N8nIcon icon="external-link" :size="16" /></template>
								{{ i18n.baseText('settings.context.skills.synced.openInGithub') }}
							</N8nButton>
						</div>
						<N8nCallout v-if="previewSkill.nameTaken" theme="info">
							{{ nameTakenReason(previewSkill) }}
						</N8nCallout>
						<N8nCallout
							v-else-if="previewSkill.error && previewFindings.length === 0"
							theme="danger"
						>
							{{ reasonText(previewSkill.error.reason) }}
						</N8nCallout>
						<N8nText
							v-if="previewSkill.skippedFiles.length > 0"
							size="small"
							color="text-light"
							data-test-id="skill-source-skill-skipped"
						>
							{{ skippedFilesText(previewSkill) }}
						</N8nText>
						<div
							v-if="previewFindings.length === 0 && !previewSkill.error && !previewSkill.nameTaken"
							:class="$style.noIssues"
						>
							<N8nIcon icon="circle-check" color="success" size="small" />
							<N8nText size="small">
								{{ i18n.baseText('settings.context.skills.connect.preview.noIssues') }}
							</N8nText>
						</div>
						<ul v-if="previewFindings.length > 0" :class="$style.findings">
							<li
								v-for="(finding, index) in previewFindings"
								:key="index"
								:class="$style.finding"
								data-test-id="skill-source-preview-finding"
							>
								<N8nCallout
									:theme="SEVERITY_CALLOUTS[finding.severity].theme"
									:icon="SEVERITY_CALLOUTS[finding.severity].icon"
									icon-size="small"
									slim
									data-test-id="skill-source-preview-finding-callout"
								>
									{{ findingTitle(finding) }}
								</N8nCallout>
								<!-- The snippet shows the problem, so the detail text is only for findings without one. -->
								<N8nText v-if="!finding.location" size="small" color="text-base">
									{{ finding.detail }}
								</N8nText>
								<pre v-else :class="$style.snippet"><code><span
									v-for="row in snippetRows(finding.location)"
									:key="row.line"
									:class="[
										$style.snippetLine,
										row.isMatch && [$style.snippetLineMatch, $style[`line-${finding.severity}`]],
									]"
								><span
									v-if="hasLineNumbers(finding.location)"
									:class="$style.lineNumber"
								>{{ row.line }}</span><span :class="$style.lineText">{{ row.before }}<mark
									v-if="row.isMatch"
									:class="[$style.mark, $style[`mark-${finding.severity}`]]"
								>{{ row.match }}</mark>{{ row.after }}</span></span></code></pre>
							</li>
						</ul>
					</template>
					<N8nText v-else size="small" color="text-light">
						{{ i18n.baseText('settings.context.skills.connect.preview.empty') }}
					</N8nText>
				</section>
			</div>
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
		</N8nDialogBody>

		<N8nDialogFooter>
			<N8nButton
				v-if="step === 'choose'"
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

/* The same header as the MCP connect dialog: the tabs sit on the header divider. */
.headerWithTabs {
	border-bottom: var(--border);
	padding-block-end: 0;
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

.tabs {
	margin-top: var(--spacing--2xs);
}

.bodyWithTabs {
	padding-block-start: var(--n8n-dialog-region--padding, var(--spacing--md));
}

.panels {
	display: grid;
}

.panel {
	grid-area: 1 / 1;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

/* Keeps its space in the grid, but cannot be seen, focused or read. */
.panelHidden {
	visibility: hidden;
}

.source {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	color: var(--text-color--subtler);
}

/* The picker needs room for the list and a readable snippet. The class is doubled so it wins
   over the width of the `full` size, whatever order the styles load in. */
.wideDialog.wideDialog {
	--dialog--max-width: min(75rem, calc(100dvw - var(--spacing--lg)));
}

/* The list on the left, the preview of the clicked skill on the right. */
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
	/* The list and the preview read as one box, square where they meet. */
	border-radius: var(--radius) 0 0 var(--radius);
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

/* The active row takes the colour of the preview, so the row and its preview read as one. */
.itemActive,
.itemActive:hover {
	background-color: var(--background--subtle);
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
	/* The list draws the shared border. */
	border-inline-start: 0;
	border-radius: 0 var(--radius) var(--radius) 0;
	/* The same colour as the snippets, so a snippet needs no box of its own. */
	background-color: var(--background--subtle);
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
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

.noIssues {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
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

/* The footer stretches its items to the button height, so the checkbox centres itself. */
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
