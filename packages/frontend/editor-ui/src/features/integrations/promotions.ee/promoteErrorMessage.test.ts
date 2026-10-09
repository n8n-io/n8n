import { describe, expect, it } from 'vitest';
import {
	PROMOTIONS_CONTAINER_TARGET_IN_USE_CODE,
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

	it.each([
		['folders', 'promotions.modal.promoteError.folderTargetInUse'],
		['projects', 'promotions.modal.promoteError.projectTargetInUse'],
	] as const)('names the occupied %s path from the container-in-use meta', (kind, key) => {
		const error = new ResponseError('Container path in use', {
			httpStatusCode: 400,
			meta: {
				code: PROMOTIONS_CONTAINER_TARGET_IN_USE_CODE,
				kind,
				target: 'projects/alpha/folders/b',
			},
		});

		expect(getPromoteErrorMessage(error, changes, i18n)).toBe(
			i18n.baseText(key, { interpolate: { target: 'projects/alpha/folders/b' } }),
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
