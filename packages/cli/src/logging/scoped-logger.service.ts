import { GlobalConfig } from '@n8n/config';
import type { LogScope } from '@n8n/config';
import { InstanceSettings } from 'n8n-core';
import { Service } from 'typedi';
import type winston from 'winston';

import { Logger } from './logger.service';

@Service()
export class ScopedLogger {
	protected internalLogger: winston.Logger;

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly instanceSettings: InstanceSettings,
	) {}

	from(scopes: LogScope | LogScope[]) {
		scopes = Array.isArray(scopes) ? scopes : [scopes];
		const scopedLogger = new Logger(this.globalConfig, this.instanceSettings);

		this.internalLogger = this.internalLogger.child({ scopes });

		return scopedLogger;
	}
}
