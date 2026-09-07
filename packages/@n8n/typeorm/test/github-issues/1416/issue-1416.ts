import 'reflect-metadata';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../utils/test-utils';
import { Author } from './entity/Author';
import { Photo } from './entity/Photo';
import { DataSource } from '../../../src/data-source/DataSource';
import { PhotoMetadata } from './entity/PhotoMetadata';
import { expect } from 'chai';

describe('github issue > #1416 Wrong behavior when fetching an entity that has a relation with its own eager relations', () => {
	let connections: DataSource[] = [];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
				enabledDrivers: ['postgres', 'sqlite-pooled'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it("should load eager relations of an entity's relations recursively", () =>
		Promise.all(
			connections.map(async (connection) => {
				const metadata = new PhotoMetadata();
				metadata.height = 640;
				metadata.width = 480;
				metadata.compressed = true;
				metadata.comment = 'cybershoot';
				metadata.orientation = 'portait';
				await connection.manager.save(metadata);

				const photo = new Photo();
				photo.name = 'Me and Bears';
				photo.description = 'I am near polar bears';
				photo.filename = 'photo-with-bears.jpg';
				photo.isPublished = true;
				photo.metadata = metadata;
				await connection.manager.save(photo);

				let photoAuthor = new Author();
				photoAuthor.name = 'John Doe';
				photoAuthor.photos = [photo];
				await connection.manager.save(photoAuthor);

				const author = (await connection.manager.findOne(Author, {
					where: {
						name: photoAuthor.name,
					},
					relations: { photos: true },
				})) as Author;
				expect(author).not.to.be.null;
				expect(author.photos[0]).not.to.be.undefined;
				expect(author.photos[0]).to.eql(photo);
				expect(author.photos[0].metadata).not.to.be.undefined;
				expect(author.photos[0].metadata).to.eql(metadata);
			}),
		));
});
