import type { Request } from 'express';
import { ICredentialTypes } from 'n8n-workflow';
import { join } from 'path';
import { access } from 'fs/promises';
import { Get, RestController } from '@/decorators';
import { BadRequestError, InternalServerError } from '@/ResponseHelper';
import { Config } from '@/config';
import { NODES_BASE_DIR } from '@/constants';

const credentialTranslationsDir = join(NODES_BASE_DIR, 'dist/credentials/translations');
const nodeHeadersPath = join(NODES_BASE_DIR, 'dist/nodes/headers');

@RestController('/')
export class TranslationController {
	constructor(private config: Config, private credentialTypes: ICredentialTypes) {}

	@Get('/credential-translation')
	async getCredentialTranslation(req: Request & { query: { credentialType: string } }) {
		const { credentialType } = req.query;

		if (!this.credentialTypes.recognizes(credentialType))
			throw new BadRequestError(`Invalid Credential type ${credentialType}`);

		const defaultLocale = this.config.getEnv('defaultLocale');
		const translationPath = join(
			credentialTranslationsDir,
			defaultLocale,
			`${credentialType}.json`,
		);

		try {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return await import(translationPath);
		} catch (error) {
			return null;
		}
	}

	@Get('/node-translation-headers')
	async getNodeTranslationHeaders() {
		try {
			await access(`${nodeHeadersPath}.js`);
		} catch (_) {
			return; // no headers available
		}

		try {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return await import(nodeHeadersPath);
		} catch (error) {
			throw new InternalServerError('Failed to load headers file');
		}
	}
}
