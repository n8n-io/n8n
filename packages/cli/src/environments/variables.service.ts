import type { Variables } from '@/databases/entities/Variables';
import { collections } from '@/Db';

export class VariablesService {
	static async getAll(): Promise<Variables[]> {
		return collections.Variables.find();
	}

	static async get(id: number): Promise<Variables | null> {
		return collections.Variables.findOne({ where: { id } });
	}

	static async create(variable: Omit<Variables, 'id'>): Promise<Variables> {
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
