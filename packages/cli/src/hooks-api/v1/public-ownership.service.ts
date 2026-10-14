import { OwnerSetupRequestDto } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, UserError } from '@n8n/errors';
import type {
	OwnerSetupInputV1,
	OwnerSetupOptionsV1,
	OwnershipApiV1,
	OwnershipErrorCodeV1,
	UserV1,
} from '@n8n/hooks-api';

import { OwnershipService } from '@/services/ownership.service';

import { HooksApiError } from '../hooks-api.error';

const toUserV1 = (user: User): UserV1 => ({
	id: user.id,
	email: user.email,
	firstName: user.firstName,
	lastName: user.lastName,
});

@Service()
export class PublicOwnershipService implements OwnershipApiV1 {
	readonly version = 1;

	constructor(private readonly ownershipService: OwnershipService) {}

	async getOwner(): Promise<UserV1 | null> {
		// A shell owner always exists. It only counts as an owner after setup.
		if (!(await this.ownershipService.hasInstanceOwner())) return null;

		return toUserV1(await this.ownershipService.getInstanceOwner());
	}

	async setupOwner(owner: OwnerSetupInputV1, options?: OwnerSetupOptionsV1): Promise<UserV1> {
		const overwriteExisting = options?.overwriteExisting ?? false;

		// Check here so that callers get a contract error code, not an internal error.
		if (!overwriteExisting && (await this.ownershipService.hasInstanceOwner())) {
			throw new HooksApiError<OwnershipErrorCodeV1>(
				'owner_already_set_up',
				'Instance owner already set up',
			);
		}

		const parsed = OwnerSetupRequestDto.safeParse(owner);
		if (!parsed.success) {
			throw new UserError(parsed.error.issues[0]?.message ?? 'Invalid owner');
		}

		try {
			const user = await this.ownershipService.setupOwner(parsed.data, { overwriteExisting });
			return toUserV1(user);
		} catch (error) {
			if (error instanceof BadRequestError && error.message === 'Instance owner already setup') {
				throw new HooksApiError<OwnershipErrorCodeV1>(
					'owner_already_set_up',
					'Instance owner already set up',
				);
			}
			throw error;
		}
	}
}
