import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import {
	bannerbearApiRequest,
	compact,
	flattenAnimationFiles,
	flattenImageFiles,
	linesToArray,
	runTool,
} from '../v2/GenericFunctions';

vi.mock('@n8n/utils/sleep', () => ({ sleep: vi.fn().mockResolvedValue(undefined) }));

const mockExecuteFunctions = (responses: IDataObject[], params: IDataObject = {}) => {
	let call = 0;
	const httpRequestWithAuthentication = vi.fn().mockImplementation(async () => responses[call++]);

	return {
		getNode: vi.fn().mockReturnValue({ name: 'Bannerbear', typeVersion: 2 }),
		getNodeParameter: vi
			.fn()
			.mockImplementation((name: string, _i: number, fallback?: unknown) =>
				name in params ? params[name] : fallback,
			),
		helpers: { httpRequestWithAuthentication },
	} as unknown as IExecuteFunctions & {
		helpers: { httpRequestWithAuthentication: typeof httpRequestWithAuthentication };
	};
};

describe('Bannerbear -> compact', () => {
	it('drops blank values but keeps zero and false', () => {
		expect(compact({ a: 1, b: undefined, c: null, d: '', e: 0, f: false })).toEqual({
			a: 1,
			e: 0,
			f: false,
		});
	});
});

describe('Bannerbear -> linesToArray', () => {
	it('splits into trimmed, non-empty lines and preserves order', () => {
		expect(linesToArray(' a.pdf \n\n b.pdf\n')).toEqual(['a.pdf', 'b.pdf']);
	});

	it('returns an empty array for empty input', () => {
		expect(linesToArray('')).toEqual([]);
	});
});

describe('Bannerbear -> flattenImageFiles', () => {
	it('adds a per-format key and picks jpg as the primary', () => {
		const image = flattenImageFiles({
			uid: 'i1',
			files: { pdf: 'https://x/o.pdf', jpg: 'https://x/o.jpg' },
		});

		expect(image.jpgUrl).toBe('https://x/o.jpg');
		expect(image.pdfUrl).toBe('https://x/o.pdf');
		expect(image.imageUrl).toBe('https://x/o.jpg');
	});

	it('falls back to whatever format is present', () => {
		expect(flattenImageFiles({ uid: 'i2', files: { png: 'https://x/o.png' } }).imageUrl).toBe(
			'https://x/o.png',
		);
	});

	it('leaves imageUrl null while a render is pending', () => {
		expect(flattenImageFiles({ uid: 'i3', status: 'pending' }).imageUrl).toBeNull();
	});
});

describe('Bannerbear -> flattenAnimationFiles', () => {
	it('prefers mp4 and exposes each format', () => {
		const animation = flattenAnimationFiles({
			uid: 'a1',
			files: { mov: 'https://x/o.mov', mp4: 'https://x/o.mp4' },
		});

		expect(animation.mp4Url).toBe('https://x/o.mp4');
		expect(animation.movUrl).toBe('https://x/o.mov');
		expect(animation.animationUrl).toBe('https://x/o.mp4');
	});

	it('uses mov when a transparent render produced only that', () => {
		expect(
			flattenAnimationFiles({ uid: 'a2', files: { mov: 'https://x/o.mov' } }).animationUrl,
		).toBe('https://x/o.mov');
	});
});

describe('Bannerbear -> bannerbearApiRequest', () => {
	it('targets the V5 host and drops an empty body and query', async () => {
		const ctx = mockExecuteFunctions([{ ok: true }]);

		await bannerbearApiRequest.call(ctx, 'GET', '/images');

		const [credential, options] = ctx.helpers.httpRequestWithAuthentication.mock.calls[0];
		expect(credential).toBe('bannerbearV5Api');
		expect(options.url).toBe('https://api.bannerbear.com/v5/images');
		expect(options.body).toBeUndefined();
		expect(options.qs).toBeUndefined();
	});
});

describe('Bannerbear -> runTool', () => {
	it('posts a compacted body and returns a completed job without polling', async () => {
		const ctx = mockExecuteFunctions(
			[{ uid: 'j1', status: 'completed', outputs: { video_url: 'https://x/o.mp4' } }],
			{ waitForCompletion: true, maxTries: 5 },
		);

		const job = await runTool.call(
			ctx,
			'resize_video',
			{
				video_url: 'https://x/i.mp4',
				width: 1280,
				fit: undefined,
			},
			0,
		);

		const [, options] = ctx.helpers.httpRequestWithAuthentication.mock.calls[0];
		expect(options.url).toBe('https://api.bannerbear.com/v5/tools/resize_video');
		expect(options.body).toEqual({ video_url: 'https://x/i.mp4', width: 1280 });
		expect(job.status).toBe('completed');
		expect(ctx.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(1);
	});

	it('polls the tool job until it settles', async () => {
		const ctx = mockExecuteFunctions(
			[
				{ uid: 'j2', status: 'pending' },
				{ uid: 'j2', status: 'running' },
				{ uid: 'j2', status: 'completed', outputs: { pdf_url: 'https://x/o.pdf' } },
			],
			{ waitForCompletion: true, maxTries: 5 },
		);

		const job = await runTool.call(ctx, 'create_pdf', { urls: ['https://x/a.pdf'] }, 0);

		expect(ctx.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(3);
		const [, polled] = ctx.helpers.httpRequestWithAuthentication.mock.calls[1];
		expect(polled.url).toBe('https://api.bannerbear.com/v5/tool_jobs/j2');
		expect(job.status).toBe('completed');
	});

	it('returns the queued job immediately when not waiting', async () => {
		const ctx = mockExecuteFunctions([{ uid: 'j3', status: 'pending' }], {
			waitForCompletion: false,
		});

		const job = await runTool.call(ctx, 'remove_bg', { image_url: 'https://x/i.png' }, 0);

		expect(job.status).toBe('pending');
		expect(ctx.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(1);
	});

	it('stops polling once max tries is reached', async () => {
		const ctx = mockExecuteFunctions(
			[
				{ uid: 'j4', status: 'pending' },
				{ uid: 'j4', status: 'pending' },
				{ uid: 'j4', status: 'pending' },
			],
			{ waitForCompletion: true, maxTries: 2 },
		);

		const job = await runTool.call(ctx, 'trim_video', { video_url: 'https://x/i.mp4' }, 0);

		expect(job.status).toBe('pending');
		expect(ctx.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(3);
	});

	it('throws with the API error message when the job fails', async () => {
		const ctx = mockExecuteFunctions(
			[{ uid: 'j5', status: 'failed', error_message: 'bad source' }],
			{
				waitForCompletion: true,
				maxTries: 5,
			},
		);

		await expect(
			runTool.call(ctx, 'crop_video', { video_url: 'https://x/i.mp4' }, 0),
		).rejects.toThrow('bad source');
	});
});
