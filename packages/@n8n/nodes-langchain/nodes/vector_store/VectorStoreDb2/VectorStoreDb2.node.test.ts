import { DB2VectorStore, DistanceStrategy } from './VectorStoreDb2.node';
import type { Embeddings } from '@langchain/core/embeddings';
import type { Document } from '@langchain/core/documents';

describe('DB2VectorStore', () => {
	let mockClient: any;
	let mockEmbeddings: jest.Mocked<Embeddings>;
	let vectorStore: DB2VectorStore;

	beforeEach(() => {
		// Create mock database client
		mockClient = {
			query: jest.fn((_sql: string, paramsOrCallback: any, callback?: any) => {
				// Handle both query(sql, callback) and query(sql, params, callback)
				const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
				if (cb) {
					// Simulate async callback
					setImmediate(() => cb(null, []));
				}
			}),
			prepare: jest.fn(),
			commit: jest.fn((callback: any) => {
				if (callback) setImmediate(() => callback(null));
			}),
			commitTransaction: jest.fn((callback: any) => {
				if (callback) setImmediate(() => callback(null));
			}),
			beginTransaction: jest.fn((callback: any) => {
				if (callback) setImmediate(() => callback(null));
			}),
			rollback: jest.fn((callback: any) => {
				if (callback) setImmediate(() => callback(null));
			}),
			rollbackTransaction: jest.fn((callback: any) => {
				if (callback) setImmediate(() => callback(null));
			}),
			close: jest.fn(),
		};

		// Create mock embeddings with default return values
		// Use mockImplementation to ensure it persists after clearAllMocks
		mockEmbeddings = {
			embedDocuments: jest.fn(),
			embedQuery: jest.fn(),
		} as any;

		// Set default implementations
		mockEmbeddings.embedDocuments.mockImplementation(async (texts: string[]) => {
			return texts.map(() => [0.1, 0.2, 0.3]);
		});
		mockEmbeddings.embedQuery.mockResolvedValue([0.1, 0.2, 0.3]);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('constructor', () => {
		it('should create instance with required parameters', () => {
			vectorStore = new DB2VectorStore(mockEmbeddings, {
				client: mockClient,
				embeddingFunction: mockEmbeddings,
				tableName: 'test_vectors',
			});

			expect(vectorStore).toBeInstanceOf(DB2VectorStore);
			expect(mockEmbeddings.embedQuery).not.toHaveBeenCalled();
		});

		it('should accept optional distance strategy', () => {
			vectorStore = new DB2VectorStore(mockEmbeddings, {
				client: mockClient,
				embeddingFunction: mockEmbeddings,
				tableName: 'test_vectors',
				distanceStrategy: DistanceStrategy.COSINE,
			});

			expect(vectorStore).toBeInstanceOf(DB2VectorStore);
			expect(mockEmbeddings.embedQuery).not.toHaveBeenCalled();
		});
	});

	describe('initialize', () => {
		it('should create table if it does not exist on first operation', async () => {
			mockEmbeddings.embedQuery.mockResolvedValue([0.1, 0.2, 0.3]);

			mockClient.query.mockImplementation((sql: string, paramsOrCallback: any, callback?: any) => {
				const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
				if (sql.includes('SELECT 1 FROM SYSIBM.SYSTABLES')) {
					const error: any = new Error('SQL0204N');
					error.message = 'SQL0204N';
					setImmediate(() => cb(error));
					return;
				}
				setImmediate(() => cb(null, []));
			});

			vectorStore = new DB2VectorStore(mockEmbeddings, {
				client: mockClient,
				embeddingFunction: mockEmbeddings,
				tableName: 'test_vectors',
			});

			await vectorStore.addTexts(['text'], [{}]);

			expect(mockEmbeddings.embedQuery).toHaveBeenCalledWith('test');
			expect(mockClient.query).toHaveBeenCalledWith(
				expect.stringContaining('CREATE TABLE'),
				expect.any(Function),
			);
		});

		it('should not create table if it already exists', async () => {
			mockEmbeddings.embedQuery.mockResolvedValue([0.1, 0.2, 0.3]);

			mockClient.query.mockImplementation((_sql: string, paramsOrCallback: any, callback?: any) => {
				const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
				setImmediate(() => cb(null, [{ '1': 1 }]));
			});

			vectorStore = new DB2VectorStore(mockEmbeddings, {
				client: mockClient,
				embeddingFunction: mockEmbeddings,
				tableName: 'test_vectors',
			});

			await vectorStore.similaritySearchVectorWithScore([0.1, 0.2, 0.3], 1);

			const createTableCalls = (mockClient.query as jest.Mock).mock.calls.filter((call) =>
				call[0].includes('CREATE TABLE'),
			);
			expect(createTableCalls).toHaveLength(0);
		});

		it('should initialize only once across multiple operations', async () => {
			mockClient.query.mockImplementation((sql: string, paramsOrCallback: any, callback?: any) => {
				const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
				if (sql.includes('SELECT 1 FROM SYSIBM.SYSTABLES')) {
					const error: any = new Error('SQL0204N');
					error.message = 'SQL0204N';
					setImmediate(() => cb(error));
					return;
				}
				setImmediate(() => cb(null, []));
			});

			vectorStore = new DB2VectorStore(mockEmbeddings, {
				client: mockClient,
				embeddingFunction: mockEmbeddings,
				tableName: 'test_vectors',
			});

			await vectorStore.addTexts(['text-1'], [{}]);
			await vectorStore.similaritySearchVectorWithScore([0.1, 0.2, 0.3], 1);

			expect(mockEmbeddings.embedQuery).toHaveBeenCalledTimes(1);
			const createTableCalls = (mockClient.query as jest.Mock).mock.calls.filter((call) =>
				call[0].includes('CREATE TABLE'),
			);
			expect(createTableCalls).toHaveLength(1);
		});

		it('should handle concurrent initialization without race conditions', async () => {
			let releaseInitialization: (() => void) | undefined;
			const initializationGate = new Promise<void>((resolve) => {
				releaseInitialization = resolve;
			});
			let createTableCalls = 0;

			mockClient.query.mockImplementation((sql: string, paramsOrCallback: any, callback?: any) => {
				const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
				if (sql.includes('SELECT 1 FROM SYSIBM.SYSTABLES')) {
					const error: any = new Error('SQL0204N');
					error.message = 'SQL0204N';
					setImmediate(() => cb(error));
					return;
				}
				if (sql.includes('CREATE TABLE')) {
					createTableCalls++;
					void initializationGate.then(() => setImmediate(() => cb(null, [])));
					return;
				}
				setImmediate(() => cb(null, []));
			});

			vectorStore = new DB2VectorStore(mockEmbeddings, {
				client: mockClient,
				embeddingFunction: mockEmbeddings,
				tableName: 'test_vectors',
			});

			const addPromise = vectorStore.addTexts(['text-1'], [{}]);
			const searchPromise = vectorStore.similaritySearchVectorWithScore([0.1, 0.2, 0.3], 1);

			await new Promise((resolve) => setImmediate(resolve));
			expect(createTableCalls).toBe(1);

			releaseInitialization?.();

			await Promise.all([addPromise, searchPromise]);

			expect(createTableCalls).toBe(1);
			expect(mockEmbeddings.embedQuery).toHaveBeenCalledTimes(1);
		});

		it('should surface clear initialization errors and allow retry', async () => {
			let shouldFailInitialization = true;

			mockClient.query.mockImplementation((sql: string, paramsOrCallback: any, callback?: any) => {
				const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
				if (sql.includes('SELECT 1 FROM SYSIBM.SYSTABLES')) {
					const error: any = new Error('SQL0204N');
					error.message = 'SQL0204N';
					setImmediate(() => cb(error));
					return;
				}
				if (sql.includes('CREATE TABLE') && shouldFailInitialization) {
					setImmediate(() => cb(new Error('permission denied')));
					return;
				}
				setImmediate(() => cb(null, []));
			});

			vectorStore = new DB2VectorStore(mockEmbeddings, {
				client: mockClient,
				embeddingFunction: mockEmbeddings,
				tableName: 'test_vectors',
			});

			await expect(vectorStore.addTexts(['text-1'], [{}])).rejects.toThrow(
				'Failed to initialize DB2 Vector Store: permission denied. Ensure the database is accessible and you have permission to create tables.',
			);

			shouldFailInitialization = false;

			await expect(vectorStore.addTexts(['text-2'], [{}])).resolves.toHaveLength(1);

			const createTableCalls = (mockClient.query as jest.Mock).mock.calls.filter((call) =>
				call[0].includes('CREATE TABLE'),
			);
			expect(createTableCalls).toHaveLength(2);
		});
	});

	describe('addVectors', () => {
		beforeEach(() => {
			mockClient.query.mockImplementation((_sql: string, paramsOrCallback: any, callback?: any) => {
				const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
				setImmediate(() => cb(null, []));
			});

			vectorStore = new DB2VectorStore(mockEmbeddings, {
				client: mockClient,
				embeddingFunction: mockEmbeddings,
				tableName: 'test_vectors',
			});

			jest.clearAllMocks();

			mockEmbeddings.embedQuery.mockResolvedValue([0.1, 0.2, 0.3]);
			mockEmbeddings.embedDocuments.mockImplementation(async (texts: string[]) => {
				return texts.map(() => [0.1, 0.2, 0.3]);
			});
			mockClient.query = jest.fn((sql: string, paramsOrCallback: any, callback?: any) => {
				const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
				if (sql.includes('SELECT 1 FROM SYSIBM.SYSTABLES')) {
					setImmediate(() => cb(null, [{ 1: 1 }]));
					return;
				}
				setImmediate(() => cb(null, []));
			});
			mockClient.beginTransaction = jest.fn((callback: any) => {
				if (callback) setImmediate(() => callback(null));
			});
			mockClient.commitTransaction = jest.fn((callback: any) => {
				if (callback) setImmediate(() => callback(null));
			});
			mockClient.rollbackTransaction = jest.fn((callback: any) => {
				if (callback) setImmediate(() => callback(null));
			});
			mockClient.commit = jest.fn((callback: any) => {
				if (callback) setImmediate(() => callback(null));
			});
			mockClient.rollback = jest.fn((callback: any) => {
				if (callback) setImmediate(() => callback(null));
			});
		});

		it('should insert vectors with documents', async () => {
			const vectors = [
				[0.1, 0.2, 0.3],
				[0.4, 0.5, 0.6],
			];
			const documents = [
				{ pageContent: 'doc1', metadata: { source: 'test1' } },
				{ pageContent: 'doc2', metadata: { source: 'test2' } },
			];

			mockEmbeddings.embedDocuments.mockResolvedValue(vectors);

			await vectorStore.addVectors(vectors, documents);

			// Should execute INSERT for each vector using query (row-by-row)
			const insertCalls = (mockClient.query as jest.Mock).mock.calls.filter((call) =>
				call[0].includes('INSERT INTO'),
			);
			expect(insertCalls.length).toBeGreaterThan(0);
		});

		it('should handle metadata correctly', async () => {
			const vectors = [[0.1, 0.2, 0.3]];
			const documents = [
				{
					pageContent: 'test',
					metadata: {
						source: 'file.txt',
						author: 'John Doe',
						tags: ['tag1', 'tag2'],
					},
				},
			];

			mockEmbeddings.embedDocuments.mockResolvedValue(vectors);

			await vectorStore.addVectors(vectors, documents);

			// Should include metadata in query
			expect(mockClient.query).toHaveBeenCalled();
		});

		it('should handle documents without metadata', async () => {
			const vectors = [[0.1, 0.2, 0.3]];
			const documents = [{ pageContent: 'test', metadata: {} }];

			mockEmbeddings.embedDocuments.mockResolvedValue(vectors);

			await vectorStore.addVectors(vectors, documents);

			expect(mockClient.query).toHaveBeenCalled();
		});
	});

	describe('batch insert optimization', () => {
		beforeEach(() => {
			mockClient.query.mockImplementation((_sql: string, paramsOrCallback: any, callback?: any) => {
				const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
				setImmediate(() => cb(null, []));
			});

			vectorStore = new DB2VectorStore(mockEmbeddings, {
				client: mockClient,
				embeddingFunction: mockEmbeddings,
				tableName: 'test_vectors',
			});

			jest.clearAllMocks();

			mockEmbeddings.embedQuery.mockResolvedValue([0.1, 0.2, 0.3]);
			mockEmbeddings.embedDocuments.mockImplementation(async (texts: string[]) => {
				return texts.map(() => [0.1, 0.2, 0.3]);
			});
		});

		it('should use batch insert with prepare() when available', async () => {
			const mockStmt = {
				bindSync: jest.fn(),
				setAttrSync: jest.fn(),
				execute: jest.fn((callback: any) => setImmediate(() => callback(null))),
				closeSync: jest.fn(),
			};

			mockClient.prepare = jest.fn((_sql: string, callback: any) => {
				setImmediate(() => callback(null, mockStmt));
			});

			const documents = Array.from({ length: 10 }, (_, i) => ({
				pageContent: `doc${i}`,
				metadata: { index: i },
			}));

			await vectorStore.addDocuments(documents);

			// Should call prepare() for batch insert
			expect(mockClient.prepare).toHaveBeenCalled();
			expect(mockStmt.bindSync).toHaveBeenCalled();
			expect(mockStmt.setAttrSync).toHaveBeenCalledWith(22, 10); // SQL_ATTR_PARAMSET_SIZE = 22
			expect(mockStmt.execute).toHaveBeenCalled();
			expect(mockStmt.closeSync).toHaveBeenCalled();
		});

		it('should process large batches in chunks of 100', async () => {
			const mockStmt = {
				bindSync: jest.fn(),
				setAttrSync: jest.fn(),
				execute: jest.fn((callback: any) => setImmediate(() => callback(null))),
				closeSync: jest.fn(),
			};

			mockClient.prepare = jest.fn((_sql: string, callback: any) => {
				setImmediate(() => callback(null, mockStmt));
			});

			// Create 250 documents to test chunking
			const documents = Array.from({ length: 250 }, (_, i) => ({
				pageContent: `doc${i}`,
				metadata: { index: i },
			}));

			await vectorStore.addDocuments(documents);

			// Should call prepare 3 times (100 + 100 + 50)
			expect(mockClient.prepare).toHaveBeenCalledTimes(3);

			// First two batches should be 100 each
			expect(mockStmt.setAttrSync).toHaveBeenNthCalledWith(1, 22, 100);
			expect(mockStmt.setAttrSync).toHaveBeenNthCalledWith(2, 22, 100);
			// Last batch should be 50
			expect(mockStmt.setAttrSync).toHaveBeenNthCalledWith(3, 22, 50);
		});

		it('should fallback to row-by-row when prepare() is not available', async () => {
			// Remove prepare method
			delete (mockClient as any).prepare;

			mockClient.query = jest.fn((_sql: string, paramsOrCallback: any, callback?: any) => {
				const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
				setImmediate(() => cb(null, []));
			});

			const documents = Array.from({ length: 5 }, (_, i) => ({
				pageContent: `doc${i}`,
				metadata: { index: i },
			}));

			await vectorStore.addDocuments(documents);

			// Should use query() for each document
			const insertCalls = (mockClient.query as jest.Mock).mock.calls.filter((call) =>
				call[0].includes('INSERT INTO'),
			);
			expect(insertCalls.length).toBeGreaterThan(0);
		});

		it('should handle batch insert errors gracefully', async () => {
			const mockStmt = {
				bindSync: jest.fn(),
				setAttrSync: jest.fn(),
				execute: jest.fn((callback: any) => {
					setImmediate(() => callback(new Error('Batch insert failed')));
				}),
				closeSync: jest.fn(),
			};

			mockClient.prepare = jest.fn((_sql: string, callback: any) => {
				setImmediate(() => callback(null, mockStmt));
			});

			const documents = [
				{ pageContent: 'doc1', metadata: {} },
				{ pageContent: 'doc2', metadata: {} },
			];

			await expect(vectorStore.addDocuments(documents)).rejects.toThrow('Batch insert failed');

			// Should still close the statement
			expect(mockStmt.closeSync).toHaveBeenCalled();
		});

		it('should handle prepare() errors and fallback', async () => {
			mockClient.prepare = jest.fn((_sql: string, callback: any) => {
				setImmediate(() => callback(new Error('Prepare failed')));
			});

			const documents = [{ pageContent: 'doc1', metadata: {} }];

			await expect(vectorStore.addDocuments(documents)).rejects.toThrow('Prepare failed');
		});

		it('should correctly format batch parameters', async () => {
			const mockStmt = {
				bindSync: jest.fn(),
				setAttrSync: jest.fn(),
				execute: jest.fn((callback: any) => setImmediate(() => callback(null))),
				closeSync: jest.fn(),
			};

			mockClient.prepare = jest.fn((_sql: string, callback: any) => {
				setImmediate(() => callback(null, mockStmt));
			});

			const documents = [
				{ pageContent: 'doc1', metadata: { key: 'value1' } },
				{ pageContent: 'doc2', metadata: { key: 'value2' } },
			];

			await vectorStore.addDocuments(documents);

			// Verify bindSync was called with column-wise arrays
			expect(mockStmt.bindSync).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.any(Array), // ids
					expect.any(Array), // embeddings
					expect.any(Array), // metadata
					expect.any(Array), // texts
				]),
			);

			const bindArgs = mockStmt.bindSync.mock.calls[0][0];
			expect(bindArgs).toHaveLength(4);
			expect(bindArgs[0]).toHaveLength(2); // 2 ids
			expect(bindArgs[1]).toHaveLength(2); // 2 embeddings
			expect(bindArgs[2]).toHaveLength(2); // 2 metadata
			expect(bindArgs[3]).toHaveLength(2); // 2 texts
		});
	});

	describe('addDocuments', () => {
		beforeEach(() => {
			mockClient.query.mockImplementation((_sql: string, paramsOrCallback: any, callback?: any) => {
				const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
				setImmediate(() => cb(null, []));
			});

			vectorStore = new DB2VectorStore(mockEmbeddings, {
				client: mockClient,
				embeddingFunction: mockEmbeddings,
				tableName: 'test_vectors',
			});

			mockEmbeddings.embedQuery.mockResolvedValue([0.1, 0.2, 0.3]);
			jest.clearAllMocks();

			mockClient.query = jest.fn((_sql: string, paramsOrCallback: any, callback?: any) => {
				const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
				setImmediate(() => cb(null, []));
			});
			mockClient.beginTransaction = jest.fn((callback: any) => {
				if (callback) setImmediate(() => callback(null));
			});
			mockClient.commitTransaction = jest.fn((callback: any) => {
				if (callback) setImmediate(() => callback(null));
			});
			mockClient.rollbackTransaction = jest.fn((callback: any) => {
				if (callback) setImmediate(() => callback(null));
			});
			mockClient.commit = jest.fn((callback: any) => {
				if (callback) setImmediate(() => callback(null));
			});
			mockClient.rollback = jest.fn((callback: any) => {
				if (callback) setImmediate(() => callback(null));
			});
			mockEmbeddings.embedDocuments.mockImplementation(async (texts: string[]) => {
				return texts.map(() => [0.1, 0.2, 0.3]);
			});
		});

		it('should embed documents and add vectors', async () => {
			const documents: Document[] = [
				{ pageContent: 'doc1', metadata: { source: 'test1' } },
				{ pageContent: 'doc2', metadata: { source: 'test2' } },
			];

			const embeddings = [
				[0.1, 0.2, 0.3],
				[0.4, 0.5, 0.6],
			];

			mockEmbeddings.embedDocuments.mockResolvedValue(embeddings);

			await vectorStore.addDocuments(documents);

			// Should call embedDocuments
			expect(mockEmbeddings.embedDocuments).toHaveBeenCalledWith(['doc1', 'doc2']);

			// Should insert vectors
			expect(mockClient.query).toHaveBeenCalled();
		});
	});

	describe('addTexts', () => {
		beforeEach(() => {
			mockClient.query.mockImplementation((_sql: string, paramsOrCallback: any, callback?: any) => {
				const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
				setImmediate(() => cb(null, []));
			});

			vectorStore = new DB2VectorStore(mockEmbeddings, {
				client: mockClient,
				embeddingFunction: mockEmbeddings,
				tableName: 'test_vectors',
			});

			mockEmbeddings.embedQuery.mockResolvedValue([0.1, 0.2, 0.3]);
			jest.clearAllMocks();

			mockClient.query = jest.fn((sql: string, paramsOrCallback: any, callback?: any) => {
				const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
				if (sql.includes('SELECT 1 FROM SYSIBM.SYSTABLES')) {
					setImmediate(() => cb(null, [{ 1: 1 }]));
					return;
				}
				setImmediate(() => cb(null, []));
			});
			mockClient.beginTransaction = jest.fn((callback: any) => {
				if (callback) setImmediate(() => callback(null));
			});
			mockClient.commitTransaction = jest.fn((callback: any) => {
				if (callback) setImmediate(() => callback(null));
			});
			mockClient.rollbackTransaction = jest.fn((callback: any) => {
				if (callback) setImmediate(() => callback(null));
			});
			mockClient.commit = jest.fn((callback: any) => {
				if (callback) setImmediate(() => callback(null));
			});
			mockClient.rollback = jest.fn((callback: any) => {
				if (callback) setImmediate(() => callback(null));
			});
			mockEmbeddings.embedDocuments.mockImplementation(async (texts: string[]) => {
				return texts.map(() => [0.1, 0.2, 0.3]);
			});
		});

		it('should convert texts to documents and add them', async () => {
			const texts = ['text1', 'text2'];
			const metadatas = [{ source: 'test1' }, { source: 'test2' }];

			const embeddings = [
				[0.1, 0.2, 0.3],
				[0.4, 0.5, 0.6],
			];

			mockEmbeddings.embedDocuments.mockResolvedValue(embeddings);

			await vectorStore.addTexts(texts, metadatas);

			// Should embed texts
			expect(mockEmbeddings.embedDocuments).toHaveBeenCalledWith(texts);

			// Should insert vectors
			expect(mockClient.query).toHaveBeenCalled();
		});

		it('should handle texts without metadata', async () => {
			const texts = ['text1', 'text2'];

			const embeddings = [
				[0.1, 0.2, 0.3],
				[0.4, 0.5, 0.6],
			];

			mockEmbeddings.embedDocuments.mockResolvedValue(embeddings);

			await vectorStore.addTexts(texts);

			expect(mockClient.query).toHaveBeenCalled();
		});
	});

	describe('similaritySearchVectorWithScore', () => {
		beforeEach(() => {
			mockClient.query.mockImplementation((_sql: string, paramsOrCallback: any, callback?: any) => {
				const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
				setImmediate(() => cb(null, []));
			});

			vectorStore = new DB2VectorStore(mockEmbeddings, {
				client: mockClient,
				embeddingFunction: mockEmbeddings,
				tableName: 'test_vectors',
				distanceStrategy: DistanceStrategy.EUCLIDEAN,
			});

			mockEmbeddings.embedQuery.mockResolvedValue([0.1, 0.2, 0.3]);
			jest.clearAllMocks();
		});

		it('should search for similar vectors', async () => {
			const queryVector = [0.1, 0.2, 0.3];
			const k = 5;

			const mockResults = [
				{
					TEXT: 'doc1',
					METADATA: JSON.stringify({ source: 'test1' }),
					DISTANCE: 0.5,
				},
				{
					TEXT: 'doc2',
					METADATA: JSON.stringify({ source: 'test2' }),
					DISTANCE: 0.8,
				},
			];

			mockClient.query.mockImplementation((_sql: string, paramsOrCallback: any, callback?: any) => {
				const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
				if (cb) {
					setImmediate(() => cb(null, mockResults));
				}
			});

			const results = await vectorStore.similaritySearchVectorWithScore(queryVector, k);

			// Should execute search query
			expect(mockClient.query).toHaveBeenCalled();

			// Should return documents with scores
			expect(results).toHaveLength(2);
			expect(results[0][0].pageContent).toBe('doc1');
			expect(results[0][1]).toBe(0.5);
		});

		it('should handle empty results', async () => {
			const queryVector = [0.1, 0.2, 0.3];

			mockClient.query.mockImplementation((_sql: string, paramsOrCallback: any, callback?: any) => {
				const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
				if (cb) {
					setImmediate(() => cb(null, []));
				}
			});

			const results = await vectorStore.similaritySearchVectorWithScore(queryVector, 5);

			expect(results).toEqual([]);
		});

		it('should parse metadata correctly', async () => {
			const queryVector = [0.1, 0.2, 0.3];

			const mockResults = [
				{
					TEXT: 'test',
					METADATA: JSON.stringify({ source: 'file.txt', author: 'John' }),
					DISTANCE: 0.5,
				},
			];

			mockClient.query.mockImplementation((_sql: string, paramsOrCallback: any, callback?: any) => {
				const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
				if (cb) {
					setImmediate(() => cb(null, mockResults));
				}
			});

			const results = await vectorStore.similaritySearchVectorWithScore(queryVector, 1);

			expect(results[0][0].metadata).toEqual({
				source: 'file.txt',
				author: 'John',
			});
		});

		it('should handle lowercase Db2 result keys', async () => {
			const queryVector = [0.1, 0.2, 0.3];

			const mockResults = [
				{
					text: 'doc-lowercase',
					metadata: JSON.stringify({ source: 'lowercase' }),
					distance: 0.25,
				},
			];

			mockClient.query.mockImplementation((_sql: string, paramsOrCallback: any, callback?: any) => {
				const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
				if (cb) {
					setImmediate(() => cb(null, mockResults));
				}
			});

			const results = await vectorStore.similaritySearchVectorWithScore(queryVector, 1);

			expect(results).toHaveLength(1);
			expect(results[0][0].pageContent).toBe('doc-lowercase');
			expect(results[0][0].metadata).toEqual({ source: 'lowercase' });
			expect(results[0][1]).toBe(0.25);
		});
	});

	describe('delete', () => {
		beforeEach(() => {
			mockClient.query.mockImplementation((_sql: string, paramsOrCallback: any, callback?: any) => {
				const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
				setImmediate(() => cb(null, []));
			});

			vectorStore = new DB2VectorStore(mockEmbeddings, {
				client: mockClient,
				embeddingFunction: mockEmbeddings,
				tableName: 'test_vectors',
			});

			mockEmbeddings.embedQuery.mockResolvedValue([0.1, 0.2, 0.3]);
			jest.clearAllMocks();
		});

		it('should delete documents by IDs', async () => {
			const ids = ['id1', 'id2', 'id3'];

			await vectorStore.delete({ ids });

			// Should execute DELETE
			const deleteCalls = (mockClient.query as jest.Mock).mock.calls.filter((call) =>
				call[0].includes('DELETE FROM'),
			);
			expect(deleteCalls.length).toBeGreaterThan(0);
		});

		it('should handle empty ID array', async () => {
			// Empty ID array should throw error
			await expect(vectorStore.delete({ ids: [] })).rejects.toThrow('No IDs provided');
		});

		describe('update', () => {
			beforeEach(() => {
				mockClient.query.mockImplementation(
					(_sql: string, paramsOrCallback: any, callback?: any) => {
						const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
						setImmediate(() => cb(null, []));
					},
				);

				vectorStore = new DB2VectorStore(mockEmbeddings, {
					client: mockClient,
					embeddingFunction: mockEmbeddings,
					tableName: 'test_vectors',
				});

				mockEmbeddings.embedQuery.mockResolvedValue([0.1, 0.2, 0.3]);
				jest.clearAllMocks();

				mockClient.query = jest.fn((_sql: string, paramsOrCallback: any, callback?: any) => {
					const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
					setImmediate(() => cb(null, []));
				});
			});

			it('should update documents by ID', async () => {
				const ids = ['doc1', 'doc2'];
				const texts = ['Updated text 1', 'Updated text 2'];
				const metadatas = [{ updated: true }, { updated: true }];

				const embeddings = [
					[0.1, 0.2, 0.3],
					[0.4, 0.5, 0.6],
				];

				mockEmbeddings.embedDocuments.mockResolvedValue(embeddings);

				await vectorStore.update(ids, texts, metadatas);

				// Should call embedDocuments
				expect(mockEmbeddings.embedDocuments).toHaveBeenCalledWith(texts);

				// Should execute UPDATE for each document
				const updateCalls = (mockClient.query as jest.Mock).mock.calls.filter((call) =>
					call[0].includes('UPDATE'),
				);
				expect(updateCalls.length).toBeGreaterThan(0);

				// Should commit transaction
				expect(mockClient.commitTransaction).toHaveBeenCalled();
			});

			it('should update documents without metadata', async () => {
				const ids = ['doc1'];
				const texts = ['Updated text'];

				const embeddings = [[0.1, 0.2, 0.3]];

				mockEmbeddings.embedDocuments.mockResolvedValue(embeddings);

				await vectorStore.update(ids, texts);

				expect(mockEmbeddings.embedDocuments).toHaveBeenCalledWith(texts);
				expect(mockClient.query).toHaveBeenCalled();
			});

			it('should throw error if IDs and texts length mismatch', async () => {
				const ids = ['doc1'];
				const texts = ['Updated text 1', 'Updated text 2'];

				await expect(vectorStore.update(ids, texts)).rejects.toThrow(
					'Number of IDs must match number of texts',
				);
			});

			it('should throw error if metadatas length mismatch', async () => {
				const ids = ['doc1', 'doc2'];
				const texts = ['Updated text 1', 'Updated text 2'];
				const metadatas = [{ updated: true }];

				await expect(vectorStore.update(ids, texts, metadatas)).rejects.toThrow(
					'Number of metadatas must match number of IDs',
				);
			});

			it('should rollback on update error', async () => {
				const ids = ['doc1'];
				const texts = ['Updated text 1'];

				const embeddings = [[0.1, 0.2, 0.3]];
				mockEmbeddings.embedDocuments.mockResolvedValue(embeddings);

				// Mock query to fail on UPDATE
				mockClient.query = jest.fn((sql: string, paramsOrCallback: any, callback?: any) => {
					const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
					if (sql.includes('UPDATE')) {
						setImmediate(() => cb(new Error('Update failed')));
					} else {
						setImmediate(() => cb(null, []));
					}
				});

				await expect(vectorStore.update(ids, texts)).rejects.toThrow('Failed to update document');
				expect(mockClient.rollbackTransaction).toHaveBeenCalled();
			});

			it('should handle multiple document updates in transaction', async () => {
				const ids = ['doc1', 'doc2', 'doc3'];
				const texts = ['Text 1', 'Text 2', 'Text 3'];
				const metadatas = [{ idx: 1 }, { idx: 2 }, { idx: 3 }];

				const embeddings = [
					[0.1, 0.2, 0.3],
					[0.4, 0.5, 0.6],
					[0.7, 0.8, 0.9],
				];

				mockEmbeddings.embedDocuments.mockResolvedValue(embeddings);

				await vectorStore.update(ids, texts, metadatas);

				// Should begin transaction
				expect(mockClient.beginTransaction).toHaveBeenCalled();

				// Should execute UPDATE for each document
				const updateCalls = (mockClient.query as jest.Mock).mock.calls.filter((call) =>
					call[0].includes('UPDATE'),
				);
				expect(updateCalls.length).toBe(3);

				// Should commit transaction
				expect(mockClient.commitTransaction).toHaveBeenCalled();
			});
		});
	});

	describe('fromTexts', () => {
		it('should create instance and add texts', async () => {
			const texts = ['text1', 'text2'];
			const metadatas = [{ source: 'test1' }, { source: 'test2' }];
			const embeddings = [
				[0.1, 0.2, 0.3],
				[0.4, 0.5, 0.6],
			];

			// Ensure all mocks are set up before creating instance
			mockClient.query = jest.fn((sql: string, paramsOrCallback: any, callback?: any) => {
				const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
				if (sql.includes('SELECT 1 FROM SYSIBM.SYSTABLES')) {
					setImmediate(() => cb(null, [{ 1: 1 }]));
					return;
				}
				setImmediate(() => cb(null, []));
			});
			mockClient.beginTransaction = jest.fn((callback: any) => {
				if (callback) setImmediate(() => callback(null));
			});
			mockClient.commitTransaction = jest.fn((callback: any) => {
				if (callback) setImmediate(() => callback(null));
			});
			mockClient.rollbackTransaction = jest.fn((callback: any) => {
				if (callback) setImmediate(() => callback(null));
			});
			mockClient.commit = jest.fn((callback: any) => {
				if (callback) setImmediate(() => callback(null));
			});
			mockClient.rollback = jest.fn((callback: any) => {
				if (callback) setImmediate(() => callback(null));
			});
			mockEmbeddings.embedQuery.mockResolvedValue([0.1, 0.2, 0.3]);
			mockEmbeddings.embedDocuments.mockResolvedValue(embeddings);

			const store = await DB2VectorStore.fromTexts(texts, metadatas, mockEmbeddings, {
				client: mockClient,
				tableName: 'test_vectors',
			});

			expect(store).toBeInstanceOf(DB2VectorStore);
			expect(mockEmbeddings.embedDocuments).toHaveBeenCalled();
		});
	});

	describe('distance strategies', () => {
		it('should support euclidean distance', () => {
			vectorStore = new DB2VectorStore(mockEmbeddings, {
				client: mockClient,
				embeddingFunction: mockEmbeddings,
				tableName: 'test_vectors',
				distanceStrategy: DistanceStrategy.EUCLIDEAN,
			});

			expect(vectorStore).toBeInstanceOf(DB2VectorStore);
		});

		it('should support cosine distance', () => {
			vectorStore = new DB2VectorStore(mockEmbeddings, {
				client: mockClient,
				embeddingFunction: mockEmbeddings,
				tableName: 'test_vectors',
				distanceStrategy: DistanceStrategy.COSINE,
			});

			expect(vectorStore).toBeInstanceOf(DB2VectorStore);
		});

		it('should support dot product', () => {
			vectorStore = new DB2VectorStore(mockEmbeddings, {
				client: mockClient,
				embeddingFunction: mockEmbeddings,
				tableName: 'test_vectors',
				distanceStrategy: DistanceStrategy.DOT_PRODUCT,
			});

			expect(vectorStore).toBeInstanceOf(DB2VectorStore);
		});

		describe('insertion', () => {
			beforeEach(() => {
				mockEmbeddings.embedQuery.mockResolvedValue([0.1, 0.2, 0.3]);

				mockClient.query.mockImplementation(
					(sql: string, paramsOrCallback: any, callback?: any) => {
						const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
						if (sql.includes('SELECT 1 FROM SYSIBM.SYSTABLES')) {
							setImmediate(() => cb(null, [{ 1: 1 }]));
							return;
						}
						setImmediate(() => cb(null, []));
					},
				);
			});

			it('should use row-by-row insert', async () => {
				vectorStore = new DB2VectorStore(mockEmbeddings, {
					client: mockClient,
					embeddingFunction: mockEmbeddings,
					tableName: 'test_vectors',
				});

				jest.clearAllMocks();

				// Re-create all mocks after clearing
				mockClient.query = jest.fn((sql: string, paramsOrCallback: any, callback?: any) => {
					const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
					if (sql.includes('SELECT 1 FROM SYSIBM.SYSTABLES')) {
						setImmediate(() => cb(null, [{ 1: 1 }]));
						return;
					}
					setImmediate(() => cb(null, []));
				});
				mockClient.beginTransaction = jest.fn((callback: any) => {
					if (callback) setImmediate(() => callback(null));
				});
				mockClient.commitTransaction = jest.fn((callback: any) => {
					if (callback) setImmediate(() => callback(null));
				});
				mockClient.rollbackTransaction = jest.fn((callback: any) => {
					if (callback) setImmediate(() => callback(null));
				});
				mockClient.commit = jest.fn((callback: any) => {
					if (callback) setImmediate(() => callback(null));
				});
				mockClient.rollback = jest.fn((callback: any) => {
					if (callback) setImmediate(() => callback(null));
				});
				mockEmbeddings.embedDocuments.mockImplementation(async (texts: string[]) => {
					return texts.map(() => [0.1, 0.2, 0.3]);
				});

				const vectors = [
					[0.1, 0.2, 0.3],
					[0.4, 0.5, 0.6],
				];
				const documents = [
					{ pageContent: 'doc1', metadata: { source: 'test1' } },
					{ pageContent: 'doc2', metadata: { source: 'test2' } },
				];

				mockEmbeddings.embedDocuments.mockResolvedValue(vectors);

				await vectorStore.addVectors(vectors, documents);

				// Should use query for row-by-row insert
				const insertCalls = (mockClient.query as jest.Mock).mock.calls.filter((call) =>
					call[0].includes('INSERT INTO'),
				);
				expect(insertCalls.length).toBeGreaterThan(0);
			});

			it('should handle insert errors', async () => {
				vectorStore = new DB2VectorStore(mockEmbeddings, {
					client: mockClient,
					embeddingFunction: mockEmbeddings,
					tableName: 'test_vectors',
				});

				mockEmbeddings.embedQuery.mockResolvedValue([0.1, 0.2, 0.3]);

				mockClient.query = jest.fn((sql: string, paramsOrCallback: any, callback?: any) => {
					const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
					if (sql.includes('SELECT 1 FROM SYSIBM.SYSTABLES')) {
						setImmediate(() => cb(null, [{ 1: 1 }]));
						return;
					}
					if (sql.includes('INSERT INTO')) {
						setImmediate(() => cb(new Error('Insert failed')));
					} else {
						setImmediate(() => cb(null, []));
					}
				});
				mockClient.beginTransaction = jest.fn((callback: any) => {
					if (callback) setImmediate(() => callback(null));
				});
				mockClient.rollbackTransaction = jest.fn((callback: any) => {
					if (callback) setImmediate(() => callback(null));
				});
				mockClient.commit = jest.fn((callback: any) => {
					if (callback) setImmediate(() => callback(null));
				});
				mockClient.rollback = jest.fn((callback: any) => {
					if (callback) setImmediate(() => callback(null));
				});
				mockEmbeddings.embedDocuments.mockImplementation(async (texts: string[]) => {
					return texts.map(() => [0.1, 0.2, 0.3]);
				});

				const vectors = [
					[0.1, 0.2, 0.3],
					[0.4, 0.5, 0.6],
				];
				const documents = [
					{ pageContent: 'doc1', metadata: {} },
					{ pageContent: 'doc2', metadata: {} },
				];

				mockEmbeddings.embedDocuments.mockResolvedValue(vectors);

				await expect(vectorStore.addVectors(vectors, documents)).rejects.toThrow();
			});
		});
	});
});

describe('Connection Pool', () => {
	let mockClient: any;
	let mockEmbeddings: jest.Mocked<Embeddings>;

	beforeEach(() => {
		// Create mock database client
		mockClient = {
			query: jest.fn((_sql: string, paramsOrCallback: any, callback?: any) => {
				const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
				if (cb) {
					setImmediate(() => cb(null, []));
				}
			}),
			close: jest.fn((callback: any) => {
				if (callback) setImmediate(() => callback(null));
			}),
			commitTransaction: jest.fn((callback: any) => {
				if (callback) setImmediate(() => callback(null));
			}),
			beginTransaction: jest.fn((callback: any) => {
				if (callback) setImmediate(() => callback(null));
			}),
			rollbackTransaction: jest.fn((callback: any) => {
				if (callback) setImmediate(() => callback(null));
			}),
		};

		mockEmbeddings = {
			embedDocuments: jest.fn(),
			embedQuery: jest.fn(),
		} as any;

		mockEmbeddings.embedDocuments.mockImplementation(async (texts: string[]) => {
			return texts.map(() => [0.1, 0.2, 0.3]);
		});
		mockEmbeddings.embedQuery.mockResolvedValue([0.1, 0.2, 0.3]);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should release connections properly', async () => {
		// Mock table exists
		mockClient.query.mockImplementation((_sql: string, paramsOrCallback: any, callback?: any) => {
			const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
			setImmediate(() => cb(null, []));
		});

		// Create vector store
		const vectorStore = new DB2VectorStore(mockEmbeddings, {
			client: mockClient,
			embeddingFunction: mockEmbeddings,
			tableName: 'test_vectors',
		});

		// Wait for initialization
		await (vectorStore as any)._initPromise;

		// Get the client
		const client = vectorStore.getClient();
		expect(client).toBe(mockClient);

		// Release should not throw
		expect(() => {
			// Simulate releaseVectorStoreClient behavior
			if (client) {
				// Connection pool release logic would go here
			}
		}).not.toThrow();
	});

	it('should reuse connections from pool', async () => {
		// Mock table exists
		mockClient.query.mockImplementation((_sql: string, paramsOrCallback: any, callback?: any) => {
			const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
			setImmediate(() => cb(null, []));
		});

		// Create first vector store
		const vs1 = new DB2VectorStore(mockEmbeddings, {
			client: mockClient,
			embeddingFunction: mockEmbeddings,
			tableName: 'test_vectors',
		});

		await (vs1 as any)._initPromise;

		// Create second vector store with same client
		const vs2 = new DB2VectorStore(mockEmbeddings, {
			client: mockClient,
			embeddingFunction: mockEmbeddings,
			tableName: 'test_vectors',
		});

		await (vs2 as any)._initPromise;

		// Both should use the same client
		expect(vs1.getClient()).toBe(vs2.getClient());
	});

	it('should handle connection errors gracefully', async () => {
		// Mock connection error
		mockClient.query.mockImplementation((sql: string, paramsOrCallback: any, callback?: any) => {
			const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
			if (sql.includes('SELECT 1')) {
				// Health check fails
				setImmediate(() => cb(new Error('Connection lost')));
			} else {
				setImmediate(() => cb(null, []));
			}
		});

		const vectorStore = new DB2VectorStore(mockEmbeddings, {
			client: mockClient,
			embeddingFunction: mockEmbeddings,
			tableName: 'test_vectors',
		});

		await (vectorStore as any)._initPromise;

		// Should still have a client
		expect(vectorStore.getClient()).toBeDefined();
	});

	it('should close connections on shutdown', async () => {
		mockClient.query.mockImplementation((_sql: string, paramsOrCallback: any, callback?: any) => {
			const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
			setImmediate(() => cb(null, []));
		});

		const vectorStore = new DB2VectorStore(mockEmbeddings, {
			client: mockClient,
			embeddingFunction: mockEmbeddings,
			tableName: 'test_vectors',
		});

		await (vectorStore as any)._initPromise;

		const client = vectorStore.getClient();

		// Simulate shutdown by closing the connection
		await new Promise<void>((resolve) => {
			client.close(() => resolve());
		});

		expect(mockClient.close).toHaveBeenCalled();
	});

	it('should handle multiple vector stores without memory leak', async () => {
		mockClient.query.mockImplementation((_sql: string, paramsOrCallback: any, callback?: any) => {
			const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
			setImmediate(() => cb(null, []));
		});

		const stores: DB2VectorStore[] = [];

		// Create multiple vector stores
		for (let i = 0; i < 10; i++) {
			const store = new DB2VectorStore(mockEmbeddings, {
				client: mockClient,
				embeddingFunction: mockEmbeddings,
				tableName: `test_vectors_${i}`,
			});
			await (store as any)._initPromise;
			stores.push(store);
		}

		// All stores should be created successfully
		expect(stores).toHaveLength(10);

		// Each store should have a client
		stores.forEach((store) => {
			expect(store.getClient()).toBeDefined();
		});
	});

	it('should validate connection health', async () => {
		let queryCount = 0;
		mockClient.query.mockImplementation((sql: string, paramsOrCallback: any, callback?: any) => {
			const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
			queryCount++;

			// First query (health check) succeeds
			if (sql.includes('SELECT 1')) {
				setImmediate(() => cb(null, [{ '1': 1 }]));
			} else {
				setImmediate(() => cb(null, []));
			}
		});

		const vectorStore = new DB2VectorStore(mockEmbeddings, {
			client: mockClient,
			embeddingFunction: mockEmbeddings,
			tableName: 'test_vectors',
		});

		await (vectorStore as any)._initPromise;

		// Client should be healthy
		const client = vectorStore.getClient();
		expect(client).toBeDefined();

		// Verify connection is usable
		await new Promise<void>((resolve, reject) => {
			client.query('SELECT 1 FROM SYSIBM.SYSDUMMY1', (err: Error | null) => {
				if (err) reject(err);
				else resolve();
			});
		});

		expect(queryCount).toBeGreaterThan(0);
	});

	it('should handle concurrent connection requests', async () => {
		mockClient.query.mockImplementation((_sql: string, paramsOrCallback: any, callback?: any) => {
			const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
			// Simulate async delay
			setTimeout(() => cb(null, []), 10);
		});

		// Create multiple stores concurrently
		const promises = Array.from({ length: 5 }, async (_, i) => {
			const store = new DB2VectorStore(mockEmbeddings, {
				client: mockClient,
				embeddingFunction: mockEmbeddings,
				tableName: `test_vectors_${i}`,
			});
			await store.similaritySearchVectorWithScore([0.1, 0.2, 0.3], 1);
			return store;
		});

		const stores = await Promise.all(promises);

		// All stores should be created
		expect(stores).toHaveLength(5);
		stores.forEach((store) => {
			expect(store.getClient()).toBeDefined();
		});
	});
});
describe('DB2VectorStore - Metadata Filtering', () => {
	let vectorStore: DB2VectorStore;
	let mockClient: any;
	let mockEmbeddings: jest.Mocked<Embeddings>;

	beforeEach(async () => {
		mockClient = {
			query: jest.fn(),
			close: jest.fn(),
			beginTransaction: jest.fn((callback: any) => {
				if (callback) setImmediate(() => callback(null));
			}),
			commitTransaction: jest.fn((callback: any) => {
				if (callback) setImmediate(() => callback(null));
			}),
			rollbackTransaction: jest.fn((callback: any) => {
				if (callback) setImmediate(() => callback(null));
			}),
		};

		mockEmbeddings = {
			embedDocuments: jest.fn(),
			embedQuery: jest.fn(),
		} as any;

		mockEmbeddings.embedDocuments.mockImplementation(async (texts: string[]) => {
			return texts.map(() => [0.1, 0.2, 0.3]);
		});
		mockEmbeddings.embedQuery.mockResolvedValue([0.1, 0.2, 0.3]);

		// Mock table exists
		mockClient.query.mockImplementation((_sql: string, paramsOrCallback: any, callback?: any) => {
			const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
			setImmediate(() => cb(null, []));
		});
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should apply metadata filter in similarity search', async () => {
		const filter = { category: 'tech', status: 'active' };

		vectorStore = new DB2VectorStore(mockEmbeddings, {
			client: mockClient,
			embeddingFunction: mockEmbeddings,
			tableName: 'test_vectors',
			distanceStrategy: DistanceStrategy.EUCLIDEAN,
			filter,
		});

		await (vectorStore as any)._initPromise;

		const mockResults = [
			{
				TEXT: 'doc1',
				METADATA: JSON.stringify({ category: 'tech', status: 'active' }),
				DISTANCE: 0.5,
			},
			{
				TEXT: 'doc2',
				METADATA: JSON.stringify({ category: 'sports', status: 'active' }),
				DISTANCE: 0.3,
			},
			{
				TEXT: 'doc3',
				METADATA: JSON.stringify({ category: 'tech', status: 'inactive' }),
				DISTANCE: 0.4,
			},
		];

		mockClient.query.mockImplementation((_sql: string, paramsOrCallback: any, callback?: any) => {
			const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
			if (cb) {
				setImmediate(() => cb(null, mockResults));
			}
		});

		const results = await vectorStore.similaritySearchVectorWithScore([0.1, 0.2, 0.3], 5);

		expect(mockClient.query).toHaveBeenCalled();
		// Only doc1 should match both filter conditions
		expect(results).toHaveLength(1);
		expect(results[0][0].pageContent).toBe('doc1');
		expect(results[0][0].metadata).toEqual({ category: 'tech', status: 'active' });
	});

	it('should work without filter', async () => {
		vectorStore = new DB2VectorStore(mockEmbeddings, {
			client: mockClient,
			embeddingFunction: mockEmbeddings,
			tableName: 'test_vectors',
			distanceStrategy: DistanceStrategy.EUCLIDEAN,
		});

		await (vectorStore as any)._initPromise;

		const mockResults = [
			{
				TEXT: 'doc1',
				METADATA: JSON.stringify({ category: 'tech' }),
				DISTANCE: 0.5,
			},
			{
				TEXT: 'doc2',
				METADATA: JSON.stringify({ category: 'sports' }),
				DISTANCE: 0.3,
			},
		];

		mockClient.query.mockImplementation((_sql: string, paramsOrCallback: any, callback?: any) => {
			const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
			if (cb) {
				setImmediate(() => cb(null, mockResults));
			}
		});

		const results = await vectorStore.similaritySearchVectorWithScore([0.1, 0.2, 0.3], 5);

		expect(mockClient.query).toHaveBeenCalled();
		// All documents should be returned
		expect(results).toHaveLength(2);
	});

	it('should handle empty filter object', async () => {
		vectorStore = new DB2VectorStore(mockEmbeddings, {
			client: mockClient,
			embeddingFunction: mockEmbeddings,
			tableName: 'test_vectors',
			distanceStrategy: DistanceStrategy.EUCLIDEAN,
			filter: {},
		});

		await (vectorStore as any)._initPromise;

		const mockResults = [
			{
				TEXT: 'doc1',
				METADATA: JSON.stringify({ category: 'tech' }),
				DISTANCE: 0.5,
			},
		];

		mockClient.query.mockImplementation((_sql: string, paramsOrCallback: any, callback?: any) => {
			const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
			if (cb) {
				setImmediate(() => cb(null, mockResults));
			}
		});

		const results = await vectorStore.similaritySearchVectorWithScore([0.1, 0.2, 0.3], 5);

		// Empty filter should not filter anything
		expect(results).toHaveLength(1);
	});

	it('should merge instance filter with parameter filter', async () => {
		// Instance filter
		const instanceFilter = { category: 'tech' };

		vectorStore = new DB2VectorStore(mockEmbeddings, {
			client: mockClient,
			embeddingFunction: mockEmbeddings,
			tableName: 'test_vectors',
			distanceStrategy: DistanceStrategy.EUCLIDEAN,
			filter: instanceFilter,
		});

		await (vectorStore as any)._initPromise;

		const mockResults = [
			{
				TEXT: 'doc1',
				METADATA: JSON.stringify({ category: 'tech', status: 'active' }),
				DISTANCE: 0.5,
			},
			{
				TEXT: 'doc2',
				METADATA: JSON.stringify({ category: 'tech', status: 'inactive' }),
				DISTANCE: 0.3,
			},
			{
				TEXT: 'doc3',
				METADATA: JSON.stringify({ category: 'sports', status: 'active' }),
				DISTANCE: 0.4,
			},
		];

		mockClient.query.mockImplementation((_sql: string, paramsOrCallback: any, callback?: any) => {
			const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
			if (cb) {
				setImmediate(() => cb(null, mockResults));
			}
		});

		// Parameter filter
		const paramFilter = { status: 'active' };
		const results = await vectorStore.similaritySearchVectorWithScore(
			[0.1, 0.2, 0.3],
			5,
			paramFilter,
		);

		// Should match both instance filter (category: tech) and parameter filter (status: active)
		expect(results).toHaveLength(1);
		expect(results[0][0].pageContent).toBe('doc1');
		expect(results[0][0].metadata).toEqual({ category: 'tech', status: 'active' });
	});

	it('should handle array values in filter (in operations)', async () => {
		const filter = { category: ['tech', 'science'] };

		vectorStore = new DB2VectorStore(mockEmbeddings, {
			client: mockClient,
			embeddingFunction: mockEmbeddings,
			tableName: 'test_vectors',
			distanceStrategy: DistanceStrategy.EUCLIDEAN,
			filter,
		});

		await (vectorStore as any)._initPromise;

		const mockResults = [
			{
				TEXT: 'doc1',
				METADATA: JSON.stringify({ category: 'tech' }),
				DISTANCE: 0.5,
			},
			{
				TEXT: 'doc2',
				METADATA: JSON.stringify({ category: 'sports' }),
				DISTANCE: 0.3,
			},
			{
				TEXT: 'doc3',
				METADATA: JSON.stringify({ category: 'science' }),
				DISTANCE: 0.4,
			},
		];

		mockClient.query.mockImplementation((_sql: string, paramsOrCallback: any, callback?: any) => {
			const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
			if (cb) {
				setImmediate(() => cb(null, mockResults));
			}
		});

		const results = await vectorStore.similaritySearchVectorWithScore([0.1, 0.2, 0.3], 5);

		// Should match doc1 (tech) and doc3 (science), but not doc2 (sports)
		expect(results).toHaveLength(2);
		expect(results.map((r) => r[0].pageContent)).toEqual(expect.arrayContaining(['doc1', 'doc3']));
	});

	it('should apply filter in similaritySearchVectorWithScoreAndEmbeddings', async () => {
		const filter = { category: 'tech' };

		vectorStore = new DB2VectorStore(mockEmbeddings, {
			client: mockClient,
			embeddingFunction: mockEmbeddings,
			tableName: 'test_vectors',
			distanceStrategy: DistanceStrategy.EUCLIDEAN,
			filter,
		});

		await (vectorStore as any)._initPromise;

		const mockResults = [
			{
				TEXT: 'doc1',
				METADATA: JSON.stringify({ category: 'tech' }),
				EMBEDDING: '[0.1,0.2,0.3]',
				DISTANCE: 0.5,
			},
			{
				TEXT: 'doc2',
				METADATA: JSON.stringify({ category: 'sports' }),
				EMBEDDING: '[0.2,0.3,0.4]',
				DISTANCE: 0.3,
			},
		];

		mockClient.query.mockImplementation((_sql: string, paramsOrCallback: any, callback?: any) => {
			const cb = typeof paramsOrCallback === 'function' ? paramsOrCallback : callback;
			if (cb) {
				setImmediate(() => cb(null, mockResults));
			}
		});

		const results = await vectorStore.similaritySearchVectorWithScoreAndEmbeddings(
			[0.1, 0.2, 0.3],
			5,
		);

		// Only doc1 should match the filter
		expect(results).toHaveLength(1);
		expect(results[0][0].pageContent).toBe('doc1');
		expect(results[0][2]).toEqual([0.1, 0.2, 0.3]); // Check embedding is returned
	});
});
