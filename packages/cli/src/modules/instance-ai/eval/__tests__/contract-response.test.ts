import { contractResponseNotes } from '../contract-response';

describe('contractResponseNotes', () => {
	it('gives the raw page schema of a list action', () => {
		const notes = contractResponseNotes({ type: '@n8n/nodes-base-next.githubIssueGetAll' });
		expect(notes).toContain('raw response body of its data request MUST match');
		expect(notes).not.toContain('Never return items');
	});

	it('gives the body schema of a request action', () => {
		const notes = contractResponseNotes({ type: '@n8n/nodes-base-next.notionUserGet' });
		expect(notes).toContain('MUST match this JSON Schema');
	});

	it('gives a code action the output fields, not as the body shape', () => {
		const notes = contractResponseNotes({ type: '@n8n/nodes-base-next.gmailMessageGet' });
		expect(notes).toContain('Never return items of this schema');
		for (const field of ['"historyId"', '"internalDate"', '"sizeEstimate"']) {
			expect(notes).toContain(field);
		}
	});

	it('covers a legacy node type at a migrated version', () => {
		const notes = contractResponseNotes({
			type: 'n8n-nodes-base.notion',
			typeVersion: 4,
			parameters: { resource: 'databasePage', operation: 'getAll' },
		});
		expect(notes ?? '').toContain('notion.databasePage.getAll');
	});

	it('gives nothing for a node without a contract', () => {
		expect(contractResponseNotes({ type: 'n8n-nodes-base.slack', typeVersion: 2 })).toBeUndefined();
	});
});
