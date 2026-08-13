import { deprovision, provision } from './provision';
import type { RunInDeprovisionTransaction, RunInProvisionTransaction } from './transaction';
import type { DesiredJob, ProvisionSummary } from './types';
import { createProvisionerTracing } from '../../observability/provisioner-tracing';
import { noopTracer, type Tracer } from '../../observability/tracer';

/**
 * Turn a scope's desired jobs into its stored set, and clear a scope.
 *
 * `PScope` / `DScope` are opaque to the package: it never inspects them, only
 * hands each back to the transaction the host bound for it (see {@link createJobProvisioner}).
 *
 * So a host identifies a scope however it likes (here, a workflow node)
 * without the scheduler package knowing its shape.
 */
export interface JobProvisioner<PScope, DScope = PScope> {
	/** Provision `scope`'s jobs so its stored set matches `desired`; see {@link provision}. */
	provision(scope: PScope, desired: DesiredJob[]): Promise<ProvisionSummary>;
	/** Delete all of `scope`'s jobs; see {@link deprovision}. */
	deprovision(scope: DScope): Promise<{ removed: number }>;
}

/**
 * Ports a host binds to its storage: given a scope, run one provision transaction over that scope's jobs.
 */
export interface JobProvisionerDeps<PScope, DScope = PScope> {
	provisionTransaction: (scope: PScope) => RunInProvisionTransaction;
	deprovisionTransaction: (scope: DScope) => RunInDeprovisionTransaction;

	/** Host tracer; defaults to a no-op. */
	tracer?: Tracer;
}

/**
 * Compose the provisioning domain operations ({@link provision} /
 * {@link deprovision}) into a {@link JobProvisioner}, binding each call's scope to
 * the host transaction that reads and writes it, and each call to a tracing span.
 */
export function createJobProvisioner<PScope, DScope = PScope>(
	deps: JobProvisionerDeps<PScope, DScope>,
): JobProvisioner<PScope, DScope> {
	const tracing = createProvisionerTracing(deps.tracer ?? noopTracer);
	return {
		async provision(scope, desired) {
			return await tracing.provision(
				async () => await provision(deps.provisionTransaction(scope), desired),
			);
		},
		async deprovision(scope) {
			return await tracing.deprovision(
				async () => await deprovision(deps.deprovisionTransaction(scope)),
			);
		},
	};
}
