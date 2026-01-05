import { prompt, PromptBuilder } from './prompt-builder';

describe('PromptBuilder', () => {
	describe('section()', () => {
		it('should add a section with XML tags by default', () => {
			const result = prompt().section('ROLE', 'You are an assistant').build();

			expect(result).toBe('<role>\nYou are an assistant\n</role>');
		});

		it('should support multiple sections', () => {
			const result = prompt()
				.section('ROLE', 'You are an assistant')
				.section('RULES', 'Follow these rules')
				.build();

			expect(result).toContain('<role>');
			expect(result).toContain('<rules>');
		});

		it('should support custom tag names', () => {
			const result = prompt().section('My Section', 'content', { tag: 'custom_tag' }).build();

			expect(result).toBe('<custom_tag>\ncontent\n</custom_tag>');
		});

		it('should support factory functions for lazy evaluation', () => {
			const factory = jest.fn(() => 'lazy content');
			const result = prompt().section('LAZY', factory).build();

			expect(factory).toHaveBeenCalledTimes(1);
			expect(result).toContain('lazy content');
		});

		it('should call factory only once during build', () => {
			const factory = jest.fn(() => 'content');
			const builder = prompt().section('TEST', factory);

			builder.build();
			builder.build();

			// Each build() call should evaluate the factory
			expect(factory).toHaveBeenCalledTimes(2);
		});
	});

	describe('sectionIf()', () => {
		it('should include section when condition is truthy', () => {
			const result = prompt().sectionIf(true, 'CONDITIONAL', 'included').build();

			expect(result).toContain('included');
		});

		it('should exclude section when condition is falsy', () => {
			const result = prompt().sectionIf(false, 'CONDITIONAL', 'excluded').build();

			expect(result).not.toContain('excluded');
			expect(result).toBe('');
		});

		it('should not call factory when condition is falsy', () => {
			const factory = jest.fn(() => 'never called');
			prompt().sectionIf(false, 'LAZY', factory).build();

			expect(factory).not.toHaveBeenCalled();
		});

		it('should call factory when condition is truthy', () => {
			const factory = jest.fn(() => 'called');
			const result = prompt().sectionIf(true, 'LAZY', factory).build();

			expect(factory).toHaveBeenCalledTimes(1);
			expect(result).toContain('called');
		});

		it('should handle null conditions as falsy', () => {
			const result = prompt().sectionIf(null, 'A', 'a').build();

			expect(result).toBe('');
		});

		it('should handle undefined conditions as falsy', () => {
			const result = prompt().sectionIf(undefined, 'B', 'b').build();

			expect(result).toBe('');
		});

		it('should handle empty string as falsy', () => {
			const result = prompt().sectionIf('', 'EMPTY', 'content').build();

			expect(result).toBe('');
		});

		it('should handle zero as falsy', () => {
			const result = prompt().sectionIf(0, 'ZERO', 'content').build();

			expect(result).toBe('');
		});

		it('should handle objects as truthy', () => {
			const result = prompt().sectionIf({}, 'OBJECT', 'object-content').build();

			expect(result).toContain('object-content');
		});

		it('should handle arrays as truthy', () => {
			const result = prompt().sectionIf([], 'ARRAY', 'array-content').build();

			expect(result).toContain('array-content');
		});

		it('should handle non-empty string as truthy', () => {
			const result = prompt().sectionIf('yes', 'STRING', 'string-content').build();

			expect(result).toContain('string-content');
		});

		it('should handle positive numbers as truthy', () => {
			const result = prompt().sectionIf(42, 'NUMBER', 'number-content').build();

			expect(result).toContain('number-content');
		});
	});

	describe('format options', () => {
		it('should use markdown headers when format is "markdown"', () => {
			const result = prompt({ format: 'markdown' }).section('MY SECTION', 'content').build();

			expect(result).toBe('## MY SECTION\ncontent');
		});

		it('should preserve section name case in markdown format', () => {
			const result = prompt({ format: 'markdown' }).section('Critical Rules', 'rules here').build();

			expect(result).toBe('## Critical Rules\nrules here');
		});

		it('should use custom separator', () => {
			const result = prompt({ separator: '\n---\n' })
				.section('A', 'first')
				.section('B', 'second')
				.build();

			expect(result).toContain('\n---\n');
		});

		it('should use default separator of double newline', () => {
			const result = prompt().section('A', 'first').section('B', 'second').build();

			expect(result).toContain('</a>\n\n<b>');
		});
	});

	describe('examples()', () => {
		interface Example {
			input: string;
			output: string;
		}

		it('should format examples using provided formatter', () => {
			const examples: Example[] = [
				{ input: 'hello', output: 'world' },
				{ input: 'foo', output: 'bar' },
			];

			const result = prompt()
				.examples('EXAMPLES', examples, (ex) => `${ex.input} → ${ex.output}`)
				.build();

			expect(result).toContain('hello → world');
			expect(result).toContain('foo → bar');
		});

		it('should use default formatter for strings', () => {
			const result = prompt().examples('EXAMPLES', ['one', 'two', 'three']).build();

			expect(result).toContain('one\n\ntwo\n\nthree');
		});

		it('should use default formatter for objects with content property', () => {
			const examples = [{ content: 'first' }, { content: 'second' }];

			const result = prompt().examples('EXAMPLES', examples).build();

			expect(result).toContain('first');
			expect(result).toContain('second');
		});

		it('should wrap examples in section tags', () => {
			const result = prompt()
				.examples('TEST EXAMPLES', [{ a: 1 }], (ex) => String(ex.a))
				.build();

			expect(result).toContain('<test_examples>');
			expect(result).toContain('</test_examples>');
		});

		it('should join multiple examples with double newlines', () => {
			const examples = [{ v: 'one' }, { v: 'two' }, { v: 'three' }];

			const result = prompt()
				.examples('LIST', examples, (ex) => ex.v)
				.build();

			expect(result).toContain('one\n\ntwo\n\nthree');
		});

		it('should support custom tag for examples', () => {
			const result = prompt()
				.examples('Examples', [{ x: 1 }], (ex) => String(ex.x), { tag: 'my_examples' })
				.build();

			expect(result).toContain('<my_examples>');
		});
	});

	describe('examplesIf()', () => {
		it('should include examples when condition is truthy', () => {
			const result = prompt()
				.examplesIf(true, 'EXAMPLES', [{ a: 1 }], (ex) => String(ex.a))
				.build();

			expect(result).toContain('1');
		});

		it('should exclude examples when condition is falsy', () => {
			const result = prompt()
				.examplesIf(false, 'EXAMPLES', [{ a: 1 }], (ex) => String(ex.a))
				.build();

			expect(result).toBe('');
		});

		it('should not call formatter when condition is falsy', () => {
			const formatter = jest.fn((ex: { a: number }) => String(ex.a));
			prompt()
				.examplesIf(false, 'EXAMPLES', [{ a: 1 }], formatter)
				.build();

			expect(formatter).not.toHaveBeenCalled();
		});

		it('should use default formatter when not provided', () => {
			const examples = [{ content: 'example 1' }, { content: 'example 2' }];

			const result = prompt().examplesIf(true, 'EXAMPLES', examples).build();

			expect(result).toContain('example 1');
			expect(result).toContain('example 2');
		});

		it('should use default formatter with strings', () => {
			const result = prompt().examplesIf(true, 'EXAMPLES', ['one', 'two']).build();

			expect(result).toContain('one\n\ntwo');
		});
	});

	describe('withExamples()', () => {
		it('should append examples to the last section with XML tags', () => {
			const result = prompt()
				.section('RULES', 'Follow these rules')
				.withExamples(['example 1', 'example 2'])
				.build();

			expect(result).toContain('Follow these rules');
			expect(result).toContain('<examples>');
			expect(result).toContain('</examples>');
			expect(result).toContain('example 1');
			expect(result).toContain('example 2');
		});

		it('should use markdown format when builder is in markdown mode', () => {
			const result = prompt({ format: 'markdown' })
				.section('RULES', 'Follow these rules')
				.withExamples(['example 1'])
				.build();

			expect(result).toContain('## Examples');
			expect(result).not.toContain('<examples>');
		});

		it('should use default formatter for strings', () => {
			const result = prompt()
				.section('TEST', 'content')
				.withExamples(['one', 'two', 'three'])
				.build();

			expect(result).toContain('one\n\ntwo\n\nthree');
		});

		it('should use default formatter for objects with content property', () => {
			const examples = [{ content: 'first example' }, { content: 'second example' }];

			const result = prompt().section('TEST', 'content').withExamples(examples).build();

			expect(result).toContain('first example');
			expect(result).toContain('second example');
		});

		it('should use custom formatter when provided', () => {
			const examples = [
				{ input: 'hello', output: 'world' },
				{ input: 'foo', output: 'bar' },
			];

			const result = prompt()
				.section('TEST', 'content')
				.withExamples(examples, (ex) => `${ex.input} → ${ex.output}`)
				.build();

			expect(result).toContain('hello → world');
			expect(result).toContain('foo → bar');
		});

		it('should throw error when called without a preceding section', () => {
			expect(() => {
				prompt().withExamples(['example']);
			}).toThrow('withExamples() must be called after section()');
		});

		it('should not modify section when examples array is empty', () => {
			const result = prompt().section('TEST', 'content').withExamples([]).build();

			expect(result).toContain('content');
			expect(result).not.toContain('<examples>');
		});

		it('should work with factory function content', () => {
			const result = prompt()
				.section('DYNAMIC', () => 'dynamic content')
				.withExamples(['example'])
				.build();

			expect(result).toContain('dynamic content');
			expect(result).toContain('<examples>');
			expect(result).toContain('example');
		});

		it('should skip section if factory returns null', () => {
			const result = prompt()
				.section('NULLABLE', () => null)
				.withExamples(['example'])
				.build();

			expect(result).toBe('');
		});

		it('should allow chaining after withExamples', () => {
			const result = prompt()
				.section('A', 'first')
				.withExamples(['ex1'])
				.section('B', 'second')
				.build();

			expect(result).toContain('first');
			expect(result).toContain('ex1');
			expect(result).toContain('second');
		});

		it('should only modify the last section', () => {
			const result = prompt()
				.section('A', 'first')
				.section('B', 'second')
				.withExamples(['example for B'])
				.build();

			// Examples should only be in section B
			const aSection = result.substring(0, result.indexOf('</a>'));
			const bSection = result.substring(result.indexOf('<b>'));

			expect(aSection).not.toContain('example for B');
			expect(bSection).toContain('example for B');
		});

		it('should throw error for objects without content property when no formatter provided', () => {
			const invalidExamples = [{ name: 'test' }];

			expect(() => {
				prompt().section('TEST', 'content').withExamples(invalidExamples).build();
			}).toThrow('Example must be a string or have a content property');
		});
	});

	describe('merge()', () => {
		it('should combine sections from another builder', () => {
			const base = prompt().section('A', 'first');
			const extra = prompt().section('B', 'second');

			const result = prompt().merge(base).merge(extra).build();

			expect(result).toContain('<a>');
			expect(result).toContain('<b>');
		});

		it('should preserve order of merged sections', () => {
			const base = prompt().section('A', 'first');
			const extra = prompt().section('B', 'second');

			const result = prompt().merge(base).section('MIDDLE', 'middle').merge(extra).build();

			const aIndex = result.indexOf('first');
			const middleIndex = result.indexOf('middle');
			const bIndex = result.indexOf('second');

			expect(aIndex).toBeLessThan(middleIndex);
			expect(middleIndex).toBeLessThan(bIndex);
		});

		it('should handle merging empty builder', () => {
			const empty = prompt();
			const result = prompt().section('A', 'content').merge(empty).build();

			expect(result).toContain('content');
		});
	});

	describe('buildAsMessageBlocks()', () => {
		it('should return array of message blocks', () => {
			const blocks = prompt().section('A', 'content').buildAsMessageBlocks();

			expect(blocks).toHaveLength(1);
			expect(blocks[0]).toEqual({
				type: 'text',
				text: expect.stringContaining('content'),
			});
		});

		it('should add cache_control when cache option is true', () => {
			const blocks = prompt()
				.section('CACHED', 'cached content', { cache: true })
				.buildAsMessageBlocks();

			expect(blocks[0]).toEqual({
				type: 'text',
				text: expect.any(String),
				cache_control: { type: 'ephemeral' },
			});
		});

		it('should not add cache_control when cache option is false or undefined', () => {
			const blocks = prompt()
				.section('NOT_CACHED', 'content', { cache: false })
				.section('DEFAULT', 'content')
				.buildAsMessageBlocks();

			expect(blocks[0]).not.toHaveProperty('cache_control');
			expect(blocks[1]).not.toHaveProperty('cache_control');
		});

		it('should create separate blocks for each section', () => {
			const blocks = prompt()
				.section('A', 'first')
				.section('B', 'second', { cache: true })
				.buildAsMessageBlocks();

			expect(blocks).toHaveLength(2);
			expect(blocks[0]).not.toHaveProperty('cache_control');
			expect(blocks[1]).toHaveProperty('cache_control');
		});
	});

	describe('estimateTokens()', () => {
		it('should estimate tokens based on content length (~4 chars per token)', () => {
			const content = 'a'.repeat(400);
			const tokens = prompt().section('TEST', content).estimateTokens();

			// 400 chars + tag overhead (~30 chars) ≈ 107-115 tokens
			expect(tokens).toBeGreaterThanOrEqual(100);
			expect(tokens).toBeLessThanOrEqual(150);
		});

		it('should return 0 for empty builder', () => {
			const tokens = prompt().estimateTokens();

			expect(tokens).toBe(0);
		});

		it('should include all sections in estimate', () => {
			const content = 'a'.repeat(100);
			const singleTokens = prompt().section('A', content).estimateTokens();
			const doubleTokens = prompt().section('A', content).section('B', content).estimateTokens();

			expect(doubleTokens).toBeGreaterThan(singleTokens);
		});
	});

	describe('edge cases', () => {
		it('should handle empty builder', () => {
			const result = prompt().build();
			expect(result).toBe('');
		});

		it('should handle factory returning null', () => {
			const result = prompt()
				.section('NULLABLE', () => null)
				.build();

			expect(result).toBe('');
		});

		it('should handle factory returning undefined', () => {
			const result = prompt()
				.section('UNDEFINED', () => undefined)
				.build();

			expect(result).toBe('');
		});

		it('should handle factory returning empty string', () => {
			const result = prompt()
				.section('EMPTY', () => '')
				.build();

			expect(result).toBe('');
		});

		it('should normalize section names to lowercase tags with underscores', () => {
			const result = prompt().section('MY SECTION NAME', 'content').build();

			expect(result).toContain('<my_section_name>');
		});

		it('should handle special characters in section names', () => {
			const result = prompt().section('Test (Beta) - v1.0', 'content').build();

			// Should sanitize to valid XML tag
			expect(result).toMatch(/<[a-z0-9_]+>/);
		});

		it('should handle multiline content', () => {
			const content = 'line 1\nline 2\nline 3';
			const result = prompt().section('MULTI', content).build();

			expect(result).toContain('line 1\nline 2\nline 3');
		});

		it('should be immutable - building does not modify internal state', () => {
			const builder = prompt().section('A', 'first');
			const result1 = builder.build();
			const result2 = builder.build();

			expect(result1).toBe(result2);
		});

		it('should handle very long content', () => {
			const longContent = 'x'.repeat(10000);
			const result = prompt().section('LONG', longContent).build();

			expect(result).toContain(longContent);
		});
	});

	describe('chaining', () => {
		it('should support fluent chaining of all methods', () => {
			const other = prompt().section('OTHER', 'other');

			const result = prompt()
				.section('A', 'a')
				.sectionIf(true, 'B', 'b')
				.examples('C', [{ x: 1 }], (e) => String(e.x))
				.examplesIf(true, 'D', [{ y: 2 }], (e) => String(e.y))
				.merge(other)
				.build();

			expect(result).toContain('a');
			expect(result).toContain('b');
			expect(result).toContain('1');
			expect(result).toContain('2');
			expect(result).toContain('other');
		});

		it('should return the same builder instance for chaining', () => {
			const builder = prompt();
			const afterSection = builder.section('A', 'a');
			const afterSectionIf = afterSection.sectionIf(true, 'B', 'b');

			expect(afterSection).toBe(builder);
			expect(afterSectionIf).toBe(builder);
		});
	});

	describe('PromptBuilder class export', () => {
		it('should export PromptBuilder class for type checking', () => {
			const builder = prompt();
			expect(builder).toBeInstanceOf(PromptBuilder);
		});

		it('should allow direct instantiation via new PromptBuilder()', () => {
			const builder = new PromptBuilder();
			const result = builder.section('TEST', 'content').build();

			expect(result).toContain('content');
		});

		it('should allow options in direct instantiation', () => {
			const builder = new PromptBuilder({ format: 'markdown' });
			const result = builder.section('TEST', 'content').build();

			expect(result).toBe('## TEST\ncontent');
		});
	});
});
