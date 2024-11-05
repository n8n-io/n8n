import FileType from 'file-type';
import { IncomingMessage, type ClientRequest } from 'http';
import { mock } from 'jest-mock-extended';
import type { Workflow, IWorkflowExecuteAdditionalData, IBinaryData } from 'n8n-workflow';
import type { Socket } from 'net';
import { Container } from 'typedi';

import { BinaryDataService } from '@/BinaryData/BinaryData.service';

import { BinaryHelpers } from '../binary-helpers';

jest.mock('file-type');

describe('BinaryHelpers', () => {
	let binaryDataService = mock<BinaryDataService>();
	Container.set(BinaryDataService, binaryDataService);
	const workflow = mock<Workflow>({ id: '123' });
	const additionalData = mock<IWorkflowExecuteAdditionalData>({ executionId: '456' });
	const binaryHelpers = new BinaryHelpers(workflow, additionalData);

	beforeEach(() => {
		jest.clearAllMocks();

		binaryDataService.store.mockImplementation(
			async (_workflowId, _executionId, _buffer, value) => value,
		);
	});

	describe('getBinaryPath', () => {
		it('should call getPath method of BinaryDataService', () => {
			binaryHelpers.getBinaryPath('mock-binary-data-id');
			expect(binaryDataService.getPath).toHaveBeenCalledWith('mock-binary-data-id');
		});
	});

	describe('getBinaryMetadata', () => {
		it('should call getMetadata method of BinaryDataService', async () => {
			await binaryHelpers.getBinaryMetadata('mock-binary-data-id');
			expect(binaryDataService.getMetadata).toHaveBeenCalledWith('mock-binary-data-id');
		});
	});

	describe('getBinaryStream', () => {
		it('should call getStream method of BinaryDataService', async () => {
			await binaryHelpers.getBinaryStream('mock-binary-data-id');
			expect(binaryDataService.getAsStream).toHaveBeenCalledWith('mock-binary-data-id', undefined);
		});
	});

	describe('prepareBinaryData', () => {
		it('should guess the mime type and file extension if not provided', async () => {
			const buffer = Buffer.from('test');
			const fileTypeData = { mime: 'application/pdf', ext: 'pdf' };
			(FileType.fromBuffer as jest.Mock).mockResolvedValue(fileTypeData);

			const binaryData = await binaryHelpers.prepareBinaryData(buffer);

			expect(binaryData.mimeType).toEqual('application/pdf');
			expect(binaryData.fileExtension).toEqual('pdf');
			expect(binaryData.fileType).toEqual('pdf');
			expect(binaryData.fileName).toBeUndefined();
			expect(binaryData.directory).toBeUndefined();
			expect(binaryDataService.store).toHaveBeenCalledWith(
				workflow.id,
				additionalData.executionId!,
				buffer,
				binaryData,
			);
		});

		it('should use the provided mime type and file extension if provided', async () => {
			const buffer = Buffer.from('test');
			const mimeType = 'application/octet-stream';

			const binaryData = await binaryHelpers.prepareBinaryData(buffer, undefined, mimeType);

			expect(binaryData.mimeType).toEqual(mimeType);
			expect(binaryData.fileExtension).toEqual('bin');
			expect(binaryData.fileType).toBeUndefined();
			expect(binaryData.fileName).toBeUndefined();
			expect(binaryData.directory).toBeUndefined();
			expect(binaryDataService.store).toHaveBeenCalledWith(
				workflow.id,
				additionalData.executionId!,
				buffer,
				binaryData,
			);
		});

		const mockSocket = mock<Socket>({ readableHighWaterMark: 0 });

		it('should use the contentDisposition.filename, responseUrl, and contentType properties to set the fileName, directory, and mimeType properties of the binaryData object', async () => {
			const incomingMessage = new IncomingMessage(mockSocket);
			incomingMessage.contentDisposition = { filename: 'test.txt', type: 'attachment' };
			incomingMessage.contentType = 'text/plain';
			incomingMessage.responseUrl = 'https://example.com/test.txt';

			const binaryData = await binaryHelpers.prepareBinaryData(incomingMessage);

			expect(binaryData.fileName).toEqual('test.txt');
			expect(binaryData.fileType).toEqual('text');
			expect(binaryData.directory).toBeUndefined();
			expect(binaryData.mimeType).toEqual('text/plain');
			expect(binaryData.fileExtension).toEqual('txt');
		});

		it('should use the req.path property to set the fileName property of the binaryData object if contentDisposition.filename and responseUrl are not provided', async () => {
			const incomingMessage = new IncomingMessage(mockSocket);
			incomingMessage.contentType = 'text/plain';
			incomingMessage.req = mock<ClientRequest>({ path: '/test.txt' });

			const binaryData = await binaryHelpers.prepareBinaryData(incomingMessage);

			expect(binaryData.fileName).toEqual('test.txt');
			expect(binaryData.directory).toBeUndefined();
			expect(binaryData.mimeType).toEqual('text/plain');
			expect(binaryData.fileExtension).toEqual('txt');
		});
	});

	describe('setBinaryDataBuffer', () => {
		it('should call store method of BinaryDataService', async () => {
			const binaryData = mock<IBinaryData>();
			const bufferOrStream = mock<Buffer>();

			await binaryHelpers.setBinaryDataBuffer(binaryData, bufferOrStream);

			expect(binaryDataService.store).toHaveBeenCalledWith(
				workflow.id,
				additionalData.executionId,
				bufferOrStream,
				binaryData,
			);
		});
	});
});
