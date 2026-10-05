import type { ImportResult } from '@n8n/api-types';

export function makePackageImportResult(overrides: Partial<ImportResult> = {}): ImportResult {
	return {
		package: { sourceN8nVersion: '2.0.0', sourceId: 'source', exportedAt: '2026-01-01T00:00:00Z' },
		agents: [
			{
				sourceAgentId: 'source-agent',
				localId: 'imported-agent',
				name: 'Imported agent',
				projectId: 'p2',
				activeVersionId: null,
				status: 'created',
				publishing: { state: 'unpublished' },
			},
		],
		workflows: [],
		removedWorkflows: [],
		removedFolders: [],
		folders: [],
		projects: [],
		bindings: { agents: {}, workflows: {}, credentials: {} },
		credentials: { matched: [], stubbed: [] },
		dataTables: { matched: 0, created: 0 },
		variables: { matched: [], missing: [], created: [], stubbed: [], updated: [] },
		tags: { matched: [], created: [], renamed: [], reconciled: [], skipped: [] },
		...overrides,
	};
}
