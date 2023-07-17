import type { Variables } from '@db/entities/Variables';
import { collections } from '@/Db';

export class VariablesService {
	static async getAll(): Promise<Variables[]> {
		return collections.Variables.find();
	}

	static async getCount(): Promise<number> {
		return collections.Variables.count();
	}

	static async get(id: string): Promise<Variables | null> {
		return collections.Variables.findOne({ where: { id } });
	}

	static async delete(id: string): Promise<void> {
		await collections.Variables.delete(id);
	}
}
