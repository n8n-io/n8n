import type { BinaryDataQueryDto, BinaryDataSignedQueryDto } from '@n8n/api-types';
import type { Request, Response } from 'express';
import { mock } from 'jest-mock-extended';
import { JsonWebTokenError } from 'jsonwebtoken';
import type { BinaryDataService } from 'n8n-core';
import { FileNotFoundError } from 'n8n-core';
import type { Readable } from 'node:stream';

import { BinaryDataController } from '../binary-data.controller';

describe('BinaryDataController', () => {
	const request = mock<Request>();
	const response = mock<Response>();
	const binaryDataService = mock<BinaryDataService>();
	const controller = new BinaryDataController(binaryDataService);

	beforeEach(() => {
		jest.resetAllMocks();
		response.status.mockReturnThis();
	});

	describe('get', () => {
		it('should return 400 if binary data mode is missing', async () => {
			const query = { id: '123', action: 'view' } as BinaryDataQueryDto;

			await controller.get(request, response, query);

			expect(response.status).toHaveBeenCalledWith(400);
			expect(response.end).toHaveBeenCalledWith('Missing binary data mode');
		});

		it('should return 400 if binary data mode is invalid', async () => {
			const query = { id: 'invalidMode:123', action: 'view' } as BinaryDataQueryDto;

			await controller.get(request, response, query);

			expect(response.status).toHaveBeenCalledWith(400);
			expect(response.end).toHaveBeenCalledWith('Invalid binary data mode');
		});

		it('should return 404 if file is not found', async () => {
			const query = {
				id: 'filesystem:123',
				action: 'view',
				mimeType: 'image/jpeg',
			} as BinaryDataQueryDto;
			binaryDataService.getAsStream.mockRejectedValue(new FileNotFoundError('File not found'));

			await controller.get(request, response, query);

			expect(response.status).toHaveBeenCalledWith(404);
			expect(response.end).toHaveBeenCalled();
		});

		it('should set Content-Type and Content-Length from query if provided', async () => {
			const query = {
				id: 'filesystem:123',
				action: 'view',
				fileName: 'test.txt',
				mimeType: 'text/plain',
			} as BinaryDataQueryDto;

			binaryDataService.getAsStream.mockResolvedValue(mock());

			await controller.get(request, response, query);

			expect(binaryDataService.getMetadata).toHaveBeenCalledWith(query.id);
			expect(response.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
			expect(response.setHeader).not.toHaveBeenCalledWith('Content-Length');
			expect(response.setHeader).not.toHaveBeenCalledWith('Content-Disposition');
		});

		it('should set Content-Type and Content-Length from metadata if not provided', async () => {
			const query = { id: 'filesystem:123', action: 'view' } as BinaryDataQueryDto;

			binaryDataService.getMetadata.mockResolvedValue({
				fileName: 'test.txt',
				mimeType: 'text/plain',
				fileSize: 100,
			});
			binaryDataService.getAsStream.mockResolvedValue(mock());

			await controller.get(request, response, query);

			expect(binaryDataService.getMetadata).toHaveBeenCalledWith('filesystem:123');
			expect(response.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
			expect(response.setHeader).toHaveBeenCalledWith('Content-Length', 100);
			expect(response.setHeader).not.toHaveBeenCalledWith('Content-Disposition');
		});

		it('should set Content-Disposition for download action', async () => {
			const query = {
				id: 'filesystem:123',
				action: 'download',
				fileName: 'test.txt',
			} as BinaryDataQueryDto;

			binaryDataService.getAsStream.mockResolvedValue(mock());

			await controller.get(request, response, query);

			expect(response.setHeader).toHaveBeenCalledWith(
				'Content-Disposition',
				'attachment; filename="test.txt"',
			);
		});

		it('should not allow viewing of html files', async () => {
			const query = {
				id: 'filesystem:123',
				action: 'view',
				fileName: 'test.html',
				mimeType: 'text/html',
			} as BinaryDataQueryDto;

			binaryDataService.getAsStream.mockResolvedValue(mock());

			await controller.get(request, response, query);

			expect(response.status).toHaveBeenCalledWith(400);
			expect(response.setHeader).not.toHaveBeenCalled();
		});

		it('should allow viewing of jpeg files, and handle mime-type casing', async () => {
			const query = {
				id: 'filesystem:123',
				action: 'view',
				fileName: 'test.jpg',
				mimeType: 'image/Jpeg',
			} as BinaryDataQueryDto;

			binaryDataService.getAsStream.mockResolvedValue(mock());

			await controller.get(request, response, query);

			expect(response.status).not.toHaveBeenCalledWith(400);
			expect(response.setHeader).toHaveBeenCalledWith('Content-Type', query.mimeType);
		});

		it('should return the file stream on success', async () => {
			const query = {
				id: 'filesystem:123',
				action: 'view',
				mimeType: 'image/jpeg',
			} as BinaryDataQueryDto;

			const stream = mock<Readable>();
			binaryDataService.getAsStream.mockResolvedValue(stream);

			const result = await controller.get(request, response, query);

			expect(result).toBe(stream);
			expect(binaryDataService.getAsStream).toHaveBeenCalledWith('filesystem:123');
		});
	});

	describe('getSigned', () => {
		const query = { token: '12344' } as BinaryDataSignedQueryDto;

		it('should return 400 if binary data mode is missing', async () => {
			binaryDataService.validateSignedToken.mockReturnValueOnce('123');
			await controller.getSigned(request, response, query);

			expect(response.status).toHaveBeenCalledWith(400);
			expect(response.end).toHaveBeenCalledWith('Missing binary data mode');
		});

		it('should return 400 if binary data mode is invalid', async () => {
			binaryDataService.validateSignedToken.mockReturnValueOnce('invalid:123');

			await controller.getSigned(request, response, query);

			expect(response.status).toHaveBeenCalledWith(400);
			expect(response.end).toHaveBeenCalledWith('Invalid binary data mode');
		});

		it('should return 400 if token is invalid', async () => {
			binaryDataService.validateSignedToken.mockImplementation(() => {
				throw new JsonWebTokenError('Invalid token');
			});

			await controller.getSigned(request, response, query);

			expect(response.status).toHaveBeenCalledWith(400);
			expect(response.end).toHaveBeenCalledWith('Invalid token');
		});

		it('should return 404 if file is not found', async () => {
			binaryDataService.validateSignedToken.mockReturnValueOnce('filesystem:123');
			binaryDataService.getAsStream.mockRejectedValue(new FileNotFoundError('File not found'));

			await controller.getSigned(request, response, query);

			expect(response.status).toHaveBeenCalledWith(404);
			expect(response.end).toHaveBeenCalled();
		});

		it('should return the file stream on a valid signed token', async () => {
			binaryDataService.validateSignedToken.mockReturnValueOnce('filesystem:123');
			const stream = mock<Readable>();
			binaryDataService.getAsStream.mockResolvedValue(stream);

			const result = await controller.getSigned(request, response, query);

			expect(result).toBe(stream);
			expect(binaryDataService.getAsStream).toHaveBeenCalledWith('filesystem:123');
		});
	});
});
