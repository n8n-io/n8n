import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { DataSource } from '../../../src';
import { expect } from 'chai';
import { Content } from './entity/Content';
import { Photo } from './entity/Photo';
import { SpecialPhoto } from './entity/SpecialPhoto';
import { Post } from './entity/Post';

describe("github issues > #2927 When using base class' custom repository, the discriminator is ignored", () => {
	let dataSources: DataSource[];
	before(
		async () =>
			(dataSources = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				schemaCreate: true,
				dropSchema: true,
				enabledDrivers: ['postgres'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(dataSources));
	after(() => closeTestingConnections(dataSources));

	it('should use the correct subclass for inheritance when saving and retrieving concrete instance', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				const entityManager = dataSource.createEntityManager();
				const repository = entityManager.getRepository(Content);

				// Create and save a new Photo.
				const photo = new Photo();
				photo.title = 'some title';
				photo.description = 'some description';
				photo.size = 42;
				await repository.save(photo);

				// Retrieve it back from the DB.
				const contents = await repository.find();
				expect(contents.length).to.equal(1);
				expect(contents[0]).to.be.an.instanceOf(Photo);
				const fetchedPhoto = contents[0] as Photo;
				expect(fetchedPhoto).to.eql(photo);
			}),
		));

	it('should work for deeply nested classes', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				const entityManager = dataSource.createEntityManager();
				const repository = entityManager.getRepository(Content);

				// Create and save a new SpecialPhoto.
				const specialPhoto = new SpecialPhoto();
				specialPhoto.title = 'some title';
				specialPhoto.description = 'some description';
				specialPhoto.size = 42;
				specialPhoto.specialProperty = 420;
				await repository.save(specialPhoto);

				// Retrieve it back from the DB.
				const contents = await repository.find();
				expect(contents.length).to.equal(1);
				expect(contents[0]).to.be.an.instanceOf(SpecialPhoto);
				const fetchedSpecialPhoto = contents[0] as SpecialPhoto;
				expect(fetchedSpecialPhoto).to.eql(specialPhoto);
			}),
		));

	it('should work for saving and fetching different subclasses', () =>
		Promise.all(
			dataSources.map(async (dataSource) => {
				const entityManager = dataSource.createEntityManager();
				const repository = entityManager.getRepository(Content);

				// Create and save a new Post.
				const post = new Post();
				post.title = 'some title';
				post.description = 'some description';
				post.viewCount = 69;

				// Create and save a new SpecialPhoto.
				const specialPhoto = new SpecialPhoto();
				specialPhoto.title = 'some title';
				specialPhoto.description = 'some description';
				specialPhoto.size = 42;
				specialPhoto.specialProperty = 420;

				await repository.save([post, specialPhoto]);

				// Retrieve them back from the DB.
				const contents = await repository.find();
				expect(contents.length).to.equal(2);
				expect(contents.find((content) => content instanceof Post)).not.to.be.undefined;
				expect(contents.find((content) => content instanceof SpecialPhoto)).not.to.be.undefined;
			}),
		));
});
