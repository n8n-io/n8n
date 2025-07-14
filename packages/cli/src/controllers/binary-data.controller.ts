import { BinaryDataQueryDto, BinaryDataSignedQueryDto, ViewableMimeTypes } from '@n8n/api-types';
import { Get, Query, RestController } from '@n8n/decorators';
import { Request, Response } from 'express';
import { JsonWebTokenError } from 'jsonwebtoken';
import { BinaryDataService, FileNotFoundError, isValidNonDefaultMode } from 'n8n-core';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

// Security: Define dangerous MIME types that should never be served
const DANGEROUS_MIME_TYPES = [
	'text/html',
	'text/html; charset=utf-8',
	'application/xhtml+xml',
	'image/svg+xml',
	'application/javascript',
	'text/javascript',
	'application/x-javascript',
	'text/x-javascript',
	'application/ecmascript',
	'text/ecmascript',
	'application/x-ecmascript',
	'text/x-ecmascript',
	'application/x-www-form-urlencoded',
	'multipart/form-data',
];

// Security: Define dangerous file signatures that indicate malicious content
const DANGEROUS_FILE_SIGNATURES = [
	// HTML files
	{ signature: Buffer.from('<!DOCTYPE html', 'utf8'), description: 'HTML document' },
	{ signature: Buffer.from('<html', 'utf8'), description: 'HTML document' },
	{ signature: Buffer.from('<script', 'utf8'), description: 'JavaScript content' },
	// JavaScript files
	{ signature: Buffer.from('function', 'utf8'), description: 'JavaScript function' },
	{ signature: Buffer.from('var ', 'utf8'), description: 'JavaScript variable' },
	{ signature: Buffer.from('const ', 'utf8'), description: 'JavaScript constant' },
	{ signature: Buffer.from('let ', 'utf8'), description: 'JavaScript variable' },
	// PHP files
	{ signature: Buffer.from('<?php', 'utf8'), description: 'PHP script' },
	// Shell scripts
	{ signature: Buffer.from('#!/bin/bash', 'utf8'), description: 'Bash script' },
	{ signature: Buffer.from('#!/bin/sh', 'utf8'), description: 'Shell script' },
];

@RestController('/binary-data')
export class BinaryDataController {
	constructor(private readonly binaryDataService: BinaryDataService) {}

	@Get('/')
	async get(
		_: Request,
		res: Response,
		@Query { id: binaryDataId, action, fileName, mimeType }: BinaryDataQueryDto,
	) {
		try {
			this.validateBinaryDataId(binaryDataId);

			// Security: Validate and sanitize MIME type parameter
			const sanitizedMimeType = this.sanitizeMimeType(mimeType);

			// Security: Validate file content for malicious signatures
			await this.validateFileContent(binaryDataId, sanitizedMimeType);

			await this.setContentHeaders(binaryDataId, action, res, fileName, sanitizedMimeType);

			// Security: Add additional security headers for binary data
			this.setSecurityHeaders(res, sanitizedMimeType);

			return await this.binaryDataService.getAsStream(binaryDataId);
		} catch (error) {
			if (error instanceof FileNotFoundError) return res.status(404).end();
			if (error instanceof BadRequestError) return res.status(400).end(error.message);
			else throw error;
		}
	}

	@Get('/signed', { skipAuth: true })
	async getSigned(_: Request, res: Response, @Query { token }: BinaryDataSignedQueryDto) {
		try {
			const binaryDataId = this.binaryDataService.validateSignedToken(token);
			this.validateBinaryDataId(binaryDataId);

			// Security: Validate file content for signed endpoints too
			await this.validateFileContent(binaryDataId);

			await this.setContentHeaders(binaryDataId, 'download', res);

			// Security: Add security headers for signed endpoints too
			this.setSecurityHeaders(res);

			return await this.binaryDataService.getAsStream(binaryDataId);
		} catch (error) {
			if (error instanceof FileNotFoundError) return res.status(404).end();
			if (error instanceof BadRequestError || error instanceof JsonWebTokenError)
				return res.status(400).end(error.message);
			else throw error;
		}
	}

	/**
	 * Validates file content for malicious signatures
	 */
	private async validateFileContent(binaryDataId: string, mimeType?: string): Promise<void> {
		try {
			// Security: Read first 1KB of file to check for dangerous signatures
			const buffer = await this.binaryDataService.getAsBuffer({ id: binaryDataId } as any);
			const sampleSize = Math.min(1024, buffer.length);
			const sample = buffer.subarray(0, sampleSize);

			// Security: Check for dangerous file signatures
			for (const { signature, description } of DANGEROUS_FILE_SIGNATURES) {
				if (sample.includes(signature)) {
					throw new BadRequestError(`File contains potentially malicious content: ${description}`);
				}
			}

			// Security: Additional check for HTML content in non-HTML MIME types
			if (
				mimeType &&
				!mimeType.startsWith('text/html') &&
				!mimeType.startsWith('application/xhtml')
			) {
				const htmlPatterns = [
					/<!DOCTYPE\s+html/i,
					/<html[^>]*>/i,
					/<script[^>]*>/i,
					/<iframe[^>]*>/i,
				];

				const content = sample.toString('utf8', 0, Math.min(sample.length, 512));
				for (const pattern of htmlPatterns) {
					if (pattern.test(content)) {
						throw new BadRequestError('File contains HTML/script content in non-HTML MIME type');
					}
				}
			}
		} catch (error) {
			if (error instanceof BadRequestError) {
				throw error;
			}
			// If we can't read the file for validation, log it but don't block the request
			// This prevents DoS attacks where malicious files are crafted to break validation
			console.warn(`Could not validate file content for ${binaryDataId}:`, error);
		}
	}

	/**
	 * Sanitizes and validates MIME type to prevent XSS attacks
	 */
	private sanitizeMimeType(mimeType?: string): string | undefined {
		if (!mimeType) return undefined;

		// Security: Normalize MIME type to lowercase for consistent comparison
		const normalizedMimeType = mimeType.toLowerCase().trim();

		// Security: Block dangerous MIME types that could lead to XSS
		if (DANGEROUS_MIME_TYPES.includes(normalizedMimeType)) {
			throw new BadRequestError('Content type not allowed for security reasons');
		}

		// Security: Validate MIME type format (type/subtype)
		const mimeTypeRegex =
			/^[a-z0-9!#$%^&\*\-_]+(\.[a-z0-9!#$%^&\*\-_]+)*\/[a-z0-9!#$%^&\*\-_]+(\.[a-z0-9!#$%^&\*\-_]+)*(\+[a-z0-9!#$%^&\*\-_]+)?(;\s*charset=[a-z0-9\-_]+)?$/i;
		if (!mimeTypeRegex.test(normalizedMimeType)) {
			throw new BadRequestError('Invalid MIME type format');
		}

		return normalizedMimeType;
	}

	/**
	 * Sets security headers to prevent XSS and other attacks
	 */
	private setSecurityHeaders(res: Response, mimeType?: string) {
		// Security: Prevent MIME type sniffing attacks
		res.setHeader('X-Content-Type-Options', 'nosniff');

		// Security: Prevent clickjacking attacks
		res.setHeader('X-Frame-Options', 'DENY');

		// Security: Add Content Security Policy for binary data
		const cspDirectives = [
			"default-src 'none'",
			"script-src 'none'",
			"object-src 'none'",
			"base-uri 'none'",
			"form-action 'none'",
		];

		// Security: Allow specific content types for viewing
		if (mimeType && ViewableMimeTypes.includes(mimeType)) {
			if (mimeType.startsWith('image/')) {
				cspDirectives.push("img-src 'self' data: blob:");
			} else if (mimeType.startsWith('video/')) {
				cspDirectives.push("media-src 'self' data: blob:");
			} else if (mimeType.startsWith('audio/')) {
				cspDirectives.push("media-src 'self' data: blob:");
			}
		}

		res.setHeader('Content-Security-Policy', cspDirectives.join('; '));

		// Security: Add referrer policy
		res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
	}

	private validateBinaryDataId(binaryDataId: string) {
		if (!binaryDataId) {
			throw new BadRequestError('Missing binary data ID');
		}

		const separatorIndex = binaryDataId.indexOf(':');

		if (separatorIndex === -1) {
			throw new BadRequestError('Malformed binary data ID');
		}

		const mode = binaryDataId.substring(0, separatorIndex);

		if (!isValidNonDefaultMode(mode)) {
			throw new BadRequestError('Invalid binary data mode');
		}

		const path = binaryDataId.substring(separatorIndex + 1);

		if (path === '' || path === '/' || path === '//') {
			throw new BadRequestError('Malformed binary data ID');
		}
	}

	private async setContentHeaders(
		binaryDataId: string,
		action: 'view' | 'download',
		res: Response,
		fileName?: string,
		mimeType?: string,
	) {
		try {
			const metadata = await this.binaryDataService.getMetadata(binaryDataId);
			fileName = metadata.fileName ?? fileName;
			mimeType = metadata.mimeType ?? mimeType;
			res.setHeader('Content-Length', metadata.fileSize);
		} catch {}

		// Security: Validate MIME type for viewing
		if (action === 'view') {
			if (!mimeType || !ViewableMimeTypes.includes(mimeType.toLowerCase())) {
				throw new BadRequestError('Content not viewable');
			}

			// Security: Additional check for dangerous MIME types
			if (DANGEROUS_MIME_TYPES.includes(mimeType.toLowerCase())) {
				throw new BadRequestError('Content type not allowed for security reasons');
			}
		}

		if (mimeType) {
			res.setHeader('Content-Type', mimeType);
		}

		if (action === 'download' && fileName) {
			const encodedFilename = encodeURIComponent(fileName);
			res.setHeader('Content-Disposition', `attachment; filename="${encodedFilename}"`);
		}
	}
}
