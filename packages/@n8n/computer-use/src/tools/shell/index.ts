import { ModuleActivation, type ToolModule } from '../types';
import { resetShellSandbox, resolveShellSandbox } from './sandbox';
import { createShellExecuteTool } from './shell-execute';

export const ShellModule: ToolModule = {
	name: 'Shell',
	category: 'shell',
	permissionGroup: 'shell',
	async activate({ config, dir }) {
		const status = await resolveShellSandbox({ config, dir });
		if (!status.enabled) return ModuleActivation.unsupported(status.reason, status.hint);
		// Only the sandboxed mode initializes the runtime, so only it needs teardown.
		const shutdown = status.mode === 'sandboxed' ? resetShellSandbox : undefined;
		return ModuleActivation.supported([createShellExecuteTool(status.mode)], shutdown);
	},
};
