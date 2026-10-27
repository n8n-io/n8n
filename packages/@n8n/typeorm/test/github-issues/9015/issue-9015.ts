import 'reflect-metadata';
import { expect } from 'chai';
import { DataSource, Repository } from '../../../src';
import { Post } from './entity/Post';
import {
	reloadTestingDatabases,
	closeTestingConnections,
	setupSingleTestingConnection,
} from '../../utils/test-utils';

describe('github issues > #9015 @UpdateDateColumn not updating on upsert', () => {
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

	it('should update the @UpdateDateColumn', async () => {
		if (!dataSource) return;

		const oldDate = new Date('1970-01-01');
		const post = new Post();
		post.id = 1;
		post.title = 'Some post';
		post.description = 'Some description';
		post.updated_at = oldDate;

		await repository.save(post);
		await repository.upsert(
			{
				title: post.title,
				description: 'Some new description',
			},
			{
				conflictPaths: { title: true },
				skipUpdateIfNoValuesChanged: true,
			},
		);
		const postReloaded = await repository.findOne({
			where: { id: post.id },
		});

		expect(postReloaded).to.exist;
		expect(postReloaded!.description).to.be.equal('Some new description');
		expect(postReloaded!.updated_at.toString()).to.not.equal(oldDate.toString());
	});
});
