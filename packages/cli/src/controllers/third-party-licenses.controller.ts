import { CLI_DIR } from '@/constants';
import { Get, RestController } from '@n8n/decorators';
import { Request, Response } from 'express';
import { readFile, access as fsAccess } from 'fs/promises';
import { resolve } from 'path';

@RestController('/third-party-licenses')
export class ThirdPartyLicensesController {
	private sendLicenseFile(res: Response, content: string, filename: string) {
		res.setHeader('Content-Type', 'text/markdown');
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
		res.send(content);
	}

	/**
	 * Download third-party licenses file
	 * Requires authentication to access
	 */
	@Get('/')
	async getThirdPartyLicenses(_: Request, res: Response) {
		const licenseFile = resolve(CLI_DIR, 'dist', 'THIRD_PARTY_LICENSES.md');
		const placeholderLicenseFile = resolve(CLI_DIR, 'THIRD_PARTY_LICENSES_PLACEHOLDER.md');

		try {
			// Try production file first
			await fsAccess(licenseFile);
			const content = await readFile(licenseFile, 'utf-8');
			this.sendLicenseFile(res, content, 'THIRD_PARTY_LICENSES.md');
		} catch {
			try {
				// Fall back to placeholder file for local development
				await fsAccess(placeholderLicenseFile);
				const content = await readFile(placeholderLicenseFile, 'utf-8');
				this.sendLicenseFile(res, content, 'THIRD_PARTY_LICENSES_PLACEHOLDER.md');
			} catch {
				res.status(404).send('Not found');
			}
		}
	}
}
