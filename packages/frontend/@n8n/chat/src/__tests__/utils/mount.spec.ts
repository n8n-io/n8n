import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { createDefaultMountingTarget } from '@/utils/mount';

describe('mount utils', () => {
	describe('createDefaultMountingTarget', () => {
		beforeEach(() => {
			// Clean up any existing test elements
			const existingElements = document.querySelectorAll('[id^="test-"], [class*="test-"]');
			existingElements.forEach((el) => el.remove());
		});

		afterEach(() => {
			// Clean up after each test
			const testElements = document.querySelectorAll('[id^="test-"], [class*="test-"]');
			testElements.forEach((el) => el.remove());
		});

		it('should create element with ID when target starts with #', () => {
			const targetId = '#test-chat-container';

			createDefaultMountingTarget(targetId);

			const element = document.querySelector(targetId);
			expect(element).toBeTruthy();
			expect(element?.id).toBe('test-chat-container');
			expect(element?.tagName).toBe('DIV');
		});

		it('should create element with class when target starts with .', () => {
			const targetClass = '.test-chat-widget';

			createDefaultMountingTarget(targetClass);

			const element = document.querySelector(targetClass);
			expect(element).toBeTruthy();
			expect(element?.classList.contains('test-chat-widget')).toBe(true);
			expect(element?.tagName).toBe('DIV');
		});

		it('should append element to document body', () => {
			const targetId = '#test-new-element';
			const initialBodyChildCount = document.body.children.length;

			createDefaultMountingTarget(targetId);

			expect(document.body.children.length).toBe(initialBodyChildCount + 1);
			const element = document.querySelector(targetId);
			expect(element?.parentElement).toBe(document.body);
		});

		it('should not create element if target already exists', () => {
			const targetId = '#test-existing-element';

			// Create element manually first
			const existingElement = document.createElement('div');
			existingElement.id = 'test-existing-element';
			document.body.appendChild(existingElement);

			const initialBodyChildCount = document.body.children.length;

			createDefaultMountingTarget(targetId);

			// Should not create additional element
			expect(document.body.children.length).toBe(initialBodyChildCount);
			expect(document.querySelectorAll(targetId)).toHaveLength(1);
		});

		it('should handle complex selectors gracefully', () => {
			const targetId = '#test-complex-123';

			createDefaultMountingTarget(targetId);

			const element = document.querySelector(targetId);
			expect(element).toBeTruthy();
			expect(element?.id).toBe('test-complex-123');
		});

		it('should handle class selectors with special characters', () => {
			const targetClass = '.test-chat-widget-v2';

			createDefaultMountingTarget(targetClass);

			const element = document.querySelector(targetClass);
			expect(element).toBeTruthy();
			expect(element?.classList.contains('test-chat-widget-v2')).toBe(true);
		});
	});
});
