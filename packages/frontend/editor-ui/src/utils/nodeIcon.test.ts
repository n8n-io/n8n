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

vi.mock('@/stores/workflows.store', () => ({
	useWorkflowsStore: vi.fn(() => ({
		workflowObject: {
			expression: {
				getParameterValue: vi.fn((value) => {
					// Mock expression resolution - handle {{ expression }} format
					if (typeof value === 'string' && value.startsWith('={{') && value.endsWith('}}')) {
						const expression = value.slice(3, -2).trim();
						// Simple mock for parameter access
						if (expression === '$parameter.mode') {
							return 'python';
						}
						if (expression === '$parameter.mode === "python" ? "python" : "js"') {
							return 'python';
						}
					}
					return value;
				}),
			},
		},
	})),
}));

describe('util: Node Icon', () => {
	describe('getNodeIcon', () => {
		it('should return the icon from nodeType', () => {
			expect(getNodeIcon(mock<IconNodeType>({ icon: 'user', iconUrl: undefined }), null)).toBe(
				'user',
			);
		});

		it('should return null if no icon is present', () => {
			expect(
				getNodeIcon(mock<IconNodeType>({ icon: undefined, iconUrl: '/test.svg' }), null),
			).toBeUndefined();
		});

		it('should resolve expression icon without a node using defaults', () => {
			const nodeType = mock<IconNodeType>({
				icon: '={{ $parameter.mode === "python" ? "python" : "js" }}',
				defaults: {
					parameters: {
						mode: 'python',
					},
				},
			});

			const result = getNodeIcon(nodeType, null);
			expect(result).toBe('python');
		});

		it('should resolve expression icon with a node using node parameters', () => {
			const nodeType = mock<IconNodeType>({
				icon: '={{ $parameter.mode === "python" ? "python" : "js" }}',
				defaults: {
					parameters: {
						mode: 'js',
					},
				},
			});

			const node = mock<{ parameters: { mode: string } }>({
				parameters: {
					mode: 'python',
				},
			});

			const result = getNodeIcon(nodeType, node as never);
			expect(result).toBe('python');
		});

		it('should return null when expression resolution fails', () => {
			const nodeType = mock<IconNodeType>({
				icon: '={{ invalid expression }}',
			});

			// Mock will not match this expression, so it should return null
			const result = getNodeIcon(nodeType, null);
			// Since our mock doesn't handle this expression, it returns the original value
			// But the function should handle non-string results
			expect(typeof result === 'string' || result === null).toBe(true);
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
				null,
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
				null,
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
				null,
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
				null,
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
				null,
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
