import type { ModulePreInitContext } from '../modules.config';

export const shouldLoadModule = (ctx: ModulePreInitContext) =>
	// Only main instance(s) should collect insights
	// Because main instances are informed of all finished workflow executions, whatever the mode
	ctx.instance.instanceType === 'main' &&
	// This is because legacy sqlite (without pool) does not support nested transactions needed for insights
	// TODO: remove once benchmarks confirm this issue is solved with buffering / flushing mechanism
	(ctx.database.type !== 'sqlite' || ctx.database.sqlite.poolSize > 0);
