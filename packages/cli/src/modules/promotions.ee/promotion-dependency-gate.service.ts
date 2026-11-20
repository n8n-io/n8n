import type {
	PromotionApplyCheck,
	PromotionCredentialGrant,
	PromotionCredentialMove,
	PromotionDependencyReport,
	PromotionKeptProject,
	PromotionKeptWorkflow,
	PromotionLiveWorkflowsWithEmptyCredential,
	PromotionCreatedEmptyCredential,
	PromotionReferenceUsage,
	PromotionResource,
	PromotionResourceWarning,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import {
	CredentialsRepository,
	ProjectRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	WorkflowDependencyRepository,
	WorkflowRepository,
	type User,
} from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { ConflictError } from '@n8n/errors';

import { CredentialsService } from '@/credentials/credentials.service';
import { EnterpriseCredentialsService } from '@/credentials/credentials.service.ee';
import type { PackageImportPlan } from '@/modules/n8n-packages/engine/project-package-importer';
import {
	PackageDirectoryInventoryReader,
	type PackageDirectoryInventory,
} from '@/modules/n8n-packages/io/directory/package-directory-inventory-reader';
import { PackageImportConfig } from '@/modules/n8n-packages/n8n-packages.config';
import {
	CredentialOwnerPolicy,
	importSelectionProjects,
	type ImportCredentialDependencies,
	type ImportResult,
	type ImportSelection,
	type PromotionLayoutProperties,
} from '@/modules/n8n-packages/n8n-packages.types';
import { MANIFEST_FILE } from '@/modules/n8n-packages/spec/constants';
import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';

import { reconcileApplyCheck } from './apply-check-reconcile';
import { PACKAGE_SUBFOLDER } from './constants';
import {
	describeGapWithFix,
	describeHardBlock,
	PromotionDependencyCheckService,
	renderGapsForCommitMessage,
	renderGapsForReviewDescription,
	requirementReasons,
	verifyConfirmedGaps,
	type ApplyCheckActions,
	type ApplyCheckOutcome,
	type CheckSelection,
} from './dependency-check';
import { ResourceWarningsService } from './dependency-check/resource-warnings.service';
import { GitCommitPackageReader } from './git-commit-package-reader';
import { promoteDeletionCallers } from './project-moves';
import { PromotionAccessService } from './promotion-access.service';
import { PromotionProvidersService } from './promotion-providers.service';
import { PromotionWorkingDirectoryService } from './promotion-working-directory.service';
import { PromotionsGitService } from './promotions-git.service';
import { checkoutBranchName, repositoryUrl } from './promotions-git.utils';
import type { PromotionOperationInput } from './promotions.types';

/** What the dependency check of a Promote reads. */
export type PromoteDependencyContext = {
	user: User;
	input: PromotionOperationInput;
	/** The items that the Promote writes: one entry for each project, in the order of the view. */
	selection: readonly CheckSelection[];
};

/** What the dependency check of an Apply reads. */
export type ApplyDependencyContext = {
	user: User;
	input: PromotionOperationInput;
	/** The package files at the commit that the Apply reads, by their path in the package. */
	files: ReadonlyMap<string, Buffer>;
	/** `'instance'` for a whole-instance Apply. */
	selection: readonly CheckSelection[] | 'instance';
	credentialHomes?: Record<string, string>;
};

/** The confirmations of an Apply request. */
export type ApplyConfirmations = {
	confirmedGapIds?: string[];
	confirmedGrantIds?: string[];
	confirmDeletionCallers?: boolean;
	/** The `id` of each `deletionCallers` row that the user saw and accepts. */
	confirmedDeletionCallerIds?: string[];
	credentialHomes?: Record<string, string>;
};

/** What the Apply operation does after the check. */
export type ApplyDependencyDecision =
	| {
			/** Write nothing and return `gaps-changed` with the report. */
			status: 'stop';
			report: PromotionDependencyReport;
	  }
	| {
			status: 'continue';
			report: PromotionDependencyReport;
			actions: ApplyCheckActions;
			/** The options that the import plan of the Apply needs. */
			importOptions: Pick<
				PromotionLayoutProperties,
				'credentialDependencies' | 'retainedWorkflowIds'
			>;
			/** The confirmed grants that the report lists. `giveConfirmedGrants` gives them. */
			pendingGrants: PromotionCredentialGrant[];
			/** The grants that the Apply gave, or found in place. They stay when the Apply then stops. */
			grants: PromotionCredentialGrant[];
			/** The home of each top-level credential that the user selected and the check accepted. */
			homes: Map<string, { id: string; name: string }>;
			confirmedGrantIds: string[];
	  };

/** The dependency part of an `applied` result. */
export type ApplyDependencyResult = {
	createdEmptyCredentials?: PromotionCreatedEmptyCredential[];
	grants?: PromotionCredentialGrant[];
	credentialMoves?: PromotionCredentialMove[];
	keptWorkflows?: PromotionKeptWorkflow[];
	keptProjects?: PromotionKeptProject[];
	liveWorkflowsWithEmptyCredential?: PromotionLiveWorkflowsWithEmptyCredential[];
	dependencyMessages?: string[];
};

const USAGE_TEXT: Record<PromotionReferenceUsage, string> = {
	credential: 'credential',
	'sub-workflow': 'sub-workflow',
	'error-workflow': 'error workflow',
};

/** One sentence for a data table or a variable that another project owns. */
export function describeResourceWarning({
	code,
	consumer,
	resource,
}: PromotionResourceWarning): string {
	const what = code === 'data-table-of-other-project' ? 'data table' : 'variable';
	const label = resource.name ? `"${resource.name}"` : `with the id ${resource.id ?? ''}`.trim();
	const project = resource.project ? `project "${resource.project.name}"` : 'another project';
	return `Workflow "${consumer.name}" uses the ${what} ${label} of ${project}. The operation does not copy it, and the reference does not resolve in the project of the workflow.`;
}

const unique = <T>(values: Iterable<T>): T[] => [...new Set(values)];

/**
 * The one place where promotion asks for a dependency report, compares it with the
 * confirmations of the user, and turns it into what the operation does. Each preview and each
 * operation calls it with the same selection, so they get the same report and the same gap ids.
 */
@Service()
export class PromotionDependencyGate {
	constructor(
		private readonly check: PromotionDependencyCheckService,
		private readonly gitService: PromotionsGitService,
		private readonly workingDirectory: PromotionWorkingDirectoryService,
		private readonly providersService: PromotionProvidersService,
		private readonly packageImportConfig: PackageImportConfig,
		private readonly access: PromotionAccessService,
		private readonly credentialsService: EnterpriseCredentialsService,
		private readonly plainCredentialsService: CredentialsService,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly inventoryReader: PackageDirectoryInventoryReader,
		private readonly logger: Logger,
		private readonly workflowDependencyRepository: WorkflowDependencyRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly resourceWarnings: ResourceWarningsService,
	) {
		this.logger = this.logger.scoped('promotions');
	}

	// -- Promote ---------------------------------------------------------------

	/**
	 * The report of a Promote of `selection`. It reads the branch at the remote head, so it
	 * must run before the Promote changes the checkout.
	 */
	async promoteReport({
		user,
		input,
		selection,
	}: PromoteDependencyContext): Promise<PromotionDependencyReport> {
		const reader = await this.readPromoteBranch(input);
		const report = await this.check.checkPromote({
			user,
			input,
			selection: selection.map(withoutFolders),
			branch: reader ? { reader } : null,
		});

		// A Promote that removes a workflow which the branch still calls: information only.
		const deletedWorkflowIds = selection.flatMap((item) => item.deletedWorkflowIds ?? []);
		if (reader && deletedWorkflowIds.length > 0) {
			try {
				const branchManifest = await reader.readManifest();
				const readable = await this.access.readableProjectIds(
					user,
					(branchManifest.projects ?? []).map(({ id }) => id),
				);
				report.deletionCallers = promoteDeletionCallers({
					deletedWorkflowIds,
					branchManifest,
					rewrittenWorkflowIds: selection.flatMap((item) => item.workflowIds ?? []),
					readableProjectIds: readable,
				});
			} catch (error) {
				// The list does not stop a Promote, so a manifest that cannot be read does not either.
				this.logger.warn('Could not read the callers of the workflows that a Promote removes', {
					error,
				});
			}
		}

		// A data table or a project variable of another project: a warning, never a gap.
		try {
			const warnings = await this.resourceWarnings.forPromote(user, selection);
			if (warnings.length > 0) report.resourceWarnings = warnings;
		} catch (error) {
			this.logger.warn('Could not check the data tables and variables of a Promote', { error });
		}

		await this.markOwnerRequests(report, user, input);
		return report;
	}

	/**
	 * The report of a Promote preview: the Promote of every change that the user can promote.
	 * A failure gives no report, so the preview still loads. The operation computes the report
	 * again and does not catch a failure.
	 */
	async promotePreviewReport(args: {
		user: User;
		input: PromotionOperationInput;
		resources: readonly PromotionResource[];
		operableProjectIds: ReadonlySet<string>;
		/** A project resource has no `projectId`, so a project preview gives its project. */
		defaultProjectId?: string;
	}): Promise<PromotionDependencyReport | undefined> {
		try {
			const selection = selectionOfChanges(
				args.resources,
				args.operableProjectIds,
				args.defaultProjectId,
			);
			return await this.promoteReport({ user: args.user, input: args.input, selection });
		} catch (error) {
			this.logger.error('Could not compute the dependency report of a Promote preview', { error });
			return undefined;
		}
	}

	/** Every workflow and every credential of the team projects: what an instance Promote writes. */
	async instancePromoteSelection(projectIds: readonly string[]): Promise<CheckSelection[]> {
		const selection: CheckSelection[] = [];
		for (const projectId of projectIds) {
			const [workflowIds, credentials] = await Promise.all([
				this.sharedWorkflowRepository.findOwnedWorkflowIdsByProjects([projectId]),
				this.sharedCredentialsRepository.findOwnedCredentialsByProjects([projectId]),
			]);
			selection.push({
				projectId,
				workflowIds,
				// The export of a whole project writes each project credential that the user can read.
				credentialIds: (
					await this.plainCredentialsService.keepWithValues(
						credentials.filter(({ usageScope }) => usageScope === 'project'),
					)
				).map(({ id }) => id),
			});
		}
		return selection;
	}

	/**
	 * True when the Promote must write nothing: the report has a hard block, or the gaps differ
	 * from the confirmed ones.
	 */
	mustStop(report: PromotionDependencyReport, confirmedGapIds: readonly string[] = []): boolean {
		return report.blocked || verifyConfirmedGaps(report, confirmedGapIds) === 'changed';
	}

	/** For a Promote route whose result has no status: the stop becomes an error with the gaps. */
	assertCanPromote(report: PromotionDependencyReport, confirmedGapIds?: readonly string[]): void {
		if (!this.mustStop(report, confirmedGapIds)) return;
		// The message is the only report of this route, so each line gives the fix.
		const blocks = report.hardBlocks.map(describeHardBlock);
		const gaps = report.gaps.map(describeGapWithFix);
		const reason =
			blocks.length > 0
				? 'A confirmation does not lift a block.'
				: 'The dependency gaps differ from the confirmed gaps. Close each gap, or send its id in `confirmedGapIds`.';
		throw new ConflictError(
			[
				`The Promote stopped and wrote nothing. ${reason}`,
				...(blocks.length > 0
					? [`${blocks.length === 1 ? 'Block' : 'Blocks'}: ${blocks.join('; ')}`]
					: []),
				...(gaps.length > 0 ? [`${gaps.length === 1 ? 'Gap' : 'Gaps'}: ${gaps.join('; ')}`] : []),
			].join(' '),
		);
	}

	/**
	 * Writes on each requirement row why its target is not on the branch: a confirmed gap, a
	 * reference that is broken on the source, or an instance credential. Apply reads the reason.
	 */
	withRequirementReasons(
		manifest: PackageManifest,
		report: PromotionDependencyReport,
	): PackageManifest {
		const reasons = requirementReasons(report);
		const { requirements } = manifest;
		if (reasons.size === 0 || !requirements) return manifest;
		return {
			...manifest,
			requirements: {
				...requirements,
				...(requirements.credentials
					? {
							credentials: requirements.credentials.map((row) => {
								const reason = reasons.get(`credential:${row.id}`);
								return reason ? { ...row, reason } : row;
							}),
						}
					: {}),
				...(requirements.workflows
					? {
							workflows: requirements.workflows.map((row) => {
								const reason = reasons.get(`workflow:${row.id}`);
								return reason ? { ...row, reason } : row;
							}),
						}
					: {}),
			},
		};
	}

	/** The commit message of a Promote with gaps lists the gaps that the user can see. */
	commitMessageWithGaps(message: string, report: PromotionDependencyReport): string {
		const gaps = renderGapsForCommitMessage(report);
		return gaps === '' ? message : `${message.trimEnd()}\n\n${gaps}`;
	}

	/** The title and the description of the review. Not set when the commit message is enough. */
	reviewMessageWithGaps(message: string, report: PromotionDependencyReport): string | undefined {
		const gaps = renderGapsForReviewDescription(report);
		return gaps === '' ? undefined : `${message.trimEnd()}\n\n${gaps}`;
	}

	// -- Apply -----------------------------------------------------------------

	/** The report of an Apply, with what the operation must do. Never send `actions` to a client. */
	async applyOutcome(context: ApplyDependencyContext): Promise<ApplyCheckOutcome> {
		const { user, input, files, selection, credentialHomes } = context;
		const outcome = await this.check.checkApplyWithActions({
			user,
			input,
			branch: { reader: new GitCommitPackageReader(files) },
			selection: selection === 'instance' ? 'instance' : selection.map(withoutFolders),
			...(credentialHomes ? { credentialHomes } : {}),
		});
		await this.addKeptProjects(outcome, user);
		// A data table or a project variable of another project: a warning, never a gap. The
		// import leaves such a reference as it is.
		try {
			const manifest = await new GitCommitPackageReader(files).readManifest();
			const warnings = await this.resourceWarnings.forApply(
				user,
				manifest,
				selection === 'instance' ? 'instance' : selection,
			);
			if (warnings.length > 0) outcome.report.resourceWarnings = warnings;
		} catch (error) {
			this.logger.warn('Could not check the data tables and variables of an Apply', { error });
		}
		await this.markOwnerRequests(outcome.report, user, input);
		return outcome;
	}

	/**
	 * The report of an Apply preview, and the check without the rows that the report describes.
	 * A failure gives no report and the check as it was, so the preview still loads.
	 */
	async applyPreviewReport<T extends PromotionApplyCheck>(
		context: ApplyDependencyContext,
		check: T,
	): Promise<{ check: T; dependencyReport?: PromotionDependencyReport }> {
		try {
			const { report, actions } = await this.applyOutcome(context);
			return {
				check: reconcileApplyCheck(check, report, {
					keptProjectIds: new Set(actions.keptProjects.map(({ projectId }) => projectId)),
				}),
				dependencyReport: report,
			};
		} catch (error) {
			this.logger.error('Could not compute the dependency report of an Apply preview', { error });
			return { check: await this.withoutUnreadableOwners(context.user, check) };
		}
	}

	/**
	 * Without a report, the check is not reconciled, and its credential rows can name the owner
	 * project of a credential. Such a row stays only when the user can read that project.
	 */
	private async withoutUnreadableOwners<T extends PromotionApplyCheck>(
		user: User,
		check: T,
	): Promise<T> {
		const ownerIds = unique(
			check.missingBindings.flatMap((binding) =>
				binding.kind === 'credential' && binding.ownerProject ? [binding.ownerProject.id] : [],
			),
		);
		if (ownerIds.length === 0) return check;
		let readable = new Set<string>();
		try {
			readable = await this.access.readableProjectIds(user, ownerIds);
		} catch (error) {
			this.logger.warn('Could not read the access to the owner projects of an Apply check', {
				error,
			});
		}
		return {
			...check,
			missingBindings: check.missingBindings.filter(
				(binding) =>
					binding.kind !== 'credential' ||
					!binding.ownerProject ||
					readable.has(binding.ownerProject.id),
			),
		};
	}

	/**
	 * Checks the Apply and compares the report with the confirmations of the user.
	 *
	 * It stops, before any write, when the gaps differ from the confirmed gaps, when the
	 * report has a hard block, and while the
	 * Apply deletes a workflow that other workflows call and the user did not accept that.
	 *
	 * It writes nothing, so an operation can call it for each selection that it plans: the plan
	 * of the moves between projects can add a project to the selection. The import plans a
	 * confirmed grant as given. Call `giveConfirmedGrants` for the final decision, before the
	 * Apply compares its plan. A grant that the report does not list is ignored.
	 */
	async decideApply(
		context: Omit<ApplyDependencyContext, 'credentialHomes'>,
		confirmations: ApplyConfirmations,
	): Promise<ApplyDependencyDecision> {
		const { report, actions } = await this.applyOutcome({
			...context,
			...(confirmations.credentialHomes ? { credentialHomes: confirmations.credentialHomes } : {}),
		});
		if (
			verifyConfirmedGaps(report, confirmations.confirmedGapIds) === 'changed' ||
			report.hardBlocks.length > 0 ||
			!this.deletionCallersConfirmed(report, confirmations, context)
		) {
			return { status: 'stop', report };
		}

		const confirmedGrantIds = new Set(confirmations.confirmedGrantIds ?? []);
		const pendingGrants = report.grants.filter(({ id }) => confirmedGrantIds.has(id));

		const homes = await this.acceptedHomes(report, confirmations.credentialHomes);
		const stubIds = actions.emptyCredentials.map(({ credential }) => credential.id);
		const stubs = new Set(stubIds);
		const credentialDependencies: ImportCredentialDependencies = {
			credentialOwnerPolicy: CredentialOwnerPolicy.FollowPackage,
			stubCredentialIds: stubIds,
			// The check selected the home of each empty credential. The import must use the same one.
			stubHomes: Object.fromEntries(
				actions.emptyCredentials.map(({ credential, projectId }) => [credential.id, projectId]),
			),
			// A confirmed gap without an empty credential, and a reference that is broken on the source:
			// the import writes the reference unchanged.
			allowedUnresolvedCredentialIds: unique(
				[...report.gaps, ...report.warnings]
					.filter(({ target }) => target.kind === 'credential' && !stubs.has(target.id))
					.map(({ target }) => target.id),
			),
			credentialGrants: pendingGrants.map(({ credential, project }) => ({
				credentialId: credential.id,
				projectId: project.id,
			})),
			credentialHomes: Object.fromEntries([...homes].map(([id, home]) => [id, home.id])),
		};

		return {
			status: 'continue',
			report,
			actions,
			importOptions: {
				credentialDependencies,
				...(actions.keptWorkflowIds.length > 0
					? { retainedWorkflowIds: actions.keptWorkflowIds }
					: {}),
			},
			pendingGrants,
			grants: [],
			homes,
			confirmedGrantIds: [],
		};
	}

	/**
	 * Whether the user accepted the callers of the workflows that the Apply deletes.
	 * `confirmedDeletionCallerIds` must name exactly the current rows, so a caller that appeared
	 * after the preview stops the Apply. The flag `confirmDeletionCallers` alone still accepts
	 * every caller: a client of an earlier version sends only the flag.
	 */
	private deletionCallersConfirmed(
		report: PromotionDependencyReport,
		confirmations: ApplyConfirmations,
		context: Pick<ApplyDependencyContext, 'input'>,
	): boolean {
		if (report.deletionCallers.length === 0) return true;
		if (confirmations.confirmedDeletionCallerIds !== undefined) {
			const confirmed = new Set(confirmations.confirmedDeletionCallerIds);
			const current = report.deletionCallers.map(({ id }) => id);
			return (
				confirmed.size === current.length &&
				current.every((id) => id !== undefined && confirmed.has(id))
			);
		}
		if (confirmations.confirmDeletionCallers !== true) return false;
		this.logger.info(
			'Apply accepted the callers of deleted workflows by the flag, without their ids',
			{ environmentId: context.input.environmentId, rowCount: report.deletionCallers.length },
		);
		return true;
	}

	/**
	 * Gives each confirmed grant that the report lists, now: a grant stays when the Apply then
	 * stops on something else, and a retry finds it in place. A confirmed grant that was not
	 * given still stops the Apply, as an access requirement.
	 */
	async giveConfirmedGrants(
		user: User,
		decision: Extract<ApplyDependencyDecision, { status: 'continue' }>,
	): Promise<void> {
		const given: PromotionCredentialGrant[] = [];
		for (const grant of decision.pendingGrants) {
			const { status } = await this.credentialsService.grantProjectAccess(
				user,
				grant.credential.id,
				grant.project.id,
			);
			if (status === 'granted' || status === 'already-usable') given.push(grant);
		}
		decision.grants = given;
		decision.confirmedGrantIds = given.map(({ id }) => id);
	}

	/** The check of the operation, without the rows that the report describes. */
	reconcileCheck<T extends PromotionApplyCheck>(
		check: T,
		decision: Extract<ApplyDependencyDecision, { status: 'continue' }>,
	): T {
		return reconcileApplyCheck(check, decision.report, {
			confirmedGrantIds: decision.confirmedGrantIds,
			homes: decision.homes,
			keptProjectIds: this.keptProjectIds(decision),
		});
	}

	keptProjectIds(decision: Extract<ApplyDependencyDecision, { status: 'continue' }>): Set<string> {
		return new Set(decision.actions.keptProjects.map(({ projectId }) => projectId));
	}

	/**
	 * The import plan is the second opinion on the empty credentials: it uses its own order of the
	 * projects. An empty credential that it may not create becomes a hard block, so the Apply stops.
	 * Returns true when it added a block.
	 */
	addPlanBlocks(report: PromotionDependencyReport, plan: PackageImportPlan): boolean {
		const known = new Set(
			report.hardBlocks
				.filter(({ code }) => code === 'credential-create-forbidden')
				.map(({ target }) => target.id),
		);
		let added = false;
		for (const { plan: scope } of plan.scopes) {
			for (const id of scope.credentialPlan.stubForbidden ?? []) {
				if (known.has(id)) continue;
				known.add(id);
				const gap = report.gaps.find(
					({ target }) => target.kind === 'credential' && target.id === id,
				);
				report.hardBlocks.push({
					code: 'credential-create-forbidden',
					target: gap?.target ?? { kind: 'credential', id },
					...(gap ? { consumer: gap.consumer } : {}),
					detail: { missingPermission: 'credential:create' },
				});
				added = true;
			}
		}
		if (added) report.blocked = true;
		return added;
	}

	/** What the Apply did for its dependencies. Each list holds only what the user may see. */
	async applyResult(
		user: User,
		decision: Extract<ApplyDependencyDecision, { status: 'continue' }>,
		result: ImportResult,
		deletedProjectIds: readonly string[] = [],
	): Promise<ApplyDependencyResult> {
		const { report, grants } = decision;
		const messages: string[] = [];

		const createdEmptyCredentials = (result.credentials.createdStubs ?? []).map(
			({ id, name, type, projectId }) => ({ id, name, type, projectId }),
		);
		for (const { name } of createdEmptyCredentials) {
			messages.push(
				`Created the empty credential "${name}". Add its values before you publish a workflow that uses it.`,
			);
		}

		// The report already holds each move with what the user may see of the old owner.
		const reported = new Map(report.credentialMoves.map((move) => [move.credential.id, move]));
		const credentialMoves = (result.credentials.moves ?? []).flatMap(
			(move): PromotionCredentialMove[] => {
				const known = reported.get(move.credentialId);
				if (!known) return [];
				if (move.status === 'moved') return [{ ...known, allowed: true, blockedReason: undefined }];
				const blockedReason =
					move.status === 'excluded'
						? move.reason === 'managed'
							? ('managed' as const)
							: ('end-user' as const)
						: (known.blockedReason ?? ('no-move-right' as const));
				return [{ ...known, allowed: false, blockedReason }];
			},
		);
		for (const { credential, allowed, blockedReason, toProject } of credentialMoves) {
			if (allowed) continue;
			messages.push(
				blockedReason === 'managed' || blockedReason === 'end-user'
					? `"${credential.name}" is ${blockedReason === 'managed' ? 'a managed' : 'an end-user'} credential, so it stays where it is.`
					: blockedReason === 'missing-create-right'
						? `"${credential.name}" did not move into project "${toProject.name}": you may not create a credential in that project.`
						: `"${credential.name}" has another owner on the destination. A user who may move it must apply.`,
			);
		}

		// A published version that references the id of a new empty credential now reads an empty
		// credential. The Apply does not unpublish, so the result says which workflows to check.
		const liveWorkflowsWithEmptyCredential = await this.liveWorkflowsWithEmptyCredential(
			user,
			createdEmptyCredentials,
		);
		for (const { credential, workflows, hiddenWorkflowCount } of liveWorkflowsWithEmptyCredential) {
			const names = workflows.map(({ name }) => `"${name}"`);
			if (hiddenWorkflowCount > 0) {
				names.push(
					`${hiddenWorkflowCount} workflow${hiddenWorkflowCount === 1 ? '' : 's'} that you cannot access`,
				);
			}
			messages.push(
				`The published version of ${names.join(', ')} uses the empty credential "${credential.name}". It fails until the credential has values.`,
			);
		}

		// A warning does not stop the Apply. The result repeats it for a client that shows no report.
		for (const { consumer, target, usage, code } of report.warnings) {
			const label = target.name ? `"${target.name}"` : `id ${target.id}`;
			messages.push(
				code === 'broken-on-source'
					? `Workflow "${consumer.name}" references the ${USAGE_TEXT[usage]} ${label}. The reference is broken on the source and stays broken.`
					: `Workflow "${consumer.name}" references the ${USAGE_TEXT[usage]} ${label}. The branch does not hold it and does not say why, so the reference stays as it is.`,
			);
		}
		for (const warning of report.resourceWarnings ?? []) {
			messages.push(describeResourceWarning(warning));
		}

		for (const { name, referencedBy } of report.keptWorkflows) {
			messages.push(
				`Workflow "${name}" was not deleted, because ${referencedBy.map((caller) => `"${caller.name}"`).join(', ')} still ${referencedBy.length === 1 ? 'references' : 'reference'} it.`,
			);
		}
		const deleted = new Set(deletedProjectIds);
		const keptProjects = (report.keptProjects ?? []).filter(
			({ project }) => !deleted.has(project.id),
		);
		for (const { project, credentials } of keptProjects) {
			messages.push(
				`Project "${project.name}" was not deleted, because the package uses ${credentials.map(({ name }) => `"${name}"`).join(', ')} of that project.`,
			);
		}

		return {
			...(createdEmptyCredentials.length > 0 ? { createdEmptyCredentials } : {}),
			...(grants.length > 0 ? { grants } : {}),
			...(credentialMoves.length > 0 ? { credentialMoves } : {}),
			...(report.keptWorkflows.length > 0 ? { keptWorkflows: report.keptWorkflows } : {}),
			...(keptProjects.length > 0 ? { keptProjects } : {}),
			...(liveWorkflowsWithEmptyCredential.length > 0 ? { liveWorkflowsWithEmptyCredential } : {}),
			...(messages.length > 0 ? { dependencyMessages: messages } : {}),
		};
	}

	/**
	 * The workflows whose published version references the id of an empty credential that the Apply
	 * created. The workflow index holds the references of each published version. A workflow is
	 * named only when the user can read its project. Never throws: the Apply is done.
	 */
	private async liveWorkflowsWithEmptyCredential(
		user: User,
		createdEmptyCredentials: PromotionCreatedEmptyCredential[],
	): Promise<PromotionLiveWorkflowsWithEmptyCredential[]> {
		if (createdEmptyCredentials.length === 0) return [];
		try {
			const rows = await this.workflowDependencyRepository.findDependenciesForResources(
				createdEmptyCredentials.map(({ id }) => id),
				['credentialId'],
				false,
			);
			const live = rows.filter(({ publishedVersionId }) => publishedVersionId !== null);
			if (live.length === 0) return [];
			const workflowIds = unique(live.map(({ workflowId }) => workflowId));
			const [owners, names] = await Promise.all([
				this.sharedWorkflowRepository.findOwnerProjectsByWorkflowIds(workflowIds),
				this.workflowRepository.findByIds(workflowIds, { fields: ['name'] }),
			]);
			const nameOf = new Map(names.map(({ id, name }) => [id, name]));
			const readable = await this.access.readableProjectIds(
				user,
				unique([...owners.values()].map(({ id }) => id)),
			);
			return createdEmptyCredentials.flatMap(
				({ id, name }): PromotionLiveWorkflowsWithEmptyCredential[] => {
					const ids = unique(
						live.filter(({ dependencyKey }) => dependencyKey === id).map((row) => row.workflowId),
					);
					if (ids.length === 0) return [];
					const visible = ids.filter((workflowId) => {
						const owner = owners.get(workflowId);
						return owner !== undefined && readable.has(owner.id);
					});
					return [
						{
							credential: { id, name },
							workflows: visible.map((workflowId) => ({
								id: workflowId,
								name: nameOf.get(workflowId) ?? workflowId,
							})),
							hiddenWorkflowCount: ids.length - visible.length,
						},
					];
				},
			);
		} catch (error) {
			this.logger.warn('Could not read the published workflows that use a new empty credential', {
				error,
			});
			return [];
		}
	}

	/** The report of the Apply preview of one project: the Apply of the whole project. */
	async projectApplyPreviewReport<T extends PromotionApplyCheck>(
		args: Omit<ApplyDependencyContext, 'selection' | 'credentialHomes'> & { projectId: string },
		check: T,
	): Promise<{ check: T; dependencyReport?: PromotionDependencyReport }> {
		let selection: CheckSelection[];
		try {
			const inventory = await this.inventoryReader.read(new GitCommitPackageReader(args.files));
			selection = await this.projectApplySelection(inventory, args.projectId);
		} catch (error) {
			this.logger.error('Could not read the package for the dependency report', { error });
			return { check: await this.withoutUnreadableOwners(args.user, check) };
		}
		return await this.applyPreviewReport(
			{ user: args.user, input: args.input, files: args.files, selection },
			check,
		);
	}

	/** The check selection of an import selection. `credentialIds` adds the selected credentials. */
	toCheckSelection(
		selection: ImportSelection,
		credentialIdsByProject: ReadonlyMap<string, readonly string[]> = new Map(),
	): CheckSelection[] {
		return importSelectionProjects(selection).map((project) => ({
			projectId: project.selectedProjectId,
			workflowIds: project.selectedWorkflowIds,
			credentialIds: unique([
				...(project.selectedCredentialIds ?? []),
				...(credentialIdsByProject.get(project.selectedProjectId) ?? []),
			]),
			deletedWorkflowIds: project.deletedWorkflowIds ?? [],
		}));
	}

	/**
	 * The Apply of a whole project, as the project preview plans it: every workflow of the
	 * project on the branch, and the deletion of each workflow that only this instance holds.
	 */
	async projectApplySelection(
		inventory: PackageDirectoryInventory,
		projectId: string,
	): Promise<CheckSelection[]> {
		const workflowIds = inventory.workflows
			.filter((workflow) => workflow.projectId === projectId)
			.map(({ id }) => id);
		const onBranch = new Set(inventory.workflows.map(({ id }) => id));
		const owned = await this.sharedWorkflowRepository.findOwnedWorkflowIdsByProjects([projectId]);
		return [
			{
				projectId,
				workflowIds,
				// A workflow that the branch holds in another project moves. It is not deleted.
				deletedWorkflowIds: owned.filter((id) => !onBranch.has(id)),
			},
		];
	}

	// -- Ask the owner ---------------------------------------------------------

	/** Closes the "Ask the owner" requests for what a Promote or an Apply wrote. Never throws. */
	async closeOwnerRequests(
		input: PromotionOperationInput,
		resources: Array<{ kind: 'credential' | 'workflow'; id: string }>,
	): Promise<void> {
		if (resources.length === 0) return;
		try {
			const service = await this.ownerRequests();
			await service.closeSatisfied(input.environmentId, input.config.direction, resources);
		} catch (error) {
			this.logger.warn('Could not close the owner requests of a promotion', { error });
		}
	}

	private async markOwnerRequests(
		report: PromotionDependencyReport,
		user: User,
		input: PromotionOperationInput,
	): Promise<void> {
		if (!report.gaps.some(({ exits }) => exits.includes('ask-owner'))) return;
		try {
			const service = await this.ownerRequests();
			const sent = await service.findSentRequestKeys(
				user,
				input.environmentId,
				input.config.direction,
			);
			for (const gap of report.gaps) {
				if (gap.exits.includes('ask-owner') && sent.has(`${gap.target.kind}:${gap.target.id}`)) {
					gap.ownerRequestSent = true;
				}
			}
		} catch (error) {
			this.logger.warn('Could not read the owner requests of a promotion', { error });
		}
	}

	/** Loaded here: the owner request service depends on the promotions service. */
	private async ownerRequests() {
		const { PromotionOwnerRequestService } = await import('./promotion-owner-request.service.js');
		return Container.get(PromotionOwnerRequestService);
	}

	// -- Helpers ---------------------------------------------------------------

	/** The package at the remote head of the promote branch. `null` when it holds none yet. */
	private async readPromoteBranch(
		input: PromotionOperationInput,
	): Promise<GitCommitPackageReader | null> {
		const operation = {
			remoteUrl: repositoryUrl(input),
			credentials: await this.providersService.decryptCredentials({
				authType: input.authType,
				auth: input.encryptedAuth,
			}),
			paths: this.workingDirectory.paths(input.environmentId),
			branchName: checkoutBranchName(input.config),
			environmentId: input.environmentId,
		};
		let commitSha: string | null;
		try {
			({ commitSha } = await this.gitService.listBranchTree({
				...operation,
				pathspecs: [`${PACKAGE_SUBFOLDER}/${MANIFEST_FILE}`],
			}));
		} catch (error) {
			// The first Promote creates the branch.
			if (await this.gitService.hasRemoteBranch(operation)) throw error;
			return null;
		}
		if (commitSha === null) return null;
		const files = await this.gitService.readTreeAtCommit({
			...operation,
			commitSha,
			directory: PACKAGE_SUBFOLDER,
			limits: this.packageImportConfig,
		});
		return files.has(MANIFEST_FILE) ? new GitCommitPackageReader(files) : null;
	}

	/** Adds the projects that the instance Apply keeps to the report, with the no-leak rule. */
	private async addKeptProjects({ report, actions }: ApplyCheckOutcome, user: User): Promise<void> {
		if (actions.keptProjects.length === 0) return;
		const projectIds = actions.keptProjects.map(({ projectId }) => projectId);
		const credentialIds = unique(actions.keptProjects.flatMap((kept) => kept.credentialIds));
		const [readable, projects, credentials] = await Promise.all([
			this.access.readableProjectIds(user, projectIds),
			this.projectRepository.findTeamProjectInfoByIds(projectIds),
			this.credentialsRepository.findNamesByIds(credentialIds),
		]);
		const projectNames = new Map(projects.map(({ id, name }) => [id, name]));
		const credentialNames = new Map(credentials.map(({ id, name }) => [id, name]));
		const kept: PromotionKeptProject[] = [];
		let hidden = 0;
		for (const { projectId, credentialIds: ids } of actions.keptProjects) {
			const name = projectNames.get(projectId);
			if (name === undefined || !readable.has(projectId)) {
				hidden++;
				continue;
			}
			kept.push({
				project: { id: projectId, name },
				credentials: ids.map((id) => ({ id, name: credentialNames.get(id) ?? id })),
			});
		}
		if (kept.length > 0) report.keptProjects = kept;
		if (hidden > 0) report.hiddenKeptProjectCount = hidden;
	}

	/** The homes that the check accepted: a selected home that left no choice open. */
	private async acceptedHomes(
		report: PromotionDependencyReport,
		credentialHomes: Record<string, string> | undefined,
	): Promise<Map<string, { id: string; name: string }>> {
		const homes = new Map<string, { id: string; name: string }>();
		const open = new Set(report.credentialHomeChoices.map(({ credential }) => credential.id));
		const entries = Object.entries(credentialHomes ?? {}).filter(([id]) => !open.has(id));
		if (entries.length === 0) return homes;
		const projects = await this.projectRepository.findTeamProjectInfoByIds(
			unique(entries.map(([, projectId]) => projectId)),
		);
		const names = new Map(projects.map(({ id, name }) => [id, name]));
		for (const [credentialId, projectId] of entries) {
			const name = names.get(projectId);
			if (name !== undefined) homes.set(credentialId, { id: projectId, name });
		}
		return homes;
	}
}

/** A selected folder writes the folder, not the workflows inside it, so the check ignores it. */
function withoutFolders({ folderIds: _folderIds, ...selection }: CheckSelection): CheckSelection {
	return selection;
}

/**
 * The selection of "every change": the added and the changed workflows of each project that
 * the user can operate, and the deleted ones. A credential comes with its workflows.
 */
function selectionOfChanges(
	resources: readonly PromotionResource[],
	operableProjectIds: ReadonlySet<string>,
	defaultProjectId?: string,
): CheckSelection[] {
	const byProject = new Map<
		string,
		Required<Pick<CheckSelection, 'workflowIds' | 'deletedWorkflowIds' | 'credentialIds'>>
	>();
	for (const { type, change, id, selectable, projectId = defaultProjectId } of resources) {
		const isCredential = type === 'credential' && selectable;
		if ((type !== 'workflow' && !isCredential) || change === 'unchanged') continue;
		if (projectId === undefined || !operableProjectIds.has(projectId)) continue;
		const entry = byProject.get(projectId) ?? {
			workflowIds: [],
			deletedWorkflowIds: [],
			credentialIds: [],
		};
		// A changed credential of the project is a change of its own: "select all" sends it.
		if (isCredential) entry.credentialIds.push(id);
		else (change === 'deleted' ? entry.deletedWorkflowIds : entry.workflowIds).push(id);
		byProject.set(projectId, entry);
	}
	return [...byProject].map(([projectId, entry]) => ({ projectId, ...entry }));
}
