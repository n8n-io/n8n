import { useDeviceSupport } from 'n8n-design-system/composables/useDeviceSupport';

describe('useDeviceSupport()', () => {
	beforeEach(() => {
		global.window = Object.create(window);
		global.navigator = { userAgent: 'test-agent', maxTouchPoints: 0 } as Navigator;
	});

	describe('isTouchDevice', () => {
		it('should be true if ontouchstart is in window', () => {
			Object.defineProperty(window, 'ontouchstart', {});
			const { isTouchDevice } = useDeviceSupport();
			expect(isTouchDevice).toEqual(true);
		});

		it('should be true if navigator.maxTouchPoints > 0', () => {
			Object.defineProperty(navigator, 'maxTouchPoints', { value: 1 });
			const { isTouchDevice } = useDeviceSupport();
			expect(isTouchDevice).toEqual(true);
		});

		it('should be false if no touch support', () => {
			delete window.ontouchstart;
			Object.defineProperty(navigator, 'maxTouchPoints', { value: 0 });
			const { isTouchDevice } = useDeviceSupport();
			expect(isTouchDevice).toEqual(false);
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
