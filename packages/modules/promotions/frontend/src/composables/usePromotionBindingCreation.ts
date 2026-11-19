import { useToast } from '@n8n/composables/useToast';
import {
	capabilities,
	capabilityRegistry,
	type ResourceEditorDestination,
	type ResourceEditorKind,
	type VariableEditorOptions,
} from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { getResourcePermissions } from '@n8n/permissions';
import {
	createPublicCredential,
	createPublicProject,
	getProject,
	ResponseError,
} from '@n8n/rest-api-client';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onScopeDispose, shallowRef, watch } from 'vue';

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
	const rootStore = useRootStore();
	const editors = capabilityRegistry.use(capabilities.resourceEditors);
	const projectContext = capabilityRegistry.use(capabilities.projectContext);
	const rbacStore = useRBACStore();
	const i18n = useI18n();
	const settingsStore = useSettingsStore();
	const toast = useToast();
	const createdProjects = shallowRef(new Map<string, CreatedPromotionProject>());
	// Projects that exist on this instance. They are not created again.
	const knownProjectIds = new Set<string>();
	let check = result.check;

	function updateCheck(value: BlockedApplyResult['check']) {
		check = value;
		for (const project of value.missingProjects) knownProjectIds.delete(project.id);
	}
	let active = false;
	let disposed = false;
	let finish: (() => void) | undefined;

	async function loadProject(id: string) {
		const project = await getProject(rootStore.restApiContext, id);
		await projectContext.getMyProjects();
		return project;
	}

	async function ensureProject(id: string, resource: 'credential' | 'projectVariable') {
		const missing = check.missingProjects.find((project) => project.id === id);
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
		const missing = check.missingProjects.find((item) => item.id === project.id);
		if (!missing || knownProjectIds.has(project.id)) {
			return { destination: { kind: 'resolved', project: await loadProject(project.id) } };
		}
		return {
			destination: {
				kind: 'pending',
				id: project.id,
				name: missing.name,
				permissions: {
					create: projectContext.hasTeamProjectQuota() && rbacStore.hasScope('project:create'),
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
			if (!(await editors.hasCredentialType(binding.credentialType))) {
				throw new Error(i18n.baseText('credentialEdit.typeUnavailable'));
			}
			return;
		}
		if (!settingsStore.isEnterpriseFeatureEnabled.variables) {
			throw new Error(i18n.baseText('promotions.bindings.variablesUnavailable'));
		}
		await editors.loadVariables();
	}

	function openCredentialEditor(
		binding: MissingCredentialBinding,
		setup: EditorSetup,
		session: EditorSession,
	) {
		editors.openCredentialEditor(binding.credentialType, {
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
		});
	}

	function openVariableEditor(
		binding: MissingVariableBinding,
		setup: EditorSetup,
		session: EditorSession,
	) {
		const project = bindingProject(binding);
		const options: VariableEditorOptions = {
			...setup,
			initialValues: { key: binding.name, value: '' },
			fixedKey: true,
			projectId: project?.id ?? null,
			allowOnProtectedInstance: true,
			appendToBody: true,
			onCreate: async (values) => {
				session.checkActive();
				if (project) await ensureProject(project.id, 'projectVariable');
				session.checkActive();
				const variable = await editors.createVariable({
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
		editors.openVariableEditor(options);
	}

	const createBinding: CreatePromotionBinding = async (binding) => {
		if (active || disposed) throw new Error(i18n.baseText('promotions.bindings.editorBusy'));
		active = true;
		try {
			const setup = await prepareDestination(bindingProject(binding));
			await assertEditorAvailable(binding);
			if (disposed) return null;
			const editor: ResourceEditorKind = binding.kind;
			if (editors.isEditorOpen(editor))
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
					// The editor's error goes to the caller unchanged, so its toast shows the real cause.
					// eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
					if (error) reject(error);
					else resolve(saved);
				};
				finish = () => {
					settle();
					editors.closeEditor(editor);
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
						editors.closeEditor(editor);
					},
				};
				try {
					if (binding.kind === 'credential') openCredentialEditor(binding, setup, session);
					else openVariableEditor(binding, setup, session);
					stopWatching = watch(
						() => editors.isEditorOpen(editor),
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
		updateCheck,
		createdProjects: computed(() => Array.from(createdProjects.value.values())),
	};
}
