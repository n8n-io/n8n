/* eslint-disable n8n-nodes-base/node-param-display-name-miscased */
/* eslint-disable n8n-nodes-base/node-class-description-empty-string */
import type { IDataObject, IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

import { Bannerbear } from '../Bannerbear.node';
import { BannerbearV2 } from '../v2/BannerbearV2.node';

vi.mock('@n8n/utils/sleep', () => ({ sleep: vi.fn().mockResolvedValue(undefined) }));

const BASE = 'https://api.bannerbear.com/v5';

type Ctx = IExecuteFunctions & {
	helpers: { httpRequestWithAuthentication: ReturnType<typeof vi.fn> };
};

const execContext = (params: IDataObject, responses: unknown[]): Ctx => {
	let call = 0;
	return {
		getInputData: vi.fn().mockReturnValue([{ json: {} }]),
		continueOnFail: vi.fn().mockReturnValue(false),
		getNode: vi.fn().mockReturnValue({ name: 'Bannerbear', typeVersion: 2 }),
		getNodeParameter: vi
			.fn()
			.mockImplementation((name: string, _i?: number, fallback?: unknown) =>
				name in params ? params[name] : fallback,
			),
		helpers: {
			httpRequestWithAuthentication: vi.fn().mockImplementation(async () => responses[call++]),
			returnJsonArray: (data: IDataObject | IDataObject[]) =>
				(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
			constructExecutionMetaData: (data: unknown[]) => data,
		},
	} as unknown as Ctx;
};

const loadContext = (params: IDataObject, response: unknown) =>
	({
		getCurrentNodeParameter: vi.fn().mockImplementation((name: string) => params[name]),
		getNode: vi.fn().mockReturnValue({ name: 'Bannerbear', typeVersion: 2 }),
		helpers: { httpRequestWithAuthentication: vi.fn().mockResolvedValue(response) },
	}) as unknown as ILoadOptionsFunctions;

const node = new BannerbearV2({
	displayName: 'Bannerbear',
	name: 'bannerbear',
	group: ['output'],
	description: '',
});

const requestFor = (ctx: Ctx, index = 0) =>
	ctx.helpers.httpRequestWithAuthentication.mock.calls[index][1];

describe('Bannerbear node -> versioning', () => {
	it('keeps v1 intact alongside v2 and defaults to v2', () => {
		const versioned = new Bannerbear();

		expect(Object.keys(versioned.nodeVersions)).toEqual(['1', '2']);
		expect(versioned.description.defaultVersion).toBe(2);
		expect(versioned.nodeVersions[1].description.credentials?.[0].name).toBe('bannerbearApi');
		expect(versioned.nodeVersions[2].description.credentials?.[0].name).toBe('bannerbearV5Api');
	});
});

describe('Bannerbear node -> image', () => {
	it('renders on the sync host and flattens the files object', async () => {
		const ctx = execContext(
			{
				resource: 'image',
				operation: 'create',
				templateId: 'tpl1',
				additionalFields: { formats: ['png'], scale: 2, metadata: 'order-42' },
				waitForImage: true,
				modificationsUi: {
					modificationsValues: [{ id: 'title', text: 'Hello', color: '#fff' }],
				},
			},
			[{ uid: 'i1', status: 'completed', files: { png: 'https://x/o.png' } }],
		);

		const [items] = await node.execute.call(ctx);
		const request = requestFor(ctx);

		expect(request.url).toBe('https://sync.api.bannerbear.com/v5/images');
		expect(request.body).toEqual({
			template: 'tpl1',
			modifications: { objects: [{ id: 'title', text: 'Hello', color: '#fff' }] },
			formats: ['png'],
			scale: 2,
			metadata: 'order-42',
		});
		expect((items[0] as { json: IDataObject }).json.imageUrl).toBe('https://x/o.png');
	});

	// Regression: n8n's fixedCollection emits every declared field with its default,
	// so an untouched row used to post opacity/ratingScore and override the template.
	it('ignores layer fields left at their defaults', async () => {
		const ctx = execContext(
			{
				resource: 'image',
				operation: 'create',
				templateId: 'tpl1',
				additionalFields: {},
				waitForImage: false,
				modificationsUi: {
					modificationsValues: [{ id: 'title', text: 'Hello', hidden: '', ratingScore: 0 }],
				},
			},
			[{ uid: 'i2', status: 'pending' }],
		);

		await node.execute.call(ctx);

		expect(requestFor(ctx).body.modifications).toEqual({
			objects: [{ id: 'title', text: 'Hello' }],
		});
	});

	// Regression: `value === 'true'` turned a boolean true from an expression into
	// false, showing a layer the user asked to hide.
	it('hides the layer when hidden arrives as a real boolean', async () => {
		const ctx = execContext(
			{
				resource: 'image',
				operation: 'create',
				templateId: 'tpl1',
				additionalFields: {},
				waitForImage: false,
				modificationsUi: { modificationsValues: [{ id: 'badge', hidden: true }] },
			},
			[{ uid: 'i5', status: 'pending' }],
		);

		await node.execute.call(ctx);

		expect(requestFor(ctx).body.modifications).toEqual({
			objects: [{ id: 'badge', hidden: true }],
		});
	});

	it('can send an explicit opacity of 1', async () => {
		const ctx = execContext(
			{
				resource: 'image',
				operation: 'create',
				templateId: 'tpl1',
				additionalFields: {},
				waitForImage: false,
				modificationsUi: { modificationsValues: [{ id: 'badge', opacity: 1 }] },
			},
			[{ uid: 'i6', status: 'pending' }],
		);

		await node.execute.call(ctx);

		expect(requestFor(ctx).body.modifications).toEqual({
			objects: [{ id: 'badge', opacity: 1 }],
		});
	});

	it('still sends layer fields the user changed, including showing a hidden layer', async () => {
		const ctx = execContext(
			{
				resource: 'image',
				operation: 'create',
				templateId: 'tpl1',
				additionalFields: {},
				waitForImage: false,
				modificationsUi: {
					modificationsValues: [{ id: 'badge', hidden: 'false', opacity: 0.5 }],
				},
			},
			[{ uid: 'i3', status: 'pending' }],
		);

		await node.execute.call(ctx);

		expect(requestFor(ctx).body.modifications).toEqual({
			objects: [{ id: 'badge', hidden: false, opacity: 0.5 }],
		});
	});

	it('drops rows with no layer selected', async () => {
		const ctx = execContext(
			{
				resource: 'image',
				operation: 'create',
				templateId: 'tpl1',
				additionalFields: {},
				waitForImage: false,
				modificationsUi: { modificationsValues: [{ id: '', text: 'orphaned' }] },
			},
			[{ uid: 'i4', status: 'pending' }],
		);

		await node.execute.call(ctx);

		expect(requestFor(ctx).body.modifications).toEqual({ objects: [] });
	});
});

describe('Bannerbear node -> workflow', () => {
	it('collects inputs from the fixedCollection and does not poll by default', async () => {
		const ctx = execContext(
			{
				resource: 'workflow',
				operation: 'run',
				workflowId: 'wf1',
				waitForCompletion: false,
				inputsUi: {
					inputValues: [
						{ name: 'headline', value: 'Launch day' },
						{ name: '', value: 'ignored' },
					],
				},
			},
			[{ uid: 'r1', status: 'queued' }],
		);

		const [items] = await node.execute.call(ctx);

		expect(requestFor(ctx).body).toEqual({
			workflow: 'wf1',
			inputs: { headline: 'Launch day' },
		});
		expect(ctx.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(1);
		expect((items[0] as { json: IDataObject }).json.status).toBe('queued');
	});

	it('polls the run when asked to wait', async () => {
		const ctx = execContext(
			{
				resource: 'workflow',
				operation: 'run',
				workflowId: 'wf1',
				waitForCompletion: true,
				maxTries: 5,
				inputsUi: {},
			},
			[
				{ uid: 'r2', status: 'queued' },
				{ uid: 'r2', status: 'completed' },
			],
		);

		await node.execute.call(ctx);

		expect(requestFor(ctx, 1).url).toBe(`${BASE}/workflow_runs/r2`);
	});

	it('throws with the run error when a waited-on run fails', async () => {
		const ctx = execContext(
			{
				resource: 'workflow',
				operation: 'run',
				workflowId: 'wf1',
				waitForCompletion: true,
				maxTries: 5,
				inputsUi: {},
			},
			[{ uid: 'r3', status: 'failed', error: 'step 2 broke' }],
		);

		await expect(node.execute.call(ctx)).rejects.toThrow('step 2 broke');
	});
});

describe('Bannerbear node -> animation', () => {
	it('sends template overrides and flattens the output', async () => {
		const ctx = execContext(
			{
				resource: 'animation',
				operation: 'create',
				templateId: 'atpl1',
				animationOptions: { fps: 60, transparent: true, formats: ['mov'] },
				waitForCompletion: false,
				modificationsUi: { modificationsValues: [{ id: 'logo', text: 'Bannerbear' }] },
			},
			[{ uid: 'an1', status: 'completed', files: { mov: 'https://x/o.mov' } }],
		);

		const [items] = await node.execute.call(ctx);

		expect(requestFor(ctx).url).toBe(`${BASE}/animations`);
		expect(requestFor(ctx).body).toEqual({
			template: 'atpl1',
			modifications: {
				objects: [{ id: 'logo', text: 'Bannerbear' }],
				template: { fps: 60, transparent: true },
			},
			formats: ['mov'],
		});
		expect((items[0] as { json: IDataObject }).json.animationUrl).toBe('https://x/o.mov');
	});
});

describe('Bannerbear node -> list operations', () => {
	it('applies the limit when Return All is off', async () => {
		const ctx = execContext(
			{ resource: 'animationTemplate', operation: 'getAll', returnAll: false, limit: 2 },
			[[{ uid: 't1' }, { uid: 't2' }, { uid: 't3' }]],
		);

		const [items] = await node.execute.call(ctx);

		expect(items).toHaveLength(2);
	});

	it('returns everything when Return All is on', async () => {
		const ctx = execContext({ resource: 'workflowRun', operation: 'getAll', returnAll: true }, [
			[{ uid: 'r1' }, { uid: 'r2' }, { uid: 'r3' }],
		]);

		const [items] = await node.execute.call(ctx);

		expect(items).toHaveLength(3);
	});
});

describe('Bannerbear node -> pagination', () => {
	const page = (n: number, size: number) =>
		Array.from({ length: size }, (_, k) => ({ uid: `p${n}-${k}` }));

	it('walks every page when Return All is on', async () => {
		const ctx = execContext({ resource: 'workflowRun', operation: 'getAll', returnAll: true }, [
			page(1, 25),
			page(2, 25),
			page(3, 4),
		]);

		const [items] = await node.execute.call(ctx);

		expect(items).toHaveLength(54);
		expect(requestFor(ctx, 0).qs).toEqual({ page: 1 });
		expect(requestFor(ctx, 2).qs).toEqual({ page: 3 });
	});

	it('stops fetching once the limit is satisfied', async () => {
		const ctx = execContext(
			{ resource: 'workflowRun', operation: 'getAll', returnAll: false, limit: 30 },
			[page(1, 25), page(2, 25), page(3, 25)],
		);

		const [items] = await node.execute.call(ctx);

		expect(items).toHaveLength(30);
		expect(ctx.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(2);
	});

	// Silently returning 5,000 of 6,000 records from "Return All" would read as a
	// complete list, so hitting the page cap has to be an error.
	it('raises rather than truncating when the page cap is reached', async () => {
		const ctx = execContext({ resource: 'workflowRun', operation: 'getAll', returnAll: true }, []);
		ctx.helpers.httpRequestWithAuthentication = vi.fn().mockResolvedValue(page(1, 25));

		await expect(node.execute.call(ctx)).rejects.toThrow(/Too many records/);
	});

	it('stops on a short page without asking for another', async () => {
		const ctx = execContext({ resource: 'workflowRun', operation: 'getAll', returnAll: true }, [
			page(1, 3),
		]);

		const [items] = await node.execute.call(ctx);

		expect(items).toHaveLength(3);
		expect(ctx.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(1);
	});
});

describe('Bannerbear node -> loadOptions', () => {
	it('lists image template layers from config.objects', async () => {
		const ctx = loadContext(
			{ templateId: 'tpl1' },
			{ config: { objects: [{ id: 'l1', name: 'Title' }, { id: 'l2' }] } },
		);

		await expect(node.methods.loadOptions.getLayers.call(ctx)).resolves.toEqual([
			{ name: 'Title', value: 'l1' },
			{ name: 'l2', value: 'l2' },
		]);
	});

	it('marks which workflow inputs are required', async () => {
		const ctx = loadContext(
			{ workflowId: 'wf1' },
			{ inputs: { headline: { type: 'string', required: true }, scale: { type: 'number' } } },
		);

		await expect(node.methods.loadOptions.getWorkflowInputs.call(ctx)).resolves.toEqual([
			{ name: 'headline (required)', value: 'headline' },
			{ name: 'scale', value: 'scale' },
		]);
	});
});

describe('Bannerbear node -> error handling', () => {
	it('records the error and continues when Continue On Fail is set', async () => {
		const ctx = execContext({ resource: 'image', operation: 'get', imageId: 'nope' }, []);
		ctx.continueOnFail = vi.fn().mockReturnValue(true);
		ctx.helpers.httpRequestWithAuthentication = vi.fn().mockRejectedValue(new Error('404 nope'));

		const [items] = await node.execute.call(ctx);

		expect((items[0] as { json: IDataObject }).json.error).toContain('404 nope');
	});
});
