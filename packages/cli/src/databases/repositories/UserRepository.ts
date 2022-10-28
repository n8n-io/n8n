import { EntityRepository, In, IsNull, MoreThanOrEqual, Not } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { validateEntity } from '../../GenericHelpers';
import { hashPassword, validatePassword } from '../../UserManagement/UserManagementHelper';
import type { Role } from '../entities/Role';
import { User } from '../entities/User';
import { BaseRepository } from './BaseRepository';

const defaultUserProps = Object.freeze({
	firstName: null,
	lastName: null,
	email: null,
	password: null,
	resetPasswordToken: null,
});

type UserRelations = 'globalRole'; // all the @ManyToOne column names

@EntityRepository(User)
export class UserRepository extends BaseRepository<User> {
	async create(fields: QueryDeepPartialEntity<User>): Promise<User> {
		const user = new User();
		Object.assign(user, { ...defaultUserProps, ...fields });
		return this.repository.save(user);
	}

	async findFirst(): Promise<User> {
		const user = await this.repository.findOneOrFail({
			relations: ['globalRole'],
			order: { createdAt: 'ASC' },
		});
		if (!user) {
			throw new Error(
				'No users found in database - did you wipe the users table? Create at least one user.',
			);
		}
		return user;
	}

	async findAll(relations: UserRelations[] = ['globalRole']) {
		return this.repository.find({ relations });
	}

	async findByIds(ids: Array<User['id']>, relations: UserRelations[] = []): Promise<User[]> {
		return this.repository.find({
			where: { id: In(ids) },
			relations,
		});
	}

	async findByEmails(
		emails: Array<User['email']>,
		relations: UserRelations[] = [],
	): Promise<User[]> {
		return this.repository.find({
			where: { email: In(emails) },
			relations,
		});
	}

	async findOneByEmail(
		email: User['email'],
		relations: UserRelations[] = [],
	): Promise<User | undefined> {
		return this.repository.findOne({ email }, { relations });
	}

	async findOneByEmailOrFail(email: User['email']): Promise<User> {
		return this.repository.findOneOrFail({ email });
	}

	async findOneByEmailIfPasswordSet(email: User['email']): Promise<User | undefined> {
		return this.repository.findOne({ email, password: Not(IsNull()) });
	}

	async findOneForPasswordReset(
		id: User['id'],
		resetPasswordToken: string,
	): Promise<User | undefined> {
		// Timestamp is saved in seconds
		const currentTimestamp = Math.floor(Date.now() / 1000);
		return this.repository.findOne({
			id,
			resetPasswordToken,
			resetPasswordTokenExpiration: MoreThanOrEqual(currentTimestamp),
		});
	}

	async findOneByGlobalRole(
		globalRole: Role,
		relations: UserRelations[] = [],
	): Promise<User | undefined> {
		return this.repository.findOne({ globalRole }, { relations });
	}

	async findOneByGlobalRoleOrFail(
		globalRole: Role,
		relations: UserRelations[] = [],
	): Promise<User> {
		return this.repository.findOneOrFail({ globalRole }, { relations });
	}

	async findOneById(
		id: User['id'],
		relations: UserRelations[] = ['globalRole'],
	): Promise<User | undefined> {
		return this.repository.findOne(id, { relations });
	}

	async findOneByIdOrFail(id: User['id'], relations: UserRelations[] = []): Promise<User> {
		const user = await this.findOneById(id, relations);
		if (!user) throw new Error(`Failed to find user with ID ${id}`);
		return user;
	}

	async findByAPIKey(apiKey: string, relations: UserRelations[] = []) {
		return this.repository.findOne({ apiKey }, { relations });
	}

	async validateAndUpdate(user: User): Promise<User> {
		await validateEntity(user);
		return this.repository.save(user);
	}

	async update(user: User, fields: QueryDeepPartialEntity<User>): Promise<User> {
		await this.repository.update({ id: user.id }, fields);
		return this.findOneByIdOrFail(user.id);
	}

	async updatePassword(user: User, newPassword: string) {
		const validPassword = validatePassword(newPassword);
		user.password = await hashPassword(validPassword);
		return this.repository.save(user);
	}

	async resetUsers(owner: User) {
		await this.repository.delete({ id: Not(owner.id) });
		await this.repository.save(Object.assign(owner, defaultUserProps));
	}
}
