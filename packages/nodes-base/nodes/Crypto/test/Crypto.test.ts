import fs from 'fs';
import fsPromises from 'fs/promises';
import { Readable } from 'stream';
import {
	testWorkflows,
	getWorkflowFilenames,
	initBinaryDataManager,
} from '../../../test/nodes/Helpers';

const workflows = getWorkflowFilenames(__dirname);

describe('Test Crypto Node', () => {
	jest.mock('fast-glob', () => async () => ['/test/binary.data']);
	jest.mock('fs/promises');
	fsPromises.access = async () => {};
	jest.mock('fs');
	fs.createReadStream = () => Readable.from(Buffer.from('test')) as fs.ReadStream;

	beforeEach(async () => {
		await initBinaryDataManager();
	});

	testWorkflows(workflows);
});
