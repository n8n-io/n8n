/**
 * Test suite for testUtils utility functions
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { removeDynamicAttributes } from '../testUtils';

describe('testUtils', () => {
	describe('removeDynamicAttributes', () => {
		let container: HTMLElement;

		beforeEach(() => {
			container = document.createElement('div');
			document.body.appendChild(container);
		});

		afterEach(() => {
			document.body.removeChild(container);
		});

		it('should remove aria-controls attributes', () => {
			container.innerHTML = '<div aria-controls="dynamic-123">Content</div>';
			const element = container.querySelector('[aria-controls]')!;

			expect(element.hasAttribute('aria-controls')).toBe(true);

			removeDynamicAttributes(container);

			expect(element.hasAttribute('aria-controls')).toBe(false);
		});

		it('should remove aria-controls from multiple elements', () => {
			container.innerHTML = `
				<div aria-controls="dynamic-123">First</div>
				<span aria-controls="dynamic-456">Second</span>
				<button aria-controls="dynamic-789">Third</button>
			`;

			const elements = container.querySelectorAll('[aria-controls]');
			expect(elements).toHaveLength(3);

			elements.forEach((el) => {
				expect(el.hasAttribute('aria-controls')).toBe(true);
			});

			removeDynamicAttributes(container);

			elements.forEach((el) => {
				expect(el.hasAttribute('aria-controls')).toBe(false);
			});
		});

		it('should preserve non-dynamic attributes', () => {
			container.innerHTML = `
				<div 
					aria-controls="dynamic-123" 
					id="static-id" 
					class="static-class"
					data-test-id="static-test"
				>
					Content
				</div>
			`;

			const element = container.querySelector('div')!;

			removeDynamicAttributes(container);

			expect(element.hasAttribute('aria-controls')).toBe(false);
			expect(element.hasAttribute('id')).toBe(true);
			expect(element.hasAttribute('class')).toBe(true);
			expect(element.hasAttribute('data-test-id')).toBe(true);
			expect(element.getAttribute('id')).toBe('static-id');
			expect(element.getAttribute('class')).toBe('static-class');
			expect(element.getAttribute('data-test-id')).toBe('static-test');
		});

		it('should handle nested elements with dynamic attributes', () => {
			container.innerHTML = `
				<div>
					<div aria-controls="outer-123">
						<span aria-controls="inner-456">Nested content</span>
					</div>
				</div>
			`;

			const outerElement = container.querySelector('[aria-controls="outer-123"]')!;
			const innerElement = container.querySelector('[aria-controls="inner-456"]')!;

			// Verify elements exist and have attributes before removal
			expect(outerElement).toBeDefined();
			expect(innerElement).toBeDefined();
			expect(outerElement.hasAttribute('aria-controls')).toBe(true);
			expect(innerElement.hasAttribute('aria-controls')).toBe(true);

			removeDynamicAttributes(container);

			expect(outerElement.hasAttribute('aria-controls')).toBe(false);
			expect(innerElement.hasAttribute('aria-controls')).toBe(false);
		});

		it('should handle empty containers', () => {
			container.innerHTML = '';

			expect(() => {
				removeDynamicAttributes(container);
			}).not.toThrow();
		});

		it('should handle containers with no dynamic attributes', () => {
			container.innerHTML = `
				<div id="static">
					<span class="static">Static content</span>
				</div>
			`;

			const staticDiv = container.querySelector('#static')!;
			const staticSpan = container.querySelector('.static')!;

			removeDynamicAttributes(container);

			expect(staticDiv.hasAttribute('id')).toBe(true);
			expect(staticSpan.hasAttribute('class')).toBe(true);
		});

		it('should handle elements with multiple aria-controls attributes', () => {
			// HTML doesn't normally allow multiple identical attributes, but test edge case
			const element = document.createElement('div');
			element.setAttribute('aria-controls', 'first-value');
			container.appendChild(element);

			removeDynamicAttributes(container);

			expect(element.hasAttribute('aria-controls')).toBe(false);
		});

		it('should handle very large DOM trees efficiently', () => {
			// Create a large DOM structure
			const createNestedElements = (depth: number): string => {
				if (depth === 0) return '<span aria-controls="leaf">Leaf</span>';
				return `<div aria-controls="level-${depth}">${createNestedElements(depth - 1)}</div>`;
			};

			container.innerHTML = createNestedElements(10);

			const elementsWithAria = container.querySelectorAll('[aria-controls]');
			expect(elementsWithAria).toHaveLength(11); // 10 divs + 1 span

			removeDynamicAttributes(container);

			const remainingElementsWithAria = container.querySelectorAll('[aria-controls]');
			expect(remainingElementsWithAria).toHaveLength(0);
		});

		it('should handle mixed content with dynamic and static attributes', () => {
			container.innerHTML = `
				<div aria-controls="dyn-1" id="static-1">
					<button aria-controls="dyn-2" class="btn" data-test="test">Button</button>
					<input aria-controls="dyn-3" type="text" name="input">
					<span class="no-dynamic">No dynamic attrs</span>
				</div>
			`;

			removeDynamicAttributes(container);

			const div = container.querySelector('#static-1')!;
			const button = container.querySelector('.btn')!;
			const input = container.querySelector('input')!;
			const span = container.querySelector('.no-dynamic')!;

			// aria-controls should be removed
			expect(div.hasAttribute('aria-controls')).toBe(false);
			expect(button.hasAttribute('aria-controls')).toBe(false);
			expect(input.hasAttribute('aria-controls')).toBe(false);

			// Static attributes should remain
			expect(div.hasAttribute('id')).toBe(true);
			expect(button.hasAttribute('class')).toBe(true);
			expect(button.hasAttribute('data-test')).toBe(true);
			expect(input.hasAttribute('type')).toBe(true);
			expect(input.hasAttribute('name')).toBe(true);
			expect(span.hasAttribute('class')).toBe(true);
		});
	});
});
