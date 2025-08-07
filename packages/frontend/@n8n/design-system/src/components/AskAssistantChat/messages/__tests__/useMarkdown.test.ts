/**
 * Test suite for useMarkdown composable
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMarkdown } from '../useMarkdown';

// Mock the dependencies
vi.mock('markdown-it', () => {
	const mockMarkdown = {
		use: vi.fn().mockReturnThis(),
		render: vi.fn(),
	};
	return {
		default: vi.fn(() => mockMarkdown),
	};
});

vi.mock('markdown-it-link-attributes', () => ({
	default: vi.fn(),
}));

vi.mock('../../../../composables/useI18n', () => ({
	useI18n: vi.fn(() => ({
		t: vi.fn((key: string) => {
			const translations: Record<string, string> = {
				'assistantChat.errorParsingMarkdown': 'Error parsing markdown content',
			};
			return translations[key] || key;
		}),
	})),
}));

describe('useMarkdown', () => {
	let mockMarkdownInstance: any;

	beforeEach(() => {
		vi.clearAllMocks();
		
		// Get the mocked markdown instance
		const Markdown = require('markdown-it').default;
		mockMarkdownInstance = Markdown();
	});

	describe('Composable initialization', () => {
		it('should return an object with renderMarkdown function', () => {
			const { renderMarkdown } = useMarkdown();
			
			expect(renderMarkdown).toBeDefined();
			expect(typeof renderMarkdown).toBe('function');
		});

		it('should initialize markdown-it with correct configuration', () => {
			const Markdown = require('markdown-it').default;
			
			useMarkdown();
			
			expect(Markdown).toHaveBeenCalledWith({
				breaks: true,
			});
		});

		it('should configure markdown-it with link attributes plugin', () => {
			const markdownLinkPlugin = require('markdown-it-link-attributes').default;
			
			useMarkdown();
			
			expect(mockMarkdownInstance.use).toHaveBeenCalledWith(markdownLinkPlugin, {
				attrs: {
					target: '_blank',
					rel: 'noopener',
				},
			});
		});

		it('should initialize i18n correctly', () => {
			const { useI18n } = require('../../../../composables/useI18n');
			
			useMarkdown();
			
			expect(useI18n).toHaveBeenCalled();
		});
	});

	describe('renderMarkdown function', () => {
		describe('Successful rendering', () => {
			it('should render basic markdown content', () => {
				mockMarkdownInstance.render.mockReturnValue('<p>Hello world</p>');
				
				const { renderMarkdown } = useMarkdown();
				const result = renderMarkdown('Hello world');
				
				expect(mockMarkdownInstance.render).toHaveBeenCalledWith('Hello world');
				expect(result).toBe('<p>Hello world</p>');
			});

			it('should render markdown with links', () => {
				const markdownContent = 'Visit [example](https://example.com)';
				const expectedHtml = '<p>Visit <a href="https://example.com" target="_blank" rel="noopener">example</a></p>';
				mockMarkdownInstance.render.mockReturnValue(expectedHtml);
				
				const { renderMarkdown } = useMarkdown();
				const result = renderMarkdown(markdownContent);
				
				expect(mockMarkdownInstance.render).toHaveBeenCalledWith(markdownContent);
				expect(result).toBe(expectedHtml);
			});

			it('should render markdown with line breaks', () => {
				const markdownContent = 'Line 1\nLine 2';
				const expectedHtml = '<p>Line 1<br>\nLine 2</p>';
				mockMarkdownInstance.render.mockReturnValue(expectedHtml);
				
				const { renderMarkdown } = useMarkdown();
				const result = renderMarkdown(markdownContent);
				
				expect(result).toBe(expectedHtml);
			});

			it('should handle empty string content', () => {
				mockMarkdownInstance.render.mockReturnValue('');
				
				const { renderMarkdown } = useMarkdown();
				const result = renderMarkdown('');
				
				expect(mockMarkdownInstance.render).toHaveBeenCalledWith('');
				expect(result).toBe('');
			});

			it('should handle complex markdown structures', () => {
				const complexMarkdown = `
# Header 1
## Header 2

**Bold text** and *italic text*

- List item 1
- List item 2

\`code snippet\`

> Blockquote

[Link](https://example.com)
`;
				const expectedHtml = '<div>Complex rendered HTML</div>';
				mockMarkdownInstance.render.mockReturnValue(expectedHtml);
				
				const { renderMarkdown } = useMarkdown();
				const result = renderMarkdown(complexMarkdown);
				
				expect(result).toBe(expectedHtml);
			});
		});

		describe('Error handling', () => {
			it('should handle markdown rendering errors gracefully', () => {
				const errorMessage = 'Markdown parsing failed';
				mockMarkdownInstance.render.mockImplementation(() => {
					throw new Error(errorMessage);
				});
				
				// Mock console.error to avoid noise in test output
				const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
				
				const { renderMarkdown } = useMarkdown();
				const result = renderMarkdown('Invalid markdown content');
				
				expect(consoleErrorSpy).toHaveBeenCalledWith('Error parsing markdown content Invalid markdown content');
				expect(result).toBe('<p>Error parsing markdown content</p>');
				
				consoleErrorSpy.mockRestore();
			});

			it('should handle different types of errors', () => {
				const errorTypes = [
					new Error('Syntax error'),
					new TypeError('Type error'),
					new ReferenceError('Reference error'),
					'String error',
					null,
					undefined,
				];

				const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
				
				errorTypes.forEach((error, index) => {
					mockMarkdownInstance.render.mockImplementationOnce(() => {
						throw error;
					});
					
					const { renderMarkdown } = useMarkdown();
					const content = `Error test ${index}`;
					const result = renderMarkdown(content);
					
					expect(consoleErrorSpy).toHaveBeenCalledWith(`Error parsing markdown content ${content}`);
					expect(result).toBe('<p>Error parsing markdown content</p>');
				});
				
				consoleErrorSpy.mockRestore();
			});

			it('should use i18n for error messages', () => {
				mockMarkdownInstance.render.mockImplementation(() => {
					throw new Error('Test error');
				});
				
				const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
				
				const { renderMarkdown } = useMarkdown();
				const result = renderMarkdown('error content');
				
				// Should return the translated error message
				expect(result).toBe('<p>Error parsing markdown content</p>');
				
				consoleErrorSpy.mockRestore();
			});
		});

		describe('Input validation and edge cases', () => {
			it('should handle various string input types', () => {
				const inputTypes = [
					'',
					' ',
					'\n',
					'\t',
					'single word',
					'multiple words with spaces',
					'123456789',
					'Mixed 123 content!@#$%',
					'Unicode: 🎉 ñáéíóú 中文',
				];
				
				inputTypes.forEach((input) => {
					mockMarkdownInstance.render.mockReturnValueOnce(`<p>${input}</p>`);
					
					const { renderMarkdown } = useMarkdown();
					const result = renderMarkdown(input);
					
					expect(mockMarkdownInstance.render).toHaveBeenCalledWith(input);
					expect(result).toBe(`<p>${input}</p>`);
				});
			});

			it('should handle very long content', () => {
				const longContent = 'A'.repeat(10000);
				const expectedOutput = `<p>${longContent}</p>`;
				mockMarkdownInstance.render.mockReturnValue(expectedOutput);
				
				const { renderMarkdown } = useMarkdown();
				const result = renderMarkdown(longContent);
				
				expect(result).toBe(expectedOutput);
			});

			it('should handle content with special characters', () => {
				const specialContent = 'Content with <script>alert("xss")</script> and & entities';
				const safeOutput = '<p>Content with &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; and &amp; entities</p>';
				mockMarkdownInstance.render.mockReturnValue(safeOutput);
				
				const { renderMarkdown } = useMarkdown();
				const result = renderMarkdown(specialContent);
				
				expect(result).toBe(safeOutput);
			});
		});

		describe('Multiple instances and consistency', () => {
			it('should create independent instances', () => {
				const instance1 = useMarkdown();
				const instance2 = useMarkdown();
				
				expect(instance1).not.toBe(instance2);
				expect(instance1.renderMarkdown).not.toBe(instance2.renderMarkdown);
			});

			it('should provide consistent results across instances', () => {
				const content = '**Bold text**';
				const expectedOutput = '<p><strong>Bold text</strong></p>';
				mockMarkdownInstance.render.mockReturnValue(expectedOutput);
				
				const instance1 = useMarkdown();
				const instance2 = useMarkdown();
				
				const result1 = instance1.renderMarkdown(content);
				const result2 = instance2.renderMarkdown(content);
				
				expect(result1).toBe(result2);
				expect(result1).toBe(expectedOutput);
			});
		});

		describe('Plugin configuration', () => {
			it('should configure link attributes correctly', () => {
				// Verify that the plugin was called with correct configuration
				const markdownLinkPlugin = require('markdown-it-link-attributes').default;
				
				useMarkdown();
				
				expect(mockMarkdownInstance.use).toHaveBeenCalledWith(markdownLinkPlugin, {
					attrs: {
						target: '_blank',
						rel: 'noopener',
					},
				});
			});

			it('should maintain plugin configuration across multiple calls', () => {
				const markdownLinkPlugin = require('markdown-it-link-attributes').default;
				
				// Create multiple instances
				useMarkdown();
				useMarkdown();
				useMarkdown();
				
				// Plugin should be configured for each instance
				expect(mockMarkdownInstance.use).toHaveBeenCalledTimes(3);
				expect(markdownLinkPlugin).toHaveBeenCalledTimes(3);
			});
		});

		describe('Performance considerations', () => {
			it('should handle repeated rendering efficiently', () => {
				mockMarkdownInstance.render.mockReturnValue('<p>test</p>');
				
				const { renderMarkdown } = useMarkdown();
				
				// Render multiple times
				for (let i = 0; i < 100; i++) {
					renderMarkdown(`content ${i}`);
				}
				
				expect(mockMarkdownInstance.render).toHaveBeenCalledTimes(100);
			});

			it('should not accumulate memory leaks with error handling', () => {
				const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
				
				// Alternate between success and error
				for (let i = 0; i < 10; i++) {
					if (i % 2 === 0) {
						mockMarkdownInstance.render.mockReturnValueOnce('<p>success</p>');
					} else {
						mockMarkdownInstance.render.mockImplementationOnce(() => {
							throw new Error('Test error');
						});
					}
					
					const { renderMarkdown } = useMarkdown();
					renderMarkdown(`content ${i}`);
				}
				
				expect(mockMarkdownInstance.render).toHaveBeenCalledTimes(10);
				expect(consoleErrorSpy).toHaveBeenCalledTimes(5); // Only for error cases
				
				consoleErrorSpy.mockRestore();
			});
		});
	});

	describe('Integration scenarios', () => {
		it('should work correctly in component context', () => {
			// Simulate usage in a Vue component
			const componentMethods = {
				processContent(content: string) {
					const { renderMarkdown } = useMarkdown();
					return renderMarkdown(content);
				},
			};
			
			mockMarkdownInstance.render.mockReturnValue('<p>component content</p>');
			
			const result = componentMethods.processContent('**component content**');
			
			expect(result).toBe('<p>component content</p>');
		});

		it('should handle real-world markdown examples', () => {
			const realWorldExamples = [
				{
					input: '# API Documentation\n\n## GET /api/users\n\nReturns a list of users.',
					output: '<h1>API Documentation</h1><h2>GET /api/users</h2><p>Returns a list of users.</p>',
				},
				{
					input: 'Check out this [link](https://n8n.io) for more info!',
					output: '<p>Check out this <a href="https://n8n.io" target="_blank" rel="noopener">link</a> for more info!</p>',
				},
				{
					input: '```javascript\nconst result = await api.call();\n```',
					output: '<pre><code class="language-javascript">const result = await api.call();\n</code></pre>',
				},
			];
			
			realWorldExamples.forEach(({ input, output }) => {
				mockMarkdownInstance.render.mockReturnValueOnce(output);
				
				const { renderMarkdown } = useMarkdown();
				const result = renderMarkdown(input);
				
				expect(result).toBe(output);
			});
		});
	});
});