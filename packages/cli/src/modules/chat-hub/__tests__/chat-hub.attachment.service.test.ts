import type { ChatAttachment } from '@n8n/api-types';
import { mock } from 'jest-mock-extended';
import type { BinaryDataService } from 'n8n-core';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import type { ChatHubMessageRepository } from '../chat-message.repository';
import { ChatHubAttachmentService } from '../chat-hub.attachment.service';

describe('ChatHubAttachmentService', () => {
	const binaryDataService = mock<BinaryDataService>();
	const messageRepository = mock<ChatHubMessageRepository>();
	const service = new ChatHubAttachmentService(binaryDataService, messageRepository);

	const makeAttachment = (mimeType: string): ChatAttachment => ({
		data: '',
		mimeType,
		fileName: 'file',
	});

	describe('validateAttachments', () => {
		it('should be a no-op when attachments array is empty', () => {
			expect(() => service.validateAttachments([], false, '')).not.toThrow();
		});

		it('should throw when file uploads are not allowed', () => {
			const attachments = [makeAttachment('image/png')];
			expect(() => service.validateAttachments(attachments, false, '')).toThrow(BadRequestError);
			expect(() => service.validateAttachments(attachments, false, '')).toThrow(
				'File uploads are not allowed for this model',
			);
		});

		it('should allow any file when allowedFilesMimeTypes is */*', () => {
			const attachments = [
				makeAttachment('image/png'),
				makeAttachment('application/pdf'),
				makeAttachment('text/csv'),
			];
			expect(() => service.validateAttachments(attachments, true, '*/*')).not.toThrow();
		});

		it('should allow any file when allowedFilesMimeTypes is empty', () => {
			const attachments = [makeAttachment('image/png'), makeAttachment('audio/mp3')];
			expect(() => service.validateAttachments(attachments, true, '')).not.toThrow();
		});

		it('should allow files matching exact MIME types', () => {
			const attachments = [makeAttachment('image/png'), makeAttachment('application/pdf')];
			expect(() =>
				service.validateAttachments(attachments, true, 'image/png, application/pdf'),
			).not.toThrow();
		});

		it('should allow files matching wildcard category', () => {
			const attachments = [makeAttachment('image/png'), makeAttachment('image/jpeg')];
			expect(() => service.validateAttachments(attachments, true, 'image/*')).not.toThrow();
		});

		it('should reject files not matching allowed MIME types', () => {
			const attachments = [makeAttachment('application/pdf')];
			expect(() => service.validateAttachments(attachments, true, 'image/*')).toThrow(
				BadRequestError,
			);
			expect(() => service.validateAttachments(attachments, true, 'image/*')).toThrow(
				'File type "application/pdf" is not allowed',
			);
		});

		it('should reject when one attachment in a batch does not match', () => {
			const attachments = [makeAttachment('image/png'), makeAttachment('audio/mp3')];
			expect(() => service.validateAttachments(attachments, true, 'image/*')).toThrow(
				BadRequestError,
			);
		});

		it('should accept application/octet-stream when explicitly in allowed types', () => {
			const attachments = [makeAttachment('application/octet-stream')];
			expect(() =>
				service.validateAttachments(
					attachments,
					true,
					'text/*,application/json,application/octet-stream',
				),
			).not.toThrow();
		});

		it('should reject application/octet-stream when not in allowed types', () => {
			const attachments = [makeAttachment('application/octet-stream')];
			expect(() => service.validateAttachments(attachments, true, 'image/*')).toThrow(
				BadRequestError,
			);
		});

		it('should handle mixed exact and wildcard patterns', () => {
			const attachments = [
				makeAttachment('image/png'),
				makeAttachment('application/pdf'),
				makeAttachment('audio/wav'),
			];
			expect(() =>
				service.validateAttachments(attachments, true, 'image/*, application/pdf, audio/*'),
			).not.toThrow();
		});
	});
});
