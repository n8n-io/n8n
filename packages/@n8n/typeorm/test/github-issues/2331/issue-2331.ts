import 'reflect-metadata';
import { expect } from 'chai';
import { DataSource, Repository } from '../../../src';
import { Post } from './entity/Post';
import {
	reloadTestingDatabases,
	closeTestingConnections,
	setupSingleTestingConnection,
} from '../../utils/test-utils';

describe('github issues > #2331 undefined value is nulling column on update', () => {
	let dataSource: DataSource;
	let repository: Repository<Post>;

	before(async () => {
		const options = setupSingleTestingConnection('postgres', {
			entities: [__dirname + '/entity/*{.js,.ts}'],
			schemaCreate: true,
			dropSchema: true,
		});

		if (!options) return;

		dataSource = new DataSource(options);
		await dataSource.initialize();
	});
	beforeEach(async () => {
		if (!dataSource) return;
		await reloadTestingDatabases([dataSource]);
		repository = dataSource.getRepository(Post);
	});
	after(() => closeTestingConnections([dataSource]));

	it('should not overwrite column with null when passing undefined', async () => {
		if (!dataSource) return;

		const post = new Post();
		post.id = 1;
		post.title = 'Some post';
		post.author = 'Some author';

		await repository.save(post);
		await repository.update(
			{
				id: post.id,
			},
			{
				title: 'Updated post',
				author: undefined,
			},
		);
		const postReloaded = await repository.findOne({
			where: { id: post.id },
		});

		expect(postReloaded).to.exist;
		expect(postReloaded!.author).to.be.equal('Some author');
	});
});
