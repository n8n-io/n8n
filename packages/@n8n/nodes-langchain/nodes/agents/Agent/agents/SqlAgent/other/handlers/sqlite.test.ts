import { DataSource } from '@n8n/typeorm';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { mock, mockDeep } from 'vitest-mock-extended';

import { getSqliteDataSource } from './sqlite';

describe('getSqliteDataSource', () => {
	const context = mockDeep<IExecuteFunctions>();
	const databases: DataSource[] = [];
	let databaseBytes: Buffer;

	beforeAll(async () => {
		const directory = await mkdtemp(join(tmpdir(), 'n8n-sqlite-input-test-'));
		const database = new DataSource({ type: 'sqlite', database: join(directory, 'input.sqlite') });
		try {
			await database.initialize();
			await database.query('CREATE TABLE example (value TEXT)');
			await database.query('INSERT INTO example VALUES (?)', ['test value']);
			await database.destroy();
			databaseBytes = await readFile(join(directory, 'input.sqlite'));
		} finally {
			if (database.isInitialized) await database.destroy();
			await rm(directory, { recursive: true, force: true });
		}
	});

	afterEach(async () => {
		for (const database of databases.splice(0)) {
			if (database.isInitialized) await database.destroy();
			if (database.options.type === 'sqlite') {
				await rm(database.options.database, { force: true });
			}
		}
		vi.clearAllMocks();
	});

	it('reads inline binary data from unique temporary SQLite files', async () => {
		const binary = {
			data: { data: databaseBytes.toString('base64'), mimeType: 'application/vnd.sqlite3' },
		};
		for (let i = 0; i < 2; i++) {
			const database = await getSqliteDataSource.call(context, binary);
			databases.push(database);
			await database.initialize();
			expect(await database.query('SELECT value FROM example')).toEqual([{ value: 'test value' }]);
		}
		expect(databases[0].options.database).not.toBe(databases[1].options.database);
	});

	it('reads stored binary data from a custom property', async () => {
		const stream = Readable.from(databaseBytes);
		context.helpers.getBinaryStream.mockResolvedValue(stream);
		context.helpers.binaryToBuffer.mockResolvedValue(databaseBytes);
		const database = await getSqliteDataSource.call(
			context,
			{ attachment: { id: 'test-binary', data: '', mimeType: 'application/vnd.sqlite3' } },
			'attachment',
		);
		databases.push(database);
		await database.initialize();
		expect(await database.query('SELECT value FROM example')).toEqual([{ value: 'test value' }]);
		expect(context.helpers.getBinaryStream).toHaveBeenCalledWith('test-binary', 256 * 1024);
		expect(context.helpers.binaryToBuffer).toHaveBeenCalledWith(stream);
	});

	it('reports missing binary input', async () => {
		context.getNode.mockReturnValue(mock<INode>({ name: 'SQL Agent' }));
		await expect(getSqliteDataSource.call(context, undefined)).rejects.toThrow(
			'No binary data received.',
		);
	});
});
