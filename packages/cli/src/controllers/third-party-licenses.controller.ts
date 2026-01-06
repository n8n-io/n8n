import { CLI_DIR } from '@/constants';
import { Get, RestController } from '@n8n/decorators';
import { Request, Response } from 'express';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

@RestController('/third-party-licenses')
export class ThirdPartyLicensesController {
	/**
	 * Get third-party licenses content
	 * Requires authentication to access
	 */
	@Get('/')
	async getThirdPartyLicenses(_: Request, res: Response) {
		const licenseFile = resolve(CLI_DIR, 'THIRD_PARTY_LICENSES.md');

		try {
			const content = await readFile(licenseFile, 'utf-8');
			res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
			res.send(content);
		} catch {
			res.status(404).send('Third-party licenses file not found');
		}
	}
}
