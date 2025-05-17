import type { ModulePreInitContext } from '../modules.config';

export const shouldLoadModule = (ctx: ModulePreInitContext) =>
	// Only main and webhook instance(s) should collect insights
	// Because main and webhooks instances are the ones informed of all finished workflow executions, whatever the mode
	ctx.instance.instanceType === 'main' || ctx.instance.instanceType === 'webhook';
