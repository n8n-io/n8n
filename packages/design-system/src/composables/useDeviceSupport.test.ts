import { useDeviceSupport } from '@/composables/useDeviceSupport';

describe('useDeviceSupport()', () => {
	beforeEach(() => {
		global.window = Object.create(window);
		Object.defineProperty(window, 'navigator', {
			writable: true,
			value: { userAgent: 'test-agent', maxTouchPoints: 0 },
		});
	});

	describe('isTouchDevice property', () => {
		it('should be true if ontouchstart is in window', () => {
			Object.defineProperty(window, 'ontouchstart', {});
			const { isTouchDevice } = useDeviceSupport();
			expect(isTouchDevice).toBe(true);
		});

		it('should be true if navigator.maxTouchPoints > 0', () => {
			window.navigator.maxTouchPoints = 1;
			const { isTouchDevice } = useDeviceSupport();
			expect(isTouchDevice).toBe(true);
		});

		it('should be false if no touch support', () => {
			delete window.ontouchstart;
			window.navigator.maxTouchPoints = 0;
			const { isTouchDevice } = useDeviceSupport();
			expect(isTouchDevice).toBe(false);
		});
	});

	describe('isMacOs property', () => {
		it('should be true for macOS user agent', () => {
			window.navigator.userAgent = 'macintosh';
			const { isMacOs } = useDeviceSupport();
			expect(isMacOs).toBe(true);
		});

		// Additional tests for other macOS user agents (ipad, iphone, ipod)

		it('should be false for non-macOS user agent', () => {
			window.navigator.userAgent = 'windows';
			const { isMacOs } = useDeviceSupport();
			expect(isMacOs).toBe(false);
		});
	});

	describe('controlKeyCode property', () => {
		it('should return Meta on macOS', () => {
			window.navigator.userAgent = 'macintosh';
			const { controlKeyCode } = useDeviceSupport();
			expect(controlKeyCode).toBe('Meta');
		});

		it('should return Control on non-macOS', () => {
			window.navigator.userAgent = 'windows';
			const { controlKeyCode } = useDeviceSupport();
			expect(controlKeyCode).toBe('Control');
		});
	});

	describe('isCtrlKeyPressed function', () => {
		it('should return true for metaKey press on macOS', () => {
			window.navigator.userAgent = 'macintosh';
			const { isCtrlKeyPressed } = useDeviceSupport();
			const event = new KeyboardEvent('keydown', { metaKey: true });
			expect(isCtrlKeyPressed(event)).toBe(true);
		});

		it('should return true for ctrlKey press on non-macOS', () => {
			window.navigator.userAgent = 'windows';
			const { isCtrlKeyPressed } = useDeviceSupport();
			const event = new KeyboardEvent('keydown', { ctrlKey: true });
			expect(isCtrlKeyPressed(event)).toBe(true);
		});

		it('should return true for touch device on MouseEvent', () => {
			Object.defineProperty(window, 'ontouchstart', { value: {} });
			const { isCtrlKeyPressed } = useDeviceSupport();
			const mockEvent = new MouseEvent('click');
			expect(isCtrlKeyPressed(mockEvent)).toBe(true);
		});
	});
});
