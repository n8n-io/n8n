import { ref } from 'vue';
import { useSourceControlFileList } from './useSourceControlFileList';
import type { SourceControlledFile } from '@n8n/api-types';

const createFile = (overrides: Partial<SourceControlledFile> = {}): SourceControlledFile => ({
	id: 'wf-1',
	name: 'Workflow 1',
	type: 'workflow',
	status: 'created',
	location: 'local',
	conflict: false,
	file: '/wf-1.json',
	updatedAt: '2025-01-01T00:00:00.000Z',
	...overrides,
});

describe('useSourceControlFileList', () => {
	it('sorts files with provided sort configuration', () => {
		const files = ref([createFile({ id: '2', name: 'B' }), createFile({ id: '1', name: 'A' })]);

		const list = useSourceControlFileList({
			files,
			sortBy: ['name'],
			sortOrder: ['asc'],
		});

		expect(list.value.map((item) => item.id)).toEqual(['1', '2']);
	});

	it('applies filter before sorting', () => {
		const files = ref([
			createFile({ id: 'created', status: 'created', updatedAt: '2025-01-01T00:00:00.000Z' }),
			createFile({ id: 'modified', status: 'modified', updatedAt: '2025-02-01T00:00:00.000Z' }),
			createFile({ id: 'deleted', status: 'deleted', updatedAt: '2025-03-01T00:00:00.000Z' }),
		]);

		const list = useSourceControlFileList({
			files,
			sortBy: ['updatedAt'],
			sortOrder: ['desc'],
			filter: (file) => file.status !== 'deleted',
		});

		expect(list.value.map((item) => item.id)).toEqual(['modified', 'created']);
	});
});
