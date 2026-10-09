import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { RegexEngine } from 'n8n-workflow';
import { createDefaultRegexEngine, resetUserRegexEngine, setUserRegexEngine } from 'n8n-workflow';

export interface ManagedRegexEngine extends RegexEngine {
	dispose?(): void;
}

/** Installs the engine that runs the patterns a user writes, once at start-up. */
@Service()
export class RegexEngineService {
	private active?: ManagedRegexEngine;

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly logger: Logger,
	) {}

	async init(): Promise<void> {
		const engine: string = this.globalConfig.regexEngine.engine;

		// `safeUserRegex` builds the built-in engine on first use when none is set.
		if (engine === 'js') return;

		this.active = await this.create();
		setUserRegexEngine(this.active);
		this.logger.debug(`Using the ${engine} regular expression engine for user patterns`);
	}

	shutdown(): void {
		if (!this.active) return;

		// Restore the built-in engine first, so a user's pattern that runs later in shutdown
		// never reaches a freed engine.
		resetUserRegexEngine();
		this.active.dispose?.();
		this.active = undefined;
	}

	private async create(): Promise<ManagedRegexEngine> {
		// No default case: the config schema accepts only the engines handled here.
		switch (this.globalConfig.regexEngine.engine) {
			case 'js':
				return createDefaultRegexEngine();
		}
	}
}
