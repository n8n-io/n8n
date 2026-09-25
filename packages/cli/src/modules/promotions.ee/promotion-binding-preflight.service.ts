import type {
	PromotionBindingConsumer,
	PromotionBindingPreflightResult,
	PromotionBindingProject,
	PromotionVariableScope,
} from '@n8n/api-types';
import { CredentialsRepository, ProjectRepository, VariablesRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import { CredentialTypes } from '@/credential-types';
import { visitWorkflowCredentials } from '@/modules/n8n-packages/entities/credential/workflow-credential-references';
import { VariableRequirementsExtractor } from '@/modules/n8n-packages/entities/variable/variable-requirements.extractor';
import { DirectoryPackageReader } from '@/modules/n8n-packages/io/directory/directory-package-reader';
import {
	PackageDirectoryInventoryReader,
	type InventoryCredential,
	type InventoryVariable,
	type InventoryWorkflow,
	type PackageDirectoryInventory,
} from '@/modules/n8n-packages/io/directory/package-directory-inventory-reader';
import { PACKAGE_ENTITY_LAYOUT } from '@/modules/n8n-packages/io/manifest-entry';
import { PackageImportConfig } from '@/modules/n8n-packages/n8n-packages.config';

interface CredentialReference {
	sourceId: string | null;
	name: string;
	expectedTypes: string[];
	file: InventoryCredential | undefined;
	workflows: InventoryWorkflow[];
}

interface VariableReference {
	name: string;
	file: InventoryVariable | undefined;
	workflows: InventoryWorkflow[];
}

type ProjectLookup = (id: string) => PromotionBindingProject;

/** Inspects package bindings without changing files, target state, or caller permissions. */
@Service()
export class PromotionBindingPreflightService {
	constructor(
		private readonly packageImportConfig: PackageImportConfig,
		private readonly inventoryReader: PackageDirectoryInventoryReader,
		private readonly variableExtractor: VariableRequirementsExtractor,
		private readonly credentialTypes: CredentialTypes,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly variablesRepository: VariablesRepository,
		private readonly projectRepository: ProjectRepository,
	) {}

	/** The caller must enforce inspection permissions. Project access does not depend on user visibility. */
	async checkDirectory({
		sourceDir,
	}: { sourceDir: string }): Promise<PromotionBindingPreflightResult> {
		const reader = new DirectoryPackageReader(sourceDir, this.packageImportConfig);
		const inventory = await this.inventoryReader.read(reader);
		const credentials = collectCredentialReferences(inventory);
		const variables = collectVariableReferences(inventory, this.variableExtractor);
		const projects = new Map(inventory.projects.map(({ id, name }) => [id, { id, name }]));
		const projectOf: ProjectLookup = (id) => {
			const project = projects.get(id);
			// The reader requires a project file for every project directory.
			if (!project) throw new UnexpectedError(`Package inventory has no project "${id}"`);
			return project;
		};

		const [targetProjects, targetCredentials, targetVariables] = await Promise.all([
			this.projectRepository.findTypesByIds([...projects.keys()]),
			this.credentialsRepository.findPromotionBindingAccess(
				credentials.flatMap(({ sourceId }) => sourceId ?? []),
				unique(credentials.flatMap(({ workflows }) => workflows.map(({ projectId }) => projectId))),
			),
			this.variablesRepository.findKeysInProjectsOrGlobal(
				unique(variables.map(({ name }) => name)),
				unique(variables.flatMap(({ workflows }) => workflows.map(({ projectId }) => projectId))),
			),
		]);
		const targetProjectIds = new Set(targetProjects.map(({ id }) => id));
		const result: PromotionBindingPreflightResult = {
			missingProjects: inventory.projects
				.filter(({ id }) => !targetProjectIds.has(id))
				.sort((a, b) => compare(a.id, b.id))
				.map(({ id, name, icon, description, customTelemetryTags }) => ({
					id,
					name,
					...(icon !== undefined ? { icon } : {}),
					...(description !== undefined ? { description } : {}),
					...(customTelemetryTags !== undefined ? { customTelemetryTags } : {}),
				})),
			missingBindings: [],
			accessRequirements: [],
			conflicts: [],
			warnings: [],
		};
		const personalProjectIds = new Set(
			targetProjects.filter(({ type }) => type === 'personal').map(({ id }) => id),
		);
		this.checkProjects(inventory, personalProjectIds, projectOf, result);
		this.checkCredentials(credentials, targetCredentials, personalProjectIds, projectOf, result);
		this.checkVariables(variables, targetVariables, personalProjectIds, projectOf, result);
		return result;
	}

	private checkProjects(
		inventory: PackageDirectoryInventory,
		personalProjectIds: ReadonlySet<string>,
		projectOf: ProjectLookup,
		result: PromotionBindingPreflightResult,
	): void {
		for (const project of [...inventory.projects].sort((a, b) => compare(a.id, b.id))) {
			if (!personalProjectIds.has(project.id)) continue;
			result.conflicts.push({
				kind: 'project',
				code: 'project-not-team',
				project: projectOf(project.id),
				filePath: `${project.path}/${PACKAGE_ENTITY_LAYOUT.projects.fileName}`,
				workflows: workflowRefs(
					inventory.workflows.filter(({ projectId }) => projectId === project.id),
				),
			});
		}
	}

	private checkCredentials(
		credentials: CredentialReference[],
		targetCredentials: Awaited<ReturnType<CredentialsRepository['findPromotionBindingAccess']>>,
		personalProjectIds: ReadonlySet<string>,
		projectOf: ProjectLookup,
		result: PromotionBindingPreflightResult,
	): void {
		const credentialsById = new Map(
			targetCredentials.map((credential) => [credential.id, credential]),
		);
		for (const reference of credentials) {
			const { sourceId, name, expectedTypes, file, workflows } = reference;
			const consumers = consumersOf(workflows, projectOf);
			const conflict = {
				kind: 'credential' as const,
				sourceId,
				name,
				expectedTypes,
				consumers,
				...(file ? { filePath: file.path } : {}),
				referenceFiles: referenceFiles(workflows),
			};
			const credentialType = expectedTypes[0];
			if (sourceId === null) {
				result.conflicts.push({ ...conflict, code: 'missing-id' });
				continue;
			}
			if (expectedTypes.length > 1) {
				result.conflicts.push({ ...conflict, code: 'conflicting-types' });
				continue;
			}
			if (!this.credentialTypes.recognizes(credentialType)) {
				result.conflicts.push({ ...conflict, code: 'unknown-type' });
				continue;
			}
			const target = credentialsById.get(sourceId);
			const binding = { kind: 'credential' as const, sourceId, name, credentialType, consumers };
			if (target) {
				if (target.type !== credentialType) {
					result.conflicts.push({ ...conflict, code: 'type-mismatch', targetType: target.type });
				} else if (target.usageScope !== 'project') {
					result.conflicts.push({
						...conflict,
						code: 'incompatible-usage-scope',
						usageScope: target.usageScope,
					});
				} else if (!target.isGlobal) {
					const accessibleProjects = new Set(target.projectIds);
					const needsAccess = consumers.filter(
						({ project }) =>
							!accessibleProjects.has(project.id) && !personalProjectIds.has(project.id),
					);
					if (needsAccess.length > 0) {
						result.accessRequirements.push({
							...binding,
							code: 'access-required',
							consumers: needsAccess,
						});
					}
				}
			} else if (!file || file.projectId === null) {
				result.conflicts.push({ ...conflict, code: 'unknown-owner' });
			} else if (!personalProjectIds.has(file.projectId)) {
				result.missingBindings.push({
					...binding,
					ownerProject: projectOf(file.projectId),
					...(file.credential.data !== undefined ? { expressionData: file.credential.data } : {}),
				});
			}
		}
	}

	private checkVariables(
		variables: VariableReference[],
		targetVariables: Awaited<ReturnType<VariablesRepository['findKeysInProjectsOrGlobal']>>,
		personalProjectIds: ReadonlySet<string>,
		projectOf: ProjectLookup,
		result: PromotionBindingPreflightResult,
	): void {
		const existingVariables = new Set(
			targetVariables.map(({ key, projectId }) => variableKey(key, projectId)),
		);
		for (const { name, file, workflows } of variables) {
			const consumers = consumersOf(workflows, projectOf);
			if (!file) {
				result.conflicts.push({
					kind: 'variable',
					code: 'missing-definition',
					name,
					consumers,
					referenceFiles: referenceFiles(workflows),
				});
				continue;
			}
			const scope: PromotionVariableScope =
				file.projectId === null
					? { kind: 'global' }
					: { kind: 'project', project: projectOf(file.projectId) };
			if (
				!existingVariables.has(variableKey(name, file.projectId)) &&
				(file.projectId === null || !personalProjectIds.has(file.projectId))
			) {
				result.missingBindings.push({
					kind: 'variable',
					name,
					variableType: file.variable.type,
					scope,
					consumers,
					...(file.variable.value !== undefined ? { sourceValue: file.variable.value } : {}),
				});
			}
			if (file.projectId === null) {
				const shadowed = consumers.filter(({ project }) =>
					existingVariables.has(variableKey(name, project.id)),
				);
				if (shadowed.length > 0) {
					result.warnings.push({
						kind: 'variable',
						code: 'variable-shadowed',
						name,
						scope: { kind: 'global' },
						consumers: shadowed,
					});
				}
			}
		}
	}
}

/** Inspect references before target lookups. File paths define ownership. */
function collectCredentialReferences(inventory: PackageDirectoryInventory): CredentialReference[] {
	const groups = new Map<string, CredentialReference>();
	const files = new Map(inventory.credentials.map((file) => [file.credential.id, file]));
	for (const workflow of inventory.workflows) {
		visitWorkflowCredentials(workflow.content.nodes, (type, details) => {
			if (!details.id && details.__aiGatewayManaged === true) return false;

			const sourceId = details.id || null;
			const key = JSON.stringify(sourceId ?? [type, details.name]);
			const file = sourceId === null ? undefined : files.get(sourceId);
			const group = groups.get(key) ?? {
				sourceId,
				name: file?.credential.name ?? details.name,
				expectedTypes: file ? [file.credential.type] : [],
				file,
				workflows: [],
			};
			group.expectedTypes.push(type);
			group.workflows.push(workflow);
			groups.set(key, group);
			return false;
		});
	}
	for (const group of groups.values()) {
		group.expectedTypes = unique(group.expectedTypes).sort(compare);
	}
	return [...groups.values()].sort(
		(a, b) =>
			compare(a.sourceId ?? '', b.sourceId ?? '') ||
			compare(a.expectedTypes[0], b.expectedTypes[0]) ||
			compare(a.name, b.name),
	);
}

/** Resolve source project scope first, then source global scope. Other projects do not supply a fallback. */
function collectVariableReferences(
	inventory: PackageDirectoryInventory,
	extractor: VariableRequirementsExtractor,
): VariableReference[] {
	const files = new Map(
		inventory.variables.map((file) => [variableKey(file.variable.name, file.projectId), file]),
	);
	const groups = new Map<string, VariableReference>();
	for (const workflow of inventory.workflows) {
		const requirements = extractor.extract({
			id: workflow.id,
			nodes: workflow.content.nodes,
			settings: workflow.content.settings,
		});
		for (const { variableName: name } of requirements) {
			const file =
				files.get(variableKey(name, workflow.projectId)) ?? files.get(variableKey(name, null));
			const key = JSON.stringify([file ? 'defined' : 'missing', file?.projectId, name]);
			const group = groups.get(key) ?? { name, file, workflows: [] };
			group.workflows.push(workflow);
			groups.set(key, group);
		}
	}
	return [...groups.values()].sort(
		(a, b) => compare(a.file?.projectId ?? '', b.file?.projectId ?? '') || compare(a.name, b.name),
	);
}

function consumersOf(
	workflows: InventoryWorkflow[],
	projectOf: ProjectLookup,
): PromotionBindingConsumer[] {
	const byProject = new Map<string, InventoryWorkflow[]>();
	for (const workflow of workflows) {
		const group = byProject.get(workflow.projectId) ?? [];
		group.push(workflow);
		byProject.set(workflow.projectId, group);
	}
	return [...byProject.entries()]
		.sort(([a], [b]) => compare(a, b))
		.map(([projectId, uses]) => ({ project: projectOf(projectId), workflows: workflowRefs(uses) }));
}

function workflowRefs(workflows: InventoryWorkflow[]): Array<{ id: string; name: string }> {
	return [...new Map(workflows.map((workflow) => [workflow.id, workflow])).values()]
		.sort((a, b) => compare(a.id, b.id))
		.map(({ id, name }) => ({ id, name }));
}

function referenceFiles(workflows: InventoryWorkflow[]): string[] {
	return unique(workflows.map(({ path }) => path)).sort(compare);
}

function variableKey(name: string, projectId: string | null): string {
	return JSON.stringify([projectId, name]);
}

function unique<T>(values: T[]): T[] {
	return [...new Set(values)];
}

function compare(a: string, b: string): number {
	return a < b ? -1 : a > b ? 1 : 0;
}
