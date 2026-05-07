import { z } from 'zod';

import { Tool } from '../../sdk/tool';
import type { BuiltTool } from '../../types/sdk/tool';
import type { SandboxProcessManager } from '../types';

export function createListProcessesTool(processes: SandboxProcessManager): BuiltTool {
	return new Tool('workspace_list_processes')
		.description('List all background processes spawned in the sandbox')
		.input(z.object({}))
		.output(
			z.object({
				processes: z.array(
					z.object({
						pid: z.number(),
						command: z.string().optional(),
						exitCode: z.number().optional(),
					}),
				),
			}),
		)
		.handler(async () => {
			const list = await processes.list();
			return { processes: list };
		})
		.build();
}

export function createKillProcessTool(processes: SandboxProcessManager): BuiltTool {
	return new Tool('workspace_kill_process')
		.description('Kill a background process in the sandbox by PID')
		.input(
			z.object({
				pid: z.number().describe('PID of the process to kill'),
			}),
		)
		.output(z.object({ killed: z.boolean() }))
		.handler(async (input) => {
			const killed = await processes.kill(input.pid);
			return { killed };
		})
		.build();
}
