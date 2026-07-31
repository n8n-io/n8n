import { safeJoinPath } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Get, RestController } from '@n8n/decorators';
import type { Request } from 'express';
import { access } from 'fs/promises';

import { NODES_BASE_DIR } from '@/constants';
import { CredentialTypes } from '@/credential-types';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { LanguageService } from '@/services/language.service';

export const CREDENTIAL_TRANSLATIONS_DIR = 'n8n-nodes-base/dist/credentials/translations';
export const NODE_HEADERS_PATH = safeJoinPath(NODES_BASE_DIR, 'dist/nodes/headers');

export declare namespace TranslationRequest {
	export type Credential = Request<{}, {}, {}, { credentialType: string }>;
	export type EditorLanguage = Request<{ code: string }>;
}

@RestController('/')
export class TranslationController {
	constructor(
		private readonly credentialTypes: CredentialTypes,
		private readonly globalConfig: GlobalConfig,
		private readonly languageService: LanguageService,
	) {}

	@Get('/credential-translation')
	async getCredentialTranslation(req: TranslationRequest.Credential) {
		const { credentialType } = req.query;

		if (!this.credentialTypes.recognizes(credentialType))
			throw new BadRequestError(`Invalid Credential type: "${credentialType}"`);

		const { defaultLocale } = this.globalConfig;
		const translationPath = safeJoinPath(
			CREDENTIAL_TRANSLATIONS_DIR,
			defaultLocale,
			`${credentialType}.json`,
		);

		try {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return require(translationPath);
		} catch (error) {
			return null;
		}
	}

	@Get('/node-translation-headers')
	async getNodeTranslationHeaders() {
		try {
			await access(`${NODE_HEADERS_PATH}.js`);
		} catch {
			return; // no headers available
		}

		try {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return require(NODE_HEADERS_PATH);
		} catch (error) {
			throw new InternalServerError('Failed to load headers file', error);
		}
	}

	// Reachable unauthenticated because a custom instance-wide default locale
	// (`N8N_DEFAULT_LOCALE`) must also render on pre-auth pages like login.
	@Get('/editor-language/:code', { allowUnauthenticated: true })
	async getEditorLanguage(req: TranslationRequest.EditorLanguage) {
		const { code } = req.params;
		const catalog = await this.languageService.getLanguageCatalog(code);
		if (!catalog) throw new NotFoundError(`Unknown UI language: "${code}"`);
		return catalog;
	}
}
