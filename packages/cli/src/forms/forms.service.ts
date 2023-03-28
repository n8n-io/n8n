import { collections } from '@/Db';

export class FormsService {
	async getAll(): Promise<any[]> {
		return collections.Forms.find();
	}

	// static async getCount(): Promise<number> {
	// 	return collections.Forms.count();
	// }

	// static async get(id: number): Promise<Variables | null> {
	// 	return collections.Forms.findOne({ where: { id } });
	// }

	// static async create(variable: Omit<Variables, 'id'>): Promise<Variables> {
	// 	return collections.Variables.save(variable);
	// }

	// static async update(id: number, variable: Omit<Variables, 'id'>): Promise<Variables> {
	// 	await collections.Variables.update(id, variable);
	// 	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	// 	return (await this.get(id))!;
	// }

	// static async delete(id: number): Promise<void> {
	// 	await collections.Variables.delete(id);
	// }
}
