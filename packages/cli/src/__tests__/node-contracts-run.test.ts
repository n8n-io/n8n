import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';

import { nodeGroupsForRun } from '@/node-contracts-run';

describe('nodeGroupsForRun', () => {
	const draftGroups = [{ id: 'g-draft', name: 'Draft', nodeIds: ['a'] }];
	const versionGroups = [{ id: 'g-version', name: 'Version', nodeIds: ['b'] }];
	const { instanceAi } = Container.get(GlobalConfig);

	afterEach(() => {
		instanceAi.nodeContractsEnabled = true;
	});

	it('returns the groups of the version with node contracts enabled', () => {
		instanceAi.nodeContractsEnabled = true;

		expect(nodeGroupsForRun(draftGroups, versionGroups)).toBe(versionGroups);
	});

	it('returns the groups of the draft with node contracts disabled', () => {
		instanceAi.nodeContractsEnabled = false;

		expect(nodeGroupsForRun(draftGroups, versionGroups)).toBe(draftGroups);
	});
});
