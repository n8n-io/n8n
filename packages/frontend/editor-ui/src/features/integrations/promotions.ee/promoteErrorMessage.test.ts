import { describe, expect, it } from 'vitest';
import {
	PROMOTIONS_WORKFLOWS_MOVED_CROSS_PROJECT_CODE,
	type PromotableResource,
} from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { i18n } from '@n8n/i18n';

import { getPromoteErrorMessage } from './promoteErrorMessage';

const changes: PromotableResource[] = [
	{
		id: 'wf-1',
		name: 'Slack trigger flow',
		type: 'workflow',
		status: 'modified',
		version: 1,
		updatedAt: null,
		updatedBy: null,
		dependencyCount: 0,
	},
];

describe('getPromoteErrorMessage', () => {
	it('returns i18n text with workflow titles from the change list', () => {
		const error = new ResponseError('Workflows moved to another project', {
			httpStatusCode: 400,
			meta: {
				code: PROMOTIONS_WORKFLOWS_MOVED_CROSS_PROJECT_CODE,
				workflowIds: ['wf-1'],
			},
		});

		expect(getPromoteErrorMessage(error, changes, i18n)).toBe(
			i18n.baseText('promotions.modal.promoteError.workflowsMovedCrossProject', {
				interpolate: { workflows: 'Slack trigger flow' },
			}),
		);
	});

	it('returns undefined for unrelated errors', () => {
		expect(getPromoteErrorMessage(new Error('offline'), changes, i18n)).toBeUndefined();
	});

	it('returns undefined when meta does not match the cross-project code', () => {
		const error = new ResponseError('Push rejected', {
			httpStatusCode: 400,
			meta: { code: 'other-error', workflowIds: ['wf-1'] },
		});

		expect(getPromoteErrorMessage(error, changes, i18n)).toBeUndefined();
	});
});
