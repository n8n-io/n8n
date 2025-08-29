import { mock } from 'vitest-mock-extended';
import {
	getNodeIcon,
	getNodeIconUrl,
	getBadgeIconUrl,
	getNodeIconSource,
	type IconNodeType,
} from './nodeIcon';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({
		baseUrl: 'https://example.com/',
	})),
}));

vi.mock('../stores/ui.store', () => ({
	useUIStore: vi.fn(() => ({
		appliedTheme: 'light',
	})),
}));

vi.mock('./nodeTypesUtils', () => ({
	getThemedValue: vi.fn((value, theme) => {
		if (typeof value === 'object' && value !== null) {
			return value[theme] || value.dark || value.light || null;
		}
		return value;
	}),
}));

describe('util: Node Icon', () => {
	describe('getNodeIcon', () => {
		it('should return the icon from nodeType', () => {
			expect(getNodeIcon(mock<IconNodeType>({ icon: 'user', iconUrl: undefined }))).toBe('user');
		});

		it('should return null if no icon is present', () => {
			expect(
				getNodeIcon(mock<IconNodeType>({ icon: undefined, iconUrl: '/test.svg' })),
			).toBeUndefined();
		});
	});

	describe('getNodeIconUrl', () => {
		it('should return the iconUrl from nodeType', () => {
			expect(
				getNodeIconUrl(
					mock<IconNodeType>({
						iconUrl: { light: 'images/light-icon.svg', dark: 'images/dark-icon.svg' },
					}),
				),
			).toBe('images/light-icon.svg');
		});

		it('should return null if no iconUrl is present', () => {
			expect(
				getNodeIconUrl(mock<IconNodeType>({ icon: 'foo', iconUrl: undefined })),
			).toBeUndefined();
		});

		it('should return the iconUrl from nodeType when using https', () => {
			expect(
				getNodeIconUrl(
					mock<IconNodeType>({
						iconUrl: 'https://my-site.com/icon.svg',
					}),
				),
			).toBe('https://my-site.com/icon.svg');
		});

		it('should return the iconUrl from nodeType when using https with themed values', () => {
			expect(
				getNodeIconUrl(
					mock<IconNodeType>({
						iconUrl: {
							light: 'https://my-site.com/light-icon.svg',
							dark: 'https://my-site.com/dark-icon.svg',
						},
					}),
				),
			).toBe('https://my-site.com/light-icon.svg');
		});
	});

	describe('getBadgeIconUrl', () => {
		it('should return the badgeIconUrl from nodeType', () => {
			expect(getBadgeIconUrl({ badgeIconUrl: 'images/badge.svg' })).toBe('images/badge.svg');
		});

		it('should return null if no badgeIconUrl is present', () => {
			expect(getBadgeIconUrl({ badgeIconUrl: undefined })).toBeUndefined();
		});
	});

	describe('getNodeIconSource', () => {
		it('should return undefined if nodeType is null or undefined', () => {
			expect(getNodeIconSource(null)).toBeUndefined();
			expect(getNodeIconSource(undefined)).toBeUndefined();
		});

		it('should create an icon source from iconData.icon if available', () => {
			const result = getNodeIconSource(
				mock<IconNodeType>({ iconData: { type: 'icon', icon: 'pencil' } }),
			);
			expect(result).toEqual({
				type: 'icon',
				name: 'pencil',
				color: undefined,
				badge: undefined,
			});
		});

		it('should create a file source from iconData.fileBuffer if available', () => {
			const result = getNodeIconSource(
				mock<IconNodeType>({
					iconData: {
						type: 'file',
						icon: undefined,
						fileBuffer: 'data://foo',
					},
				}),
			);
			expect(result).toEqual({
				type: 'file',
				src: 'data://foo',
				badge: undefined,
			});
		});

		it('should create a file source from iconUrl if available', () => {
			const result = getNodeIconSource(
				mock<IconNodeType>({ iconUrl: 'images/node-icon.svg', name: undefined }),
			);
			expect(result).toEqual({
				type: 'file',
				src: 'https://example.com/images/node-icon.svg',
				badge: undefined,
			});
		});

		it('should create an icon source from icon if available', () => {
			const result = getNodeIconSource(
				mock<IconNodeType>({
					icon: 'icon:user',
					iconColor: 'blue',
					iconData: undefined,
					iconUrl: undefined,
					name: undefined,
				}),
			);
			expect(result).toEqual({
				type: 'icon',
				name: 'user',
				color: 'var(--color-node-icon-blue)',
			});
		});

		it('should include badge if available', () => {
			const result = getNodeIconSource(
				mock<IconNodeType>({ badgeIconUrl: 'images/badge.svg', name: undefined }),
			);
			expect(result?.badge).toEqual({
				type: 'file',
				src: 'https://example.com/images/badge.svg',
			});
		});
	});
});
