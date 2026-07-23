import 'reflect-metadata';
import { expect } from 'chai';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { DataSource } from '../../../../src/data-source/DataSource';
import { Post } from './entity/Post';

describe('columns > update and insert control', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [Post],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('should respect column update and insert properties', () =>
		Promise.all(
			connections.map(async (connection) => {
				const postRepository = connection.getRepository(Post);

				// create and save a post first
				const post = new Post();
				post.title = 'About columns';
				post.text = 'Some text about columns';
				post.authorFirstName = 'Umed';
				post.authorMiddleName = 'B';
				post.authorLastName = 'Good';
				await postRepository.save(post);

				// check if all columns are as expected
				let loadedPost = await postRepository.findOneBy({ id: post.id });
				expect(loadedPost!.title).to.be.equal('About columns');
				expect(loadedPost!.text).to.be.equal('Some text about columns');
				expect(loadedPost!.authorFirstName).to.be.equal('Umed');
				expect(loadedPost!.authorMiddleName).to.be.equal('Default'); // insert blocked
				expect(loadedPost!.authorLastName).to.be.equal('Default'); // insert blocked

				// then update all its properties and save again
				post.title = 'About columns1';
				post.text = 'Some text about columns1';
				post.authorFirstName = 'Umed1';
				post.authorMiddleName = 'B1';
				post.authorLastName = 'Good1';
				await postRepository.save(post);

				// check if all columns are as expected
				loadedPost = await postRepository.findOneBy({ id: post.id });
				expect(loadedPost!.title).to.be.equal('About columns1');
				expect(loadedPost!.text).to.be.equal('Some text about columns1');
				expect(loadedPost!.authorFirstName).to.be.equal('Umed'); // update blocked
				expect(loadedPost!.authorMiddleName).to.be.equal('B1');
				expect(loadedPost!.authorLastName).to.be.equal('Default'); // update blocked
			}),
		));
});
