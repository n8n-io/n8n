import type { GlobalConfig } from '@n8n/config';

export const shouldLoadModule = (ctx: GlobalConfig) =>
	ctx.database.type !== 'sqlite' || ctx.database.sqlite.poolSize > 0;
