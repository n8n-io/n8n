import { processDynamicTabs } from './tabUtils';

describe('processDynamicTabs', () => {
	it('keeps available tabs, drops unavailable ones and passes the project id to the check', () => {
		const available = vi.fn((projectId: string | undefined) => projectId === 'project-1');

		const tabs = processDynamicTabs(
			[
				{ label: 'Apps', value: 'apps', available },
				{ label: 'Agents', value: 'agents' },
			],
			'project-1',
		);

		expect(tabs.map((tab) => tab.value)).toEqual(['apps', 'agents']);
		expect(available).toHaveBeenCalledWith('project-1');
		expect(tabs[0]).not.toHaveProperty('available');
	});

	it('drops a tab whose check returns false', () => {
		const tabs = processDynamicTabs(
			[
				{ label: 'Apps', value: 'apps', available: () => false },
				{ label: 'Agents', value: 'agents' },
			],
			'project-1',
		);

		expect(tabs.map((tab) => tab.value)).toEqual(['agents']);
	});

	it('resolves a dynamic route with the project id', () => {
		const [tab] = processDynamicTabs(
			[
				{
					label: 'Apps',
					value: 'apps',
					dynamicRoute: { name: 'ProjectApps', includeProjectId: true },
				},
			],
			'project-1',
		);

		expect(tab.to).toEqual({ name: 'ProjectApps', params: { projectId: 'project-1' } });
		expect(tab).not.toHaveProperty('dynamicRoute');
	});
});
