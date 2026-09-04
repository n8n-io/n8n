import { Logger } from '@n8n/backend-common';
import type {
	EnforcementPoint,
	PolicyCheckFailure,
	PolicyCheckResult,
	PolicyDecision,
	PolicyVersionRef,
} from '@n8n/decorators';
import { ENFORCEMENT_POINT_METHODS, PolicyCheckMetadata } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { OperationalError } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import type { PolicyContext, PolicyEnforcementBackend } from '@/policy/policy-enforcement-backend';

import { PolicyCheckFailedError } from './policy-check-failed.error';
import type { PolicyDecisionAudit } from './policy-decision-audit';
import { checkFailureAudit, violationAudit } from './policy-decision-audit';

/**
 * How long one check gets. Tight on the two points that sit inside a running execution: a wedged
 * policy store there pins worker slots rather than failing a single request.
 */
const DEADLINES_MS = {
	workflowSave: 1_000,
	workflowPublish: 1_000,
	workflowStart: 250,
	workflowTransfer: 1_000,
	credentialDecrypt: 250,
	contentImport: 1_000,
} as const satisfies Record<EnforcementPoint, number>;

type CheckRunner<Point extends EnforcementPoint> = (
	context: PolicyContext<Point>,
	signal: AbortSignal,
) => Promise<PolicyCheckResult>;

type CheckOutcome =
	| { answered: true; result: PolicyCheckResult }
	| { answered: false; failure: PolicyCheckFailure };

/**
 * Bounds `start` to `ms`, two ways. The signal lets a check that honours it stop its own work
 * — abort the query, drop the request — and the race covers the ones that don't, which would
 * otherwise carry on in the background while we've stopped waiting.
 */
export async function withDeadline<T>(start: (signal: AbortSignal) => Promise<T>, ms: number) {
	const controller = new AbortController();
	let expired: OperationalError | undefined;
	let timer: NodeJS.Timeout | undefined;

	try {
		return await Promise.race([
			// Aborting can make a check answer, so re-check after it settles: an answer that
			// arrives once the deadline has passed is not an answer.
			start(controller.signal).then((result) => {
				if (expired) throw expired;

				return result;
			}),
			new Promise<never>((_, reject) => {
				timer = setTimeout(() => {
					expired = new OperationalError(`Deadline of ${ms}ms exceeded`);
					reject(expired);
					controller.abort(expired);
				}, ms);
			}),
		]);
	} finally {
		clearTimeout(timer);
	}
}

function mergeVersions(results: PolicyCheckResult[]): PolicyVersionRef[] {
	const byScope = new Map<string, PolicyVersionRef>();

	for (const { policyVersions = [] } of results) {
		for (const version of policyVersions)
			byScope.set(`${version.scope}:${version.version}`, version);
	}

	return [...byScope.values()];
}

function decisionFrom(results: PolicyCheckResult[]): PolicyDecision {
	const violations = results.flatMap((result) => result.violations);
	const policyVersions = mergeVersions(results);

	return policyVersions.length > 0 ? { violations, policyVersions } : { violations };
}

/**
 * Runs the registered `@PolicyCheck`s and combines what they say. Registered into
 * `PolicyEnforcementService` by the module, which is what turns the proxy's no-ops into real
 * decisions.
 *
 * Three outcomes, three answers:
 *
 * - **No checks** — allow. A feature that isn't installed isn't a security failure.
 * - **A check breaks or overruns its deadline** — `enforce` blocks with `PolicyCheckFailedError`,
 *   because a check that didn't answer hasn't said yes.
 * - **Same, under `evaluate`** — report it in `checkErrors` and keep what the other checks said.
 *   An advisory surface must never show a crashed check as "no violations".
 *
 * Checks are combined by conjunction: all of them have to pass and every violation is reported,
 * so a user fixing a workflow sees the whole list rather than one at a time.
 *
 * Either way of blocking writes one audit line from here, the single emit site for enforcement
 * observability. `evaluate` stays silent, so previews never pollute the trail.
 */
@Service()
export class PolicyDecisionService implements PolicyEnforcementBackend {
	constructor(
		private readonly logger: Logger,
		private readonly checkMetadata: PolicyCheckMetadata,
	) {
		this.logger = this.logger.scoped('policy');
	}

	async enforce<Point extends EnforcementPoint>(
		point: Point,
		context: PolicyContext<Point>,
	): Promise<PolicyDecision> {
		const startedAt = Date.now();
		const { checkIds, results, failures } = await this.runChecks(point, context);
		const durationMs = Date.now() - startedAt;

		if (failures.length > 0) {
			this.audit(checkFailureAudit(point, context, failures, durationMs, checkIds));

			throw new PolicyCheckFailedError(
				point,
				failures.map((failure) => failure.correlationId),
			);
		}

		const decision = decisionFrom(results);

		// The proxy throws on any violation, so this is the veto — and the only place it is logged.
		if (decision.violations.length > 0) {
			this.audit(violationAudit(point, context, decision, durationMs, checkIds));
		}

		return decision;
	}

	async evaluate<Point extends EnforcementPoint>(
		point: Point,
		context: PolicyContext<Point>,
	): Promise<PolicyDecision> {
		const { results, failures } = await this.runChecks(point, context);
		const decision = decisionFrom(results);

		return failures.length > 0 ? { ...decision, checkErrors: failures } : decision;
	}

	/** From `runnersFor`, so this cannot disagree with what `enforce` and `evaluate` run. */
	hasChecksFor(point: EnforcementPoint): boolean {
		return this.runnersFor(point).length > 0;
	}

	/**
	 * The one emit site for enforcement observability, so every policy feature gets the same
	 * line without building one.
	 *
	 * `warn`, not `info`: a blocked action must survive an operator quietening logs. The
	 * structured half only reaches the console under `N8N_LOG_FORMAT=json` — the text format
	 * prints the message alone — so the message names the point on its own.
	 */
	private audit(line: PolicyDecisionAudit) {
		const message =
			line.outcome === 'violation'
				? `Policy blocked ${line.point}`
				: `Policy could not be verified for ${line.point}, so it was blocked`;

		this.logger.warn(message, line);
	}

	private async runChecks<Point extends EnforcementPoint>(
		point: Point,
		context: PolicyContext<Point>,
	) {
		const runners = this.runnersFor(point);
		const outcomes = await Promise.all(
			runners.map(async ({ checkId, run }): Promise<CheckOutcome> => {
				try {
					const result = await withDeadline(
						async (signal) => await run(context, signal),
						DEADLINES_MS[point],
					);

					return { answered: true, result };
				} catch (error) {
					const correlationId = randomUUID();

					this.logger.error(`Policy check "${checkId}" failed at ${point}`, {
						correlationId,
						error,
					});

					return { answered: false, failure: { checkId, correlationId } };
				}
			}),
		);

		const results: PolicyCheckResult[] = [];
		const failures: PolicyCheckFailure[] = [];

		for (const outcome of outcomes) {
			if (outcome.answered) results.push(outcome.result);
			else failures.push(outcome.failure);
		}

		return { checkIds: runners.map((runner) => runner.checkId), results, failures };
	}

	/**
	 * Read the registry per decision rather than once at startup, so module load order can't
	 * decide whether a check runs. Order follows registration order, which affects the sequence
	 * of reported violations but never the verdict.
	 */
	private runnersFor<Point extends EnforcementPoint>(point: Point) {
		return this.checkMetadata.getClasses().flatMap((checkClass) => {
			const check = Container.get(checkClass);
			// `ENFORCEMENT_POINT_METHODS` pins each point to exactly its own method, but TS can't
			// correlate the two through a generic `Point`, so the pairing is asserted here.
			const run = check[ENFORCEMENT_POINT_METHODS[point]] as CheckRunner<Point> | undefined;

			return run ? [{ checkId: check.id, run: run.bind(check) }] : [];
		});
	}
}
