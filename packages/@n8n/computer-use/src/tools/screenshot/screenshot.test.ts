import { Monitor } from 'node-screenshots';

import { ScreenshotModule } from './index';
import { screenshotTool, screenshotRegionTool } from './screenshot';

jest.mock('node-screenshots');

const mockFromRgbaPixels = jest.fn<unknown, unknown[]>();
jest.mock('@napi-rs/image', () => ({
	__esModule: true,
	// eslint-disable-next-line @typescript-eslint/naming-convention
	Transformer: {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		fromRgbaPixels: (...args: unknown[]) => mockFromRgbaPixels(...args),
	},
}));

const MockMonitor = Monitor as jest.MockedClass<typeof Monitor>;

const DUMMY_CONTEXT = { dir: '/test/base' };

interface MockImage {
	width: number;
	height: number;
	toRaw: jest.Mock;
	crop: jest.Mock;
}

function makeMockImage(width = 1920, height = 1080, rawData = 'fake-raw-bytes'): MockImage {
	const image: MockImage = {
		width,
		height,
		toRaw: jest.fn().mockResolvedValue(Buffer.from(rawData)),
		crop: jest.fn(),
	};
	// Default crop returns a new cropped image
	// eslint-disable-next-line @typescript-eslint/promise-function-async
	image.crop.mockImplementation((_x: number, _y: number, w: number, h: number) =>
		Promise.resolve({
			width: w,
			height: h,
			toRaw: jest.fn().mockResolvedValue(Buffer.from(`cropped-${w}x${h}`)),
			crop: jest.fn(),
		}),
	);
	return image;
}

interface MockMonitorInstance {
	isPrimary: jest.Mock;
	x: jest.Mock;
	y: jest.Mock;
	width: jest.Mock;
	height: jest.Mock;
	scaleFactor: jest.Mock;
	captureImage: jest.Mock;
}

function makeMockMonitor(opts: {
	isPrimary?: boolean;
	x?: number;
	y?: number;
	width?: number;
	height?: number;
	scaleFactor?: number;
	image?: MockImage;
}): MockMonitorInstance {
	const image = opts.image ?? makeMockImage();
	return {
		isPrimary: jest.fn().mockReturnValue(opts.isPrimary ?? false),
		x: jest.fn().mockReturnValue(opts.x ?? 0),
		y: jest.fn().mockReturnValue(opts.y ?? 0),
		width: jest.fn().mockReturnValue(opts.width ?? 1920),
		height: jest.fn().mockReturnValue(opts.height ?? 1080),
		scaleFactor: jest.fn().mockReturnValue(opts.scaleFactor ?? 1.0),
		captureImage: jest.fn().mockResolvedValue(image),
	};
}

beforeEach(() => {
	const mockJpeg = jest.fn().mockResolvedValue(Buffer.from('fake-jpeg'));
	const mockResize = jest.fn();
	const pipeline = { resize: mockResize, jpeg: mockJpeg };
	mockResize.mockReturnValue(pipeline);
	mockFromRgbaPixels.mockReturnValue(pipeline);
});

describe('screen_screenshot tool', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	it('returns base64 JPEG as media content for primary monitor', async () => {
		const monitor = makeMockMonitor({ isPrimary: true, width: 1920, height: 1080 });
		(MockMonitor.all as jest.Mock).mockReturnValue([monitor]);

		const result = await screenshotTool.execute({}, DUMMY_CONTEXT);

		expect(result.content).toHaveLength(1);

		const imageBlock = result.content[0];
		expect(imageBlock.type).toBe('image');
		expect(imageBlock).toHaveProperty('data', Buffer.from('fake-jpeg').toString('base64'));
		expect(imageBlock).toHaveProperty('mimeType', 'image/jpeg');
	});

	it('uses the primary monitor when multiple monitors are available', async () => {
		const secondary = makeMockMonitor({ isPrimary: false, x: 1920 });
		const primary = makeMockMonitor({ isPrimary: true, x: 0 });
		(MockMonitor.all as jest.Mock).mockReturnValue([secondary, primary]);

		await screenshotTool.execute({}, DUMMY_CONTEXT);

		expect(primary.captureImage).toHaveBeenCalled();
		expect(secondary.captureImage).not.toHaveBeenCalled();
	});

	it('throws when no monitors are available', async () => {
		(MockMonitor.all as jest.Mock).mockReturnValue([]);

		await expect(screenshotTool.execute({}, DUMMY_CONTEXT)).rejects.toThrow(
			'No monitors available',
		);
	});

	it('resizes the image to logical dimensions on HiDPI (Retina 2x) displays', async () => {
		// Physical image is 2x the logical monitor dimensions
		const image = makeMockImage(3840, 2160);
		const monitor = makeMockMonitor({
			isPrimary: true,
			width: 1920,
			height: 1080,
			scaleFactor: 2.0,
			image,
		});
		(MockMonitor.all as jest.Mock).mockReturnValue([monitor]);

		await screenshotTool.execute({}, DUMMY_CONTEXT);

		const pipeline = mockFromRgbaPixels.mock.results[0].value as { resize: jest.Mock };
		expect(pipeline.resize).toHaveBeenCalledWith(1920, 1080);
	});

	it('downscales to max 1024px when physical dimensions match logical dimensions', async () => {
		const monitor = makeMockMonitor({
			isPrimary: true,
			width: 1920,
			height: 1080,
			scaleFactor: 1.0,
		});
		(MockMonitor.all as jest.Mock).mockReturnValue([monitor]);

		await screenshotTool.execute({}, DUMMY_CONTEXT);

		const pipeline = mockFromRgbaPixels.mock.results[0].value as { resize: jest.Mock };
		// No HiDPI resize, but LLM downscale kicks in (1920x1080 → 1024x576)
		expect(pipeline.resize).toHaveBeenCalledWith(1024, 576);
	});
});

describe('screen_screenshot_region tool', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	it('returns cropped image data as media content', async () => {
		const monitor = makeMockMonitor({ isPrimary: true, x: 0, y: 0, width: 1920, height: 1080 });
		(MockMonitor.all as jest.Mock).mockReturnValue([monitor]);

		const result = await screenshotRegionTool.execute(
			{ x: 100, y: 200, width: 400, height: 300 },
			DUMMY_CONTEXT,
		);

		expect(result.content).toHaveLength(1);

		const imageBlock = result.content[0];
		expect(imageBlock.type).toBe('image');
		expect(imageBlock).toHaveProperty('mimeType', 'image/jpeg');
		expect(imageBlock).toHaveProperty('data');
	});

	it('translates absolute screen coords to monitor-relative coordinates', async () => {
		const image = makeMockImage(2560, 1440);
		const monitor = makeMockMonitor({
			isPrimary: true,
			x: 1920,
			y: 100,
			width: 2560,
			height: 1440,
			image,
		});
		(MockMonitor.all as jest.Mock).mockReturnValue([monitor]);

		await screenshotRegionTool.execute({ x: 2000, y: 200, width: 300, height: 200 }, DUMMY_CONTEXT);

		// relX = 2000 - 1920 = 80, relY = 200 - 100 = 100
		expect(image.crop).toHaveBeenCalledWith(80, 100, 300, 200);
	});

	it('clamps relX/relY to zero when coordinates fall before monitor origin', async () => {
		const image = makeMockImage(1920, 1080);
		const monitor = makeMockMonitor({
			isPrimary: true,
			x: 500,
			y: 500,
			width: 1920,
			height: 1080,
			image,
		});
		(MockMonitor.all as jest.Mock).mockReturnValue([monitor]);

		await screenshotRegionTool.execute({ x: 100, y: 100, width: 200, height: 150 }, DUMMY_CONTEXT);

		// relX = max(0, 100 - 500) = 0, relY = max(0, 100 - 500) = 0
		expect(image.crop).toHaveBeenCalledWith(0, 0, expect.any(Number), expect.any(Number));
	});

	it('scales crop coordinates to physical pixels on HiDPI displays', async () => {
		// Retina 2x: logical 1920x1080, physical 3840x2160
		const image = makeMockImage(3840, 2160);
		const monitor = makeMockMonitor({
			isPrimary: true,
			x: 0,
			y: 0,
			width: 1920,
			height: 1080,
			scaleFactor: 2.0,
			image,
		});
		(MockMonitor.all as jest.Mock).mockReturnValue([monitor]);

		// Input in logical pixels: x=100, y=200, w=400, h=300
		await screenshotRegionTool.execute({ x: 100, y: 200, width: 400, height: 300 }, DUMMY_CONTEXT);

		// Crop must be in physical pixels (×2)
		expect(image.crop).toHaveBeenCalledWith(200, 400, 800, 600);
	});

	it('resizes cropped image back to logical dimensions on HiDPI displays', async () => {
		const image = makeMockImage(3840, 2160);
		const monitor = makeMockMonitor({
			isPrimary: true,
			x: 0,
			y: 0,
			width: 1920,
			height: 1080,
			scaleFactor: 2.0,
			image,
		});
		(MockMonitor.all as jest.Mock).mockReturnValue([monitor]);

		await screenshotRegionTool.execute({ x: 100, y: 200, width: 400, height: 300 }, DUMMY_CONTEXT);

		// Cropped image (800×600 physical) must be resized to logical 400×300
		const pipeline = mockFromRgbaPixels.mock.results[0].value as { resize: jest.Mock };
		expect(pipeline.resize).toHaveBeenCalledWith(400, 300);
	});
});

describe('ScreenshotModule.isSupported', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	it.each([
		['has monitors', [{}], true],
		['returns empty array', [], false],
	])('returns %s -> %s', async (_label, monitorList, expected) => {
		(MockMonitor.all as jest.Mock).mockReturnValue(monitorList);
		await expect(ScreenshotModule.isSupported()).resolves.toBe(expected);
	});

	it('returns false when Monitor.all() throws', async () => {
		(MockMonitor.all as jest.Mock).mockImplementation(() => {
			throw new Error('Display server unavailable');
		});
		await expect(ScreenshotModule.isSupported()).resolves.toBe(false);
	});
});
