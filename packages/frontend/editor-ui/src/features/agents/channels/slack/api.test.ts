import { ResponseError } from '@n8n/rest-api-client';
import { describe, expect, it } from 'vitest';

import { getSlackApiErrorCode } from './api';

describe('getSlackApiErrorCode', () => {
	it('returns the code from a Slack API response error', () => {
		const error = new ResponseError('Slack request failed', {
			httpStatusCode: 400,
			meta: {
				integrationType: 'slack',
				code: 'service_limits_exceeded',
			},
		});

		expect(getSlackApiErrorCode(error)).toBe('service_limits_exceeded');
	});

	it('rejects metadata from another integration', () => {
		const error = new ResponseError('Integration request failed', {
			httpStatusCode: 400,
			meta: {
				integrationType: 'linear',
				code: 'service_limits_exceeded',
			},
		});

		expect(getSlackApiErrorCode(error)).toBeUndefined();
	});

	it('rejects Slack-shaped metadata outside a response error', () => {
		const error = {
			meta: {
				integrationType: 'slack',
				code: 'service_limits_exceeded',
			},
		};

		expect(getSlackApiErrorCode(error)).toBeUndefined();
	});
});
