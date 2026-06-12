import type { MessengerAccountDto, MessengerPlatform } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { randomBytes } from 'crypto';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

@Service()
export class MessengerAccountsService {
	private readonly accountsByUser = new Map<string, Map<MessengerPlatform, MessengerAccountDto>>();

	list(userId: string): MessengerAccountDto[] {
		const userAccounts = this.accountsByUser.get(userId);
		if (!userAccounts) return [];
		return Array.from(userAccounts.values());
	}

	verifyCode(userId: string, code: string): MessengerAccountDto {
		if (!code.trim()) {
			throw new BadRequestError('Code is required');
		}

		const account: MessengerAccountDto = {
			platform: 'telegram',
			platformUserId: `tg_${randomBytes(5).toString('hex')}`,
			linkedAt: new Date().toISOString(),
		};

		let userAccounts = this.accountsByUser.get(userId);
		if (!userAccounts) {
			userAccounts = new Map();
			this.accountsByUser.set(userId, userAccounts);
		}
		userAccounts.set(account.platform, account);

		return account;
	}

	unlink(userId: string, platform: MessengerPlatform): void {
		const userAccounts = this.accountsByUser.get(userId);
		if (!userAccounts?.has(platform)) {
			throw new NotFoundError(`No ${platform} account linked`);
		}
		userAccounts.delete(platform);
	}
}
