import type { Variables } from '@/databases/entities/Variables';
import { collections } from '@/Db';
import { canCreateNewVariable } from './enviromentHelpers';

export class VariablesLicenseError extends Error {}

export class VariablesService {
	static async getAll(): Promise<Variables[]> {
		return collections.Variables.find();
	}

	static async getCount(): Promise<number> {
		return collections.Variables.count();
	}

	static async get(id: number): Promise<Variables | null> {
		return collections.Variables.findOne({ where: { id } });
	}

	static async create(variable: Omit<Variables, 'id'>): Promise<Variables> {
		if (!canCreateNewVariable(await this.getCount())) {
			throw new VariablesLicenseError('Variables limit reached');
		}
		return collections.Variables.save(variable);
	}

	static async update(id: number, variable: Omit<Variables, 'id'>): Promise<Variables> {
		await collections.Variables.update(id, variable);
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		return (await this.get(id))!;
	}

	static async delete(id: number): Promise<void> {
		await collections.Variables.delete(id);
	}
}
