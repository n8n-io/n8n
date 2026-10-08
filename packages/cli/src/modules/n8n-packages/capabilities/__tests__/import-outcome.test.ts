import fc from 'fast-check';

import type { WorkflowPublishingOutcome } from '../../n8n-packages.types';
import {
	dataTablesNotKeptWarning,
	type ErrorWorkflowLinkInput,
	errorWorkflowProblemText,
	keptDataTablesWarning,
	planErrorWorkflowLink,
	publishingWarning,
	removedErrorWorkflowWarning,
	uncheckedErrorWorkflowRemovedWarning,
	uncheckedErrorWorkflowWarning,
} from '../import-outcome';

describe('publishingWarning', () => {
	const unchanged: WorkflowPublishingOutcome = { state: 'unchanged' };
	const draftLive = { versionId: 'v-2', activeVersionId: 'v-2' };
	const earlierLive = { versionId: 'v-2', activeVersionId: 'v-1' };

	it('says nothing for a copy that is not published', () => {
		expect(
			publishingWarning({
				publishing: unchanged,
				copy: { versionId: 'v-1', activeVersionId: null },
				previousActiveVersionId: undefined,
			}),
		).toBeUndefined();
	});

	it('says that the import put the new version of a published copy live', () => {
		expect(
			publishingWarning({
				publishing: { state: 'published' },
				copy: draftLive,
				previousActiveVersionId: 'v-1',
			}),
		).toBe(
			'The workflow was published, so the import published the new version. The new version is live now.',
		);
	});

	it('says that the import published a workflow that was not live before', () => {
		const copy = { versionId: 'v-1', activeVersionId: 'v-1' };

		expect(
			publishingWarning({
				publishing: { state: 'published' },
				copy,
				previousActiveVersionId: undefined,
			}),
		).toBe('The import published the workflow.');
		expect(
			publishingWarning({
				publishing: { state: 'published' },
				copy,
				previousActiveVersionId: null,
			}),
		).toBe('The import published the workflow.');
	});

	// Only a publish of this import changes the live version, so the other outcomes say nothing.
	it('says nothing when the draft is live but the import did not publish it', () => {
		expect(
			publishingWarning({
				publishing: unchanged,
				copy: draftLive,
				previousActiveVersionId: undefined,
			}),
		).toBeUndefined();
	});

	// An import of the same content again publishes the version that is already live.
	it('says nothing when the version that is live did not change', () => {
		expect(
			publishingWarning({
				publishing: { state: 'published' },
				copy: draftLive,
				previousActiveVersionId: 'v-2',
			}),
		).toBeUndefined();
		expect(
			publishingWarning({ publishing: unchanged, copy: draftLive, previousActiveVersionId: 'v-2' }),
		).toBeUndefined();
	});

	it('says that an earlier version stays live when the source does not publish the new one', () => {
		expect(
			publishingWarning({
				publishing: unchanged,
				copy: earlierLive,
				previousActiveVersionId: 'v-1',
			}),
		).toBe(
			'The new version is not live, because the source workflow does not publish this version. Publish the workflow to make it live. An earlier version stays live.',
		);
	});

	it.each([
		['stub-credential', 'it uses credentials that are not set up'],
		['missing-node-type', 'this instance does not have all the node types that it uses'],
	] as const)('names why the import could not publish the new version (%s)', (reason, text) => {
		const expected = `The new version is not live, because ${text}. An earlier version stays live.`;

		expect(
			publishingWarning({
				publishing: { state: 'unchanged', skippedPublishReason: reason },
				copy: earlierLive,
				previousActiveVersionId: 'v-1',
			}),
		).toBe(expected);
		expect(
			publishingWarning({
				publishing: { state: 'blocked', blockedReason: reason },
				copy: earlierLive,
				previousActiveVersionId: 'v-1',
			}),
		).toBe(expected);
	});

	it('gives the error when the publish of the new version failed', () => {
		expect(
			publishingWarning({
				publishing: { state: 'failed', error: 'The webhook path is in use' },
				copy: earlierLive,
				previousActiveVersionId: 'v-1',
			}),
		).toBe(
			'The new version is not live, because the import could not publish it: The webhook path is in use. An earlier version stays live.',
		);
		expect(
			publishingWarning({
				publishing: { state: 'failed' },
				copy: earlierLive,
				previousActiveVersionId: 'v-1',
			}),
		).toBe(
			'The new version is not live, because the import could not publish it: unknown error. An earlier version stays live.',
		);
	});

	it('gives the error when the publish failed and no version is live', () => {
		const copy = { versionId: 'v-2', activeVersionId: null };

		expect(
			publishingWarning({
				publishing: { state: 'failed', error: 'No trigger node' },
				copy,
				previousActiveVersionId: undefined,
			}),
		).toBe('The import could not publish the workflow: No trigger node.');
		expect(
			publishingWarning({ publishing: { state: 'failed' }, copy, previousActiveVersionId: 'v-1' }),
		).toBe('The import could not publish the workflow: unknown error.');
	});

	it('says that the import unpublished the workflow', () => {
		expect(
			publishingWarning({
				publishing: { state: 'unpublished' },
				copy: { versionId: 'v-2', activeVersionId: null },
				previousActiveVersionId: 'v-1',
			}),
		).toBe('The import unpublished the workflow.');
	});
});

describe('planErrorWorkflowLink', () => {
	const input = (overrides: Partial<ErrorWorkflowLinkInput>): ErrorWorkflowLinkInput => ({
		created: true,
		imported: undefined,
		importedId: undefined,
		previous: undefined,
		packageWorkflowIds: ['wf-copy'],
		...overrides,
	});

	it('keeps a new copy without a link', () => {
		expect(planErrorWorkflowLink(input({}))).toEqual({ action: 'keep' });
		expect(planErrorWorkflowLink(input({ imported: 'DEFAULT' }))).toEqual({ action: 'keep' });
	});

	it('checks the link of a new copy to a workflow outside the package', () => {
		expect(planErrorWorkflowLink(input({ imported: 'wf-err', importedId: 'wf-err' }))).toEqual({
			action: 'check',
			errorWorkflowId: 'wf-err',
		});
	});

	it('keeps a link to a workflow of the package', () => {
		const linked = { imported: 'wf-copy', importedId: 'wf-copy' };

		expect(planErrorWorkflowLink(input(linked))).toEqual({ action: 'keep' });
		expect(planErrorWorkflowLink(input({ ...linked, created: false, previous: 'wf-own' }))).toEqual(
			{ action: 'keep' },
		);
	});

	it('puts back the link that the copy had before a re-import', () => {
		expect(
			planErrorWorkflowLink(
				input({ created: false, imported: 'wf-err', importedId: 'wf-err', previous: 'wf-own' }),
			),
		).toEqual({ action: 'restore', errorWorkflow: 'wf-own' });
		expect(
			planErrorWorkflowLink(input({ created: false, imported: 'wf-err', importedId: 'wf-err' })),
		).toEqual({ action: 'restore', errorWorkflow: undefined });
		expect(planErrorWorkflowLink(input({ created: false, previous: 'wf-own' }))).toEqual({
			action: 'restore',
			errorWorkflow: 'wf-own',
		});
	});

	it('keeps the link of a re-imported copy when the import did not change it', () => {
		expect(
			planErrorWorkflowLink(
				input({ created: false, imported: 'wf-err', importedId: 'wf-err', previous: 'wf-err' }),
			),
		).toEqual({ action: 'keep' });
		expect(planErrorWorkflowLink(input({ created: false }))).toEqual({ action: 'keep' });
	});

	// A re-import never leaves the copy with a link that the package brought in from outside.
	it('ends a re-import with the link that the copy had or with a link into the package (property)', () => {
		const id = fc.constantFrom('wf-copy', 'wf-err', 'wf-own');
		fc.assert(
			fc.property(
				fc.option(id, { nil: undefined }),
				fc.option(id, { nil: undefined }),
				(imported, previous) => {
					const plan = planErrorWorkflowLink(
						input({ created: false, imported, importedId: imported, previous }),
					);
					const result = plan.action === 'restore' ? plan.errorWorkflow : imported;
					expect(plan.action).not.toBe('check');
					expect(result === previous || result === 'wf-copy').toBe(true);
				},
			),
		);
	});
});

describe('errorWorkflowProblemText', () => {
	it.each([
		['not-found', 'it is not on this instance or you cannot open it'],
		['not-published', 'it is not published'],
		['no-error-trigger', 'its published version has no active Error Trigger node'],
		['caller-policy', 'it does not let this workflow call it'],
	] as const)('gives the reason "%s" in words', (reason, text) => {
		expect(errorWorkflowProblemText(reason)).toBe(text);
	});
});

describe('error workflow link warnings', () => {
	it('names the error workflow and why the import removed the link', () => {
		expect(
			removedErrorWorkflowWarning('"Alert the team" (wf-err)', 'it is not available in MCP'),
		).toBe(
			'The import removed the link to the error workflow "Alert the team" (wf-err), because it is not available in MCP. Choose an error workflow in the workflow settings.',
		);
	});

	it('says that the import removed a link that it could not check', () => {
		expect(uncheckedErrorWorkflowRemovedWarning('the workflow could not be read')).toBe(
			'The import removed the error workflow link of the copy, because it could not check the link: the workflow could not be read. Choose an error workflow in the workflow settings.',
		);
	});

	it('says that a link stays unchecked when the import could not remove it', () => {
		expect(uncheckedErrorWorkflowWarning('Database is locked')).toBe(
			'The import could not check the error workflow of the copy: Database is locked. Check it in the workflow settings.',
		);
	});
});

describe('data table warnings', () => {
	const tables = [
		{ id: 'dt-2', name: 'Orders' },
		{ id: 'dt-1', name: 'Customers' },
		{ id: 'dt-3', name: 'Orders' },
	];

	it('counts the replaced tables and names them sorted and once each', () => {
		expect(keptDataTablesWarning(tables)).toBe(
			'The copy keeps the data tables that it used in place of 3 data table(s) of the package that this project does not have: Customers, Orders.',
		);
	});

	it('says which tables the import could not keep, and why', () => {
		expect(dataTablesNotKeptWarning([tables[1]], 'you cannot update the workflow')).toBe(
			'The import could not keep the data tables that the copy used in place of 1 data table(s) of the package that this project does not have (Customers), because you cannot update the workflow. Check the data tables in the workflow before it runs.',
		);
	});
});
