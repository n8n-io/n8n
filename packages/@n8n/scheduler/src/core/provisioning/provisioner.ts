import {
	SCHEDULED_JOB_OWNER_ID_MAX_LENGTH,
	SCHEDULED_JOB_OWNER_MEMBER_ID_MAX_LENGTH,
} from '@n8n/constants';

import { deprovision, provision } from './provision';
import type { RunInDeprovisionTransaction, RunInProvisionTransaction } from './transaction';
import type { DesiredJob, ProvisionSummary } from './types';
import { createProvisionerTracing } from '../../observability/provisioner-tracing';
import { noopTracer, type Tracer } from '../../observability/tracer';
import {
	InvalidOwnerIdError,
	InvalidOwnerMemberIdError,
	UnregisteredOwnerTypeError,
} from '../errors';
import type { ScheduledJobOwner } from '../materializer/owner-key';
import type { ScheduledJobOwnerRegistry } from '../reconciliation/owner';

/** The one part of a scope the package reads itself: the owner its jobs carry. */
export interface OwnedScope {
	owner: ScheduledJobOwner;
}

/**
 * Turn a scope's desired jobs into its stored set, and clear a scope.
 *
 * Beyond the owner (see {@link OwnedScope}), `PScope` / `DScope` are opaque:
 * the package only hands each back to the transaction the host bound for it, so
 * a host can identify a scope however it likes.
 */
export interface JobProvisioner<PScope extends OwnedScope, DScope = PScope> {
	/**
	 * Provision `scope`'s jobs so its stored set matches `desired`; see {@link provision}.
	 *
	 * @throws {UnregisteredOwnerTypeError} when no resolver claimed the scope's
	 * owner type, which would create jobs the sweep could never clean up.
	 * @throws {InvalidOwnerIdError} when the owner id is empty or too long to store.
	 * @throws {InvalidOwnerMemberIdError} when the owner member id is empty or too long to store.
	 */
	provision(scope: PScope, desired: DesiredJob[]): Promise<ProvisionSummary>;
	/** Delete all of `scope`'s jobs; see {@link deprovision}. */
	deprovision(scope: DScope): Promise<{ removed: number }>;
}

/**
 * Ports a host binds to its storage: given a scope, run one provision transaction over that scope's jobs.
 */
export interface JobProvisionerDeps<PScope extends OwnedScope, DScope = PScope> {
	provisionTransaction: (scope: PScope) => RunInProvisionTransaction;
	deprovisionTransaction: (scope: DScope) => RunInDeprovisionTransaction;

	/** Registry every provision is checked against, before anything is written. */
	owners: ScheduledJobOwnerRegistry;

	/** Host tracer; defaults to a no-op. */
	tracer?: Tracer;
}

/**
 * Compose the provisioning domain operations ({@link provision} /
 * {@link deprovision}) into a {@link JobProvisioner}, binding each call's scope to
 * the host transaction that reads and writes it, and each call to a tracing span.
 */
export function createJobProvisioner<PScope extends OwnedScope, DScope = PScope>(
	deps: JobProvisionerDeps<PScope, DScope>,
): JobProvisioner<PScope, DScope> {
	const tracing = createProvisionerTracing(deps.tracer ?? noopTracer);
	return {
		async provision(scope, desired) {
			assertProvisionableOwner(deps.owners, scope.owner);
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

/**
 * Reject an owner nothing could clean up, or one whose ids do not fit their
 * columns. The owner type's own length is checked when its resolver registers.
 *
 * @throws {UnregisteredOwnerTypeError} when no resolver claimed the owner type.
 * @throws {InvalidOwnerIdError} when `ownerId` is empty or too long to store.
 * @throws {InvalidOwnerMemberIdError} when `ownerMemberId` is empty or too long to store.
 */
function assertProvisionableOwner(
	owners: ScheduledJobOwnerRegistry,
	{ ownerType, ownerId, ownerMemberId }: ScheduledJobOwner,
): void {
	if (!owners.has(ownerType)) {
		throw new UnregisteredOwnerTypeError(ownerType);
	}
	if (ownerId === '' || ownerId.length > SCHEDULED_JOB_OWNER_ID_MAX_LENGTH) {
		throw new InvalidOwnerIdError(ownerId.length, SCHEDULED_JOB_OWNER_ID_MAX_LENGTH);
	}
	if (
		ownerMemberId !== null &&
		(ownerMemberId === '' || ownerMemberId.length > SCHEDULED_JOB_OWNER_MEMBER_ID_MAX_LENGTH)
	) {
		throw new InvalidOwnerMemberIdError(
			ownerMemberId.length,
			SCHEDULED_JOB_OWNER_MEMBER_ID_MAX_LENGTH,
		);
	}
}
