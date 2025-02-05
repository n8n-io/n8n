import type { FrontEndModule, FrontEndModuleContext } from '@n8n/module-common/frontend/types';

export const modules: FrontEndModule[] = [];

export function registerModule(module: FrontEndModule, context: FrontEndModuleContext) {
	modules.push(module);
	module.setup(context);
}
