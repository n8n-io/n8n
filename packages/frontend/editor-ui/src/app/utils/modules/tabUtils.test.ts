import { i18n } from '@n8n/i18n';

import { processDynamicTab, processDynamicTabs } from './tabUtils';

/**
 * A project tab declares its label as a translation key, the same way a settings page
 * does, so the descriptor that contributes it needs no value import of `@n8n/i18n`.
 * `processDynamicTab` is the shell side of that contract.
 */
describe('processDynamicTab', () => {
	it('should resolve a declared label key and drop the key from the rendered tab', () => {
		const tab = processDynamicTab({ value: 'data-table', labelKey: 'dataTable.dataTables' });

		expect(tab.label).toBe(i18n.baseText('dataTable.dataTables'));
		expect('labelKey' in tab).toBe(false);
	});

	it('should keep a resolved label when no key is declared', () => {
		expect(processDynamicTab({ value: 'agents', label: 'Agents' }).label).toBe('Agents');
	});

	it('should prefer the key over a resolved label', () => {
		const tab = processDynamicTab({
			value: 'data-table',
			label: 'stale',
			labelKey: 'dataTable.dataTables',
		});

		expect(tab.label).toBe(i18n.baseText('dataTable.dataTables'));
	});

	it('should leave an unlabelled tab unlabelled', () => {
		expect(processDynamicTab({ value: 'bare' }).label).toBeUndefined();
	});

	it('should resolve the label alongside a dynamic project route', () => {
		const tab = processDynamicTab(
			{
				value: 'project-data-tables',
				labelKey: 'dataTable.dataTables',
				dynamicRoute: { name: 'ProjectDataTables', includeProjectId: true },
			},
			'project-1',
		);

		expect(tab.label).toBe(i18n.baseText('dataTable.dataTables'));
		expect(tab.to).toEqual({ name: 'ProjectDataTables', params: { projectId: 'project-1' } });
	});

	it('should resolve every tab in a list', () => {
		const tabs = processDynamicTabs([
			{ value: 'a', labelKey: 'dataTable.dataTables' },
			{ value: 'b', label: 'B' },
		]);

		expect(tabs.map((tab) => tab.label)).toEqual([i18n.baseText('dataTable.dataTables'), 'B']);
	});
});
