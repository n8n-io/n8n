import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
export declare class S98Service {
	private readonly logger;
	private readonly globalConfig;
	constructor(logger: Logger, globalConfig: GlobalConfig);
	call(url: string, data: Record<string, any>): Promise<void>;
}
