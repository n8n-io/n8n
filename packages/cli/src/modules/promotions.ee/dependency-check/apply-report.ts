import type {
	PromotionCredentialGrant,
	PromotionCredentialHomeChoice,
	PromotionCredentialMove,
	PromotionDeletionCallers,
	PromotionDependencyProject,
	PromotionDependencyReport,
	PromotionGap,
	PromotionGapExit,
	PromotionGapGroup,
	PromotionKeptWorkflow,
} from '@n8n/api-types';

import {
	ambiguousOwnerBlock,
	expressionNotes,
	gapId,
	grantId,
	type KnownTarget,
	ReportBuilder,
	toConsumer,
	Visibility,
	withIncompleteExit,
} from './dependency-check.shared';
import {
	targetKey,
	type ApplyCheckActions,
	type ApplyCheckInput,
	type ApplyCheckOutcome,
	type DestinationTargetFact,
	type PlaceholderCandidate,
	type ReferenceFact,
} from './dependency-check.types';

/** The report of an Apply. See `computeApplyOutcome` for the rules. */
export function computeApplyReport(input: ApplyCheckInput): PromotionDependencyReport {
	return computeApplyOutcome(input).report;
}

/**
 * The Apply check. It reads the state after the Apply. For each reference of an item that the
 * Apply writes, it asks the questions in a fixed order:
 *
 * 1. Does the branch record the reference as broken on the source? Yes: a warning. This wins.
 * 2. Does the selection delete the target? Yes: a gap.
 * 3. Is the target on the destination after the Apply? Then it must not be archived, and the
 *    consumer must be able to use it: a grant or a gap for a credential, a gap for a workflow.
 * 4. Is the target on the branch? Then the gap offers "include" or "ask the owner".
 * 5. Otherwise the reason on the branch decides: a confirmed gap is a gap, and a reference
 *    without a reason is a warning for a workflow and a gap for a credential.
 *
 * The result also holds what the operation must do: the workflows and the projects to keep,
 * and the placeholders of an incomplete Apply.
 */
export function computeApplyOutcome(input: ApplyCheckInput): ApplyCheckOutcome {
	const { allowIncomplete, branch, plan, access, destinationTargets } = input;
	const visibility = new Visibility(access);
	const report = new ReportBuilder();
	const canCreateIn = new Set(access.createCredentialProjectIds);

	const live = input.references.filter(({ publishedOnly }) => !publishedOnly);
	const publishedOnly = input.references.filter((reference) => reference.publishedOnly);

	const projectRef = (projectId: string): { id: string; name: string } | undefined =>
		access.projects[projectId] ??
		(branch.projects[projectId]
			? { id: projectId, name: branch.projects[projectId].name }
			: undefined);

	// --- Deletions, case 2: reconciliation keeps a workflow that a written workflow references.
	const reconcile = new Map((plan.reconcileDeletedWorkflows ?? []).map((w) => [w.id, w]));
	const keptBy = new Map<string, Map<string, { id: string; name: string }>>();
	for (const { consumer, target } of live) {
		if (target.kind !== 'workflow' || !reconcile.has(target.id)) continue;
		const callers = keptBy.get(target.id) ?? new Map<string, { id: string; name: string }>();
		callers.set(consumer.id, { id: consumer.id, name: consumer.name });
		keptBy.set(target.id, callers);
	}
	const keptWorkflows: PromotionKeptWorkflow[] = [];
	let hiddenKeptWorkflowCount = 0;
	for (const [id, callers] of keptBy) {
		const kept = reconcile.get(id);
		if (!kept) continue;
		if (visibility.canReadProject(kept.projectId)) {
			keptWorkflows.push({ ...kept, referencedBy: [...callers.values()] });
		} else {
			hiddenKeptWorkflowCount++;
		}
	}

	const selectedDeletions = new Map(plan.deletedWorkflows.map((w) => [w.id, w]));
	const deleted = new Map(selectedDeletions);
	for (const [id, workflow] of reconcile) if (!keptBy.has(id)) deleted.set(id, workflow);

	// --- Credentials that the Apply writes: type, usage scope, and "the owner follows the branch".
	const credentialMoves: PromotionCredentialMove[] = [];
	/** The project that each credential moves into, when the move is allowed. */
	const movesInto = new Map<string, string>();
	for (const [id, toProjectId] of Object.entries(plan.writtenCredentials)) {
		const destination = destinationTargets[targetKey('credential', id)];
		const file = branch.credentials[id];
		if (!file) continue;
		const target = { kind: 'credential' as const, id, name: file.name, credentialType: file.type };
		const folders = branch.credentialFolders[id] ?? [];
		if (folders.length > 1) {
			report.addHardBlock(ambiguousOwnerBlock(visibility, target, folders, projectRef));
			continue;
		}
		if (!destination) continue;
		if (blockForCredentialIdentity(report, destination, target, file.type)) continue;

		const from = destination.project;
		if (!from || from.id === toProjectId) continue;
		const toProject = projectRef(toProjectId);
		if (!toProject) continue;

		const placeholder = destination.isPlaceholder === true;
		const canCreate = canCreateIn.has(toProjectId);
		let blockedReason: PromotionCredentialMove['blockedReason'];
		if (destination.isManaged) blockedReason = 'managed';
		else if (destination.isResolvable) blockedReason = 'end-user';
		else if (!canCreate) blockedReason = 'missing-create-right';
		else if (!placeholder && !access.credentials[id]?.canMove) blockedReason = 'no-move-right';

		// A placeholder must get its home. Without the right to create there, the Apply stops.
		if (placeholder && blockedReason === 'missing-create-right') {
			report.addHardBlock({
				code: 'credential-move-forbidden',
				target,
				detail: { missingPermission: 'credential:create', project: toProject.name },
			});
		}

		if (!blockedReason) movesInto.set(id, toProjectId);
		const fromProject = visibility.project(from);
		credentialMoves.push({
			credential: { id, name: file.name, type: file.type },
			toProject: { id: toProject.id, name: toProject.name },
			...(fromProject ? { fromProject } : {}),
			placeholder,
			allowed: !blockedReason,
			...(blockedReason ? { blockedReason } : {}),
		});
	}

	const grants = new Map<string, PromotionCredentialGrant>();
	const homeChoices = new Map<string, PromotionCredentialHomeChoice>();
	/** The consumer projects of each credential that an incomplete Apply gives a placeholder. */
	const placeholderGaps = new Map<string, { reference: ReferenceFact; gapIds: string[] }[]>();

	const canUse = (destination: DestinationTargetFact, id: string, projectId: string) =>
		destination.usableByAllProjects === true ||
		(destination.usableByProjectIds ?? []).includes(projectId) ||
		// After an allowed move the new owner can use it, and every share stays.
		movesInto.get(id) === projectId;

	const addGrant = (reference: ReferenceFact, destination: DestinationTargetFact) => {
		const { consumer, target } = reference;
		const project = projectRef(consumer.projectId);
		if (!project) return;
		const id = grantId(target.id, consumer.projectId);
		const grant = grants.get(id) ?? {
			id,
			credential: {
				id: target.id,
				name: destination.name ?? target.name ?? target.id,
				type: destination.credentialType ?? target.credentialType ?? '',
			},
			project: { id: project.id, name: project.name },
			consumers: [],
		};
		if (!grant.consumers.some(({ id: consumerId }) => consumerId === consumer.id)) {
			grant.consumers.push({ id: consumer.id, name: consumer.name });
		}
		grants.set(id, grant);
	};

	const checkReference = (reference: ReferenceFact) => {
		const { consumer, target, usage } = reference;
		const key = targetKey(target.kind, target.id);
		const requirement = branch.requirements[key];
		const destination = destinationTargets[key];
		const consumerRef = toConsumer(consumer);
		const id = gapId(reference);

		const gap = (
			group: PromotionGapGroup,
			exits: PromotionGapExit[],
			known: KnownTarget | undefined,
			extra: Partial<PromotionGap> = {},
		) => {
			report.gaps.push({
				id,
				consumer: consumerRef,
				target: visibility.target(reference, known),
				usage,
				group,
				exits: withIncompleteExit(exits, allowIncomplete),
				...extra,
			});
		};

		/** A gap for a target that the user may not see: only what the node holds. */
		const hiddenGap = () => gap('no-access', ['ask-owner'], undefined);

		/** A credential gap that an incomplete Apply satisfies with a placeholder. */
		const placeholderExtra = (): Partial<PromotionGap> => {
			if (target.kind !== 'credential' || destination) return {};
			const entries = placeholderGaps.get(target.id) ?? [];
			entries.push({ reference, gapIds: [id] });
			placeholderGaps.set(target.id, entries);
			return allowIncomplete ? { placeholder: true } : {};
		};

		/** The target is on the branch and not on the destination: include it or ask the owner. */
		const gapOnBranch = (projectId: string, name: string, credentialType?: string) => {
			const project = projectRef(projectId);
			const known: KnownTarget = { name, credentialType, project, canRead: true };
			const visible = visibility.canReadProject(projectId);
			const placeholder = placeholderExtra();
			const extra: Partial<PromotionGap> = {
				...(visible ? { state: 'missing-on-destination' as const } : {}),
				...placeholder,
			};
			if (!visibility.environmentCovers(projectId)) {
				gap('outside-environment', ['add-project'], known, extra);
			} else if (visibility.canOperateProject(projectId)) {
				gap(
					projectId === consumer.projectId ? 'same-project' : 'other-project',
					['include'],
					known,
					{ ...extra, include: { projectId, resourceKey: key } },
				);
			} else if (visible) {
				gap('read-only-project', ['ask-owner'], known, extra);
			} else {
				gap('no-access', ['ask-owner'], undefined, placeholder);
			}
		};

		// 1. Broken on the source wins: the source has the same failure.
		if (requirement?.reason === 'broken-on-source') {
			report.warnings.push({
				id,
				consumer: consumerRef,
				target: visibility.target(reference),
				usage,
				code: 'broken-on-source',
			});
			return;
		}

		if (target.kind === 'workflow') {
			// 2. Deletions, case 1: the selection deletes the target.
			if (selectedDeletions.has(target.id)) {
				const doomed = selectedDeletions.get(target.id);
				gap('deleted-by-apply', ['remove-deletion'], {
					name: doomed?.name,
					project: doomed ? projectRef(doomed.projectId) : undefined,
					canRead: true,
				});
				return;
			}

			const writtenInto = plan.writtenWorkflows[target.id];
			const onBranch = branch.workflows[target.id];
			if (writtenInto !== undefined || destination) {
				// 3. Present. The project after the Apply is the one of the branch when it is written.
				const project = writtenInto !== undefined ? projectRef(writtenInto) : destination?.project;
				const known: KnownTarget = {
					name: onBranch?.name ?? destination?.name,
					project,
					canRead: writtenInto !== undefined || destination?.canRead === true,
				};
				const visible = visibility.canReadProject(project?.id);
				// Including a target never restores it.
				if (destination?.archived) {
					if (visible) gap('archived-on-destination', ['restore'], known);
					else hiddenGap();
					return;
				}
				if (input.callerVerdicts[target.id]?.[consumer.id] === false) {
					if (visible) gap('caller-policy', ['change-policy'], known);
					else hiddenGap();
				}
				return;
			}

			// 4. On the branch, not on the destination.
			if (onBranch) {
				gapOnBranch(onBranch.projectId, onBranch.name);
				return;
			}

			// 5. Not on the branch: the reason decides.
			if (requirement?.reason === 'confirmed-gap') {
				gap('not-on-branch', [], undefined, { detail: 'confirmed-gap' });
				return;
			}
			report.warnings.push({
				id,
				consumer: consumerRef,
				target: visibility.target(reference),
				usage,
				code: 'legacy-workflow-reference',
			});
			return;
		}

		// --- Credentials.
		const shownTarget = visibility.target(reference, destination);
		const folders = branch.credentialFolders[target.id] ?? [];
		if (folders.length > 1) {
			report.addHardBlock({
				...ambiguousOwnerBlock(visibility, shownTarget, folders, projectRef),
				consumer: consumerRef,
			});
			return;
		}

		const file = branch.credentials[target.id];

		// An instance credential is never in the package. The destination must hold it.
		if (requirement?.reason === 'instance-credential' && !file) {
			if (!destination) {
				report.addHardBlock({
					code: 'instance-credential-missing',
					target: shownTarget,
					consumer: consumerRef,
				});
			}
			return;
		}

		if (destination) {
			// 3. Present. A match by id also needs the same type and a compatible usage scope.
			const expectedType = file?.type ?? target.credentialType;
			if (blockForCredentialIdentity(report, destination, shownTarget, expectedType, consumerRef)) {
				return;
			}
			if (canUse(destination, target.id, consumer.projectId)) return;
			const sharingLicensed = access.sharingLicensed !== false;
			if (sharingLicensed && access.credentials[target.id]?.canShare) {
				addGrant(reference, destination);
				return;
			}
			// The id is taken, so no placeholder. The binding waits for a grant.
			const group: PromotionGapGroup = visibility.canReadProject(destination.project?.id)
				? 'access-not-grantable'
				: 'no-access';
			gap(
				group,
				group === 'no-access' ? ['ask-owner'] : [],
				destination,
				sharingLicensed ? {} : { detail: 'sharing-not-licensed' },
			);
			return;
		}

		// The Apply writes the credential. A person creates it in its owner project, then continues.
		if (target.id in plan.writtenCredentials) return;

		if (folders.length === 1 && file) {
			gapOnBranch(folders[0], file.name, file.type);
			return;
		}

		// A top-level file of an existing branch has no owner. The user selects the home.
		if (file && branch.topLevelCredentialIds.includes(target.id)) {
			const candidates = homeCandidates(target.id);
			const selected = input.credentialHomes?.[target.id];
			if (
				selected !== undefined &&
				candidates.some(({ id: projectId }) => projectId === selected)
			) {
				return;
			}
			if (!homeChoices.has(target.id)) {
				homeChoices.set(target.id, {
					credential: { id: target.id, name: file.name, type: file.type },
					candidateProjects: candidates,
				});
			}
			return;
		}

		// 5. Not on the branch. A confirmed gap, or a branch of an earlier version.
		gap('not-on-branch', [], undefined, {
			detail: requirement?.reason === 'confirmed-gap' ? 'confirmed-gap' : 'legacy-reference',
			...placeholderExtra(),
		});
	};

	/** Team projects where the user can create the credential. The consumers come first. */
	const homeCandidates = (credentialId: string): PromotionDependencyProject[] => {
		const removed = new Set(plan.deletedProjectIds ?? []);
		const consumers = new Set(
			live
				.filter(({ target }) => target.kind === 'credential' && target.id === credentialId)
				.map(({ consumer }) => consumer.projectId),
		);
		const eligible = access.createCredentialProjectIds.filter(
			(projectId) =>
				!removed.has(projectId) &&
				access.projects[projectId]?.kind === 'team' &&
				visibility.canReadProject(projectId),
		);
		const rank = (projectId: string) => {
			const index = plan.projectOrder.indexOf(projectId);
			return index === -1 ? plan.projectOrder.length : index;
		};
		return eligible
			.sort((a, b) => {
				const byUse = Number(consumers.has(b)) - Number(consumers.has(a));
				if (byUse !== 0) return byUse;
				if (rank(a) !== rank(b)) return rank(a) - rank(b);
				return access.projects[a].name.localeCompare(access.projects[b].name);
			})
			.map((projectId) => ({ id: projectId, name: access.projects[projectId].name }));
	};

	for (const reference of live) checkReference(reference);

	// --- The published version of a consumer (open decision 8).
	const liveKeys = new Set(live.map(gapId));
	const publishedCallers = new Map<string, PromotionDeletionCallers['callers']>();
	for (const reference of publishedOnly) {
		const { consumer, target } = reference;
		if (liveKeys.has(gapId(reference))) continue;
		if (target.kind === 'workflow') {
			// The live version still calls a workflow that the Apply deletes.
			if (!deleted.has(target.id)) continue;
			const callers = publishedCallers.get(target.id) ?? [];
			if (!callers.some(({ id }) => id === consumer.id)) {
				callers.push({ ...consumer, publishedOnly: true });
			}
			publishedCallers.set(target.id, callers);
			continue;
		}
		// The live version needs the credential in the project that the workflow moves into.
		const destination = destinationTargets[targetKey('credential', target.id)];
		if (!destination || canUse(destination, target.id, consumer.projectId)) continue;
		if (access.sharingLicensed !== false && access.credentials[target.id]?.canShare) {
			addGrant(reference, destination);
			continue;
		}
		const visible = visibility.canReadProject(destination.project?.id);
		report.gaps.push({
			id: gapId(reference),
			consumer: toConsumer(consumer),
			target: visibility.target(reference, visible ? destination : undefined),
			usage: reference.usage,
			group: visible ? 'access-not-grantable' : 'no-access',
			exits: withIncompleteExit(visible ? [] : ['ask-owner'], allowIncomplete),
			detail: 'published-version',
		});
	}

	// --- Deletions, case 3: the callers on the destination of a workflow that the Apply deletes.
	const deletionCallers: PromotionDeletionCallers[] = [];
	for (const [id, workflow] of deleted) {
		const callers: PromotionDeletionCallers['callers'] = [...(publishedCallers.get(id) ?? [])];
		let hiddenCallerCount = 0;
		const seen = new Set(callers.map((caller) => caller.id));
		for (const { targetId, caller } of input.destinationCallers) {
			if (targetId !== id || seen.has(caller.id) || deleted.has(caller.id)) continue;
			seen.add(caller.id);
			if (visibility.canReadProject(caller.projectId)) callers.push(caller);
			else hiddenCallerCount++;
		}
		if (callers.length === 0 && hiddenCallerCount === 0) continue;
		deletionCallers.push({
			target: { id, name: workflow.name },
			callers,
			hiddenCallerCount,
		});
	}

	// --- Placeholders of an incomplete Apply: one for each credential id.
	const placeholders: PlaceholderCandidate[] = [];
	const rank = (projectId: string) => {
		const index = plan.projectOrder.indexOf(projectId);
		return index === -1 ? plan.projectOrder.length : index;
	};
	for (const [credentialId, entries] of allowIncomplete ? placeholderGaps : []) {
		const projectIds = [...new Set(entries.map(({ reference }) => reference.consumer.projectId))];
		projectIds.sort((a, b) => rank(a) - rank(b));
		const [homeProjectId, ...shareWithProjectIds] = projectIds;
		const first = entries.find(({ reference }) => reference.consumer.projectId === homeProjectId);
		if (!first) continue;
		const { target, consumer } = first.reference;
		// The name and the type of the source credential: the branch knows them better than a node.
		const file = branch.credentials[credentialId];
		const row = branch.requirements[targetKey('credential', credentialId)];
		const name = file?.name ?? row?.name ?? target.name;
		const type = file?.type ?? row?.credentialType ?? target.credentialType;
		// The confirmation of the gaps never gives the right to create a credential.
		if (!canCreateIn.has(homeProjectId) || name === undefined || type === undefined) {
			report.addHardBlock({
				code: 'placeholder-create-forbidden',
				target: visibility.target(first.reference),
				consumer: toConsumer(consumer),
				detail: { missingPermission: 'credential:create' },
			});
			continue;
		}
		placeholders.push({
			credential: { id: credentialId, name, type },
			projectId: homeProjectId,
			shareWithProjectIds,
			gapIds: entries.flatMap(({ gapIds }) => gapIds),
		});
	}

	report.notes.push(...expressionNotes(input.expressionReferences));

	const actions: ApplyCheckActions = {
		keptWorkflowIds: [...keptBy.keys()],
		keptProjects: keptProjects(input, live),
		placeholders,
	};

	return {
		report: report.build(allowIncomplete, {
			grants: [...grants.values()],
			credentialMoves,
			deletionCallers,
			keptWorkflows,
			...(hiddenKeptWorkflowCount > 0 ? { hiddenKeptWorkflowCount } : {}),
			credentialHomeChoices: [...homeChoices.values()],
		}),
		actions,
	};
}

/**
 * A match by id needs the same credential type and a project usage scope. Both stop the Apply
 * in both modes. The detail gives the destination type only when the user can read it.
 */
function blockForCredentialIdentity(
	report: ReportBuilder,
	destination: DestinationTargetFact,
	target: { kind: 'credential' | 'workflow'; id: string; name?: string; credentialType?: string },
	expectedType: string | undefined,
	consumer?: ReturnType<typeof toConsumer>,
): boolean {
	if (
		expectedType !== undefined &&
		destination.credentialType !== undefined &&
		destination.credentialType !== expectedType
	) {
		report.addHardBlock({
			code: 'credential-type-mismatch',
			target,
			...(consumer ? { consumer } : {}),
			detail: {
				branchType: expectedType,
				...(destination.canRead ? { destinationType: destination.credentialType } : {}),
			},
		});
		return true;
	}
	if (destination.usageScope === 'instance') {
		report.addHardBlock({
			code: 'incompatible-usage-scope',
			target,
			...(consumer ? { consumer } : {}),
		});
		return true;
	}
	return false;
}

/**
 * An instance Apply keeps a project that it would delete when a written workflow uses a
 * credential that the project owns.
 */
function keptProjects(
	input: ApplyCheckInput,
	live: ReferenceFact[],
): ApplyCheckActions['keptProjects'] {
	const removed = new Set(input.plan.deletedProjectIds ?? []);
	const kept = new Map<string, Set<string>>();
	for (const { target } of live) {
		if (target.kind !== 'credential') continue;
		const owner = input.destinationTargets[targetKey('credential', target.id)]?.project?.id;
		if (owner === undefined || !removed.has(owner)) continue;
		const credentialIds = kept.get(owner) ?? new Set<string>();
		credentialIds.add(target.id);
		kept.set(owner, credentialIds);
	}
	return [...kept].map(([projectId, credentialIds]) => ({
		projectId,
		credentialIds: [...credentialIds],
	}));
}
