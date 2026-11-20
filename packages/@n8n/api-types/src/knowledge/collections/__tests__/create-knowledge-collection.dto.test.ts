import {
	CreateKnowledgeCollectionDto,
	KNOWLEDGE_COLLECTION_DESCRIPTION_MAX_LENGTH,
	KNOWLEDGE_COLLECTION_NAME_MAX_LENGTH,
} from '../create-knowledge-collection.dto';

describe('CreateKnowledgeCollectionDto', () => {
	const valid = {
		name: 'Returns playbook',
		description: 'How we handle returns and refunds',
	};

	it('accepts a name and a description', () => {
		expect(CreateKnowledgeCollectionDto.safeParse(valid).success).toBe(true);
	});

	it('trims the name and the description', () => {
		const result = CreateKnowledgeCollectionDto.safeParse({
			...valid,
			name: '  Returns playbook  ',
			description: ' How we handle returns ',
		});

		expect(result.success && result.data).toMatchObject({
			name: 'Returns playbook',
			description: 'How we handle returns',
		});
	});

	it.each([
		['an empty name', { name: '' }],
		['a name of spaces', { name: '   ' }],
		['an empty description', { description: '' }],
		['a description of spaces', { description: '   ' }],
		['a name that is too long', { name: 'a'.repeat(KNOWLEDGE_COLLECTION_NAME_MAX_LENGTH + 1) }],
		[
			'a description that is too long',
			{ description: 'a'.repeat(KNOWLEDGE_COLLECTION_DESCRIPTION_MAX_LENGTH + 1) },
		],
	])('refuses %s', (_case, override) => {
		expect(CreateKnowledgeCollectionDto.safeParse({ ...valid, ...override }).success).toBe(false);
	});

	it('accepts a description of exactly the maximum length', () => {
		const description = 'a'.repeat(KNOWLEDGE_COLLECTION_DESCRIPTION_MAX_LENGTH);

		expect(CreateKnowledgeCollectionDto.safeParse({ ...valid, description }).success).toBe(true);
	});
});
