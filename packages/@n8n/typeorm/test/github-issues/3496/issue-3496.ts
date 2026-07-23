import '../../utils/test-setup';
import { DataSource } from '../../../src';
import { closeTestingConnections, createTestingConnections } from '../../utils/test-utils';
import { Post } from './entity/Post';

describe("github issues > #3496 jsonb comparison doesn't work", () => {
	let connections: DataSource[];
	before(async () => {
		connections = await createTestingConnections({
			entities: [__dirname + '/entity/*{.js,.ts}'],
			enabledDrivers: ['postgres'],
			dropSchema: true,
		});
	});
	after(() => closeTestingConnections(connections));

	it('the entity should not be updated a second time', () =>
		Promise.all(
			connections.map(async (connection) => {
				await connection.synchronize();
				const repository = connection.getRepository(Post);

				const problems = [{ message: '', attributeKey: '', level: '' }];
				const post = new Post();
				post.problems = problems.slice();

				const savedPost1 = await repository.save(post);
				const savedPost2 = await repository.save(
					repository.create({
						id: savedPost1.id,
						version: savedPost1.version,
						problems: problems.slice(),
					}),
				);

				savedPost1!.version.should.be.equal(savedPost2!.version);
			}),
		));
});
