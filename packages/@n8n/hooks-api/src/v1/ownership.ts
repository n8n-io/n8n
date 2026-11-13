export type OwnershipErrorCodeV1 = 'owner_already_set_up';

export interface UserV1 {
	id: string;
	email: string | null;
	firstName: string | null;
	lastName: string | null;
}

export interface OwnerSetupInputV1 {
	email: string;
	firstName: string;
	lastName: string;
	password: string;
}

export interface OwnerSetupOptionsV1 {
	/** Replace the details of an owner that is already set up. Default: `false`. */
	overwriteExisting?: boolean;
}

export interface OwnershipApiV1 {
	readonly version: 1;

	/** Returns the instance owner, or `null` if no owner is set up. */
	getOwner(): Promise<UserV1 | null>;

	/**
	 * Sets up the instance owner. The owner can then log in with `password`.
	 * n8n stores `email` in lower case.
	 *
	 * Rejects with `HooksApiErrorV1<'owner_already_set_up'>` if an owner exists
	 * and `overwriteExisting` is not set.
	 */
	setupOwner(owner: OwnerSetupInputV1, options?: OwnerSetupOptionsV1): Promise<UserV1>;
}
