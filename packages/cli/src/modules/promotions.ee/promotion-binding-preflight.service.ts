import type {
	PromotionBindingIssue,
	PromotionBindingPreflightResult,
	PromotionBindingProject,
	PromotionDestinationProject,
	PromotionSourcePlacement,
	PromotionUnresolvedCredential,
	PromotionUnresolvedVariable,
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
	destinationOf: (id: string) => PromotionDestinationProject;
}

type CredentialConsumer = PromotionUnresolvedCredential['consumers'][number];
type CredentialDestination = PromotionUnresolvedCredential['destination'];

/** Everything known about one required credential before its record is built. */
interface CredentialFacts {
	sourceId: string | null;
	name: string;
	expectedTypes: string[];
	/** The one type the workflows agree on, or `undefined` when they disagree. */
	type: string | undefined;
	typeKnown: boolean;
	file: InventoryCredential | undefined;
	sourcePlacement: PromotionSourcePlacement;
	destination: CredentialDestination;
	consumers: Array<Omit<CredentialConsumer, 'access'>>;
}

/** A credential the matcher can check: it has an id, a known type, and exists on the destination. */
interface CheckableCredential {
	sourceId: string;
	type: string;
	name: string;
	workflowIds: string[];
}

/**
 * Finds the credentials and variables the incoming workflows need that the
 * destination cannot resolve. Reads the package files and the database, and
 * never writes to either. Credentials match by source id. Variables match by
 * name inside the consuming project. Each result carries what the files say
 * about the item's owner and what the destination has, so later work can decide
 * where to create it.
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

		return { unresolvedBindings: [...credentials, ...variables] };
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
			destinationOf: (id) => typeById.get(id) ?? 'absent',
		};
	}

	private async checkCredentials(
		inventory: PackageDirectoryInventory,
		context: DestinationContext,
		user: User,
	): Promise<PromotionUnresolvedCredential[]> {
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
				sourcePlacement: placementOf(file, context),
				destination:
					sourceId === null
						? 'unchecked'
						: destinationStateOf(type, destinationTypes.get(sourceId)),
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
		const byProject = new Map<string, CheckableCredential[]>();
		for (const fact of facts) {
			const checkable = asCheckable(fact);
			if (!checkable) continue;
			for (const consumer of fact.consumers) {
				if (consumer.destination === 'team') pushTo(byProject, consumer.project.id, checkable);
			}
		}

		const unavailable = new Set<string>();
		for (const [projectId, candidates] of byProject) {
			const resolution = await this.credentialMatcher.match(
				candidates.map(({ sourceId, name, type, workflowIds }) => ({
					id: sourceId,
					name,
					type,
					usedByWorkflows: workflowIds,
				})),
				{ projectId, user },
			);
			for (const failure of resolution.failures) {
				unavailable.add(accessKey(failure.sourceId, projectId));
			}
		}

		return unavailable;
	}

	private async checkVariables(
		inventory: PackageDirectoryInventory,
		context: DestinationContext,
	): Promise<PromotionUnresolvedVariable[]> {
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
				const destination: PromotionUnresolvedVariable['destination'] = existingKeys.has(
					variableKey(name, null),
				)
					? 'global'
					: 'absent';
				const consumer = {
					project: context.projectOf(projectId),
					destination: context.destinationOf(projectId),
					workflows: workflowRefs(workflows),
				};
				const sourcePlacement = placementOf(variableFile(filesByName, name, projectId), context);
				const issues: PromotionBindingIssue[] = [
					destination === 'global' ? 'global-only' : 'absent',
					...projectIssues([consumer.destination], 'consuming-project'),
					...(sourcePlacement.state === 'known' ? [] : (['unknown-owner'] as const)),
				];
				return {
					kind: 'variable' as const,
					name,
					sourcePlacement,
					consumer,
					destination,
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
function destinationStateOf(
	expectedType: string | undefined,
	destinationType: string | undefined,
): CredentialDestination {
	if (expectedType === undefined) return 'unchecked';
	if (destinationType === undefined) return 'absent';
	return destinationType === expectedType ? 'exists' : 'type-mismatch';
}

function buildCredentialRecord(
	fact: CredentialFacts,
	unavailable: Set<string>,
): PromotionUnresolvedCredential {
	const consumers = fact.consumers.map((consumer) => ({
		...consumer,
		access: accessOf(fact, consumer, unavailable),
	}));

	return {
		kind: 'credential',
		sourceId: fact.sourceId,
		name: fact.name,
		expectedTypes: fact.expectedTypes,
		...(fact.file?.credential.data ? { expressionData: fact.file.credential.data } : {}),
		sourcePlacement: fact.sourcePlacement,
		destination: fact.destination,
		consumers,
		issues: credentialIssues(fact, consumers),
	};
}

function asCheckable(fact: CredentialFacts): CheckableCredential | undefined {
	if (fact.sourceId === null || fact.type === undefined || !fact.typeKnown) return undefined;
	if (fact.destination !== 'exists') return undefined;
	return {
		sourceId: fact.sourceId,
		type: fact.type,
		name: fact.name,
		workflowIds: fact.consumers.flatMap((consumer) => consumer.workflows.map((w) => w.id)),
	};
}

/** Usability is only a question for a checkable credential in a team project that exists. */
function accessOf(
	fact: CredentialFacts,
	consumer: Omit<CredentialConsumer, 'access'>,
	unavailable: Set<string>,
): CredentialConsumer['access'] {
	const checkable = asCheckable(fact);
	if (!checkable || consumer.destination !== 'team') return 'unchecked';
	return unavailable.has(accessKey(checkable.sourceId, consumer.project.id))
		? 'unavailable'
		: 'usable';
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
	if (fact.destination === 'absent' || fact.destination === 'type-mismatch') {
		issues.push(fact.destination);
	}
	if (consumers.some((consumer) => consumer.access === 'unavailable')) {
		issues.push('unavailable');
	}
	issues.push(
		...projectIssues(
			consumers.map((consumer) => consumer.destination),
			'consuming-project',
		),
	);

	if (fact.destination === 'absent') {
		const placement = fact.sourcePlacement;
		if (placement.state !== 'known') {
			issues.push('unknown-owner');
		} else {
			issues.push(...projectIssues([placement.destination], 'owner-project'));
			if (consumers.some((consumer) => consumer.project.id !== placement.project.id)) {
				issues.push('sharing-required');
			}
		}
	}

	return issues;
}

function projectIssues(
	destinations: PromotionDestinationProject[],
	role: 'owner-project' | 'consuming-project',
): PromotionBindingIssue[] {
	const issues: PromotionBindingIssue[] = [];
	if (destinations.includes('absent')) issues.push(`${role}-absent`);
	if (destinations.includes('personal')) issues.push(`${role}-not-team`);
	return issues;
}

function placementOf(
	file: InventoryCredential | InventoryVariable | undefined,
	context: DestinationContext,
): PromotionSourcePlacement {
	if (!file) return { state: 'none' };
	if (file.projectId === null) return { state: 'unknown', filePath: file.path };
	return {
		state: 'known',
		project: context.projectOf(file.projectId),
		destination: context.destinationOf(file.projectId),
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
): Array<Omit<CredentialConsumer, 'access'>> {
	const byProject = new Map<string, InventoryWorkflow[]>();
	for (const use of uses) pushTo(byProject, use.workflow.projectId, use.workflow);

	return [...byProject.entries()]
		.sort(([a], [b]) => compare(a, b))
		.map(([projectId, workflows]) => ({
			project: context.projectOf(projectId),
			destination: context.destinationOf(projectId),
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
