import { useSettingsStore } from '@n8n/stores/settings.store';
import { EnterpriseEditionFeature } from '@/app/constants';
import { useToast } from '@n8n/composables/useToast';
import { computed, onScopeDispose, shallowRef, watch } from 'vue';
import { getResourcePermissions } from '@n8n/permissions';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useI18n } from '@n8n/i18n';
import { ResponseError } from '@n8n/rest-api-client';
import { useUIStore } from '@/app/stores/ui.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { ResourceEditorDestination } from '@/features/collaboration/projects/projects.types';
import { createPublicProject } from '@/features/collaboration/projects/projects.api';
import { createPublicCredential } from '@/features/credentials/credentials.api';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { useEnvironmentsStore } from '@/features/settings/environments.ee/environments.store';
import { VARIABLE_MODAL_KEY } from '@/features/settings/environments.ee/environments.constants';
import type { VariableModalOptions } from '@/features/settings/environments.ee/environments.types';
import type {
	BlockedApplyResult,
	CreatedPromotionBinding,
	CreatedPromotionProject,
	CreatePromotionBinding,
	MissingPromotionBinding,
} from '../promotions.types';

type MissingCredentialBinding = Extract<MissingPromotionBinding, { kind: 'credential' }>;
type MissingVariableBinding = Extract<MissingPromotionBinding, { kind: 'variable' }>;
type EditorSetup = { destination?: ResourceEditorDestination; notice?: () => string };
// Connects an open editor to its pending createBinding call.
type EditorSession = {
	checkActive: () => void;
	save: (binding: CreatedPromotionBinding) => void;
	fail: (error: unknown) => void;
};

export function usePromotionBindingCreation(
	result: BlockedApplyResult,
	onProjectCreated: (project: CreatedPromotionProject) => void,
) {
	const uiStore = useUIStore();
	const rootStore = useRootStore();
	const projectsStore = useProjectsStore();
	const credentialsStore = useCredentialsStore();
	const environmentsStore = useEnvironmentsStore();
	const i18n = useI18n();
	const settingsStore = useSettingsStore();
	const toast = useToast();
	const createdProjects = shallowRef(new Map<string, CreatedPromotionProject>());
	// Projects that exist on this instance. They are not created again.
	const knownProjectIds = new Set<string>();
	let preflight = result.preflight;

	function updatePreflight(value: BlockedApplyResult['preflight']) {
		preflight = value;
		for (const project of value.missingProjects) knownProjectIds.delete(project.id);
	}
	let active = false;
	let disposed = false;
	let finish: (() => void) | undefined;

	async function loadProject(id: string) {
		const project = await projectsStore.fetchProject(id);
		await projectsStore.getMyProjects();
		return project;
	}

	async function ensureProject(id: string, resource: 'credential' | 'projectVariable') {
		const missing = preflight.missingProjects.find((project) => project.id === id);
		if (missing && !knownProjectIds.has(id)) {
			try {
				const project = await createPublicProject(rootStore.publicApiContext, missing);
				knownProjectIds.add(id);
				const metadata = { id: project.id, name: project.name };
				createdProjects.value = new Map(createdProjects.value).set(project.id, metadata);
				onProjectCreated(metadata);
			} catch (error) {
				if (
					error instanceof ResponseError &&
					error.httpStatusCode &&
					error.httpStatusCode < 500 &&
					error.httpStatusCode !== 409
				)
					throw error;
				// A lost response can still mean that the project was saved. The read below decides.
			}
		}
		const project = await loadProject(id);
		knownProjectIds.add(id);
		if (project.type !== 'team' || !getResourcePermissions(project.scopes)[resource].create) {
			throw new Error(i18n.baseText('promotions.bindings.destinationDenied'));
		}
		return project;
	}

	function bindingProject(binding: MissingPromotionBinding) {
		if (binding.kind === 'credential') return binding.ownerProject;
		return binding.scope.kind === 'project' ? binding.scope.project : undefined;
	}

	async function prepareDestination(project: { id: string } | undefined): Promise<EditorSetup> {
		if (!project) return {};
		const missing = preflight.missingProjects.find((item) => item.id === project.id);
		if (!missing || knownProjectIds.has(project.id)) {
			return { destination: { kind: 'resolved', project: await loadProject(project.id) } };
		}
		return {
			destination: {
				kind: 'pending',
				id: project.id,
				name: missing.name,
				permissions: {
					create: projectsStore.canCreateProjects && projectsStore.hasPermissionToCreateProjects,
				},
			},
			notice: () => {
				const created = createdProjects.value.get(project.id);
				return i18n.baseText(
					created
						? 'promotions.bindings.projectSetup.retained'
						: 'promotions.bindings.projectSetup.beforeSave',
					{ interpolate: { projectName: created?.name ?? missing.name } },
				);
			},
		};
	}

	async function assertEditorAvailable(binding: MissingPromotionBinding) {
		if (binding.kind === 'credential') {
			await credentialsStore.fetchCredentialTypes(false);
			if (!credentialsStore.getCredentialTypeByName(binding.credentialType)) {
				throw new Error(i18n.baseText('credentialEdit.typeUnavailable'));
			}
			return;
		}
		if (!settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Variables]) {
			throw new Error(i18n.baseText('promotions.bindings.variablesUnavailable'));
		}
		await environmentsStore.fetchAllVariables();
	}

	function openCredentialEditor(
		binding: MissingCredentialBinding,
		setup: EditorSetup,
		session: EditorSession,
	) {
		uiStore.openNewCredential(
			binding.credentialType,
			false,
			true,
			undefined,
			undefined,
			undefined,
			undefined,
			{
				...setup,
				initialName: binding.name,
				initialData: binding.expressionData,
				appendToBody: true,
				hideAskAssistant: true,
				usageScope: 'project',
				onInitializeError: session.fail,
				createCredential: async (details, projectId) => {
					session.checkActive();
					await ensureProject(projectId, 'credential');
					session.checkActive();
					const credential = await createPublicCredential(rootStore.publicApiContext, {
						id: binding.sourceId,
						name: details.name,
						description: details.description,
						type: binding.credentialType,
						data: details.data ?? {},
						projectId,
						isResolvable: false,
					});
					session.checkActive();
					session.save({
						kind: 'credential',
						sourceId: binding.sourceId,
						id: credential.id,
						name: credential.name,
						credentialType: credential.type,
						projectId,
					});
					return credential.id;
				},
			},
		);
	}

	function openVariableEditor(
		binding: MissingVariableBinding,
		setup: EditorSetup,
		session: EditorSession,
	) {
		const project = bindingProject(binding);
		const options: VariableModalOptions = {
			...setup,
			mode: 'new',
			initialValues: { key: binding.name, value: '' },
			fixedKey: true,
			projectId: project?.id ?? null,
			appendToBody: true,
			onCreate: async (values) => {
				session.checkActive();
				if (project) await ensureProject(project.id, 'projectVariable');
				session.checkActive();
				const variable = await environmentsStore.createVariable({
					key: binding.name,
					value: values.value,
					projectId: project?.id ?? null,
				});
				session.checkActive();
				session.save({
					kind: 'variable',
					id: variable.id,
					name: variable.key,
					scope: variable.project
						? { kind: 'project', project: variable.project }
						: { kind: 'global' },
				});
				return variable;
			},
		};
		uiStore.openModalWithData({ name: VARIABLE_MODAL_KEY, data: options });
	}

	const createBinding: CreatePromotionBinding = async (binding) => {
		if (active || disposed) throw new Error(i18n.baseText('promotions.bindings.editorBusy'));
		active = true;
		try {
			const setup = await prepareDestination(bindingProject(binding));
			await assertEditorAvailable(binding);
			if (disposed) return null;
			const modalName =
				binding.kind === 'credential' ? CREDENTIAL_EDIT_MODAL_KEY : VARIABLE_MODAL_KEY;
			if (uiStore.modalsById[modalName]?.open)
				throw new Error(i18n.baseText('promotions.bindings.editorBusy'));
			return await new Promise<CreatedPromotionBinding | null>((resolve, reject) => {
				let saved: CreatedPromotionBinding | null = null;
				let settled = false;
				let stopWatching: (() => void) | undefined;
				const settle = (error?: unknown) => {
					if (settled) return;
					settled = true;
					stopWatching?.();
					finish = undefined;
					if (error) reject(error);
					else resolve(saved);
				};
				finish = () => {
					settle();
					uiStore.closeModal(modalName);
				};
				const session: EditorSession = {
					checkActive: () => {
						if (settled || disposed)
							throw new Error(i18n.baseText('promotions.bindings.editorClosed'));
					},
					save: (value) => {
						saved = value;
					},
					fail: (error) => {
						if (settled || disposed) return;
						settle(error);
						uiStore.closeModal(modalName);
					},
				};
				try {
					if (binding.kind === 'credential') openCredentialEditor(binding, setup, session);
					else openVariableEditor(binding, setup, session);
					stopWatching = watch(
						() => uiStore.modalsById[modalName]?.open,
						(open) => {
							if (!open) settle();
						},
					);
				} catch (error) {
					settle(error);
				}
			});
		} catch (error) {
			toast.showError(error, i18n.baseText('promotions.bindings.error.setup'));
			throw error;
		} finally {
			active = false;
		}
	};

	onScopeDispose(() => {
		disposed = true;
		finish?.();
	});

	return {
		createBinding,
		updatePreflight,
		createdProjects: computed(() => Array.from(createdProjects.value.values())),
	};
}
