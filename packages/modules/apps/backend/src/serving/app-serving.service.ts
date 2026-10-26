import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';
import type { Request, Response } from 'express';
import path from 'node:path';

import { AppBundleCache } from './app-bundle-cache';
import { AppAuthService, type AppRequest } from '../auth/app-auth.service';

@Service()
export class AppServingService {
	constructor(
		private readonly bundles: AppBundleCache,
		private readonly auth: AppAuthService,
	) {}

	isReserved(req: Request): boolean {
		const pathname = this.filePath(req.path);
		return pathname === '_n8n' || pathname.startsWith('_n8n/');
	}

	async serve(req: AppRequest, res: Response): Promise<void> {
		if (req.method !== 'GET' && req.method !== 'HEAD') {
			res.set('Allow', 'GET, HEAD').sendStatus(405);
			return;
		}
		const versionId = req.appContext?.app.publishedVersionId;
		if (!versionId) throw new NotFoundError('App not found.');
		const bundle = await this.bundles.get(versionId);
		const name = this.filePath(req.path);
		let file = bundle.get(name || 'index.html');
		if (!file && !path.posix.extname(name) && this.auth.isNavigation(req)) {
			file = bundle.get('index.html');
		}
		if (!file) throw new NotFoundError('App file not found.');
		// TODO: review these headers
		res.set({
			'Cache-Control': 'private, no-cache',
			ETag: file.etag,
			'Content-Type': file.contentType,
			'X-Content-Type-Options': 'nosniff',
			'Referrer-Policy': 'same-origin',
			'Content-Security-Policy': "base-uri 'self'; object-src 'none'",
		});
		res.send(file.body);
	}

	private filePath(value: string): string {
		let decoded: string;
		try {
			decoded = decodeURIComponent(value);
		} catch {
			throw new NotFoundError('App file not found.');
		}
		if (
			/[\\\0]/.test(decoded) ||
			decoded.split('/').some((part) => part === '.' || part === '..')
		) {
			throw new NotFoundError('App file not found.');
		}
		return decoded.replace(/^\//, '');
	}
}
