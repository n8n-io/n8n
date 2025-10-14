import { mock } from 'vitest-mock-extended';
import {
	getNodeIcon,
	getNodeIconUrl,
	getBadgeIconUrl,
	getNodeIconSource,
	type IconNodeType,
} from './nodeIcon';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { getThemedValue } from './nodeTypesUtils';
import { removePreviewToken } from '../components/Node/NodeCreator/utils';

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

vi.mock('../components/Node/NodeCreator/utils', () => ({
	removePreviewToken: vi.fn((nodeType: string) => nodeType.replace('__preview__', '')),
}));

vi.mock('@/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		communityNodeType: vi.fn(),
		getNodeType: vi.fn(),
	})),
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
				color: 'var(--node--icon--color--blue)',
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

		describe('when nodeType is a string', () => {
			beforeEach(() => {
				vi.clearAllMocks();
			});

			it('should return file source when community node has iconUrl', () => {
				const mockCommunityNode = {
					nodeDescription: {
						iconUrl: { light: 'community/icon.svg', dark: 'community/icon-dark.svg' },
					},
				};

				vi.mocked(useNodeTypesStore).mockReturnValue({
					communityNodeType: vi.fn().mockReturnValue(mockCommunityNode),
					getNodeType: vi.fn(),
				} as unknown as ReturnType<typeof useNodeTypesStore>);

				vi.mocked(getThemedValue).mockReturnValue('community/icon.svg');

				const result = getNodeIconSource('community-node');

				expect(result).toEqual({
					type: 'file',
					src: 'community/icon.svg',
				});
				expect(useNodeTypesStore().communityNodeType).toHaveBeenCalledWith('community-node');
			});

			it('should return file source when regular node has iconUrl', () => {
				const mockNodeType = {
					iconUrl: { light: 'regular/icon.svg', dark: 'regular/icon-dark.svg' },
				};

				vi.mocked(useNodeTypesStore).mockReturnValue({
					communityNodeType: vi.fn().mockReturnValue(null),
					getNodeType: vi.fn().mockReturnValue(mockNodeType),
				} as unknown as ReturnType<typeof useNodeTypesStore>);

				vi.mocked(getThemedValue).mockReturnValue('regular/icon.svg');

				const result = getNodeIconSource('regular-node');

				expect(result).toEqual({
					type: 'file',
					src: 'regular/icon.svg',
				});
				expect(useNodeTypesStore().getNodeType).toHaveBeenCalledWith('regular-node');
			});

			it('should remove preview token from nodeType string', () => {
				const mockNodeType = {
					iconUrl: 'preview/icon.svg',
				};

				vi.mocked(useNodeTypesStore).mockReturnValue({
					communityNodeType: vi.fn().mockReturnValue(null),
					getNodeType: vi.fn().mockReturnValue(mockNodeType),
				} as unknown as ReturnType<typeof useNodeTypesStore>);

				vi.mocked(removePreviewToken).mockReturnValue('preview-node');

				getNodeIconSource('preview-node__preview__');

				expect(removePreviewToken).toHaveBeenCalledWith('preview-node__preview__');
				expect(useNodeTypesStore().getNodeType).toHaveBeenCalledWith('preview-node');
			});

			it('should return undefined when no node is found', () => {
				vi.mocked(useNodeTypesStore).mockReturnValue({
					communityNodeType: vi.fn().mockReturnValue(null),
					getNodeType: vi.fn().mockReturnValue(null),
				} as unknown as ReturnType<typeof useNodeTypesStore>);

				const result = getNodeIconSource('non-existent-node');

				expect(result).toBeUndefined();
			});

			it('should return undefined when node has no iconUrl', () => {
				const mockNodeType = {
					iconUrl: undefined,
				};

				vi.mocked(useNodeTypesStore).mockReturnValue({
					communityNodeType: vi.fn().mockReturnValue(null),
					getNodeType: vi.fn().mockReturnValue(mockNodeType),
				} as unknown as ReturnType<typeof useNodeTypesStore>);

				const result = getNodeIconSource('node-without-icon');

				expect(result).toBeUndefined();
			});

			it('should return undefined when themed iconUrl is null', () => {
				const mockNodeType = {
					iconUrl: { light: 'icon.svg', dark: 'icon-dark.svg' },
				};

				vi.mocked(useNodeTypesStore).mockReturnValue({
					communityNodeType: vi.fn().mockReturnValue(null),
					getNodeType: vi.fn().mockReturnValue(mockNodeType),
				} as unknown as ReturnType<typeof useNodeTypesStore>);

				vi.mocked(getThemedValue).mockReturnValue(null);

				const result = getNodeIconSource('node-with-null-themed-icon');

				expect(result).toBeUndefined();
			});
		});
	});
});
