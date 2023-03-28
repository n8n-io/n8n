import type { Forms } from '@/databases/entities/Forms';
import { collections } from '@/Db';
import type { Form } from '..';

function parseForm(form: Forms): Form {
	try {
		return {
			...form,
			id: form.id.toString(),
			schema: JSON.parse(form.schema) as object[],
		};
	} catch (error) {
		throw error;
	}
}

function serializeForm(form: Omit<Form, 'id'>): Omit<Forms, 'id'> {
	try {
		return {
			...form,
			schema: JSON.stringify(form.schema),
		};
	} catch (error) {
		throw error;
	}
}

export class FormsService {
	async getAll(): Promise<Form[]> {
		const forms = await collections.Forms.find();

		return forms.map((form) => parseForm(form));
	}

	async get(id: number): Promise<Form | null> {
		const form = await collections.Forms.findOne({ where: { id } });
		if (!form) return null;

		return parseForm(form);
	}

	async create(form: Omit<Form, 'id'>): Promise<Form> {
		const saved = await collections.Forms.save(serializeForm(form));

		return parseForm(saved);
	}

	async update(id: number, form: Omit<Form, 'id'>): Promise<Form | null> {
		await collections.Forms.update(id, serializeForm(form));

		return this.get(id);
	}

	async delete(id: number): Promise<void> {
		await collections.Variables.delete(id);
	}
}
