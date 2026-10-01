import { WorkflowEntity } from '@n8n/db';

import { WorkflowVersionPolicy } from '../../../n8n-packages.types';
import { applyWorkflowVersionPolicy } from '../workflow-version-policy';

/**
 * Policy selection itself is covered end to end by the export integration suites.
 * This guard fires only when a caller loads workflows without the published
 * version, which no export path can reach.
 */
describe('applyWorkflowVersionPolicy', () => {
	it('fails loudly when the published version was not loaded', () => {
		const workflow = Object.assign(new WorkflowEntity(), {
			id: 'wf-1',
			activeVersionId: 'wf-1-published-version',
			activeVersion: null,
		});

		expect(() =>
			applyWorkflowVersionPolicy([workflow], WorkflowVersionPolicy.PublishedStrict),
		).toThrow('Published version was not loaded for workflow');
	});

	it('exports archived workflows at their latest version under published-strict', () => {
		const published = Object.assign(new WorkflowEntity(), {
			id: 'wf-published',
			isArchived: false,
			nodes: [{ name: 'Draft' }],
			activeVersionId: 'v-published',
			activeVersion: { versionId: 'v-published', nodes: [{ name: 'Live' }], connections: {} },
		});
		const archived = Object.assign(new WorkflowEntity(), {
			id: 'wf-archived',
			isArchived: true,
			nodes: [{ name: 'Latest' }],
			activeVersionId: null,
			activeVersion: null,
		});

		const result = applyWorkflowVersionPolicy(
			[archived, published],
			WorkflowVersionPolicy.PublishedStrict,
		);

		expect(result.map(({ id }) => id)).toEqual(['wf-published', 'wf-archived']);
		expect(result[0].nodes).toEqual([{ name: 'Live' }]);
		expect(result[1].nodes).toEqual([{ name: 'Latest' }]);
	});

	it('keeps archived workflows under ignore-unpublished', () => {
		const unpublished = Object.assign(new WorkflowEntity(), {
			id: 'wf-unpublished',
			isArchived: false,
			activeVersionId: null,
		});
		const archived = Object.assign(new WorkflowEntity(), {
			id: 'wf-archived',
			isArchived: true,
			activeVersionId: null,
		});

		const result = applyWorkflowVersionPolicy(
			[unpublished, archived],
			WorkflowVersionPolicy.IgnoreUnpublished,
		);

		expect(result.map(({ id }) => id)).toEqual(['wf-archived']);
	});
});
