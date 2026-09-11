import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { RegexEngine } from 'n8n-workflow';
import {
	createDefaultRegexEngine,
	resetUserRegexEngine,
	setUserRegexEngine,
} from 'n8n-workflow';

/** An engine this service can install, plus the teardown it needs when the process exits. */
export interface ManagedRegexEngine extends RegexEngine {
	dispose?(): void;
}

/**
 * Installs the engine that runs the patterns a user writes. The instance picks it once, at
 * start-up; there is no switching later. Patterns n8n itself authored stay on `safeRegex`.
 */
@Service()
export class RegexEngineService {
	private active?: ManagedRegexEngine;

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly logger: Logger,
	) {}

	async init(): Promise<void> {
		const { engine } = this.globalConfig.regexEngine;

		this.active = await this.create();
		setUserRegexEngine(this.active);
		this.logger.debug(`Using the ${engine} regular expression engine for user patterns`);
	}

	shutdown(): void {
		if (!this.active) return;

		// Restore the built-in engine before freeing the selected one: a user's regex
		// evaluated during the rest of the shutdown must still find an engine.
		resetUserRegexEngine();
		this.active.dispose?.();
		this.active = undefined;
	}

	/** The config schema rejects any value with no case here, so this needs no fallback. */
	private async create(): Promise<ManagedRegexEngine> {
		switch (this.globalConfig.regexEngine.engine) {
			case 'js':
				return createDefaultRegexEngine();
		}
	}
}
