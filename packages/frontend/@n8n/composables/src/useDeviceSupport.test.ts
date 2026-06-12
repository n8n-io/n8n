import { useDeviceSupport } from './useDeviceSupport';

const detectPointerType = (query: string) => {
	const isCoarse = query === '(any-pointer: coarse)';
	const isFine = query === '(any-pointer: fine)';
	return { matches: isCoarse || isFine };
};

describe('useDeviceSupport()', () => {
	beforeEach(() => {
		global.window = Object.create(window);
		global.navigator = { userAgent: 'test-agent', maxTouchPoints: 0 } as Navigator;

		Object.defineProperty(window, 'matchMedia', {
			value: vi.fn().mockImplementation((query: string) => detectPointerType(query)),
		});
	});

	describe('isTouchDevice', () => {
		it('should be true if device has touch points', () => {
			Object.defineProperty(navigator, 'maxTouchPoints', { value: 5 });
			const { isTouchDevice } = useDeviceSupport();
			expect(isTouchDevice).toEqual(true);
		});

		it('should be true if device has only coarse pointer', () => {
			Object.defineProperty(window, 'matchMedia', {
				value: vi.fn().mockImplementation((query: string) => ({
					matches: query === '(any-pointer: coarse)',
				})),
			});
			const { isTouchDevice } = useDeviceSupport();
			expect(isTouchDevice).toEqual(true);
		});

		it('should be false if device has no touch points and has fine pointer', () => {
			Object.defineProperty(navigator, 'maxTouchPoints', { value: 0 });
			Object.defineProperty(window, 'matchMedia', {
				value: vi.fn().mockImplementation((query: string) => ({
					matches: query === '(any-pointer: fine)',
				})),
			});
			const { isTouchDevice } = useDeviceSupport();
			expect(isTouchDevice).toEqual(false);
		});

		it('should be true for iPad Pro with Apple Pencil', () => {
			Object.defineProperty(navigator, 'maxTouchPoints', { value: 5 });
			Object.defineProperty(window, 'matchMedia', {
				value: vi.fn().mockImplementation(() => ({
					matches: true, // Both fine and coarse pointers
				})),
			});
			Object.defineProperty(navigator, 'userAgent', { value: 'ipad' });
			const { isTouchDevice } = useDeviceSupport();
			expect(isTouchDevice).toEqual(true);
		});
	});

	describe('isMacOs', () => {
		it('should be true for macOS user agent', () => {
			Object.defineProperty(navigator, 'userAgent', { value: 'macintosh' });
			const { isMacOs } = useDeviceSupport();
			expect(isMacOs).toEqual(true);
		});

		it('should be false for non-macOS user agent', () => {
			Object.defineProperty(navigator, 'userAgent', { value: 'windows' });
			const { isMacOs } = useDeviceSupport();
			expect(isMacOs).toEqual(false);
		});
	});

	describe('controlKeyCode', () => {
		it('should return Meta on macOS', () => {
			Object.defineProperty(navigator, 'userAgent', { value: 'macintosh' });
			const { controlKeyCode } = useDeviceSupport();
			expect(controlKeyCode).toEqual('Meta');
		});

		it('should return Control on non-macOS', () => {
			Object.defineProperty(navigator, 'userAgent', { value: 'windows' });
			const { controlKeyCode } = useDeviceSupport();
			expect(controlKeyCode).toEqual('Control');
		});
	});

	describe('isMobileDevice', () => {
		it('should be true for iOS user agent', () => {
			Object.defineProperty(navigator, 'userAgent', { value: 'iphone' });
			const { isMobileDevice } = useDeviceSupport();
			expect(isMobileDevice).toEqual(true);
		});

		it('should be true for Android user agent', () => {
			Object.defineProperty(navigator, 'userAgent', { value: 'android' });
			const { isMobileDevice } = useDeviceSupport();
			expect(isMobileDevice).toEqual(true);
		});

		it('should be false for non-mobile user agent', () => {
			Object.defineProperty(navigator, 'userAgent', { value: 'windows' });
			const { isMobileDevice } = useDeviceSupport();
			expect(isMobileDevice).toEqual(false);
		});

		it('should be true for iPad user agent', () => {
			Object.defineProperty(navigator, 'userAgent', { value: 'ipad' });
			const { isMobileDevice } = useDeviceSupport();
			expect(isMobileDevice).toEqual(true);
		});

		it('should be true for iPod user agent', () => {
			Object.defineProperty(navigator, 'userAgent', { value: 'ipod' });
			const { isMobileDevice } = useDeviceSupport();
			expect(isMobileDevice).toEqual(true);
		});
	});

	describe('isCtrlKeyPressed()', () => {
		it('should return true for metaKey press on macOS', () => {
			Object.defineProperty(navigator, 'userAgent', { value: 'macintosh' });
			const { isCtrlKeyPressed } = useDeviceSupport();
			const event = new KeyboardEvent('keydown', { metaKey: true });
			expect(isCtrlKeyPressed(event)).toEqual(true);
		});

		it('should return true for ctrlKey press on non-macOS', () => {
			Object.defineProperty(navigator, 'userAgent', { value: 'windows' });
			const { isCtrlKeyPressed } = useDeviceSupport();
			const event = new KeyboardEvent('keydown', { ctrlKey: true });
			expect(isCtrlKeyPressed(event)).toEqual(true);
		});
	});
});
