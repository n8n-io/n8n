import {
	AVATAR_MAX_SOURCE_BYTES,
	AvatarImageError,
	cropPreviewStyle,
	cropRectangle,
	decodeAvatarSource,
	isAcceptedAvatarFile,
	probeTransparency,
} from './avatarImage';

const file = (type: string, size = 10) =>
	new File([new Uint8Array(size)], `picture.${type.split('/')[1]}`, { type });

describe('isAcceptedAvatarFile', () => {
	it.each(['image/jpeg', 'image/png', 'image/webp'])('accepts %s', (type) => {
		expect(isAcceptedAvatarFile(file(type))).toBe(true);
	});

	it.each(['image/gif', 'image/svg+xml', 'image/bmp', 'application/pdf', ''])(
		'refuses %p',
		(type) => {
			expect(isAcceptedAvatarFile(file(type))).toBe(false);
		},
	);
});

describe('decodeAvatarSource', () => {
	it('refuses the wrong type before touching the bytes', async () => {
		await expect(decodeAvatarSource(file('image/gif'))).rejects.toMatchObject({ problem: 'type' });
	});

	it('refuses oversized files before decoding', async () => {
		const big = new File([new Uint8Array(AVATAR_MAX_SOURCE_BYTES + 1)], 'big.png', {
			type: 'image/png',
		});
		await expect(decodeAvatarSource(big)).rejects.toMatchObject({ problem: 'size' });
	});

	it('reports a picture the browser cannot decode', async () => {
		vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('bad')));
		try {
			await expect(decodeAvatarSource(file('image/png'))).rejects.toBeInstanceOf(AvatarImageError);
			await expect(decodeAvatarSource(file('image/png'))).rejects.toMatchObject({
				problem: 'decode',
			});
		} finally {
			vi.unstubAllGlobals();
		}
	});
});

describe('cropRectangle', () => {
	const landscape = { width: 400, height: 200 };

	it('fills the shorter edge at zoom 1 and centers on the longer one', () => {
		expect(cropRectangle(landscape, { zoom: 1, panX: 0, panY: 0 })).toEqual({
			x: 100,
			y: 0,
			size: 200,
		});
	});

	it('pans across the slack of the longer edge', () => {
		expect(cropRectangle(landscape, { zoom: 1, panX: -1, panY: 0 }).x).toBe(0);
		expect(cropRectangle(landscape, { zoom: 1, panX: 1, panY: 0 }).x).toBe(200);
		expect(cropRectangle(landscape, { zoom: 1, panX: 0.5, panY: 0 }).x).toBe(150);
	});

	it('zooms in by shrinking the crop and keeps it inside the picture', () => {
		const zoomed = cropRectangle(landscape, { zoom: 2, panX: 1, panY: 1 });

		expect(zoomed.size).toBe(100);
		expect(zoomed.x + zoomed.size).toBe(400);
		expect(zoomed.y + zoomed.size).toBe(200);
	});

	it('clamps zoom and pan to their ranges', () => {
		expect(cropRectangle(landscape, { zoom: 10, panX: 5, panY: -5 })).toEqual(
			cropRectangle(landscape, { zoom: 3, panX: 1, panY: -1 }),
		);
		expect(cropRectangle(landscape, { zoom: 0.1, panX: 0, panY: 0 }).size).toBe(200);
	});

	it('works for portrait pictures too', () => {
		expect(cropRectangle({ width: 100, height: 300 }, { zoom: 1, panX: 0, panY: 1 })).toEqual({
			x: 0,
			y: 200,
			size: 100,
		});
	});
});

describe('cropPreviewStyle', () => {
	it('scales and shifts the picture so the crop fills a square box', () => {
		const style = cropPreviewStyle({ width: 400, height: 200 }, { zoom: 1, panX: 0, panY: 0 });

		// The crop starts 100px into a 400px-wide picture, i.e. half a box in.
		expect(style).toEqual({
			width: '200%',
			height: '100%',
			left: '-50%',
			top: '0%',
		});
	});

	it('scales up for a zoomed crop', () => {
		const style = cropPreviewStyle({ width: 200, height: 200 }, { zoom: 2, panX: 0, panY: 0 });

		expect(style.width).toBe('200%');
		expect(style.height).toBe('200%');
		expect(style.left).toBe('-50%');
		expect(style.top).toBe('-50%');
	});

	it('offsets by the box, not by the picture, when panned to an edge', () => {
		const left = cropPreviewStyle({ width: 400, height: 200 }, { zoom: 1, panX: -1, panY: 0 });
		const right = cropPreviewStyle({ width: 400, height: 200 }, { zoom: 1, panX: 1, panY: 0 });

		expect(left.left).toBe('0%');
		// The crop's right edge meets the picture's: 200% wide, shifted one box.
		expect(right.left).toBe('-100%');
	});
});

describe('probeTransparency', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('treats a picture it cannot fetch as opaque', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

		await expect(probeTransparency('/rest/users/1/avatar/upload')).resolves.toBe(false);
	});

	it('treats a failed response as opaque', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

		await expect(probeTransparency('/rest/users/1/avatar/upload')).resolves.toBe(false);
	});

	it('knows a JPEG has no alpha without decoding it', async () => {
		const createImageBitmap = vi.fn();
		vi.stubGlobal('createImageBitmap', createImageBitmap);
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				blob: async () => new Blob([new Uint8Array(4)], { type: 'image/jpeg' }),
			}),
		);

		await expect(probeTransparency('/rest/users/1/avatar/upload')).resolves.toBe(false);
		expect(createImageBitmap).not.toHaveBeenCalled();
	});

	it('sends the session cookie along', async () => {
		const fetch = vi.fn().mockResolvedValue({ ok: false });
		vi.stubGlobal('fetch', fetch);

		await probeTransparency('/rest/users/1/avatar/sso');

		expect(fetch).toHaveBeenCalledWith('/rest/users/1/avatar/sso', { credentials: 'include' });
	});
});
