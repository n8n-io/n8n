import { CLI_DIR } from '@/constants';
import { Get, RestController } from '@n8n/decorators';
import { Request, Response } from 'express';
import { readFile, access as fsAccess } from 'fs/promises';
import { resolve } from 'path';

@RestController('/third-party-licenses')
export class ThirdPartyLicensesController {
	/**
	 * Download third-party licenses file
	 * Public access (licenses are required to be disclosed)
	 * User already authenticated to access About modal
	 */
	@Get('/', { skipAuth: true })
	async getThirdPartyLicenses(_: Request, res: Response) {
		const licenseFile = resolve(CLI_DIR, 'dist', 'THIRD_PARTY_LICENSES.md');
		const placeholderLicenseFile = resolve(CLI_DIR, 'THIRD_PARTY_LICENSES_PLACEHOLDER.md');

		try {
			// Try production file first
			await fsAccess(licenseFile);
			const content = await readFile(licenseFile, 'utf-8');

			res.set({
				'Content-Type': 'text/markdown',
				'Content-Disposition': 'attachment; filename="THIRD_PARTY_LICENSES.md"',
			});
			res.send(content);
		} catch {
			try {
				// Fall back to placeholder file for local development
				await fsAccess(placeholderLicenseFile);
				const content = await readFile(placeholderLicenseFile, 'utf-8');

				res.set({
					'Content-Type': 'text/markdown',
					'Content-Disposition': 'attachment; filename="THIRD_PARTY_LICENSES_PLACEHOLDER.md"',
				});
				res.send(content);
			} catch {
				res.status(404).send('Not found');
			}
		}
	}
}
