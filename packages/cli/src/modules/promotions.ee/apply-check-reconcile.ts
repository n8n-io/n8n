import type {
	PromotionApplyCheck,
	PromotionBindingConsumer,
	PromotionCredentialGrant,
	PromotionDependencyReport,
} from '@n8n/api-types';

type AccessRequirement = PromotionApplyCheck['accessRequirements'][number];
type MissingBinding = PromotionApplyCheck['missingBindings'][number];

export type ReconcileOptions = {
	/** The grants that the user confirmed. Every other grant of the report still stops the Apply. */
	confirmedGrantIds?: readonly string[];
	/** The home that the user selected for a top-level credential, by credential id. */
	homes?: ReadonlyMap<string, { id: string; name: string }>;
	/** The projects that the instance Apply keeps. They are not deleted, so they need no confirmation. */
	keptProjectIds?: ReadonlySet<string>;
};

/** The credential conflicts of the old check that the dependency report also describes. */
const REPORTED_CONFLICT_CODES = new Set([
	'unknown-owner',
	'type-mismatch',
	'incompatible-usage-scope',
]);

/**
 * Makes the Apply check agree with the dependency report, so one reference has one row:
 *
 * - A credential that the report describes (a gap, a warning, a hard block or a grant) leaves
 *   `missingBindings`, `accessRequirements` and the credential conflicts above. The check can
 *   name the owner project of such a credential, and the report never does without access.
 * - `accessRequirements` then holds the grants of the report that the user did not confirm, so
 *   a client of an earlier version still reads why the Apply stops.
 * - `unknown-owner` stays for a top-level credential that has no home yet. With a home, it
 *   becomes a missing binding in the home project: a person creates the credential there.
 * - A `missingBindings` row stays for a credential that the Apply writes for its owner project.
 */
export function reconcileApplyCheck<T extends PromotionApplyCheck>(
	check: T,
	report: PromotionDependencyReport,
	options: ReconcileOptions = {},
): T {
	const reported = new Set<string>();
	for (const { target } of [...report.gaps, ...report.warnings, ...report.hardBlocks]) {
		if (target.kind === 'credential') reported.add(target.id);
	}
	for (const { credential } of report.grants) reported.add(credential.id);
	const needsHome = new Set(report.credentialHomeChoices.map(({ credential }) => credential.id));

	const createdInHome: MissingBinding[] = [];
	const conflicts = check.conflicts.filter((conflict) => {
		if (conflict.code === 'project-deletion') {
			return !options.keptProjectIds?.has(conflict.project.id);
		}
		if (conflict.kind !== 'credential' || conflict.sourceId === null) return true;
		if (!REPORTED_CONFLICT_CODES.has(conflict.code)) return true;
		if (reported.has(conflict.sourceId)) return false;
		if (conflict.code !== 'unknown-owner' || needsHome.has(conflict.sourceId)) return true;
		const home = options.homes?.get(conflict.sourceId);
		if (!home) return true;
		createdInHome.push({
			kind: 'credential',
			sourceId: conflict.sourceId,
			name: conflict.name,
			credentialType: conflict.expectedTypes[0],
			consumers: conflict.consumers,
			ownerProject: home,
		});
		return false;
	});

	const confirmed = new Set(options.confirmedGrantIds ?? []);
	return {
		...check,
		conflicts,
		missingBindings: [
			...check.missingBindings.filter(
				(binding) => binding.kind !== 'credential' || !reported.has(binding.sourceId),
			),
			...createdInHome,
		],
		accessRequirements: [
			...check.accessRequirements.filter(({ sourceId }) => !reported.has(sourceId)),
			...accessRequirementsOf(report.grants.filter(({ id }) => !confirmed.has(id))),
		],
	};
}

/** One row for each credential, with its consumer projects. */
function accessRequirementsOf(grants: PromotionCredentialGrant[]): AccessRequirement[] {
	const rows = new Map<string, AccessRequirement>();
	for (const { credential, project, consumers } of grants) {
		if (credential.type === '') continue;
		const row = rows.get(credential.id) ?? {
			kind: 'credential' as const,
			code: 'access-required' as const,
			sourceId: credential.id,
			name: credential.name,
			credentialType: credential.type,
			consumers: [],
		};
		const consumer: PromotionBindingConsumer = {
			project: { id: project.id, name: project.name },
			workflows: consumers.map(({ id, name }) => ({ id, name })),
		};
		row.consumers.push(consumer);
		rows.set(credential.id, row);
	}
	return [...rows.values()].sort((a, b) => a.sourceId.localeCompare(b.sourceId));
}
