import { OutboundHttp } from '@n8n/backend-network';
import { Container } from '@n8n/di';
import type {
	IAllExecuteFunctions,
	IHttpRequestOptions,
	INode,
	IWorkflowExecuteAdditionalData,
	Workflow,
} from 'n8n-workflow';
import { mock, mockDeep } from 'vitest-mock-extended';

import { getRequestHelperFunctions } from '../factory';

// SPIKE (API-663): auth helpers use the managed type, so the managed type's `authenticate`
// applies, not the node's own type's. A managed type with no `authenticate` adds no header.
describe('request helpers in managed mode', () => {
	const workflow = mock<Workflow>();
	const node: INode = {
		id: '1',
		name: 'Slack',
		type: 'n8n-nodes-base.slack',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		credentials: { platformManagedApi: { id: 'managed-1', name: 'Managed by platform' } },
	};

	function setup() {
		const request = vi.fn().mockResolvedValue({ ok: true });
		Container.set(
			OutboundHttp,
			mock<OutboundHttp>({ requests: () => ({ request, requestLegacy: request }) as never }),
		);
		const additionalData =
			mockDeep<IWorkflowExecuteAdditionalData>() as IWorkflowExecuteAdditionalData;
		additionalData.evalLlmMockHandler = undefined;
		additionalData.otel = undefined;
		additionalData.credentialsHelper.getParentTypes = vi.fn(() => []);
		additionalData.credentialsHelper.preAuthentication = vi.fn(async () => undefined);
		const authenticate = vi.fn(
			async (_data: unknown, _type: string, options: IHttpRequestOptions) => options,
		);
		additionalData.credentialsHelper.authenticate = authenticate as never;
		const getCredentials = vi.fn().mockResolvedValue({ notice: '' });
		const context = mock<IAllExecuteFunctions>({ getCredentials });
		return {
			helpers: getRequestHelperFunctions(workflow, node, additionalData),
			context,
			getCredentials,
			authenticate,
		};
	}

	beforeEach(() => {
		process.env.N8N_MANAGED_CREDENTIAL_TYPE = 'platformManagedApi';
	});

	afterEach(() => {
		delete process.env.N8N_MANAGED_CREDENTIAL_TYPE;
		Container.reset();
	});

	it("authenticates with the managed type, not the node's own type", async () => {
		const { helpers, context, getCredentials, authenticate } = setup();

		await helpers.httpRequestWithAuthentication.call(context, 'slackApi', {
			url: 'https://slack.com/api/chat.postMessage',
		});

		expect(getCredentials).toHaveBeenCalledWith('platformManagedApi');
		expect(authenticate.mock.calls[0][1]).toBe('platformManagedApi');
	});

	it('sends OAuth2 requests through the managed type, with no token', async () => {
		const { helpers, context, authenticate } = setup();

		// oxlint-disable-next-line typescript/no-deprecated
		await helpers.requestOAuth2.call(context, 'googleSheetsOAuth2Api', {
			uri: 'https://sheets.googleapis.com/v4/spreadsheets/1',
		});

		expect(authenticate.mock.calls[0][1]).toBe('platformManagedApi');
	});

	it("uses the node's own type when managed mode is off", async () => {
		delete process.env.N8N_MANAGED_CREDENTIAL_TYPE;
		const { helpers, context, authenticate } = setup();

		await helpers.httpRequestWithAuthentication.call(context, 'slackApi', {
			url: 'https://slack.com/api/chat.postMessage',
		});

		expect(authenticate.mock.calls[0][1]).toBe('slackApi');
	});
});
