import type { INode } from 'n8n-workflow';
import { OperationalError } from 'n8n-workflow';

import { OAuth2SessionExpiredError } from '../../../../utils/oauth2-token-provider';
import { makeDatabricksFailedAttemptHandler } from '../error-handling';

const mockNode: INode = {
	id: '1',
	name: 'Databricks Chat Model',
	typeVersion: 1,
	type: '@n8n/n8n-nodes-langchain.lmChatDatabricks',
	position: [0, 0],
	parameters: {},
};

const handle = makeDatabricksFailedAttemptHandler(403);

/** Shaped like the OpenAI client's APIError for a rejected request. */
function apiError(status: number, message: string) {
	return Object.assign(new Error(message), { status });
}

describe('makeDatabricksFailedAttemptHandler', () => {
	it('should ask the user to reconnect when the token was rejected', () => {
		expect(() => handle(apiError(403, '403 Invalid Token'))).toThrow(OperationalError);
		expect(() => handle(apiError(403, '403 Invalid Token'))).toThrow(/sign in again/i);
	});

	it('should leave a permission failure alone', () => {
		// A Databricks 403 also covers "no access to this endpoint", which signing
		// in again would not fix
		expect(() =>
			handle(apiError(403, 'PERMISSION_DENIED: User lacks CAN QUERY on the endpoint')),
		).not.toThrow();
	});

	it('should not claim expiry for a rejection on a different status', () => {
		expect(() => handle(apiError(401, '401 Invalid Token'))).not.toThrow();
	});

	it('should recover a session error the model client wrapped as a connection failure', () => {
		const sessionExpired = new OAuth2SessionExpiredError(
			mockNode,
			'Databricks credential is not connected',
		);
		const wrapped = new Error('Connection error.', { cause: sessionExpired });

		expect(() => handle(wrapped)).toThrow(OAuth2SessionExpiredError);
	});

	it('should pass other errors to the OpenAI handler', () => {
		expect(() => handle(new Error('socket hang up'))).not.toThrow();
	});

	it('should honour a non-Databricks expiry status', () => {
		expect(() =>
			makeDatabricksFailedAttemptHandler(401)(apiError(401, '401 Invalid Token')),
		).toThrow(OperationalError);
	});

	it('should not tell a service principal to sign in again', () => {
		// A service principal has no sign-in session to reconnect, so it keeps the
		// generic "check your credentials" advice
		const handleWithoutRefresh = makeDatabricksFailedAttemptHandler(undefined);

		expect(() => handleWithoutRefresh(apiError(403, '403 Invalid Token'))).not.toThrow();
	});
});
