import { resolveCredentialRequestSchema } from '../engine-credentials.contract';
import { CONTROL_PLANE_PREFIX, CREDENTIALS_RESOLVE_PATH } from '../engine-v2.constants';

const fullRequest = {
	credential: { id: 'cred-1', name: 'Header Auth account', type: 'httpHeaderAuth' },
	execution: { executionId: 'exec-1', workflowId: 'wf-1', mode: 'manual' },
	context: { userId: 'user-1', projectId: 'project-1' },
	consumer: { nodeType: 'n8n-nodes-base.httpRequest' },
};

describe('resolveCredentialRequestSchema', () => {
	it('accepts a full request', () => {
		expect(resolveCredentialRequestSchema.parse(fullRequest)).toEqual(fullRequest);
	});

	it('accepts a request whose context names neither user nor project', () => {
		const request = { ...fullRequest, context: {} };

		expect(resolveCredentialRequestSchema.parse(request)).toEqual(request);
	});

	it('rejects a request without a credential id', () => {
		const { id: _id, ...credential } = fullRequest.credential;

		expect(resolveCredentialRequestSchema.safeParse({ ...fullRequest, credential }).success).toBe(
			false,
		);
	});

	it('rejects a mode the v1 engine does not know', () => {
		const request = { ...fullRequest, execution: { ...fullRequest.execution, mode: 'production' } };

		expect(resolveCredentialRequestSchema.safeParse(request).success).toBe(false);
	});
});

describe('CREDENTIALS_RESOLVE_PATH', () => {
	it('is mounted under the control plane prefix, so auth and body limits apply to it', () => {
		expect(CREDENTIALS_RESOLVE_PATH).toBe(`${CONTROL_PLANE_PREFIX}/credentials/resolve`);
	});
});
