import type { MinedPreference } from '@n8n/api-types';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { PreferenceMiningController } from '../preference-mining.controller';
import type { LabDataset, MemoryHelpers } from '../../workflow-index/preference-mining/lab-types';
import { retrieve } from '../../workflow-index/preference-mining/preference-lab';

const memory = mock<MemoryHelpers>({
	recall: (preferences) => preferences.map((preference) => preference.id),
});
const probe = {
	id: 'probe',
	projectId: 'project',
	folderId: 'reports',
	contexts: ['project'],
	query: 'Build a report',
	expected: [],
	forbidden: [],
} satisfies LabDataset['probes'][number];
const candidate: MinedPreference = {
	id: 'candidate',
	category: 'naming',
	key: 'name',
	value: 'Report - <name>',
	content: 'In Reports. Prefix new workflow names with Report -.',
	application: {
		condition: 'In Reports.',
		instruction: 'Prefix new workflow names with Report -.',
	},
	evidenceSummary: 'The sampled workflows share this prefix.',
	projectId: 'project',
	folderId: 'reports',
	contexts: ['project'],
	origin: 'exploration',
	evidence: [{ sourceId: 'evidence-1', quote: 'Report - Daily' }],
	support: 1,
};

it.each(['prompt', 'recall'] as const)('only includes scoped instructions in %s', (mode) => {
	const legacy = { ...candidate, id: 'legacy', application: undefined };
	const otherFolder = { ...candidate, id: 'other', folderId: 'archive' };
	const result = retrieve([legacy, otherFolder, candidate], probe, memory, mode, 5);
	expect(result).toEqual([candidate]);
	expect(result[0].content).not.toContain('sampled');
});

it('gates every mining endpoint by project access', () => {
	const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
		PreferenceMiningController as never,
	);
	for (const route of metadata.routes.values()) {
		expect(route.accessScope).toMatchObject({ scope: 'workflow:read', globalOnly: false });
	}
});
