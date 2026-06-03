import { Workspace, type WorkspaceFilesystem, type WorkspaceSandbox } from '@n8n/agents';

import {
	createBuilderWorkItemPathMappedWorkspace,
	remapBuilderWorkItemPathReferences,
} from '../builder-work-item-path-mapping';

const ROOT = '/home/user/workspace';
const CURRENT = `${ROOT}/builder-work-items/wi_current-aaaaaaaa`;
const OLD = `${ROOT}/builder-work-items/wi_old-bbbbbbbb`;

describe('builder work item path mapping', () => {
	it('remaps recorded absolute builder work item paths to the current work item', () => {
		expect(remapBuilderWorkItemPathReferences(`${OLD}/src/workflow.ts`, ROOT, CURRENT)).toBe(
			`${CURRENT}/src/workflow.ts`,
		);
	});

	it('remaps recorded builder work item paths inside commands', () => {
		const command = `cd ${ROOT} && npx tsc --project ${OLD}/tsconfig.json 2>&1`;

		expect(remapBuilderWorkItemPathReferences(command, ROOT, CURRENT)).toBe(
			`cd ${ROOT} && npx tsc --project ${CURRENT}/tsconfig.json 2>&1`,
		);
	});

	it('maps workspace file and command tools through the wrapped workspace', async () => {
		const writes: string[] = [];
		const commands: string[] = [];
		const filesystem = {
			id: 'fs',
			name: 'fs',
			provider: 'test',
			status: 'running',
			readFile: jest.fn(),
			writeFile: jest.fn(async (path: string) => {
				writes.push(path);
				await Promise.resolve();
			}),
		} as unknown as WorkspaceFilesystem;
		const sandbox = {
			id: 'sandbox',
			name: 'sandbox',
			provider: 'test',
			status: 'running',
			executeCommand: jest.fn(async (command: string) => {
				commands.push(command);
				await Promise.resolve();
				return { exitCode: 0, stdout: '', stderr: '' };
			}),
		} as unknown as WorkspaceSandbox;
		const workspace = createBuilderWorkItemPathMappedWorkspace(
			new Workspace({ filesystem, sandbox }),
			ROOT,
			CURRENT,
		);

		await workspace.filesystem?.writeFile(`${OLD}/src/workflow.ts`, 'content');
		await workspace.sandbox?.executeCommand?.(`node build.mjs '${OLD}/src/workflow.ts'`);

		expect(writes).toEqual([`${CURRENT}/src/workflow.ts`]);
		expect(commands).toEqual([`node build.mjs '${CURRENT}/src/workflow.ts'`]);
	});
});
