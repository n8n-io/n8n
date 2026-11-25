import {
	KNOWLEDGE_COLLECTION_DESCRIPTION_MAX_LENGTH,
	KNOWLEDGE_COLLECTION_NAME_MAX_LENGTH,
} from '../create-knowledge-collection.dto';
import { UpdateKnowledgeCollectionDto } from '../update-knowledge-collection.dto';

describe('UpdateKnowledgeCollectionDto', () => {
	it.each([
		['a name only', { name: 'Returns playbook' }],
		['a description only', { description: 'How we handle returns' }],
		[
			'a name and a description',
			{ name: 'Returns playbook', description: 'How we handle returns' },
		],
		['an empty body', {}],
	])('accepts %s', (_case, body) => {
		expect(UpdateKnowledgeCollectionDto.safeParse(body).success).toBe(true);
	});

	it('trims the name and the description', () => {
		const result = UpdateKnowledgeCollectionDto.safeParse({
			name: '  Returns playbook  ',
			description: ' How we handle returns ',
		});

		expect(result.success && result.data).toEqual({
			name: 'Returns playbook',
			description: 'How we handle returns',
		});
	});

	it('drops the fields that a change cannot set, such as the slug and the project', () => {
		const result = UpdateKnowledgeCollectionDto.safeParse({
			name: 'Returns playbook',
			slug: 'new_slug',
			projectId: 'other-project',
		});

		expect(result.success).toBe(true);
		expect(result.data).toStrictEqual({ name: 'Returns playbook' });
	});

	it.each([
		['an empty name', { name: '' }],
		['a name of spaces', { name: '   ' }],
		['an empty description', { description: '' }],
		['a name that is too long', { name: 'a'.repeat(KNOWLEDGE_COLLECTION_NAME_MAX_LENGTH + 1) }],
		[
			'a description that is too long',
			{ description: 'a'.repeat(KNOWLEDGE_COLLECTION_DESCRIPTION_MAX_LENGTH + 1) },
		],
	])('refuses %s', (_case, body) => {
		expect(UpdateKnowledgeCollectionDto.safeParse(body).success).toBe(false);
	});
});
