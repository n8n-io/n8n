import { mock, type MockProxy } from 'jest-mock-extended';
import type { Workflow, INode, IDataObject } from 'n8n-workflow';
import { FORM_NODE_TYPE, WAIT_NODE_TYPE } from 'n8n-workflow';

import { autoDetectResponseMode, handleFormRedirectionCase } from '../webhook-helpers';
import type { IWebhookResponseCallbackData } from '../webhook.types';

describe('autoDetectResponseMode', () => {
	let workflow: MockProxy<Workflow>;

	beforeEach(() => {
		workflow = mock<Workflow>();
		workflow.nodes = {};
	});

	test('should return undefined if start node is WAIT_NODE_TYPE with resume not equal to form', () => {
		const workflowStartNode = mock<INode>({
			type: WAIT_NODE_TYPE,
			parameters: { resume: 'webhook' },
		});
		const result = autoDetectResponseMode(workflowStartNode, workflow, 'POST');
		expect(result).toBeUndefined();
	});

	test('should return responseNode when start node is FORM_NODE_TYPE and method is POST', () => {
		const workflowStartNode = mock<INode>({
			type: FORM_NODE_TYPE,
			name: 'startNode',
			parameters: {},
		});
		workflow.getChildNodes.mockReturnValue(['childNode']);
		workflow.nodes.childNode = mock<INode>({
			type: WAIT_NODE_TYPE,
			parameters: { resume: 'form' },
			disabled: false,
		});
		const result = autoDetectResponseMode(workflowStartNode, workflow, 'POST');
		expect(result).toBe('responseNode');
	});

	test('should return undefined when start node is FORM_NODE_TYPE with no other form child nodes', () => {
		const workflowStartNode = mock<INode>({
			type: FORM_NODE_TYPE,
			name: 'startNode',
			parameters: {},
		});
		workflow.getChildNodes.mockReturnValue([]);
		const result = autoDetectResponseMode(workflowStartNode, workflow, 'POST');
		expect(result).toBeUndefined();
	});

	test('should return undefined for non-matching node type and method', () => {
		const workflowStartNode = mock<INode>({ type: 'someOtherNodeType', parameters: {} });
		const result = autoDetectResponseMode(workflowStartNode, workflow, 'GET');
		expect(result).toBeUndefined();
	});
});

describe('handleFormRedirectionCase', () => {
	test('should return data unchanged if start node is WAIT_NODE_TYPE with resume not equal to form', () => {
		const data: IWebhookResponseCallbackData = {
			responseCode: 302,
			headers: { location: 'http://example.com' },
		};
		const workflowStartNode = mock<INode>({
			type: WAIT_NODE_TYPE,
			parameters: { resume: 'webhook' },
		});
		const result = handleFormRedirectionCase(data, workflowStartNode);
		expect(result).toEqual(data);
	});

	test('should modify data if start node type matches and responseCode is a redirect', () => {
		const data: IWebhookResponseCallbackData = {
			responseCode: 302,
			headers: { location: 'http://example.com' },
		};
		const workflowStartNode = mock<INode>({
			type: FORM_NODE_TYPE,
			parameters: {},
		});
		const result = handleFormRedirectionCase(data, workflowStartNode);
		expect(result.responseCode).toBe(200);
		expect(result.data).toEqual({ redirectURL: 'http://example.com' });
		expect((result?.headers as IDataObject)?.location).toBeUndefined();
	});

	test('should not modify data if location header is missing', () => {
		const data: IWebhookResponseCallbackData = { responseCode: 302, headers: {} };
		const workflowStartNode = mock<INode>({
			type: FORM_NODE_TYPE,
			parameters: {},
		});
		const result = handleFormRedirectionCase(data, workflowStartNode);
		expect(result).toEqual(data);
	});
});
