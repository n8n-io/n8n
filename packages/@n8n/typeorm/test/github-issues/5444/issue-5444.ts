import { EntitySchemaTransformer } from '../../../src/entity-schema/EntitySchemaTransformer';

import { expect } from 'chai';

import { Post, PostSchema } from './entity/Post';
import { Author, AuthorSchema } from './entity/Author';
import { EntitySchema } from '../../../src';

describe('github issues > #5444 EntitySchema missing support for multiple joinColumns in relations', () => {
	it('Update query returns the number of affected rows', async () => {
		const transformer = new EntitySchemaTransformer();

		const actual = transformer.transform([
			new EntitySchema<Author>(AuthorSchema),
			new EntitySchema<Post>(PostSchema),
		]);

		const joinColumns = actual.joinColumns;

		expect(joinColumns.length).to.eq(2);
		expect(joinColumns).to.deep.eq([
			{
				target: Post,
				propertyName: 'author',
				name: 'authorPublisherId',
				referencedColumnName: 'publisherId',
				foreignKeyConstraintName: undefined,
			},
			{
				target: Post,
				propertyName: 'author',
				name: 'authorId',
				referencedColumnName: 'id',
				foreignKeyConstraintName: undefined,
			},
		]);
	});
});
