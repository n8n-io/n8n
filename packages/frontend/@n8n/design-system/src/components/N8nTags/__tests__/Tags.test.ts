/**
 * Test suite for N8nTags component
 */

import { render, fireEvent } from '@testing-library/vue';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import N8nTags from '../Tags.vue';

interface ITag {
	id: string;
	name: string;
}

// Mock the child components
vi.mock('../../N8nTag', () => ({
	default: {
		name: 'N8nTag',
		template: `
			<div class="tag-mock" 
				:data-text="text" 
				:data-clickable="clickable"
				@click="$emit('click', $event)">
				{{ text }}
			</div>
		`,
		props: ['text', 'clickable'],
		emits: ['click'],
	},
}));

vi.mock('../../N8nLink', () => ({
	default: {
		name: 'N8nLink',
		template: `
			<button class="link-mock" 
				:data-theme="theme" 
				:data-underline="underline" 
				:data-size="size"
				@click="$emit('click', $event)">
				<slot />
			</button>
		`,
		props: ['theme', 'underline', 'size'],
		emits: ['click'],
	},
}));

// Mock the composable
vi.mock('../../../composables/useI18n', () => ({
	useI18n: () => ({
		t: (key: string, params?: string[]) => {
			const translations: Record<string, string> = {
				'tags.showMore': `+${params?.[0]} more`,
			};
			return translations[key] || key;
		},
	}),
}));

describe('N8nTags', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const mockTags: ITag[] = [
		{ id: '1', name: 'JavaScript' },
		{ id: '2', name: 'Vue.js' },
		{ id: '3', name: 'TypeScript' },
		{ id: '4', name: 'Node.js' },
		{ id: '5', name: 'Express' },
	];

	describe('Basic Rendering', () => {
		it('should render with default props', () => {
			const { container } = render(N8nTags);

			const tagsContainer = container.querySelector('.n8n-tags');
			expect(tagsContainer).toBeInTheDocument();
		});

		it('should render tags when provided', () => {
			const { container } = render(N8nTags, {
				props: {
					tags: mockTags.slice(0, 2),
				},
			});

			const tags = container.querySelectorAll('.tag-mock');
			expect(tags).toHaveLength(2);
			expect(tags[0]).toHaveTextContent('JavaScript');
			expect(tags[1]).toHaveTextContent('Vue.js');
		});

		it('should render empty when no tags provided', () => {
			const { container } = render(N8nTags, {
				props: {
					tags: [],
				},
			});

			const tags = container.querySelectorAll('.tag-mock');
			expect(tags).toHaveLength(0);
		});

		it('should apply correct CSS classes', () => {
			const { container } = render(N8nTags, {
				props: {
					tags: mockTags.slice(0, 2),
				},
			});

			const tagsContainer = container.querySelector('.n8n-tags');
			expect(tagsContainer).toHaveClass('n8n-tags');
		});
	});

	describe('Clickable Props', () => {
		it('should make tags clickable by default', () => {
			const { container } = render(N8nTags, {
				props: {
					tags: mockTags.slice(0, 2),
				},
			});

			const tags = container.querySelectorAll('.tag-mock');
			expect(tags[0]).toHaveAttribute('data-clickable', 'true');
			expect(tags[1]).toHaveAttribute('data-clickable', 'true');
		});

		it('should make tags non-clickable when clickable is false', () => {
			const { container } = render(N8nTags, {
				props: {
					tags: mockTags.slice(0, 2),
					clickable: false,
				},
			});

			const tags = container.querySelectorAll('.tag-mock');
			expect(tags[0]).toHaveAttribute('data-clickable', 'false');
			expect(tags[1]).toHaveAttribute('data-clickable', 'false');
		});
	});

	describe('Truncation Functionality', () => {
		it('should show all tags when truncate is false', () => {
			const { container } = render(N8nTags, {
				props: {
					tags: mockTags,
					truncate: false,
				},
			});

			const tags = container.querySelectorAll('.tag-mock');
			expect(tags).toHaveLength(5);

			const showMoreLink = container.querySelector('.link-mock');
			expect(showMoreLink).not.toBeInTheDocument();
		});

		it('should truncate tags when truncate is true and tags exceed truncateAt', () => {
			const { container } = render(N8nTags, {
				props: {
					tags: mockTags,
					truncate: true,
					truncateAt: 3,
				},
			});

			const tags = container.querySelectorAll('.tag-mock');
			expect(tags).toHaveLength(3);
			expect(tags[0]).toHaveTextContent('JavaScript');
			expect(tags[1]).toHaveTextContent('Vue.js');
			expect(tags[2]).toHaveTextContent('TypeScript');

			const showMoreLink = container.querySelector('.link-mock');
			expect(showMoreLink).toBeInTheDocument();
			expect(showMoreLink).toHaveTextContent('+2 more');
		});

		it('should not show "show more" when tags count is equal to truncateAt', () => {
			const { container } = render(N8nTags, {
				props: {
					tags: mockTags.slice(0, 3),
					truncate: true,
					truncateAt: 3,
				},
			});

			const tags = container.querySelectorAll('.tag-mock');
			expect(tags).toHaveLength(3);

			const showMoreLink = container.querySelector('.link-mock');
			expect(showMoreLink).not.toBeInTheDocument();
		});

		it('should not show "show more" when tags count is less than truncateAt', () => {
			const { container } = render(N8nTags, {
				props: {
					tags: mockTags.slice(0, 2),
					truncate: true,
					truncateAt: 3,
				},
			});

			const tags = container.querySelectorAll('.tag-mock');
			expect(tags).toHaveLength(2);

			const showMoreLink = container.querySelector('.link-mock');
			expect(showMoreLink).not.toBeInTheDocument();
		});

		it('should use default truncateAt value of 3', () => {
			const { container } = render(N8nTags, {
				props: {
					tags: mockTags,
					truncate: true,
				},
			});

			const tags = container.querySelectorAll('.tag-mock');
			expect(tags).toHaveLength(3);

			const showMoreLink = container.querySelector('.link-mock');
			expect(showMoreLink).toBeInTheDocument();
			expect(showMoreLink).toHaveTextContent('+2 more');
		});

		it('should handle custom truncateAt values', () => {
			const { container } = render(N8nTags, {
				props: {
					tags: mockTags,
					truncate: true,
					truncateAt: 2,
				},
			});

			const tags = container.querySelectorAll('.tag-mock');
			expect(tags).toHaveLength(2);

			const showMoreLink = container.querySelector('.link-mock');
			expect(showMoreLink).toBeInTheDocument();
			expect(showMoreLink).toHaveTextContent('+3 more');
		});
	});

	describe('Expand Functionality', () => {
		it('should expand to show all tags when "show more" is clicked', async () => {
			const onExpand = vi.fn();
			const { container } = render(N8nTags, {
				props: {
					tags: mockTags,
					truncate: true,
					truncateAt: 3,
					onExpand,
				},
			});

			// Initially should show 3 tags
			let tags = container.querySelectorAll('.tag-mock');
			expect(tags).toHaveLength(3);

			const showMoreLink = container.querySelector('.link-mock');
			expect(showMoreLink).toBeInTheDocument();

			// Click "show more"
			await fireEvent.click(showMoreLink!);

			// Should now show all tags
			tags = container.querySelectorAll('.tag-mock');
			expect(tags).toHaveLength(5);

			// "Show more" link should be gone
			const updatedShowMoreLink = container.querySelector('.link-mock');
			expect(updatedShowMoreLink).not.toBeInTheDocument();

			// Should emit expand event
			expect(onExpand).toHaveBeenCalledWith(true);
		});

		it('should prevent event propagation on "show more" click', async () => {
			const onContainerClick = vi.fn();
			const { container } = render(N8nTags, {
				props: {
					tags: mockTags,
					truncate: true,
					truncateAt: 3,
				},
				attrs: {
					onClick: onContainerClick,
				},
			});

			const showMoreLink = container.querySelector('.link-mock');
			await fireEvent.click(showMoreLink!);

			// Container click should not be called due to stop propagation
			expect(onContainerClick).not.toHaveBeenCalled();
		});
	});

	describe('Tag Click Events', () => {
		it('should emit click:tag event when a tag is clicked', async () => {
			const onClickTag = vi.fn();
			const { container } = render(N8nTags, {
				props: {
					tags: mockTags.slice(0, 2),
					'onClick:tag': onClickTag,
				},
			});

			const firstTag = container.querySelectorAll('.tag-mock')[0];
			const mockPointerEvent = new PointerEvent('click');

			await fireEvent.click(firstTag, mockPointerEvent);

			expect(onClickTag).toHaveBeenCalledWith('1', expect.any(Event));
		});

		it('should emit click:tag events for different tags with correct IDs', async () => {
			const onClickTag = vi.fn();
			const { container } = render(N8nTags, {
				props: {
					tags: mockTags.slice(0, 3),
					'onClick:tag': onClickTag,
				},
			});

			const tags = container.querySelectorAll('.tag-mock');

			// Click first tag
			await fireEvent.click(tags[0]);
			expect(onClickTag).toHaveBeenCalledWith('1', expect.any(Event));

			// Click second tag
			await fireEvent.click(tags[1]);
			expect(onClickTag).toHaveBeenCalledWith('2', expect.any(Event));

			// Click third tag
			await fireEvent.click(tags[2]);
			expect(onClickTag).toHaveBeenCalledWith('3', expect.any(Event));

			expect(onClickTag).toHaveBeenCalledTimes(3);
		});

		it('should still emit events when clickable is false', async () => {
			const onClickTag = vi.fn();
			const { container } = render(N8nTags, {
				props: {
					tags: mockTags.slice(0, 2),
					clickable: false,
					'onClick:tag': onClickTag,
				},
			});

			const firstTag = container.querySelectorAll('.tag-mock')[0];
			await fireEvent.click(firstTag);

			expect(onClickTag).toHaveBeenCalledWith('1', expect.any(Event));
		});
	});

	describe('Show More Link Properties', () => {
		it('should configure show more link with correct props', () => {
			const { container } = render(N8nTags, {
				props: {
					tags: mockTags,
					truncate: true,
					truncateAt: 2,
				},
			});

			const showMoreLink = container.querySelector('.link-mock');
			expect(showMoreLink).toHaveAttribute('data-theme', 'text');
			expect(showMoreLink).toHaveAttribute('data-underline', 'true');
			expect(showMoreLink).toHaveAttribute('data-size', 'small');
		});

		it('should calculate correct hidden tags count', () => {
			const testCases = [
				{ total: 5, truncateAt: 2, expected: '+3 more' },
				{ total: 5, truncateAt: 3, expected: '+2 more' },
				{ total: 5, truncateAt: 4, expected: '+1 more' },
				{ total: 10, truncateAt: 3, expected: '+7 more' },
			];

			testCases.forEach(({ total, truncateAt, expected }) => {
				const tags = Array.from({ length: total }, (_, i) => ({
					id: `${i + 1}`,
					name: `Tag ${i + 1}`,
				}));

				const { container } = render(N8nTags, {
					props: {
						tags,
						truncate: true,
						truncateAt,
					},
				});

				const showMoreLink = container.querySelector('.link-mock');
				expect(showMoreLink).toHaveTextContent(expected);
			});
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty tags array', () => {
			const { container } = render(N8nTags, {
				props: {
					tags: [],
					truncate: true,
				},
			});

			const tags = container.querySelectorAll('.tag-mock');
			expect(tags).toHaveLength(0);

			const showMoreLink = container.querySelector('.link-mock');
			expect(showMoreLink).not.toBeInTheDocument();
		});

		it('should handle single tag', () => {
			const { container } = render(N8nTags, {
				props: {
					tags: [mockTags[0]],
					truncate: true,
					truncateAt: 3,
				},
			});

			const tags = container.querySelectorAll('.tag-mock');
			expect(tags).toHaveLength(1);
			expect(tags[0]).toHaveTextContent('JavaScript');

			const showMoreLink = container.querySelector('.link-mock');
			expect(showMoreLink).not.toBeInTheDocument();
		});

		it('should handle tags with special characters', () => {
			const specialTags: ITag[] = [
				{ id: '1', name: 'C++' },
				{ id: '2', name: 'C#' },
				{ id: '3', name: '.NET' },
				{ id: '4', name: 'React & Redux' },
				{ id: '5', name: 'Vue.js 3.0' },
			];

			const { container } = render(N8nTags, {
				props: {
					tags: specialTags,
					truncate: false,
				},
			});

			const tags = container.querySelectorAll('.tag-mock');
			expect(tags).toHaveLength(5);
			expect(tags[0]).toHaveTextContent('C++');
			expect(tags[1]).toHaveTextContent('C#');
			expect(tags[2]).toHaveTextContent('.NET');
			expect(tags[3]).toHaveTextContent('React & Redux');
			expect(tags[4]).toHaveTextContent('Vue.js 3.0');
		});

		it('should handle very long tag names', () => {
			const longTag: ITag = {
				id: '1',
				name: 'This is a very long tag name that might cause layout issues',
			};

			const { container } = render(N8nTags, {
				props: {
					tags: [longTag],
				},
			});

			const tag = container.querySelector('.tag-mock');
			expect(tag).toHaveTextContent(longTag.name);
		});

		it('should handle truncateAt of 0', () => {
			const { container } = render(N8nTags, {
				props: {
					tags: mockTags,
					truncate: true,
					truncateAt: 0,
				},
			});

			const tags = container.querySelectorAll('.tag-mock');
			expect(tags).toHaveLength(0);

			const showMoreLink = container.querySelector('.link-mock');
			expect(showMoreLink).toBeInTheDocument();
			expect(showMoreLink).toHaveTextContent('+5 more');
		});

		it('should handle negative truncateAt value', () => {
			const { container } = render(N8nTags, {
				props: {
					tags: mockTags,
					truncate: true,
					truncateAt: -1,
				},
			});

			const tags = container.querySelectorAll('.tag-mock');
			expect(tags).toHaveLength(0);

			const showMoreLink = container.querySelector('.link-mock');
			expect(showMoreLink).toBeInTheDocument();
		});
	});

	describe('State Management', () => {
		it('should maintain expanded state after expansion', async () => {
			const { container } = render(N8nTags, {
				props: {
					tags: mockTags,
					truncate: true,
					truncateAt: 2,
				},
			});

			// Initially truncated
			let tags = container.querySelectorAll('.tag-mock');
			expect(tags).toHaveLength(2);

			// Expand
			const showMoreLink = container.querySelector('.link-mock');
			await fireEvent.click(showMoreLink!);

			// Should show all tags
			tags = container.querySelectorAll('.tag-mock');
			expect(tags).toHaveLength(5);

			// Should stay expanded
			const updatedShowMoreLink = container.querySelector('.link-mock');
			expect(updatedShowMoreLink).not.toBeInTheDocument();
		});

		it('should reset expansion state when tags prop changes', async () => {
			const { container, rerender } = render(N8nTags, {
				props: {
					tags: mockTags,
					truncate: true,
					truncateAt: 2,
				},
			});

			// Expand
			const showMoreLink = container.querySelector('.link-mock');
			await fireEvent.click(showMoreLink!);

			// Should show all tags
			let tags = container.querySelectorAll('.tag-mock');
			expect(tags).toHaveLength(5);

			// Change tags prop
			const newTags = [
				{ id: '6', name: 'Python' },
				{ id: '7', name: 'Django' },
				{ id: '8', name: 'Flask' },
				{ id: '9', name: 'FastAPI' },
			];

			await rerender({
				props: {
					tags: newTags,
					truncate: true,
					truncateAt: 2,
				},
			});

			// Should be truncated again with new tags
			tags = container.querySelectorAll('.tag-mock');
			expect(tags).toHaveLength(2);
			expect(tags[0]).toHaveTextContent('Python');
			expect(tags[1]).toHaveTextContent('Django');

			const newShowMoreLink = container.querySelector('.link-mock');
			expect(newShowMoreLink).toBeInTheDocument();
			expect(newShowMoreLink).toHaveTextContent('+2 more');
		});
	});

	describe('Performance', () => {
		it('should handle large numbers of tags efficiently', () => {
			const largeTags: ITag[] = Array.from({ length: 1000 }, (_, i) => ({
				id: `${i + 1}`,
				name: `Tag ${i + 1}`,
			}));

			const { container } = render(N8nTags, {
				props: {
					tags: largeTags,
					truncate: true,
					truncateAt: 5,
				},
			});

			const tags = container.querySelectorAll('.tag-mock');
			expect(tags).toHaveLength(5);

			const showMoreLink = container.querySelector('.link-mock');
			expect(showMoreLink).toHaveTextContent('+995 more');
		});

		it('should handle component unmounting gracefully', () => {
			const { unmount } = render(N8nTags, {
				props: {
					tags: mockTags,
					truncate: true,
				},
			});

			expect(() => {
				unmount();
			}).not.toThrow();
		});
	});

	describe('Accessibility', () => {
		it('should maintain proper semantic structure', () => {
			const { container } = render(N8nTags, {
				props: {
					tags: mockTags.slice(0, 3),
				},
			});

			const tagsContainer = container.querySelector('.n8n-tags');
			expect(tagsContainer?.tagName).toBe('DIV');

			const tags = container.querySelectorAll('.tag-mock');
			tags.forEach((tag) => {
				expect(tag).toBeInTheDocument();
			});
		});

		it('should make show more button keyboard accessible', () => {
			const { container } = render(N8nTags, {
				props: {
					tags: mockTags,
					truncate: true,
					truncateAt: 2,
				},
			});

			const showMoreLink = container.querySelector('.link-mock');
			expect(showMoreLink?.tagName).toBe('BUTTON');
		});
	});
});
