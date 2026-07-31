import type { ExpressionEngineConfig } from '@n8n/config';
import type {
	IDataObject,
	INodeParameters,
	INodeType,
	INodeTypes,
	IWebhookDescription,
} from 'n8n-workflow';
import { Workflow } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { WebhookDescriptionResolver } from '@/webhooks/webhook-description-resolver';

const webhookNodeType: INodeType = {
	description: {
		displayName: 'Webhook',
		name: 'webhook',
		group: ['trigger'],
		version: 1,
		description: '',
		defaults: { name: 'Webhook' },
		inputs: [],
		outputs: ['main'],
		properties: [
			{ displayName: 'Path', name: 'path', type: 'string', default: '' },
			{ displayName: 'Method', name: 'httpMethod', type: 'string', default: 'GET' },
			{ displayName: 'Code', name: 'responseCode', type: 'number', default: 200 },
		],
	},
};

const nodeTypes: INodeTypes = {
	getByName: () => webhookNodeType,
	getByNameAndVersion: () => webhookNodeType,
	getKnownTypes: () => ({}) as IDataObject,
};

const buildWorkflow = (parameters: INodeParameters) =>
	new Workflow({
		id: '1',
		nodes: [
			{
				name: 'Webhook',
				typeVersion: 1,
				type: 'test.webhook',
				id: 'webhook-1',
				position: [0, 0],
				parameters,
			},
		],
		connections: {},
		active: false,
		nodeTypes,
	});

const description: IWebhookDescription = {
	name: 'default',
	path: '={{$parameter["path"]}}',
	httpMethod: '={{$parameter["httpMethod"] || "GET"}}',
	responseCode: '={{(function (p) { return p.responseCode; })($parameter)}}',
	resolve: { responseCode: (p: INodeParameters) => p.responseCode as number },
};

describe('WebhookDescriptionResolver', () => {
	// The legacy engine has no isolate to save, so it never takes the native path
	const resolver = (preferNativeWebhookResolution = true, engine: 'vm' | 'legacy' = 'vm') =>
		new WebhookDescriptionResolver(
			mock<ExpressionEngineConfig>({ engine, preferNativeWebhookResolution }),
		);

	describe('with static node parameters', () => {
		const workflow = buildWorkflow({ path: 'hook', responseCode: 201 });
		const node = workflow.getNode('Webhook')!;

		// The isolate skip in `LiveWebhooks` rests on this: no engine call means
		// nothing needs an isolate to have been acquired.
		it('resolves a plain template without touching the expression engine', () => {
			const engine = vi.spyOn(workflow.expression, 'getSimpleParameterValue');

			expect(resolver().simple(workflow, node, description, 'path', 'internal')).toBe('hook');
			expect(engine).not.toHaveBeenCalled();
		});

		it('applies the node-type default through the template fallback', () => {
			expect(resolver().simple(workflow, node, description, 'httpMethod', 'internal')).toBe('GET');
		});

		it('uses the declared resolver for a template it cannot read', () => {
			const engine = vi.spyOn(workflow.expression, 'getSimpleParameterValue');

			expect(resolver().simple(workflow, node, description, 'responseCode', 'internal')).toBe(201);
			expect(engine).not.toHaveBeenCalled();
		});

		it('returns the default for a field the description does not define', () => {
			expect(
				resolver().simple(
					workflow,
					node,
					description,
					'restartWebhook',
					'internal',
					{},
					undefined,
					false,
				),
			).toBe(false);
		});

		it('falls back to the engine when the kill switch is off', () => {
			const engine = vi
				.spyOn(workflow.expression, 'getSimpleParameterValue')
				.mockReturnValue('from-engine');

			expect(resolver(false).simple(workflow, node, description, 'path', 'internal')).toBe(
				'from-engine',
			);
			expect(engine).toHaveBeenCalled();
		});

		it('falls back to the engine on the legacy engine, which has no isolate to save', () => {
			const engine = vi
				.spyOn(workflow.expression, 'getSimpleParameterValue')
				.mockReturnValue('from-engine');

			expect(resolver(true, 'legacy').simple(workflow, node, description, 'path', 'internal')).toBe(
				'from-engine',
			);
			expect(engine).toHaveBeenCalled();
		});

		afterEach(() => vi.restoreAllMocks());
	});

	it('falls back to the engine once any node parameter is an expression', () => {
		const workflow = buildWorkflow({ path: '={{ $json.p }}' });
		const node = workflow.getNode('Webhook')!;
		const engine = vi
			.spyOn(workflow.expression, 'getSimpleParameterValue')
			.mockReturnValue('from-engine');

		expect(resolver().simple(workflow, node, description, 'path', 'internal')).toBe('from-engine');
		expect(engine).toHaveBeenCalled();
	});

	it('falls back to the engine for a node the workflow does not hold', () => {
		const workflow = buildWorkflow({ path: 'hook' });
		const engine = vi
			.spyOn(workflow.expression, 'getSimpleParameterValue')
			.mockReturnValue('from-engine');
		const foreign = { ...workflow.getNode('Webhook')!, name: 'Not in workflow' };

		expect(resolver().simple(workflow, foreign, description, 'path', 'internal')).toBe(
			'from-engine',
		);
		expect(engine).toHaveBeenCalled();
	});

	it('reads the workflow-held node, not the one it was passed', () => {
		const workflow = buildWorkflow({ path: 'hook' });
		// Same name, stale parameters — the engine's `$parameter` proxy would read
		// the workflow's node, so the native path has to as well.
		const stale = { ...workflow.getNode('Webhook')!, parameters: { path: 'stale' } };

		expect(resolver().simple(workflow, stale, description, 'path', 'internal')).toBe('hook');
	});
});
