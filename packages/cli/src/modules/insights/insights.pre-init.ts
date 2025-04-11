import type { ModulePreInitContext } from '../modules.config';

export function shouldLoadModule(ctx: ModulePreInitContext): boolean {
	// Only main instance should collect insights
	// Because main instances are informed of all finished workflow executions, whatever the mode
	if (ctx.instance.instanceType !== 'main') {
		return false;
	}

	// Disable insights for sqlite if pool size is not set
	// This is because legacy sqlite does not support nested transactions needed for insights
	// TODO: remove once benchmarks confirm this issue is solved with buffering / flushing mechanism
	if (ctx.database.type === 'sqlite' && !ctx.database.sqlite.poolSize) {
		return false;
	}

	return true;
}
