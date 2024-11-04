import { useBrowserMetadata } from './useBrowserMetadata';

describe('useBrowserMetadata', () => {
	describe('operatingSystem', () => {
		it('should return macos when userAgent is macintosh', () => {
			Object.defineProperty(window.navigator, 'userAgent', {
				value: 'macintosh',
				writable: true,
			});
			const { operatingSystem } = useBrowserMetadata();
			expect(operatingSystem).toBe('macos');
		});

		it('should return ios when userAgent is iphone', () => {
			Object.defineProperty(window.navigator, 'userAgent', {
				value: 'iphone',
				writable: true,
			});
			const { operatingSystem } = useBrowserMetadata();
			expect(operatingSystem).toBe('ios');
		});

		it('should return windows when userAgent is win32', () => {
			Object.defineProperty(window.navigator, 'userAgent', {
				value: 'win32',
				writable: true,
			});
			const { operatingSystem } = useBrowserMetadata();
			expect(operatingSystem).toBe('windows');
		});

		it('should return android when userAgent is android', () => {
			Object.defineProperty(window.navigator, 'userAgent', {
				value: 'android',
				writable: true,
			});
			const { operatingSystem } = useBrowserMetadata();
			expect(operatingSystem).toBe('android');
		});

		it('should return linux when userAgent is unknown', () => {
			Object.defineProperty(window.navigator, 'userAgent', {
				value: 'unknown',
				writable: true,
			});
			const { operatingSystem } = useBrowserMetadata();
			expect(operatingSystem).toBe('linux');
		});
	});

	describe('operatingSystem', () => {
		it('should return macos when userAgent is macintosh', () => {
			Object.defineProperty(window.navigator, 'userAgent', {
				value: 'macintosh',
				writable: true,
			});
			const { isMacOs } = useBrowserMetadata();
			expect(isMacOs).toBe(true);
		});

		it('should return ios when userAgent is iphone', () => {
			Object.defineProperty(window.navigator, 'userAgent', {
				value: 'iphone',
				writable: true,
			});
			const { isMacOs } = useBrowserMetadata();
			expect(isMacOs).toBe(false);
		});
	});
});
