import type { INodeUi } from '@/Interface';
import type { INodeProperties, INodeTypeDescription } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getWorkflowSetupParameterIssues } from './workflowSetupParameterIssues';

function makeNode(overrides: Partial<INodeUi> = {}): INodeUi {
	return {
		id: 'http-request',
		name: 'HTTP Request',
		type: 'n8n-nodes-base.httpRequest',
		typeVersion: 4.2,
		position: [0, 0],
		parameters: {},
		...overrides,
	} as INodeUi;
}

function makeNodeType(properties: INodeProperties[]): INodeTypeDescription {
	return {
		displayName: 'HTTP Request',
		name: 'n8n-nodes-base.httpRequest',
		group: ['transform'],
		version: 4.2,
		description: 'Makes HTTP requests',
		defaults: { name: 'HTTP Request' },
		inputs: ['main'],
		outputs: ['main'],
		properties,
	} as INodeTypeDescription;
}

describe('getWorkflowSetupParameterIssues', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('returns no issues without a node type or requested parameters', () => {
		const getNodeParametersIssuesSpy = vi.spyOn(NodeHelpers, 'getNodeParametersIssues');
		const node = makeNode();
		const nodeType = makeNodeType([
			{ displayName: 'URL', name: 'url', type: 'string', default: '' },
		]);

		expect(getWorkflowSetupParameterIssues(node, null, ['url'])).toEqual({});
		expect(getWorkflowSetupParameterIssues(node, nodeType, [])).toEqual({});
		expect(getNodeParametersIssuesSpy).not.toHaveBeenCalled();
	});

	it('returns validation issues only for requested visible parameters', () => {
		vi.spyOn(NodeHelpers, 'getNodeParametersIssues').mockReturnValue({
			parameters: {
				url: ['URL is required'],
				method: ['Method is required'],
				ignored: ['Ignored issue'],
			},
		});
		const node = makeNode({ parameters: { url: '', method: '' } });
		const nodeType = makeNodeType([
			{ displayName: 'URL', name: 'url', type: 'string', default: '' },
			{ displayName: 'Method', name: 'method', type: 'string', default: '' },
			{ displayName: 'Ignored', name: 'ignored', type: 'string', default: '' },
		]);

		expect(getWorkflowSetupParameterIssues(node, nodeType, ['url', 'method'])).toEqual({
			url: ['URL is required'],
			method: ['Method is required'],
		});
	});

	it('adds placeholder issues for requested visible parameters', () => {
		vi.spyOn(NodeHelpers, 'getNodeParametersIssues').mockReturnValue({ parameters: {} });
		const node = makeNode({ parameters: { url: '<__PLACEHOLDER_VALUE__Enter URL__>' } });
		const nodeType = makeNodeType([
			{ displayName: 'URL', name: 'url', type: 'string', default: '' },
		]);

		expect(getWorkflowSetupParameterIssues(node, nodeType, ['url'])).toEqual({
			url: ['Placeholder "Enter URL" - please provide the real value'],
		});
	});

	it('skips hidden parameters and parameters hidden by display options', () => {
		vi.spyOn(NodeHelpers, 'getNodeParametersIssues').mockReturnValue({
			parameters: {
				hidden: ['Hidden is required'],
				conditional: ['Conditional is required'],
			},
		});
		const displayParameterSpy = vi.spyOn(NodeHelpers, 'displayParameter').mockReturnValue(false);
		const node = makeNode({ parameters: { hidden: '', conditional: '' } });
		const conditionalProperty: INodeProperties = {
			displayName: 'Conditional',
			name: 'conditional',
			type: 'string',
			default: '',
			displayOptions: { show: { mode: ['advanced'] } },
		};
		const nodeType = makeNodeType([
			{ displayName: 'Hidden', name: 'hidden', type: 'hidden', default: '' },
			conditionalProperty,
		]);

		expect(getWorkflowSetupParameterIssues(node, nodeType, ['hidden', 'conditional'])).toEqual({});
		expect(displayParameterSpy).toHaveBeenCalledWith(
			node.parameters,
			conditionalProperty,
			node,
			nodeType,
		);
	});

	it('keeps issues when any duplicate parameter definition is visible', () => {
		vi.spyOn(NodeHelpers, 'getNodeParametersIssues').mockReturnValue({
			parameters: { value: ['Value is required'] },
		});
		const hiddenDefinition: INodeProperties = {
			displayName: 'Value',
			name: 'value',
			type: 'string',
			default: '',
			displayOptions: { show: { mode: ['advanced'] } },
		};
		const visibleDefinition: INodeProperties = {
			displayName: 'Value',
			name: 'value',
			type: 'string',
			default: '',
			displayOptions: { show: { mode: ['basic'] } },
		};
		vi.spyOn(NodeHelpers, 'displayParameter').mockImplementation((_parameters, property) => {
			return property === visibleDefinition;
		});
		const node = makeNode({ parameters: { value: '' } });
		const nodeType = makeNodeType([hiddenDefinition, visibleDefinition]);

		expect(getWorkflowSetupParameterIssues(node, nodeType, ['value'])).toEqual({
			value: ['Value is required'],
		});
	});
});
