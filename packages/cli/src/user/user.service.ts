import type { EntityManager, FindOptionsWhere } from 'typeorm';
import { In } from 'typeorm';
import { v4 as uuid } from 'uuid';
import * as Db from '@/Db';
import { User } from '@db/entities/User';
import type { IUserSettings } from 'n8n-workflow';
import { getInstanceBaseUrl } from '../UserManagement/UserManagementHelper';

export class UserService {
	static async get(where: FindOptionsWhere<User>): Promise<User | null> {
		return Db.collections.User.findOne({
			relations: ['globalRole'],
			where,
		});
	}

	static async getByIds(transaction: EntityManager, ids: string[]) {
		return transaction.find(User, { where: { id: In(ids) } });
	}

	static async updateUserSettings(id: string, userSettings: Partial<IUserSettings>) {
		const { settings: currentSettings } = await Db.collections.User.findOneOrFail({
			where: { id },
		});
		return Db.collections.User.update(id, { settings: { ...currentSettings, ...userSettings } });
	}

	static async generatePasswordResetUrl(user: User): Promise<string> {
		user.resetPasswordToken = uuid();
		const { id, resetPasswordToken } = user;
		const resetPasswordTokenExpiration = Math.floor(Date.now() / 1000) + 7200;
		await Db.collections.User.update(id, { resetPasswordToken, resetPasswordTokenExpiration });

		const baseUrl = getInstanceBaseUrl();
		const url = new URL(`${baseUrl}/change-password`);
		url.searchParams.append('userId', id);
		url.searchParams.append('token', resetPasswordToken);
		return url.toString();
	}
}
