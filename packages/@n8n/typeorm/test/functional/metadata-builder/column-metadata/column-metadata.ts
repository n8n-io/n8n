import 'reflect-metadata';
import { expect } from 'chai';
import {
	closeTestingConnections,
	createTestingConnections,
	reloadTestingDatabases,
} from '../../../utils/test-utils';
import { DataSource } from '../../../../src/data-source/DataSource';
import { Post } from './entity/Post';
import { Counters } from './entity/Counters';
import { Subcounters } from './entity/Subcounters';

describe('metadata-builder > ColumnMetadata', () => {
	let connections: DataSource[];
	before(
		async () =>
			(connections = await createTestingConnections({
				entities: [__dirname + '/entity/*{.js,.ts}'],
			})),
	);
	beforeEach(() => reloadTestingDatabases(connections));
	after(() => closeTestingConnections(connections));

	it('getValue', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new Post();
				post.id = 1;
				post.title = 'Post #1';
				post.counters = new Counters();
				post.counters.code = 123;
				post.counters.likes = 2;
				post.counters.comments = 3;
				post.counters.favorites = 4;
				post.counters.subcounters = new Subcounters();
				post.counters.subcounters.version = 1;
				post.counters.subcounters.watches = 10;

				const titleColumnMetadata = connection
					.getMetadata(Post)
					.columns.find((column) => column.propertyName === 'title');
				expect(titleColumnMetadata).not.to.be.undefined;
				expect(titleColumnMetadata!.getEntityValue(post)).to.be.equal('Post #1');

				const codeColumnMetadata = connection
					.getMetadata(Post)
					.columns.find((column) => column.propertyName === 'code');
				expect(codeColumnMetadata).not.to.be.undefined;
				expect(codeColumnMetadata!.getEntityValue(post)).to.be.equal(123);

				const watchesColumnMetadata = connection
					.getMetadata(Post)
					.columns.find((column) => column.propertyName === 'watches');
				expect(watchesColumnMetadata).not.to.be.undefined;
				expect(watchesColumnMetadata!.getEntityValue(post)).to.be.equal(10);
			}),
		));

	it('getValueMap', () =>
		Promise.all(
			connections.map(async (connection) => {
				const post = new Post();
				post.id = 1;
				post.title = 'Post #1';
				post.counters = new Counters();
				post.counters.code = 123;
				post.counters.likes = 2;
				post.counters.comments = 3;
				post.counters.favorites = 4;
				post.counters.subcounters = new Subcounters();
				post.counters.subcounters.version = 1;
				post.counters.subcounters.watches = 10;

				const titleColumnMetadata = connection
					.getMetadata(Post)
					.columns.find((column) => column.propertyName === 'title');
				expect(titleColumnMetadata).not.to.be.undefined;
				expect(titleColumnMetadata!.getEntityValueMap(post)).to.be.eql({
					title: 'Post #1',
				});
				expect(titleColumnMetadata!.getEntityValueMap({ id: 1 })).to.be.undefined;

				const codeColumnMetadata = connection
					.getMetadata(Post)
					.columns.find((column) => column.propertyName === 'code');
				expect(codeColumnMetadata).not.to.be.undefined;
				expect(codeColumnMetadata!.getEntityValueMap(post)).to.be.eql({
					counters: { code: 123 },
				});
				expect(codeColumnMetadata!.getEntityValueMap({ id: 1 })).to.be.undefined;
				expect(
					codeColumnMetadata!.getEntityValueMap({
						id: 1,
						counters: undefined,
					}),
				).to.be.undefined;
				expect(
					codeColumnMetadata!.getEntityValueMap({
						id: 1,
						counters: {},
					}),
				).to.be.undefined;
				expect(
					codeColumnMetadata!.getEntityValueMap({
						id: 1,
						counters: { code: undefined },
					}),
				).to.be.undefined;
				expect(
					codeColumnMetadata!.getEntityValueMap({
						id: 1,
						counters: { code: null },
					}),
				).to.be.eql({ counters: { code: null } });
				expect(
					codeColumnMetadata!.getEntityValueMap({
						id: 1,
						counters: { code: 0 },
					}),
				).to.be.eql({ counters: { code: 0 } });
				expect(
					codeColumnMetadata!.getEntityValueMap({
						id: 1,
						counters: { likes: 123 },
					}),
				).to.be.undefined;

				const watchesColumnMetadata = connection
					.getMetadata(Post)
					.columns.find((column) => column.propertyName === 'watches');
				expect(watchesColumnMetadata).not.to.be.undefined;
				expect(watchesColumnMetadata!.getEntityValueMap(post)).to.be.eql({
					counters: { subcounters: { watches: 10 } },
				});
				expect(watchesColumnMetadata!.getEntityValueMap({ id: 1 })).to.be.eql(undefined);
				expect(
					watchesColumnMetadata!.getEntityValueMap({
						id: 1,
						counters: undefined,
					}),
				).to.be.undefined;
				expect(
					watchesColumnMetadata!.getEntityValueMap({
						id: 1,
						counters: {},
					}),
				).to.be.undefined;
				expect(
					watchesColumnMetadata!.getEntityValueMap({
						id: 1,
						counters: { subcounters: undefined },
					}),
				).to.be.undefined;
				expect(
					watchesColumnMetadata!.getEntityValueMap({
						id: 1,
						counters: { subcounters: { watches: null } },
					}),
				).to.be.eql({ counters: { subcounters: { watches: null } } });
				expect(
					watchesColumnMetadata!.getEntityValueMap({
						id: 1,
						counters: { subcounters: { watches: 0 } },
					}),
				).to.be.eql({ counters: { subcounters: { watches: 0 } } });
				expect(
					watchesColumnMetadata!.getEntityValueMap({
						id: 1,
						counters: { subcounters: { version: 123 } },
					}),
				).to.be.undefined;
			}),
		));
});
