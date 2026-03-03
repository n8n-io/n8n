import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type fs from 'fs';
import fsPromises, { type FileHandle } from 'fs/promises';
import { Readable } from 'stream';

describe('Test Crypto Node', () => {
	jest.mock('fast-glob', () => async () => ['/test/binary.data']);
	jest.mock('fs/promises');
	fsPromises.access = async () => {};
	fsPromises.stat = jest.fn(async (path: fs.PathLike) => {
		if (path === '/test/binary.data') {
			return {
				isFile: () => true,
				dev: 123456,
				ino: 654321,
			} as fs.Stats;
		}
		throw Object.assign(new Error('File not found'), { code: 'ENOENT' });
	}) as unknown as typeof fsPromises.stat;
	fsPromises.open = jest.fn(async (path: fs.PathLike) => {
		if (path === '/test/binary.data') {
			return {
				close: async () => {},
				// eslint-disable-next-line @typescript-eslint/require-await
				stat: async () =>
					({
						isFile: () => true,
						dev: 123456,
						ino: 654321,
					}) as fs.Stats,
				createReadStream: () => {
					const stream = Readable.from(Buffer.from('test')) as fs.ReadStream;
					// Emit 'open' event asynchronously to match real fs.ReadStream behavior
					setImmediate(() => stream.emit('open'));
					return stream;
				},
			} as FileHandle;
		}
		throw Object.assign(new Error('File not found'), { code: 'ENOENT' });
	}) as unknown as typeof fsPromises.open;
	const realpathSpy = jest.spyOn(fsPromises, 'realpath');
	realpathSpy.mockImplementation(async (path) => path as string);

	new NodeTestHarness().setupTests();
});
