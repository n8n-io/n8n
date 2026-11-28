import { OutboundHttp } from '@n8n/backend-network';
import { Container } from '@n8n/di';
import type {
	ICredentialDataDecryptedObject,
	IHttpRequestOptions,
	INode,
	INodeProperties,
	IWorkflowExecuteAdditionalData,
	Workflow,
} from 'n8n-workflow';
import { mock, mockDeep } from 'vitest-mock-extended';

import { getRequestHelperFunctions } from '../factory';

// SPIKE (API-663): requests a node builds itself (its own auth header) still get the managed
// type's `authenticate`, fed with the data on the node's managed reference.
describe('request helpers in managed mode', () => {
	const workflow = mock<Workflow>();
	const ordIdField = {
		displayName: 'ORD ID',
		name: 'ordId',
		type: 'string',
		default: '',
		required: true,
	} as INodeProperties;
	const freshdesk = (reference?: Record<string, unknown>): INode => ({
		id: '1',
		name: 'Freshdesk',
		type: 'n8n-nodes-base.freshdesk',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		...(reference
			? { credentials: { platformManagedApi: { id: null, name: 'x', ...reference } } }
			: {}),
	});

	function setup(node: INode) {
		const request = vi.fn().mockResolvedValue({ ok: true });
		Container.set(OutboundHttp, mock<OutboundHttp>({ requests: () => ({ request }) as never }));
		const additionalData =
			mockDeep<IWorkflowExecuteAdditionalData>() as IWorkflowExecuteAdditionalData;
		additionalData.evalLlmMockHandler = undefined;
		additionalData.otel = undefined;
		const authenticate = vi.fn(
			async (data: ICredentialDataDecryptedObject, _type: string, options: IHttpRequestOptions) =>
				({ ...options, headers: { ordID: data.ordId } }) as IHttpRequestOptions,
		);
		additionalData.credentialsHelper.authenticate = authenticate as never;
		additionalData.credentialsHelper.getCredentialsProperties = vi.fn(() => [ordIdField]);
		return {
			helpers: getRequestHelperFunctions(workflow, node, additionalData),
			request,
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

	it("applies the managed type's authenticate with the node's data", async () => {
		const { helpers, request, authenticate } = setup(
			freshdesk({ ordId: 'acme:apiResource:FRESHDESK:v1' }),
		);

		await helpers.httpRequest({ url: 'https://company.freshdesk.com/api/v2/tickets/1' });

		expect(authenticate.mock.calls[0].slice(0, 2)).toEqual([
			{ ordId: 'acme:apiResource:FRESHDESK:v1' },
			'platformManagedApi',
		]);
		expect(request).toHaveBeenCalledWith(
			expect.objectContaining({ headers: { ordID: 'acme:apiResource:FRESHDESK:v1' } }),
		);
	});

	it('stops before sending when a required field is missing', async () => {
		const { helpers, request } = setup(freshdesk({}));

		await expect(helpers.httpRequest({ url: 'https://company.freshdesk.com' })).rejects.toThrow(
			"Add ordId to this node's managed credential",
		);
		expect(request).not.toHaveBeenCalled();
	});

	it('lets the eval mock answer request() before the managed data is checked', async () => {
		const node = freshdesk({});
		const request = vi.fn();
		Container.set(OutboundHttp, mock<OutboundHttp>({ requests: () => ({ request }) as never }));
		const additionalData =
			mockDeep<IWorkflowExecuteAdditionalData>() as IWorkflowExecuteAdditionalData;
		additionalData.otel = undefined;
		additionalData.evalLlmMockHandler = vi.fn(async () => ({
			statusCode: 200,
			headers: {},
			body: { mocked: true },
		}));
		additionalData.credentialsHelper.getCredentialsProperties = vi.fn(() => [ordIdField]);
		const helpers = getRequestHelperFunctions(workflow, node, additionalData);

		await expect(helpers.request({ uri: 'https://company.freshdesk.com' })).resolves.toEqual({
			mocked: true,
		});
		expect(request).not.toHaveBeenCalled();
	});

	it('leaves requests of a node without a credential unchanged', async () => {
		const { helpers, authenticate } = setup(freshdesk());

		await helpers.httpRequest({ url: 'https://example.com/feed.xml' });

		expect(authenticate).not.toHaveBeenCalled();
	});

	it('changes nothing when managed mode is off', async () => {
		delete process.env.N8N_MANAGED_CREDENTIAL_TYPE;
		const { helpers, authenticate } = setup(freshdesk({ ordId: 'x' }));

		await helpers.httpRequest({ url: 'https://example.com' });

		expect(authenticate).not.toHaveBeenCalled();
	});
});
