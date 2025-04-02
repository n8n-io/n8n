import type { Response } from 'express';
import { mock } from 'jest-mock-extended';
import type { BinaryDataService } from 'n8n-core';
import { FileNotFoundError } from 'n8n-core';
import type { Readable } from 'node:stream';

import type { BinaryDataRequest } from '@/requests';

import { BinaryDataController } from '../binary-data.controller';

describe('BinaryDataController', () => {
	const request = mock<BinaryDataRequest>();
	const response = mock<Response>();
	const binaryDataService = mock<BinaryDataService>();
	const controller = new BinaryDataController(binaryDataService);

	beforeEach(() => {
		jest.resetAllMocks();
		response.status.mockReturnThis();
	});

	describe('get', () => {
		it('should return 400 if binary data ID is missing', async () => {
			// @ts-expect-error invalid query object
			request.query = {};

			await controller.get(request, response);

			expect(response.status).toHaveBeenCalledWith(400);
			expect(response.end).toHaveBeenCalledWith('Missing binary data ID');
		});

		it('should return 400 if binary data mode is missing', async () => {
			request.query = { id: '123', action: 'view' };

			await controller.get(request, response);

			expect(response.status).toHaveBeenCalledWith(400);
			expect(response.end).toHaveBeenCalledWith('Missing binary data mode');
		});

		it('should return 400 if binary data mode is invalid', async () => {
			request.query = { id: 'invalidMode:123', action: 'view' };

			await controller.get(request, response);

			expect(response.status).toHaveBeenCalledWith(400);
			expect(response.end).toHaveBeenCalledWith('Invalid binary data mode');
		});

		it('should return 404 if file is not found', async () => {
			request.query = { id: 'filesystem:123', action: 'view' };
			binaryDataService.getAsStream.mockRejectedValue(new FileNotFoundError('File not found'));

			await controller.get(request, response);

			expect(response.status).toHaveBeenCalledWith(404);
			expect(response.end).toHaveBeenCalled();
		});

		it('should set Content-Type and Content-Length from query if provided', async () => {
			request.query = {
				id: 'filesystem:123',
				action: 'view',
				fileName: 'test.txt',
				mimeType: 'text/plain',
			};

			binaryDataService.getAsStream.mockResolvedValue(mock());

			await controller.get(request, response);

			expect(binaryDataService.getMetadata).not.toHaveBeenCalled();
			expect(response.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
			expect(response.setHeader).not.toHaveBeenCalledWith('Content-Length');
			expect(response.setHeader).not.toHaveBeenCalledWith('Content-Disposition');
		});

		it('should set Content-Type and Content-Length from metadata if not provided', async () => {
			request.query = { id: 'filesystem:123', action: 'view' };

			binaryDataService.getMetadata.mockResolvedValue({
				fileName: 'test.txt',
				mimeType: 'text/plain',
				fileSize: 100,
			});
			binaryDataService.getAsStream.mockResolvedValue(mock());

			await controller.get(request, response);

			expect(binaryDataService.getMetadata).toHaveBeenCalledWith('filesystem:123');
			expect(response.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
			expect(response.setHeader).toHaveBeenCalledWith('Content-Length', 100);
			expect(response.setHeader).not.toHaveBeenCalledWith('Content-Disposition');
		});

		it('should set Content-Disposition for download action', async () => {
			request.query = { id: 'filesystem:123', action: 'download', fileName: 'test.txt' };

			binaryDataService.getAsStream.mockResolvedValue(mock());

			await controller.get(request, response);

			expect(response.setHeader).toHaveBeenCalledWith(
				'Content-Disposition',
				'attachment; filename="test.txt"',
			);
		});

		it('should set Content-Security-Policy for HTML in view mode', async () => {
			request.query = {
				id: 'filesystem:123',
				action: 'view',
				fileName: 'test.html',
				mimeType: 'text/html',
			};

			binaryDataService.getAsStream.mockResolvedValue(mock());

			await controller.get(request, response);

			expect(response.header).toHaveBeenCalledWith('Content-Security-Policy', 'sandbox');
		});

		it('should not set Content-Security-Policy for HTML in download mode', async () => {
			request.query = {
				id: 'filesystem:123',
				action: 'download',
				fileName: 'test.html',
				mimeType: 'text/html',
			};

			binaryDataService.getAsStream.mockResolvedValue(mock());

			await controller.get(request, response);

			expect(response.header).not.toHaveBeenCalledWith('Content-Security-Policy', 'sandbox');
		});

		it('should return the file stream on success', async () => {
			request.query = { id: 'filesystem:123', action: 'view' };

			const stream = mock<Readable>();
			binaryDataService.getAsStream.mockResolvedValue(stream);

			const result = await controller.get(request, response);

			expect(result).toBe(stream);
			expect(binaryDataService.getAsStream).toHaveBeenCalledWith('filesystem:123');
		});
	});
});
