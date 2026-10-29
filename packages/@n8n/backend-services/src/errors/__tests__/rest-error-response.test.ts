import type { SourceControlledFile } from '@n8n/api-types';

import { ConflictError, NotFoundError, UnexpectedError, UserError } from '@n8n/errors';

import { classifyRestError } from '../rest-error-classifier';
import { serializeInternalRestError, serializePublicApiError } from '../rest-error-response';

describe('rest-error-response', () => {
	it('serializes a ResponseError with a minimal public message', () => {
		const descriptor = classifyRestError(new NotFoundError('x'));
		expect(serializePublicApiError(descriptor)).toEqual({
			status: 404,
			body: { message: 'x' },
		});
	});

	it('serializes a ResponseError with its code for internal requests', () => {
		const descriptor = classifyRestError(new NotFoundError('x'));
		expect(serializeInternalRestError(descriptor)).toEqual({
			status: 404,
			body: {
				code: 404,
				message: 'x',
			},
		});
	});

	it('serializes source control conflicts in both response formats', () => {
		const conflicts: SourceControlledFile[] = [
			{
				file: 'workflows/wf-1.json',
				id: 'wf-1',
				name: 'My workflow',
				type: 'workflow',
				status: 'modified',
				location: 'local',
				conflict: true,
				updatedAt: '2024-01-01T00:00:00.000Z',
			},
		];
		const descriptor = classifyRestError(
			new ConflictError(
				'Push blocked by conflicting files. Pass `force: true` to push anyway.',
				undefined,
				{ conflicts },
			),
		);

		expect(serializePublicApiError(descriptor)).toEqual({
			status: 409,
			body: {
				message: expect.stringContaining('conflicting files'),
				conflicts,
			},
		});
		expect(serializeInternalRestError(descriptor)).toEqual({
			status: 409,
			body: {
				code: 409,
				message: expect.stringContaining('conflicting files'),
				meta: { conflicts },
			},
		});
	});

	it('maps UserError to 400', () => {
		const descriptor = classifyRestError(new UserError('bad input'));
		expect(serializePublicApiError(descriptor)).toEqual({
			status: 400,
			body: { message: 'bad input' },
		});
		expect(serializeInternalRestError(descriptor)).toEqual({
			status: 400,
			body: { code: 0, message: 'bad input' },
		});
	});

	it('sanitizes UnexpectedError for public responses', () => {
		const descriptor = classifyRestError(new UnexpectedError('secret'));
		expect(serializePublicApiError(descriptor)).toEqual({
			status: 500,
			body: { message: 'Internal server error' },
		});
		expect(serializeInternalRestError(descriptor)).toEqual({
			status: 500,
			body: { code: 0, message: 'secret' },
		});
	});
});
