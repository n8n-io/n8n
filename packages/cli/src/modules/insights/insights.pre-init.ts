import type { ModulePreInitContext } from '../modules.config';

export const shouldLoadModule = (ctx: ModulePreInitContext) =>
	// Only main instance(s) should collect insights
	// Because main instances are informed of all finished workflow executions, whatever the mode
	ctx.instance.instanceType === 'main';
