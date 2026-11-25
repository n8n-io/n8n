import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import type { CredentialTypes } from '@/credential-types';
import type { NodeTypes } from '@/node-types';

import type { WorkflowSerializer } from '../../entities/workflow/workflow.serializer';
import type { PackageReader } from '../../io/package-reader';
import { N8nPackageParser } from '../n8n-package-parser';

const parser = new N8nPackageParser(
	mock<Logger>(),
	mock<NodeTypes>(),
	mock<WorkflowSerializer>(),
	mock<CredentialTypes>(),
);
const id = '7dfb1649-a8b9-49bf-bbed-5a3c933584b2';

function reader(
	target: string,
	preference: unknown,
	projects?: Array<{ id: string; target: string; name: string }>,
): PackageReader {
	return {
		readManifest: async () => ({
			packageFormatVersion: '3',
			sourceId: 'source',
			sourceN8nVersion: '2.50.0',
			preferences: [{ id, name: 'Preference', target }],
			projects,
		}),
		readFile: async () => Buffer.from(JSON.stringify(preference)),
		listEntries: async () => [],
	};
}

it('derives project ownership from the project layout', async () => {
	const preference = { id, scope: 'project', content: 'Use names' };
	const rows = await parser.getPreferences(
		reader('projects/team/preferences/rule', preference, [
			{ id: 'team', target: 'projects/team', name: 'Team' },
		]),
	);
	expect(rows).toEqual([{ ...preference, sourceProjectId: 'team' }]);
});

it.each([
	['instance', 'projects/team/preferences/rule'],
	['project', 'preferences/rule'],
	['project', 'projects/team/preferences/nested/rule'],
	['project', 'projects/other/preferences/rule'],
])('rejects %s scope at %s in a project package', async (scope, target) => {
	await expect(
		parser.getPreferences(
			reader(target, { id, scope, content: 'Rule' }, [
				{ id: 'team', target: 'projects/team', name: 'Team' },
			]),
		),
	).rejects.toThrow('scope');
});

it('rejects a payload identity that differs from the manifest', async () => {
	await expect(
		parser.getPreferences(
			reader('preferences/rule', {
				id: '9dfb1649-a8b9-49bf-bbed-5a3c933584b2',
				scope: 'instance',
				content: 'Rule',
			}),
		),
	).rejects.toThrow('ID');
});

it('rejects personal scope and imported local metadata', async () => {
	for (const data of [
		{ id, scope: 'user', content: 'Rule' },
		{ id, scope: 'instance', content: 'Rule', createdById: 'source-user' },
	]) {
		await expect(parser.getPreferences(reader('preferences/rule', data))).rejects.toThrow(
			'validation',
		);
	}
});
