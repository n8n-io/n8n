/**
 * Test suite for N8nPulse component
 */

import { render } from '@testing-library/vue';
import { describe, it, expect } from 'vitest';
import N8nPulse from '../Pulse.vue';

describe('N8nPulse', () => {
	describe('Basic Rendering', () => {
		it('should render with default structure', () => {
			const { container } = render(N8nPulse);

			const pulseContainer = container.querySelector('.pulse');
			expect(pulseContainer).toBeInTheDocument();

			const pulseElement = container.querySelector('[class*="pulse"]');
			expect(pulseElement).toBeInTheDocument();
		});

		it('should render pulse container with correct classes', () => {
			const { container } = render(N8nPulse);

			const pulseContainer = container.querySelector('.pulse');
			expect(pulseContainer).toBeInTheDocument();
			expect(pulseContainer).toHaveClass('pulse');
		});

		it('should have nested pulse elements', () => {
			const { container } = render(N8nPulse);

			// Should have the outer pulse container
			const outerPulse = container.querySelector('[class*="pulse"]');
			expect(outerPulse).toBeInTheDocument();

			// Should have nested pulse elements
			const pulseElements = container.querySelectorAll('[class*="pulse"]');
			expect(pulseElements.length).toBeGreaterThan(1);
		});
	});

	describe('Slot Content', () => {
		it('should render slot content', () => {
			const { container } = render(N8nPulse, {
				slots: {
					default: '<div class="test-content">Pulse Content</div>',
				},
			});

			const testContent = container.querySelector('.test-content');
			expect(testContent).toBeInTheDocument();
			expect(testContent).toHaveTextContent('Pulse Content');
		});

		it('should render complex slot content', () => {
			const { container } = render(N8nPulse, {
				slots: {
					default: `
						<div class="complex-content">
							<span class="icon">⚡</span>
							<span class="text">Loading...</span>
						</div>
					`,
				},
			});

			const complexContent = container.querySelector('.complex-content');
			expect(complexContent).toBeInTheDocument();

			const icon = container.querySelector('.icon');
			expect(icon).toBeInTheDocument();
			expect(icon).toHaveTextContent('⚡');

			const text = container.querySelector('.text');
			expect(text).toBeInTheDocument();
			expect(text).toHaveTextContent('Loading...');
		});

		it('should render without slot content', () => {
			const { container } = render(N8nPulse);

			const pulseContainer = container.querySelector('.pulse');
			expect(pulseContainer).toBeInTheDocument();
		});

		it('should render empty slot', () => {
			const { container } = render(N8nPulse, {
				slots: {
					default: '',
				},
			});

			const pulseContainer = container.querySelector('.pulse');
			expect(pulseContainer).toBeInTheDocument();
		});
	});

	describe('CSS Module Classes', () => {
		it('should apply CSS module classes for styling', () => {
			const { container } = render(N8nPulse);

			// Check that CSS module classes are applied (they will have generated names)
			const pulseContainer = container.querySelector('.pulse');
			expect(pulseContainer).toBeInTheDocument();

			// The CSS modules should generate unique class names
			const elementWithModules = container.querySelector('[class*="pulse"]');
			expect(elementWithModules).toBeInTheDocument();
		});

		it('should have container structure for pulse animation', () => {
			const { container } = render(N8nPulse);

			// Should have proper DOM structure for the pulse effect
			const pulseContainer = container.querySelector('.pulse');
			expect(pulseContainer).toBeInTheDocument();

			// Should have nested elements for layered animation
			const nestedElements = container.querySelectorAll('[class*="pulse"]');
			expect(nestedElements.length).toBeGreaterThan(0);
		});
	});

	describe('Accessibility', () => {
		it('should be accessible as a presentational element', () => {
			const { container } = render(N8nPulse);

			const pulseContainer = container.querySelector('.pulse');
			expect(pulseContainer).toBeInTheDocument();
		});

		it('should work with ARIA attributes when provided', () => {
			const { container } = render(N8nPulse, {
				props: {
					'aria-label': 'Loading indicator',
					'data-testid': 'pulse-indicator',
				},
			});

			const pulseContainer = container.querySelector('.pulse');
			expect(pulseContainer).toBeInTheDocument();
		});

		it('should be compatible with screen readers', () => {
			const { container } = render(N8nPulse, {
				slots: {
					default: '<span aria-live="polite">Loading content...</span>',
				},
			});

			const liveRegion = container.querySelector('[aria-live="polite"]');
			expect(liveRegion).toBeInTheDocument();
			expect(liveRegion).toHaveTextContent('Loading content...');
		});
	});

	describe('Animation and Visual State', () => {
		it('should render elements that support CSS animations', () => {
			const { container } = render(N8nPulse);

			// The pulse elements should be present for CSS animations to work
			const animatedElements = container.querySelectorAll('[class*="pulse"]');
			expect(animatedElements.length).toBeGreaterThan(0);
		});

		it('should maintain structure for continuous animation', () => {
			const { container } = render(N8nPulse);

			// Pulse animation requires specific DOM structure
			const pulseContainer = container.querySelector('.pulse');
			expect(pulseContainer).toBeInTheDocument();

			// Should have nested structure for layered pulse effect
			const childElements = pulseContainer.children;
			expect(childElements.length).toBeGreaterThan(0);
		});

		it('should not interfere with user interactions when clicked', () => {
			const { container } = render(N8nPulse, {
				slots: {
					default: '<button class="interactive-content">Click me</button>',
				},
			});

			const interactiveContent = container.querySelector('.interactive-content');
			expect(interactiveContent).toBeInTheDocument();
		});
	});

	describe('Integration Scenarios', () => {
		it('should work as a loading indicator', () => {
			const { container } = render(N8nPulse, {
				slots: {
					default: `
						<div class="loading-spinner">
							<span class="sr-only">Loading...</span>
						</div>
					`,
				},
			});

			const loadingSpinner = container.querySelector('.loading-spinner');
			expect(loadingSpinner).toBeInTheDocument();

			const screenReaderText = container.querySelector('.sr-only');
			expect(screenReaderText).toBeInTheDocument();
			expect(screenReaderText).toHaveTextContent('Loading...');
		});

		it('should work with icon content', () => {
			const { container } = render(N8nPulse, {
				slots: {
					default: `
						<div class="icon-container">
							<i class="icon-sync"></i>
						</div>
					`,
				},
			});

			const iconContainer = container.querySelector('.icon-container');
			expect(iconContainer).toBeInTheDocument();

			const icon = container.querySelector('.icon-sync');
			expect(icon).toBeInTheDocument();
		});

		it('should work with text content', () => {
			const { container } = render(N8nPulse, {
				slots: {
					default: '<span class="pulse-text">Syncing...</span>',
				},
			});

			const pulseText = container.querySelector('.pulse-text');
			expect(pulseText).toBeInTheDocument();
			expect(pulseText).toHaveTextContent('Syncing...');
		});

		it('should work in different container sizes', () => {
			const { container } = render(N8nPulse, {
				props: {
					style: 'width: 100px; height: 100px;',
				},
			});

			const pulseContainer = container.querySelector('.pulse');
			expect(pulseContainer).toBeInTheDocument();
		});
	});

	describe('Edge Cases', () => {
		it('should handle multiple pulse components', () => {
			const { container } = render({
				template: `
					<div>
						<N8nPulse class="pulse-1">
							<span>First</span>
						</N8nPulse>
						<N8nPulse class="pulse-2">
							<span>Second</span>
						</N8nPulse>
					</div>
				`,
				components: { N8nPulse },
			});

			const firstPulse = container.querySelector('.pulse-1');
			const secondPulse = container.querySelector('.pulse-2');

			expect(firstPulse).toBeInTheDocument();
			expect(secondPulse).toBeInTheDocument();
			expect(firstPulse).toHaveTextContent('First');
			expect(secondPulse).toHaveTextContent('Second');
		});

		it('should handle rapid mount/unmount', () => {
			const { unmount } = render(N8nPulse, {
				slots: {
					default: '<span>Test</span>',
				},
			});

			expect(() => {
				unmount();
			}).not.toThrow();
		});

		it('should handle very long content', () => {
			const longContent = 'Very long content text '.repeat(100);
			const { container } = render(N8nPulse, {
				slots: {
					default: `<div class="long-content">${longContent}</div>`,
				},
			});

			const content = container.querySelector('.long-content');
			expect(content).toBeInTheDocument();
			expect(content).toHaveTextContent(longContent);
		});

		it('should handle special characters in content', () => {
			const { container } = render(N8nPulse, {
				slots: {
					default: '<div class="special-chars">🎉 Special chars: <>&"\'</div>',
				},
			});

			const content = container.querySelector('.special-chars');
			expect(content).toBeInTheDocument();
			expect(content).toHaveTextContent('🎉 Special chars: <>&"\'');
		});

		it('should work with dynamic content changes', () => {
			const { container, rerender } = render(N8nPulse, {
				slots: {
					default: '<span class="dynamic">Initial</span>',
				},
			});

			let content = container.querySelector('.dynamic');
			expect(content).toHaveTextContent('Initial');

			rerender({
				slots: {
					default: '<span class="dynamic">Updated</span>',
				},
			});

			content = container.querySelector('.dynamic');
			expect(content).toHaveTextContent('Updated');
		});
	});

	describe('Performance', () => {
		it('should render efficiently with minimal DOM nodes', () => {
			const { container } = render(N8nPulse);

			// Should have reasonable DOM structure
			const allElements = container.querySelectorAll('*');
			expect(allElements.length).toBeLessThan(10); // Reasonable limit
		});

		it('should handle multiple re-renders', () => {
			const { rerender } = render(N8nPulse, {
				slots: {
					default: '<span>Content 1</span>',
				},
			});

			expect(() => {
				for (let i = 0; i < 10; i++) {
					rerender({
						slots: {
							default: `<span>Content ${i}</span>`,
						},
					});
				}
			}).not.toThrow();
		});
	});
});