import { describe, expect, it } from 'vitest';
import {
	PROMOTIONS_WORKFLOWS_MOVED_CROSS_PROJECT_CODE,
	type PromotionResource,
} from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { i18n } from '@n8n/i18n';

import { getPromoteErrorMessage } from './promoteErrorMessage';

const resource = (overrides: Partial<PromotionResource>): PromotionResource => ({
	key: 'workflow:wf-1',
	type: 'workflow',
	id: 'wf-1',
	name: 'Slack trigger flow',
	parentKey: 'project:p1',
	change: 'modified',
	selectable: true,
	revision: { before: 'a', after: 'b' },
	...overrides,
});

const resources = [
	resource({}),
	// A resource of another type with the same ID must not supply the workflow name.
	resource({ key: 'credential:wf-1', type: 'credential', name: 'Slack account' }),
];

describe('getPromoteErrorMessage', () => {
	it('returns i18n text with workflow titles from the preview resources', () => {
		const error = new ResponseError('Workflows moved to another project', {
			httpStatusCode: 400,
			meta: {
				code: PROMOTIONS_WORKFLOWS_MOVED_CROSS_PROJECT_CODE,
				workflowIds: ['wf-1'],
			},
		});

		expect(getPromoteErrorMessage(error, resources, i18n)).toBe(
			i18n.baseText('promotions.operation.promoteError.workflowsMovedCrossProject', {
				interpolate: { workflows: 'Slack trigger flow' },
			}),
		);
	});

	it('returns undefined for unrelated errors', () => {
		expect(getPromoteErrorMessage(new Error('offline'), resources, i18n)).toBeUndefined();
	});

	it('returns undefined when meta does not match the cross-project code', () => {
		const error = new ResponseError('Push rejected', {
			httpStatusCode: 400,
			meta: { code: 'other-error', workflowIds: ['wf-1'] },
		});

		expect(getPromoteErrorMessage(error, resources, i18n)).toBeUndefined();
	});
});
