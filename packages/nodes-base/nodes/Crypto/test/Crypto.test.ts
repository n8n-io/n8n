import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { Readable } from 'stream';

describe('Test Crypto Node', () => {
	jest.mock('fast-glob', () => async () => ['/test/binary.data']);
	jest.mock('fs/promises');
	fsPromises.access = async () => {};
	jest.mock('fs');
	fs.createReadStream = () => Readable.from(Buffer.from('test')) as fs.ReadStream;

	new NodeTestHarness().setupTests();
});
