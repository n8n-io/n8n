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
});
