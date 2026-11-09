import type {
	CreateCredentialDto,
	CreateEnvironmentVariable,
	EnvironmentsVersion,
	EnvironmentVariable,
	SelfHealingResultDetail,
} from '@n8n/api-types';
import type { Scope } from '@n8n/permissions';
import type { Project } from '@n8n/rest-api-client';
import type { ICredentialsDecrypted } from 'n8n-workflow';
import type { ComputedRef, Ref } from 'vue';

/**
 * A typed key for a capability. `declareCapability()` is the only way to make
 * one, and the token is the only way to read or write its slot in the registry.
 */
export interface CapabilityToken<T> {
	/** Labels the capability in registry warnings and errors. */
	readonly key: string;
	/** Returned by `use()` when nothing is provided. Absent means `use()` throws. */
	readonly fallback?: T;
}

/**
 * Structurally identical to `ModalOpeners` in `@n8n/stores`; declared here so a
 * module needs no `@n8n/stores` import.
 *
 * Method syntax keeps the parameters bivariant, so the shell can provide openers
 * typed with the narrower `ModalKey` union without a cast.
 */
export interface ModalOpeners {
	openModal(name: string): void;
	openModalWithData(payload: { name: string; data: Record<string, unknown> }): void;
}

export interface ProjectPermissions {
	/** The user's global scopes plus their scopes in the project. Reads reactive state, so call it in a `computed`. */
	scopesFor(projectId: string): Scope[];
	/** The current project, or the personal project when no project is open. */
	defaultProjectId?(): string | undefined;
	/** Whether the instance blocks writes (source control read-only branch). Reads reactive state. */
	isReadOnly(): boolean;
}

export interface McpExposeAllOffer {
	/** Whether the experiment is on for this user. Reads reactive state, so call it in a `computed`. */
	isEnabled(): boolean;
	/**
	 * Opens the expose-all modal when there is something to expose. Resolves `true`
	 * when the modal opened. `onExposed` runs after the user exposes everything.
	 */
	offer(onExposed: () => Promise<void> | void): Promise<boolean>;
}

export type SelfHealingChatInput = Pick<
	SelfHealingResultDetail,
	'resultId' | 'workflowId' | 'report' | 'outcome' | 'reviewState' | 'execution'
>;

/**
 * `started` means the chat opened and the report is on its way, so do not start it again.
 * `busy` and `failed` mean no chat started, so the caller can offer another try.
 */
export type SelfHealingChatStartOutcome = 'started' | 'busy' | 'failed' | 'unavailable';

export interface SelfHealingChatHandoff {
	available: ComputedRef<boolean>;
	/** Whether the Assistant is ready and the user can read the project. Reads reactive state, so call it in a `computed`. */
	canStart(projectId: string): boolean;
	/** Opens a chat in the project and sends the report through the normal Assistant handoff. */
	start(projectId: string, input: SelfHealingChatInput): Promise<SelfHealingChatStartOutcome>;
}

/** The project that the editor shows and the project lists of the sidebar. */
export interface ProjectContext {
	/** The project that the shell shows, or null. Reads reactive state, so call it in a `computed`. */
	currentProject(): Project | null;
	/** The project id of the route, else of the shown project. Reads reactive state. */
	currentProjectId(): string | undefined;
	/** Shows a project that the server changed, for example after an Apply. */
	setCurrentProject(project: Project): void;
	/** Whether the license allows one more team project. Reads reactive state. */
	hasTeamProjectQuota(): boolean;
	/** Reloads the projects of the user, which the sidebar shows. */
	getMyProjects(): Promise<void>;
	/** Reloads the project counts, which the team project quota reads. */
	getProjectsCount(): Promise<void>;
	/** Reloads all projects of the instance. Only for users with the global `project:list` scope. */
	getAllProjects(): Promise<void>;
}

/** Where a credential or variable editor saves to. A `pending` project does not exist yet. */
export type ResourceEditorDestination =
	| { kind: 'resolved'; project: Project }
	| { kind: 'pending'; id: string; name: string; permissions: { create: boolean } };

export type CredentialPayload = ICredentialsDecrypted & Pick<CreateCredentialDto, 'description'>;

/** Opens the credential editor in manual mode. `createCredential` replaces the default save. */
export type CredentialEditorOptions = {
	initialName?: string;
	initialData?: Record<string, unknown>;
	destination?: ResourceEditorDestination;
	/** Shown above the form. Called on each render, so the text can change. */
	notice?: () => string;
	appendToBody?: boolean;
	hideAskAssistant?: boolean;
	usageScope?: 'project' | 'instance';
	onInitializeError?: (error: unknown) => void;
	/** Saves the credential and resolves its id. */
	createCredential?: (details: CredentialPayload, projectId: string) => Promise<string>;
};

/** Opens the variable editor for a new variable. `onCreate` replaces the default save. */
export type VariableEditorOptions = {
	initialValues?: Pick<EnvironmentVariable, 'key' | 'value'>;
	fixedKey?: boolean;
	projectId?: string | null;
	destination?: ResourceEditorDestination;
	notice?: () => string;
	allowOnProtectedInstance?: boolean;
	appendToBody?: boolean;
	onCreate?: (variable: CreateEnvironmentVariable) => Promise<EnvironmentVariable>;
};

export type ResourceEditorKind = 'credential' | 'variable';

/** The shell's credential and variable editors, and the stores behind them. */
export interface ResourceEditors {
	/** Loads the credential types once. Resolves `true` when this instance knows the type. */
	hasCredentialType(type: string): Promise<boolean>;
	loadVariables(): Promise<void>;
	createVariable(variable: CreateEnvironmentVariable): Promise<EnvironmentVariable>;
	openCredentialEditor(type: string, options: CredentialEditorOptions): void;
	openVariableEditor(options: VariableEditorOptions): void;
	/** Reads reactive state, so watch it to see the editor close. */
	isEditorOpen(editor: ResourceEditorKind): boolean;
	closeEditor(editor: ResourceEditorKind): void;
}

export interface EnvironmentsVersionSwitch {
	busy: Ref<boolean>;
	/** Whether the user can switch the instance back to Environments. */
	canSwitchBack: ComputedRef<boolean>;
	/** Asks for confirmation, switches the instance and opens the settings page of the new version. */
	switchTo(version: EnvironmentsVersion): Promise<void>;
}

/** The Environments settings. They live in the source control preferences of the shell. */
export interface EnvironmentsSettings {
	/** The promotions module is active and the instance uses Environments v2. Reads reactive state. */
	isPromotionsEnabled(): boolean;
	/** The protected instance setting. Reads reactive state. */
	isProtected(): boolean;
	loadPreferences(): Promise<void>;
	setProtected(value: boolean): Promise<void>;
	/** Call during component setup, because the switch uses the router and the message box. */
	useVersionSwitch(): EnvironmentsVersionSwitch;
}

/** The tag names of this instance. */
export interface TagNames {
	/** Loads the tags once. Resolves without tags when the user cannot list them. */
	load(): Promise<void>;
	/** Reads reactive state. `undefined` when the tag is unknown or not loaded. */
	nameOf(id: string): string | undefined;
}

export interface AppAssistantHandoff {
	/** Whether the Assistant is ready to open an App thread. */
	available: ComputedRef<boolean>;
	/** Opens the newest Assistant thread linked to an App, or creates one. */
	openApp(input: { appId: string; projectId: string; appName?: string }): Promise<boolean>;
	/** Opens the Assistant empty state for a new App. */
	createApp(input: { appId: string; projectId: string }): Promise<void>;
}
