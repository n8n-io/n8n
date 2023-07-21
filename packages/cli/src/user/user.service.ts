import type { EntityManager, FindOptionsWhere } from 'typeorm';
import { In } from 'typeorm';
import { v4 as uuid } from 'uuid';
import * as Db from '@/Db';
import { User } from '@db/entities/User';
import type { IUserSettings } from 'n8n-workflow';
import { getInstanceBaseUrl } from '../UserManagement/UserManagementHelper';
import jwt from 'jsonwebtoken';
import config from '@/config';

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
		const { id } = user;
		const token = jwt.sign({ sub: id }, config.getEnv('userManagement.jwtSecret'), {
			expiresIn: '1d',
		});
		const baseUrl = getInstanceBaseUrl();
		const url = new URL(`${baseUrl}/change-password`);
		url.searchParams.append('token', token);
		return url.toString();
	}
}
