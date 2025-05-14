import type { PreInitContext } from '../module-types'; // @TODO: Move to standalone package

/**
 * Only mains are entitled to collect insights because mains are
 * informed of all finished workflow executions, whatever the mode.
 */
export const shouldLoadModule = (ctx: PreInitContext) => ctx.instance.instanceType === 'main';
