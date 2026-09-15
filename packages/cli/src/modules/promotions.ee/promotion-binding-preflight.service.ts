import type {
	PromotionBindingIssue,
	PromotionBindingPreflightResult,
	PromotionBindingProject,
	PromotionCredentialBindingReview,
	PromotionDestinationProjectStatus,
	PromotionSourceFile,
	PromotionVariableBindingReview,
} from '@n8n/api-types';
import { CredentialsRepository, ProjectRepository, VariablesRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError, UserError } from 'n8n-workflow';

import { CredentialTypes } from '@/credential-types';
import { IdBasedCredentialMatcher } from '@/modules/n8n-packages/entities/credential/id-based-credential-matcher';
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
import { PackageImportConfig } from '@/modules/n8n-packages/n8n-packages.config';
import type { PackageCredentialRequirement } from '@/modules/n8n-packages/spec/requirements.schema';

interface CredentialUse {
	workflow: InventoryWorkflow;
	type: string;
	name: string;
}

interface CredentialUseGroup {
	sourceId: string | null;
	uses: CredentialUse[];
}

interface VariableRequirement {
	name: string;
	projectId: string;
	workflows: InventoryWorkflow[];
}

/** Destination facts for the projects named in the package. */
interface DestinationContext {
	projectOf: (id: string) => PromotionBindingProject;
	destinationProjectStatusOf: (id: string) => PromotionDestinationProjectStatus;
}

type CredentialConsumer = PromotionCredentialBindingReview['consumers'][number];
type CredentialDestinationMatch = PromotionCredentialBindingReview['destinationMatch'];

/** Everything known about one required credential before its record is built. */
interface CredentialFacts {
	sourceId: string | null;
	name: string;
	expectedTypes: string[];
	/** The one type the workflows agree on, or `undefined` when they disagree. */
	type: string | undefined;
	typeKnown: boolean;
	file: InventoryCredential | undefined;
	sourceFile: PromotionSourceFile;
	destinationMatch: CredentialDestinationMatch;
	consumers: Array<Omit<CredentialConsumer, 'accessStatus'>>;
}

/** A credential the matcher can check: it has an id, a known type, and exists on the destination. */
interface CheckableCredential extends CredentialFacts {
	sourceId: string;
	type: string;
	typeKnown: true;
	destinationMatch: 'matched';
}

/**
 * Finds credential and variable bindings that need review before import.
 * Includes variables that resolve through a global fallback. Reads the package
 * files and the database. Never writes to either. Credentials match by source
 * id. Variables match by name inside the consuming project. Each result records
 * the source file location and destination status for later creation decisions.
 */
@Service()
export class PromotionBindingPreflightService {
	constructor(
		private readonly packageImportConfig: PackageImportConfig,
		private readonly inventoryReader: PackageDirectoryInventoryReader,
		private readonly variableExtractor: VariableRequirementsExtractor,
		private readonly credentialTypes: CredentialTypes,
		private readonly credentialMatcher: IdBasedCredentialMatcher,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly variablesRepository: VariablesRepository,
		private readonly projectRepository: ProjectRepository,
	) {}

	/** `sourceDir` is the package directory inside a checkout the caller controls. Destination state is read fresh on every call. */
	async checkDirectory({
		sourceDir,
		user,
	}: {
		sourceDir: string;
		user: User;
	}): Promise<PromotionBindingPreflightResult> {
		const reader = new DirectoryPackageReader(sourceDir, this.packageImportConfig);
		const inventory = await this.inventoryReader.read(reader);

		const context = await this.readDestinationProjects(inventory);
		const credentials = await this.checkCredentials(inventory, context, user);
		const variables = await this.checkVariables(inventory, context);

		return { bindingsNeedingReview: [...credentials, ...variables] };
	}

	private async readDestinationProjects(
		inventory: PackageDirectoryInventory,
	): Promise<DestinationContext> {
		const projectsById = new Map(inventory.projects.map((p) => [p.id, { id: p.id, name: p.name }]));
		const typeById = new Map(
			(await this.projectRepository.findTypesByIds([...projectsById.keys()])).map((row) => [
				row.id,
				row.type,
			]),
		);

		return {
			projectOf: (id) => {
				const project = projectsById.get(id);
				// The reader only accepts files inside a directory with a project.json.
				if (!project) throw new UnexpectedError(`Package inventory has no project "${id}"`);
				return project;
			},
			destinationProjectStatusOf: (id) => typeById.get(id) ?? 'missing',
		};
	}

	private async checkCredentials(
		inventory: PackageDirectoryInventory,
		context: DestinationContext,
		user: User,
	): Promise<PromotionCredentialBindingReview[]> {
		const groups = collectCredentialUses(inventory);
		const filesById = new Map(inventory.credentials.map((file) => [file.credential.id, file]));

		const sourceIds = groups.flatMap((group) => group.sourceId ?? []);
		const destinationTypes = new Map(
			(await this.credentialsRepository.findTypesByIds(sourceIds)).map((row) => [row.id, row.type]),
		);

		const facts = groups.map(({ sourceId, uses }): CredentialFacts => {
			const file = sourceId === null ? undefined : filesById.get(sourceId);
			const expectedTypes = unique(uses.map((use) => use.type)).sort(compare);
			const type = expectedTypes.length === 1 ? expectedTypes[0] : undefined;

			if (file && type !== undefined && file.credential.type !== type) {
				throw new UserError(
					`Package credential file at ${file.path} has type "${file.credential.type}", but workflows use credential "${sourceId}" as "${type}".`,
				);
			}

			return {
				sourceId,
				name: file?.credential.name ?? uses[0].name,
				expectedTypes,
				type,
				typeKnown: type !== undefined && this.credentialTypes.recognizes(type),
				file,
				sourceFile: sourceFileOf(file, context),
				destinationMatch:
					sourceId === null
						? 'unchecked'
						: destinationMatchOf(type, destinationTypes.get(sourceId)),
				consumers: consumersOf(uses, context),
			};
		});

		const unavailable = await this.findUnavailable(facts, user);

		return facts
			.map((fact) => buildCredentialRecord(fact, unavailable))
			.filter((record) => record.issues.length > 0)
			.sort(
				(a, b) =>
					compare(a.sourceId ?? '', b.sourceId ?? '') ||
					compare(a.expectedTypes[0], b.expectedTypes[0]),
			);
	}

	/**
	 * Asks the matcher, per consuming team project, which existing credentials that
	 * project cannot use. The matcher decides what "usable" means for import, so
	 * pre-flight agrees with it. Returns one key per credential and project.
	 */
	private async findUnavailable(facts: CredentialFacts[], user: User): Promise<Set<string>> {
		const byProject = new Map<string, PackageCredentialRequirement[]>();
		for (const fact of facts) {
			if (!isCheckable(fact)) continue;
			const requirement: PackageCredentialRequirement = {
				id: fact.sourceId,
				name: fact.name,
				type: fact.type,
				usedByWorkflows: fact.consumers.flatMap((consumer) => consumer.workflows.map((w) => w.id)),
			};
			for (const consumer of fact.consumers) {
				if (consumer.destinationProjectStatus === 'team') {
					pushTo(byProject, consumer.project.id, requirement);
				}
			}
		}

		const unavailable = new Set<string>();
		for (const [projectId, candidates] of byProject) {
			const resolution = await this.credentialMatcher.match(candidates, { projectId, user });
			for (const failure of resolution.failures) {
				unavailable.add(accessKey(failure.sourceId, projectId));
			}
		}

		return unavailable;
	}

	private async checkVariables(
		inventory: PackageDirectoryInventory,
		context: DestinationContext,
	): Promise<PromotionVariableBindingReview[]> {
		const requirements = this.collectVariableRequirements(inventory);
		if (requirements.length === 0) return [];

		// A project variable resolves the requirement. A global one is reported, so the user can
		// still create a project variable, but marked as the runtime fallback it is.
		const existing = await this.variablesRepository.findKeysInProjectsOrGlobal(
			unique(requirements.map((requirement) => requirement.name)),
			unique(requirements.map((requirement) => requirement.projectId)),
		);
		const existingKeys = new Set(existing.map(({ key, projectId }) => variableKey(key, projectId)));
		const filesByName = indexVariableFiles(inventory.variables);

		return requirements
			.filter(({ name, projectId }) => !existingKeys.has(variableKey(name, projectId)))
			.map(({ name, projectId, workflows }) => {
				const destinationMatch: PromotionVariableBindingReview['destinationMatch'] =
					existingKeys.has(variableKey(name, null)) ? 'global-fallback' : 'missing';
				const consumer = {
					project: context.projectOf(projectId),
					destinationProjectStatus: context.destinationProjectStatusOf(projectId),
					workflows: workflowRefs(workflows),
				};
				const sourceFile = sourceFileOf(variableFile(filesByName, name, projectId), context);
				const issues: PromotionBindingIssue[] = [
					destinationMatch === 'global-fallback' ? 'global-only' : 'missing-variable',
					...projectIssues([consumer.destinationProjectStatus], 'consuming-project'),
					...(sourceFile.location === 'project' ? [] : (['unknown-owner'] as const)),
				];
				return {
					kind: 'variable' as const,
					name,
					sourceFile,
					consumer,
					destinationMatch,
					issues,
				};
			})
			.sort(
				(a, b) => compare(a.consumer.project.id, b.consumer.project.id) || compare(a.name, b.name),
			);
	}

	private collectVariableRequirements(inventory: PackageDirectoryInventory): VariableRequirement[] {
		const byKey = new Map<string, VariableRequirement>();

		for (const workflow of inventory.workflows) {
			const names = this.variableExtractor.extract({
				id: workflow.id,
				nodes: workflow.content.nodes,
				settings: workflow.content.settings,
			});

			for (const { variableName } of names) {
				const key = variableKey(variableName, workflow.projectId);
				const requirement = byKey.get(key) ?? {
					name: variableName,
					projectId: workflow.projectId,
					workflows: [],
				};
				requirement.workflows.push(workflow);
				byKey.set(key, requirement);
			}
		}

		return [...byKey.values()];
	}
}

/** Groups raw references by id, or by type when the reference has no id, so nothing is lost before review. */
function collectCredentialUses(inventory: PackageDirectoryInventory): CredentialUseGroup[] {
	const groups = new Map<string, CredentialUseGroup>();

	for (const workflow of inventory.workflows) {
		visitWorkflowCredentials(workflow.content.nodes, (type, details) => {
			const sourceId = details.id || null;
			const key = sourceId ?? `\0${type}`;
			const group = groups.get(key) ?? { sourceId, uses: [] };
			group.uses.push({ workflow, type, name: details.name });
			groups.set(key, group);
			return false;
		});
	}

	return [...groups.values()];
}

/** Without one agreed type there is nothing to compare the destination credential against. */
function destinationMatchOf(
	expectedType: string | undefined,
	destinationType: string | undefined,
): CredentialDestinationMatch {
	if (expectedType === undefined) return 'unchecked';
	if (destinationType === undefined) return 'missing';
	return destinationType === expectedType ? 'matched' : 'type-mismatch';
}

function buildCredentialRecord(
	fact: CredentialFacts,
	unavailable: Set<string>,
): PromotionCredentialBindingReview {
	const consumers = fact.consumers.map((consumer) => ({
		...consumer,
		accessStatus: accessStatusOf(fact, consumer, unavailable),
	}));

	return {
		kind: 'credential',
		sourceId: fact.sourceId,
		name: fact.name,
		expectedTypes: fact.expectedTypes,
		...(fact.file?.credential.data ? { expressionData: fact.file.credential.data } : {}),
		sourceFile: fact.sourceFile,
		destinationMatch: fact.destinationMatch,
		consumers,
		issues: credentialIssues(fact, consumers),
	};
}

function isCheckable(fact: CredentialFacts): fact is CheckableCredential {
	return (
		fact.sourceId !== null &&
		fact.type !== undefined &&
		fact.typeKnown &&
		fact.destinationMatch === 'matched'
	);
}

/** Usability is only a question for a checkable credential in a team project that exists. */
function accessStatusOf(
	fact: CredentialFacts,
	consumer: Omit<CredentialConsumer, 'accessStatus'>,
	unavailable: Set<string>,
): CredentialConsumer['accessStatus'] {
	if (!isCheckable(fact) || consumer.destinationProjectStatus !== 'team') return 'unchecked';
	return unavailable.has(accessKey(fact.sourceId, consumer.project.id)) ? 'unavailable' : 'usable';
}

function accessKey(sourceId: string, projectId: string): string {
	return `${sourceId}\0${projectId}`;
}

/**
 * Only a missing credential needs an owner, so ownership issues apply only when
 * the destination has no credential with this id.
 */
function credentialIssues(
	fact: CredentialFacts,
	consumers: CredentialConsumer[],
): PromotionBindingIssue[] {
	if (fact.sourceId === null) return ['missing-id'];
	if (fact.expectedTypes.length > 1) return ['conflicting-types'];

	const issues: PromotionBindingIssue[] = [];
	if (!fact.typeKnown) issues.push('unknown-type');
	if (fact.destinationMatch === 'missing') issues.push('missing-credential');
	if (fact.destinationMatch === 'type-mismatch') issues.push('type-mismatch');
	if (consumers.some((consumer) => consumer.accessStatus === 'unavailable')) {
		issues.push('unavailable');
	}
	issues.push(
		...projectIssues(
			consumers.map((consumer) => consumer.destinationProjectStatus),
			'consuming-project',
		),
	);

	if (fact.destinationMatch === 'missing') {
		const sourceFile = fact.sourceFile;
		if (sourceFile.location !== 'project') {
			issues.push('unknown-owner');
		} else {
			issues.push(...projectIssues([sourceFile.destinationProjectStatus], 'owner-project'));
			if (consumers.some((consumer) => consumer.project.id !== sourceFile.project.id)) {
				issues.push('sharing-required');
			}
		}
	}

	return issues;
}

function projectIssues(
	projectStatuses: PromotionDestinationProjectStatus[],
	role: 'owner-project' | 'consuming-project',
): PromotionBindingIssue[] {
	const issues: PromotionBindingIssue[] = [];
	if (projectStatuses.includes('missing')) issues.push(`${role}-missing`);
	if (projectStatuses.includes('personal')) issues.push(`${role}-not-team`);
	return issues;
}

function sourceFileOf(
	file: InventoryCredential | InventoryVariable | undefined,
	context: DestinationContext,
): PromotionSourceFile {
	if (!file) return { location: 'missing' };
	if (file.projectId === null) return { location: 'outside-project', filePath: file.path };
	return {
		location: 'project',
		project: context.projectOf(file.projectId),
		destinationProjectStatus: context.destinationProjectStatusOf(file.projectId),
		filePath: file.path,
	};
}

/** Variable files by name, sorted by path, so the fallback choice below does not depend on reader order. */
function indexVariableFiles(files: InventoryVariable[]): Map<string, InventoryVariable[]> {
	const byName = new Map<string, InventoryVariable[]>();
	for (const file of [...files].sort((a, b) => compare(a.path, b.path))) {
		pushTo(byName, file.variable.name, file);
	}
	return byName;
}

/** The bundle inside the consuming project wins. Otherwise the first bundle by path is the evidence. */
function variableFile(
	filesByName: Map<string, InventoryVariable[]>,
	name: string,
	projectId: string,
): InventoryVariable | undefined {
	const bundles = filesByName.get(name) ?? [];
	return bundles.find((file) => file.projectId === projectId) ?? bundles[0];
}

function consumersOf(
	uses: CredentialUse[],
	context: DestinationContext,
): Array<Omit<CredentialConsumer, 'accessStatus'>> {
	const byProject = new Map<string, InventoryWorkflow[]>();
	for (const use of uses) pushTo(byProject, use.workflow.projectId, use.workflow);

	return [...byProject.entries()]
		.sort(([a], [b]) => compare(a, b))
		.map(([projectId, workflows]) => ({
			project: context.projectOf(projectId),
			destinationProjectStatus: context.destinationProjectStatusOf(projectId),
			workflows: workflowRefs(workflows),
		}));
}

function workflowRefs(workflows: InventoryWorkflow[]): Array<{ id: string; name: string }> {
	const byId = new Map(workflows.map((workflow) => [workflow.id, workflow]));
	return [...byId.values()]
		.sort((a, b) => compare(a.id, b.id))
		.map(({ id, name }) => ({ id, name }));
}

function variableKey(name: string, projectId: string | null): string {
	return `${projectId ?? ''}\0${name}`;
}

function pushTo<T>(map: Map<string, T[]>, key: string, value: T): void {
	const bucket = map.get(key);
	if (bucket) bucket.push(value);
	else map.set(key, [value]);
}

function unique<T>(values: T[]): T[] {
	return [...new Set(values)];
}

function compare(a: string, b: string): number {
	return a < b ? -1 : a > b ? 1 : 0;
}
