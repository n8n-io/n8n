import { classifyHttpError } from '@/errors/http-error-classifier';
import {
	serializeInternalRestError,
	serializePublicApiError,
} from '@/errors/http-error-serializers';
import { toCredentialResolutionFailedError } from '@/modules/n8n-packages/entities/credential/credential-resolution-error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { LicenseEulaRequiredError } from '@/errors/response-errors/license-eula-required.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { UnexpectedError, UserError } from 'n8n-workflow';

describe('http-error-serializers', () => {
	it('serializePublicApiError: minimal message for ResponseError', () => {
		const descriptor = classifyHttpError(new NotFoundError('x'));
		expect(serializePublicApiError(descriptor)).toEqual({
			status: 404,
			body: { message: 'x' },
		});
	});

	it('serializeInternalRestError: includes code for ResponseError', () => {
		const descriptor = classifyHttpError(new NotFoundError('x'));
		expect(serializeInternalRestError(descriptor)).toEqual({
			status: 404,
			body: {
				code: 404,
				message: 'x',
			},
		});
	});

	it('serializePublicApiError: does not expose internal-only response error meta', () => {
		const descriptor = classifyHttpError(
			new LicenseEulaRequiredError('License activation requires EULA acceptance', {
				eulaUrl: 'https://n8n.io/legal/eula/',
			}),
		);
		expect(serializePublicApiError(descriptor)).toEqual({
			status: 400,
			body: { message: 'License activation requires EULA acceptance' },
		});
		expect(serializeInternalRestError(descriptor)).toEqual({
			status: 400,
			body: {
				code: 400,
				message: 'License activation requires EULA acceptance',
				meta: { eulaUrl: 'https://n8n.io/legal/eula/' },
			},
		});
	});

	it('serializePublicApiError: spreads meta for credential resolution failures', () => {
		const descriptor = classifyHttpError(
			toCredentialResolutionFailedError([
				{
					kind: 'not_found',
					sourceId: 'cred-1',
					usedByWorkflows: ['wf-1'],
				},
			]),
		);
		expect(serializePublicApiError(descriptor)).toEqual({
			status: 422,
			body: {
				message: '1 credential reference could not be resolved.',
				failures: [
					{
						kind: 'not_found',
						sourceId: 'cred-1',
						usedByWorkflows: ['wf-1'],
					},
				],
			},
		});
	});

	it('serializePublicApiError: exposes workflow conflict metadata', () => {
		const conflicts = [
			{ sourceWorkflowId: 'wf-1', existingWorkflowId: 'local-1', name: 'Existing' },
		];
		const descriptor = classifyHttpError(
			new ConflictError(
				'Import blocked: 1 workflow(s) already exist in the target project',
				undefined,
				{
					code: 'WORKFLOW_CONFLICT',
					conflicts,
				},
			),
		);
		expect(serializePublicApiError(descriptor)).toEqual({
			status: 409,
			body: {
				code: 409,
				message: 'Import blocked: 1 workflow(s) already exist in the target project',
				meta: {
					code: 'WORKFLOW_CONFLICT',
					conflicts,
				},
			},
		});
	});

	it('both serializers map UserError to 400', () => {
		const descriptor = classifyHttpError(new UserError('bad input'));
		expect(serializePublicApiError(descriptor)).toEqual({
			status: 400,
			body: { message: 'bad input' },
		});
		expect(serializeInternalRestError(descriptor)).toEqual({
			status: 400,
			body: { code: 0, message: 'bad input' },
		});
	});

	it('public sanitizes UnexpectedError; internal keeps message', () => {
		const descriptor = classifyHttpError(new UnexpectedError('secret'));
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
