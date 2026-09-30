import type { WorkflowJSON } from '@n8n/workflow-sdk';

import {
	nextWorkspaceFiles,
	nodeOutputsDeclaration,
	synthesizedFixtures,
	usedNodeIds,
} from '../next-workflow-build';

const source = `import { workflow, manual } from '@n8n/workflow-sdk/next';
import { notion } from '@n8n/nodes/notion';
import { httpRequest } from "@n8n/nodes/httpRequest";`;

describe('next workflow build', () => {
	it('finds the node modules a source imports', () => {
		expect(usedNodeIds(source)).toEqual(['notion', 'httpRequest']);
	});

	it('generates the tsconfig and only the imported node modules', () => {
		const result = nextWorkspaceFiles(source);
		expect(result.ok && [...result.files.keys()]).toEqual([
			'tsconfig.next.json',
			'.n8n/node-outputs.d.ts',
			'.n8n/nodes/notion.ts',
			'.n8n/nodes/httpRequest.ts',
		]);
		expect(result.ok && result.files.get('.n8n/nodes/notion.ts')).toContain(
			'export const notion = {',
		);
	});

	it('names the typed modules when a source imports an unknown one', () => {
		expect(nextWorkspaceFiles("import { slack } from '@n8n/nodes/slack';")).toEqual({
			ok: false,
			errors: [expect.stringContaining('No typed node module "@n8n/nodes/slack"')],
		});
	});

	it('declares derived output types by node name', () => {
		const workflow: WorkflowJSON = {
			name: 'Done',
			connections: {},
			nodes: [
				{
					id: '1',
					name: 'Done tasks',
					type: '@n8n/nodes-base-next.notionDatabasePageGetAll',
					typeVersion: 1,
					position: [0, 0],
					parameters: {
						database: 'x',
						where: {
							match: 'all',
							conditions: [
								{
									property: 'Completed',
									type: 'date',
									condition: { op: 'on_or_after', value: '2026-09-01' },
								},
							],
						},
					},
				},
			],
		};
		const text = nodeOutputsDeclaration(workflow);
		expect(text).toContain('"Done tasks": {');
		expect(text).toContain('property_completed: {\n\t\t\t\tstart: string;');
		expect(synthesizedFixtures(workflow)['Done tasks']?.[0]).toMatchObject({
			property_completed: { start: '2026-09-15' },
		});
		expect(synthesizedFixtures(workflow, { 'Done tasks': [{ id: 'mine' }] })).toEqual({
			'Done tasks': [{ id: 'mine' }],
		});
	});
});
