'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const jsonwebtoken_1 = require('jsonwebtoken');
const n8n_core_1 = require('n8n-core');
const binary_data_controller_1 = require('../binary-data.controller');
describe('BinaryDataController', () => {
	const request = (0, jest_mock_extended_1.mock)();
	const response = (0, jest_mock_extended_1.mock)();
	const binaryDataService = (0, jest_mock_extended_1.mock)();
	const coreBinaryDataService = (0, jest_mock_extended_1.mock)();
	const controller = new binary_data_controller_1.BinaryDataController(
		binaryDataService,
		coreBinaryDataService,
	);
	beforeEach(() => {
		jest.resetAllMocks();
		response.status.mockReturnThis();
	});
	describe('get', () => {
		it('should return 400 if binary data mode is missing', async () => {
			const query = { id: '123', action: 'view' };
			await controller.get(request, response, query);
			expect(response.status).toHaveBeenCalledWith(400);
			expect(response.end).toHaveBeenCalledWith('Malformed binary data ID');
		});
		it('should return 400 if binary data mode is invalid', async () => {
			const query = { id: 'invalidMode:123', action: 'view' };
			await controller.get(request, response, query);
			expect(response.status).toHaveBeenCalledWith(400);
			expect(response.end).toHaveBeenCalledWith('Invalid binary data mode');
		});
		it('should return 404 if file is not found', async () => {
			const query = {
				id: 'filesystem:123',
				action: 'view',
				mimeType: 'image/jpeg',
			};
			binaryDataService.getBinaryDataStream.mockRejectedValue(
				new n8n_core_1.FileNotFoundError('File not found'),
			);
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
			};
			binaryDataService.getBinaryDataStream.mockResolvedValue((0, jest_mock_extended_1.mock)());
			await controller.get(request, response, query);
			expect(binaryDataService.getBinaryDataMetadata).toHaveBeenCalledWith(query.id);
			expect(response.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
			expect(response.setHeader).not.toHaveBeenCalledWith('Content-Length');
			expect(response.setHeader).not.toHaveBeenCalledWith('Content-Disposition');
		});
		it('should set Content-Type and Content-Length from metadata if not provided', async () => {
			const query = { id: 'filesystem:123', action: 'view' };
			binaryDataService.getBinaryDataMetadata.mockResolvedValue({
				fileName: 'test.txt',
				mimeType: 'text/plain',
				fileSize: 100,
			});
			binaryDataService.getBinaryDataStream.mockResolvedValue((0, jest_mock_extended_1.mock)());
			await controller.get(request, response, query);
			expect(binaryDataService.getBinaryDataMetadata).toHaveBeenCalledWith('filesystem:123');
			expect(response.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
			expect(response.setHeader).toHaveBeenCalledWith('Content-Length', 100);
			expect(response.setHeader).not.toHaveBeenCalledWith('Content-Disposition');
		});
		it('should set Content-Disposition for download action', async () => {
			const query = {
				id: 'filesystem:123',
				action: 'download',
				fileName: 'test.txt',
			};
			binaryDataService.getBinaryDataStream.mockResolvedValue((0, jest_mock_extended_1.mock)());
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
			};
			binaryDataService.getBinaryDataStream.mockResolvedValue((0, jest_mock_extended_1.mock)());
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
			};
			binaryDataService.getBinaryDataStream.mockResolvedValue((0, jest_mock_extended_1.mock)());
			await controller.get(request, response, query);
			expect(response.status).not.toHaveBeenCalledWith(400);
			expect(response.setHeader).toHaveBeenCalledWith('Content-Type', query.mimeType);
		});
		it('should return the file stream on success', async () => {
			const query = {
				id: 'filesystem:123',
				action: 'view',
				mimeType: 'image/jpeg',
			};
			const stream = (0, jest_mock_extended_1.mock)();
			binaryDataService.getBinaryDataStream.mockResolvedValue(stream);
			const result = await controller.get(request, response, query);
			expect(result).toBe(stream);
			expect(binaryDataService.getBinaryDataStream).toHaveBeenCalledWith('filesystem:123');
		});
		describe('with malicious binary data IDs', () => {
			it.each([
				['filesystem:'],
				['filesystem-v2:'],
				['filesystem:/'],
				['filesystem-v2:/'],
				['filesystem://'],
				['filesystem-v2://'],
			])('should return 400 for ID "%s"', async (maliciousId) => {
				const query = { id: maliciousId, action: 'download' };
				await controller.get(request, response, query);
				expect(response.status).toHaveBeenCalledWith(400);
				expect(response.end).toHaveBeenCalledWith('Malformed binary data ID');
			});
		});
	});
	describe('getSigned', () => {
		const query = { token: '12344' };
		it('should return 400 if binary data mode is missing', async () => {
			binaryDataService.validateSignedToken.mockReturnValueOnce('123');
			await controller.getSigned(request, response, query);
			expect(response.status).toHaveBeenCalledWith(400);
			expect(response.end).toHaveBeenCalledWith('Malformed binary data ID');
		});
		it('should return 400 if binary data mode is invalid', async () => {
			binaryDataService.validateSignedToken.mockReturnValueOnce('invalid:123');
			await controller.getSigned(request, response, query);
			expect(response.status).toHaveBeenCalledWith(400);
			expect(response.end).toHaveBeenCalledWith('Invalid binary data mode');
		});
		it('should return 400 if token is invalid', async () => {
			binaryDataService.validateSignedToken.mockImplementation(() => {
				throw new jsonwebtoken_1.JsonWebTokenError('Invalid token');
			});
			await controller.getSigned(request, response, query);
			expect(response.status).toHaveBeenCalledWith(400);
			expect(response.end).toHaveBeenCalledWith('Invalid token');
		});
		it('should return 404 if file is not found', async () => {
			binaryDataService.validateSignedToken.mockReturnValueOnce('filesystem:123');
			binaryDataService.getBinaryDataStream.mockRejectedValue(
				new n8n_core_1.FileNotFoundError('File not found'),
			);
			await controller.getSigned(request, response, query);
			expect(response.status).toHaveBeenCalledWith(404);
			expect(response.end).toHaveBeenCalled();
		});
		it('should return the file stream on a valid signed token', async () => {
			binaryDataService.validateSignedToken.mockReturnValueOnce('filesystem:123');
			const stream = (0, jest_mock_extended_1.mock)();
			binaryDataService.getBinaryDataStream.mockResolvedValue(stream);
			const result = await controller.getSigned(request, response, query);
			expect(result).toBe(stream);
			expect(binaryDataService.getBinaryDataStream).toHaveBeenCalledWith('filesystem:123');
		});
	});
	describe('upload', () => {
		const uploadDto = { fileName: 'test.png', mimeType: 'image/png' };
		const mockFile = {
			buffer: Buffer.from('test'),
			originalname: 'test.png',
			mimetype: 'image/png',
		};
		beforeEach(() => {
			request.file = mockFile;
		});
		it('should return 400 if no file is uploaded', async () => {
			request.file = undefined;
			const result = await controller.upload(request, response, uploadDto);
			await result;
			expect(response.status).toHaveBeenCalledWith(400);
		});
		it('should upload file successfully', async () => {
			const metadata = {
				id: 'filesystem:123',
				fileName: 'test.png',
				fileSize: 4,
				checksum: 'abc123',
				uploadedAt: new Date(),
			};
			binaryDataService.uploadBinaryData.mockResolvedValue(metadata);
			const result = await controller.upload(request, response, uploadDto);
			await result;
			expect(binaryDataService.uploadBinaryData).toHaveBeenCalledWith(
				mockFile.buffer,
				expect.objectContaining({
					fileName: 'test.png',
					mimeType: 'image/png',
				}),
			);
			expect(response.status).toHaveBeenCalledWith(201);
		});
	});
	describe('download', () => {
		const params = { id: 'filesystem:123' };
		it('should return 400 if binary data ID is missing', async () => {
			const emptyParams = { id: '' };
			await controller.download(request, response, emptyParams);
			expect(response.status).toHaveBeenCalledWith(400);
		});
		it('should download file successfully', async () => {
			const stream = (0, jest_mock_extended_1.mock)();
			binaryDataService.getBinaryDataStream.mockResolvedValue(stream);
			const result = await controller.download(request, response, params);
			expect(result).toBe(stream);
			expect(binaryDataService.getBinaryDataStream).toHaveBeenCalledWith('filesystem:123');
		});
		it('should return 404 if file is not found', async () => {
			binaryDataService.getBinaryDataStream.mockRejectedValue(
				new n8n_core_1.FileNotFoundError('File not found'),
			);
			await controller.download(request, response, params);
			expect(response.status).toHaveBeenCalledWith(404);
		});
	});
	describe('delete', () => {
		const params = { id: 'filesystem:123' };
		it('should return 400 if binary data ID is missing', async () => {
			const emptyParams = { id: '' };
			await controller.delete(request, response, emptyParams);
			expect(response.status).toHaveBeenCalledWith(400);
		});
		it('should delete file successfully', async () => {
			binaryDataService.deleteBinaryData.mockResolvedValue(undefined);
			await controller.delete(request, response, params);
			expect(binaryDataService.deleteBinaryData).toHaveBeenCalledWith('filesystem:123');
			expect(response.status).toHaveBeenCalledWith(200);
		});
		it('should return 404 if file is not found', async () => {
			binaryDataService.deleteBinaryData.mockRejectedValue(
				new n8n_core_1.FileNotFoundError('File not found'),
			);
			await controller.delete(request, response, params);
			expect(response.status).toHaveBeenCalledWith(404);
		});
	});
});
//# sourceMappingURL=binary-data.controller.test.js.map
