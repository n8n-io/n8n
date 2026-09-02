/**
 * Unit tests for the AST interpreter.
 */
import type { Mock } from 'vitest';

import {
	InterpreterError,
	SecurityError,
	UnsupportedNodeError,
	UnknownIdentifierError,
	ResourceLimitError,
} from './errors';
import { expr } from '../expression';
import type { SDKFunctions } from './interpreter';
import { interpretSDKCode } from './interpreter';
import { parseSDKCode } from './parser';

/** Helper to get the first call argument from a Vitest mock with proper typing */
function getFirstCallArg<T>(mockFn: Mock): T {
	const calls = mockFn.mock.calls as unknown[][];
	return calls[0][0] as T;
}

// Mock SDK functions for testing
const createMockSDKFunctions = (): SDKFunctions => ({
	workflow: vi.fn((id: string, name: string) => ({
		id,
		name,
		nodes: [] as unknown[],
		add: vi.fn(function (this: { nodes: unknown[] }, node: unknown) {
			this.nodes.push(node);
			return this;
		}),
		then: vi.fn(function (this: { nodes: unknown[] }, node: unknown) {
			this.nodes.push(node);
			return this;
		}),
		toJSON: vi.fn(function (this: { id: string; name: string; nodes: unknown[] }) {
			return { id: this.id, name: this.name, nodes: this.nodes };
		}),
	})),
	node: vi.fn((config: unknown) => ({
		type: 'node',
		config,
		then: vi.fn((target: unknown) => target),
		to: vi.fn((target: unknown) => target),
		input: vi.fn(() => ({ index: 0 })),
		output: vi.fn(() => ({ index: 0 })),
		onError: vi.fn(),
	})),
	trigger: vi.fn((config: unknown) => ({
		type: 'trigger',
		config,
		then: vi.fn((target: unknown) => target),
		to: vi.fn((target: unknown) => target),
	})),
	sticky: vi.fn((content: string, options?: unknown) => ({
		type: 'sticky',
		content,
		options,
	})),
	placeholder: vi.fn((value: string) => `<__PLACEHOLDER_VALUE__${value}__>`),
	newCredential: vi.fn((name: string) => ({ __newCredential: true, name })),
	ifElse: vi.fn(),
	switchCase: vi.fn(),
	merge: vi.fn((config: unknown) => ({ type: 'merge', config, input: vi.fn() })),
	splitInBatches: vi.fn(),
	nextBatch: vi.fn(),
	languageModel: vi.fn((config: unknown) => ({ type: 'languageModel', config })),
	memory: vi.fn((config: unknown) => ({ type: 'memory', config })),
	tool: vi.fn((config: unknown) => ({ type: 'tool', config })),
	outputParser: vi.fn((config: unknown) => ({ type: 'outputParser', config })),
	embedding: vi.fn((config: unknown) => ({ type: 'embedding', config })),
	embeddings: vi.fn((config: unknown) => ({ type: 'embeddings', config })),
	vectorStore: vi.fn((config: unknown) => ({ type: 'vectorStore', config })),
	retriever: vi.fn((config: unknown) => ({ type: 'retriever', config })),
	documentLoader: vi.fn((config: unknown) => ({ type: 'documentLoader', config })),
	textSplitter: vi.fn((config: unknown) => ({ type: 'textSplitter', config })),
	reranker: vi.fn((config: unknown) => ({ type: 'reranker', config })),
	fromAi: vi.fn(
		(key: string, desc?: string) => `={{ $fromAI('${key}'${desc ? `, '${desc}'` : ''}) }}`,
	),
	nodeJson: vi.fn((node: { name: string } | string, path: string) => {
		const name = typeof node === 'string' ? node : node.name;
		return `={{ $('${name}').item.json.${path} }}`;
	}),
});

describe('AST Interpreter', () => {
	describe('parseSDKCode', () => {
		it('should parse simple code', () => {
			const code = 'const x = 1; export default x;';
			const ast = parseSDKCode(code);
			expect(ast.type).toBe('Program');
			expect(ast.body.length).toBe(2);
		});

		it('should throw InterpreterError for syntax errors', () => {
			const code = 'const x = {;'; // Invalid syntax
			expect(() => parseSDKCode(code)).toThrow(InterpreterError);
		});

		it('should include location info in error', () => {
			const code = 'const x = {;';
			try {
				parseSDKCode(code);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(InterpreterError);
				expect((error as InterpreterError).location).toBeDefined();
			}
		});
	});

	describe('interpretSDKCode - basic operations', () => {
		let sdkFunctions: SDKFunctions;

		beforeEach(() => {
			sdkFunctions = createMockSDKFunctions();
		});

		it('should interpret a simple export default statement', () => {
			const code = 'export default 42;';
			const result = interpretSDKCode(code, sdkFunctions);
			expect(result).toBe(42);
		});

		it('should interpret const variable declaration', () => {
			const code = 'const x = 10; export default x;';
			const result = interpretSDKCode(code, sdkFunctions);
			expect(result).toBe(10);
		});

		it('should interpret object literals', () => {
			const code = "export default { a: 1, b: 'hello', c: true };";
			const result = interpretSDKCode(code, sdkFunctions);
			expect(result).toEqual({ a: 1, b: 'hello', c: true });
		});

		it('should interpret array literals', () => {
			const code = 'export default [1, 2, 3];';
			const result = interpretSDKCode(code, sdkFunctions);
			expect(result).toEqual([1, 2, 3]);
		});

		it('should interpret nested objects and arrays', () => {
			const code = "export default { items: [{ name: 'a' }, { name: 'b' }] };";
			const result = interpretSDKCode(code, sdkFunctions);
			expect(result).toEqual({ items: [{ name: 'a' }, { name: 'b' }] });
		});

		it('should interpret template literals', () => {
			const code = 'export default `hello world`;';
			const result = interpretSDKCode(code, sdkFunctions);
			expect(result).toBe('hello world');
		});

		it('should interpret template literals with expressions', () => {
			const code = 'const name = "test"; export default `hello ${name}`;';
			const result = interpretSDKCode(code, sdkFunctions);
			expect(result).toBe('hello test');
		});

		it('should interpret spread operator in arrays', () => {
			const code = 'const arr = [1, 2]; export default [...arr, 3];';
			const result = interpretSDKCode(code, sdkFunctions);
			expect(result).toEqual([1, 2, 3]);
		});

		it('should interpret spread operator in objects', () => {
			const code = 'const obj = { a: 1 }; export default { ...obj, b: 2 };';
			const result = interpretSDKCode(code, sdkFunctions);
			expect(result).toEqual({ a: 1, b: 2 });
		});
	});

	describe('interpretSDKCode - SDK functions', () => {
		let sdkFunctions: SDKFunctions;

		beforeEach(() => {
			sdkFunctions = createMockSDKFunctions();
		});

		it('should call workflow function', () => {
			const code = "export default workflow('id-123', 'My Workflow');";
			const result = interpretSDKCode(code, sdkFunctions) as { id: string; name: string };
			expect(sdkFunctions.workflow).toHaveBeenCalledWith('id-123', 'My Workflow');
			expect(result.id).toBe('id-123');
			expect(result.name).toBe('My Workflow');
		});

		it('should call node function with config', () => {
			const code = "export default node({ type: 'n8n-nodes-base.set', version: 3, config: {} });";
			interpretSDKCode(code, sdkFunctions);
			expect(sdkFunctions.node).toHaveBeenCalledWith({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: {},
			});
		});

		it('should call trigger function', () => {
			const code =
				"export default trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });";
			interpretSDKCode(code, sdkFunctions);
			expect(sdkFunctions.trigger).toHaveBeenCalledWith({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: {},
			});
		});

		it('should call languageModel function', () => {
			const code =
				"export default languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1, config: {} });";
			interpretSDKCode(code, sdkFunctions);
			expect(sdkFunctions.languageModel).toHaveBeenCalled();
		});

		it('should call fromAi function', () => {
			const code = "export default fromAi('email', 'The recipient email address');";
			const result = interpretSDKCode(code, sdkFunctions);
			expect(sdkFunctions.fromAi).toHaveBeenCalledWith('email', 'The recipient email address');
			expect(result).toContain('$fromAI');
		});

		it('should call nodeJson function', () => {
			const code = "export default nodeJson('Telegram Trigger', 'message.chat.id');";
			const result = interpretSDKCode(code, sdkFunctions);

			expect(sdkFunctions.nodeJson).toHaveBeenCalledWith('Telegram Trigger', 'message.chat.id');
			expect(result).toBe("={{ $('Telegram Trigger').item.json.message.chat.id }}");
		});

		it('should chain method calls', () => {
			const code = `
				const wf = workflow('id', 'name');
				export default wf.add(trigger({ type: 'test', version: 1, config: {} }));
			`;
			const result = interpretSDKCode(code, sdkFunctions) as { nodes: unknown[] };
			expect(result.nodes.length).toBe(1);
		});
	});

	describe('interpretSDKCode - operators', () => {
		let sdkFunctions: SDKFunctions;

		beforeEach(() => {
			sdkFunctions = createMockSDKFunctions();
		});

		it('should interpret unary minus', () => {
			const code = 'export default -5;';
			const result = interpretSDKCode(code, sdkFunctions);
			expect(result).toBe(-5);
		});

		it('should interpret unary plus', () => {
			const code = "export default +'10';";
			const result = interpretSDKCode(code, sdkFunctions);
			expect(result).toBe(10);
		});

		it('should interpret logical not', () => {
			const code = 'export default !false;';
			const result = interpretSDKCode(code, sdkFunctions);
			expect(result).toBe(true);
		});

		it('should interpret binary operators', () => {
			expect(interpretSDKCode('export default 2 + 3;', sdkFunctions)).toBe(5);
			expect(interpretSDKCode('export default 5 - 2;', sdkFunctions)).toBe(3);
			expect(interpretSDKCode('export default 3 * 4;', sdkFunctions)).toBe(12);
			expect(interpretSDKCode('export default 10 / 2;', sdkFunctions)).toBe(5);
			expect(interpretSDKCode('export default 7 % 3;', sdkFunctions)).toBe(1);
		});

		it('should support string concatenation with +', () => {
			expect(interpretSDKCode("export default 'hello' + ' world';", sdkFunctions)).toBe(
				'hello world',
			);
			expect(interpretSDKCode("export default 'count: ' + 5;", sdkFunctions)).toBe('count: 5');
			expect(interpretSDKCode("export default 1 + ' item';", sdkFunctions)).toBe('1 item');
			// Multi-part concat
			expect(interpretSDKCode("export default 'a' + 'b' + 'c';", sdkFunctions)).toBe('abc');
		});

		it('should interpret comparison operators', () => {
			expect(interpretSDKCode('export default 5 > 3;', sdkFunctions)).toBe(true);
			expect(interpretSDKCode('export default 5 < 3;', sdkFunctions)).toBe(false);
			expect(interpretSDKCode('export default 5 >= 5;', sdkFunctions)).toBe(true);
			expect(interpretSDKCode('export default 5 <= 4;', sdkFunctions)).toBe(false);
			expect(interpretSDKCode('export default 5 === 5;', sdkFunctions)).toBe(true);
			expect(interpretSDKCode('export default 5 !== 3;', sdkFunctions)).toBe(true);
		});

		it('should interpret logical operators', () => {
			expect(interpretSDKCode('export default true && false;', sdkFunctions)).toBe(false);
			expect(interpretSDKCode('export default true || false;', sdkFunctions)).toBe(true);
			expect(interpretSDKCode("export default null ?? 'default';", sdkFunctions)).toBe('default');
		});

		it('should interpret conditional (ternary) operator', () => {
			expect(interpretSDKCode("export default true ? 'yes' : 'no';", sdkFunctions)).toBe('yes');
			expect(interpretSDKCode("export default false ? 'yes' : 'no';", sdkFunctions)).toBe('no');
		});
	});

	describe('interpretSDKCode - n8n runtime variables in templates', () => {
		let sdkFunctions: SDKFunctions;

		beforeEach(() => {
			sdkFunctions = createMockSDKFunctions();
		});

		it('should preserve $json as literal in template literals', () => {
			// When we have ${$json.name} in a template, it should become literal "${$json.name}"
			const code = 'export default `${$json.name}`;';
			const result = interpretSDKCode(code, sdkFunctions);
			expect(result).toBe('${$json.name}');
		});

		it('should preserve $today as literal in template literals', () => {
			const code = 'export default `Today is ${$today}`;';
			const result = interpretSDKCode(code, sdkFunctions);
			expect(result).toBe('Today is ${$today}');
		});

		it('should preserve $input.item as literal', () => {
			const code = 'export default `${$input.item.json.data}`;';
			const result = interpretSDKCode(code, sdkFunctions);
			expect(result).toBe('${$input.item.json.data}');
		});

		it('should preserve $env as literal', () => {
			const code = 'export default `${$env.API_KEY}`;';
			const result = interpretSDKCode(code, sdkFunctions);
			expect(result).toBe('${$env.API_KEY}');
		});
	});

	describe('Security - rejected patterns', () => {
		let sdkFunctions: SDKFunctions;

		beforeEach(() => {
			sdkFunctions = createMockSDKFunctions();
		});

		it('should reject eval()', () => {
			const code = "export default eval('1+1');";
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should reject Function()', () => {
			// Direct Function call (not chained) - this is caught as a dangerous identifier
			const code = 'export default Function;';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should reject require()', () => {
			const code = "export default require('fs');";
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should reject process access', () => {
			const code = 'export default process.env.PATH;';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should reject global access', () => {
			const code = 'export default global.process;';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should reject globalThis access', () => {
			const code = 'export default globalThis.process;';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should reject constructor access', () => {
			const code = 'export default {}.constructor;';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should reject __proto__ access', () => {
			const code = 'export default {}.__proto__;';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should reject prototype access', () => {
			const code = 'export default {}.prototype;';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should reject __proto__ access via literal key', () => {
			const code = 'export default {}["__proto__"];';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should reject prototype access via literal key', () => {
			const code = 'export default {}["prototype"];';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should reject constructor access via literal key', () => {
			const code = 'export default {}["constructor"];';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should reject dynamic property access with expressions', () => {
			const code = "const prop = 'constructor'; export default {}[prop];";
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should allow literal property access', () => {
			const code = "export default { foo: 'bar' }['foo'];";
			const result = interpretSDKCode(code, sdkFunctions);
			expect(result).toBe('bar');
		});
	});

	describe('Security - forbidden syntax', () => {
		let sdkFunctions: SDKFunctions;

		beforeEach(() => {
			sdkFunctions = createMockSDKFunctions();
		});

		it('should reject arrow functions', () => {
			const code = 'export default(() => 1);';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(UnsupportedNodeError);
		});

		it('should reject function expressions', () => {
			const code = 'export default(function() { return 1; });';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(UnsupportedNodeError);
		});

		it('should reject for loops', () => {
			const code = 'for (let i = 0; i < 10; i++) {}';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(UnsupportedNodeError);
		});

		it('should reject while loops', () => {
			const code = 'while (true) { break; }';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(UnsupportedNodeError);
		});

		it('should reject try-catch', () => {
			const code = 'try { const x = 1; } catch (e) {}';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(UnsupportedNodeError);
		});

		it('should reject let declarations', () => {
			const code = 'let x = 1; export default x;';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should reject var declarations', () => {
			const code = 'var x = 1; export default x;';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should reject new expressions', () => {
			const code = 'export default new Date();';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(UnsupportedNodeError);
		});

		it('should reject bare variable reassignment', () => {
			const code = 'const x = 1; x = 2;';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(UnsupportedNodeError);
		});

		it('should reject compound assignment operators', () => {
			const code = 'const x = { count: 0 }; x.count += 1;';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(UnsupportedNodeError);
		});

		it('should reject assignment to __proto__', () => {
			const code = 'const x = {}; x.__proto__ = {};';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should reject assignment to prototype', () => {
			const code = 'const x = {}; x.prototype = {};';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should reject assignment to constructor', () => {
			const code = 'const x = {}; x.constructor = {};';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should reject assignment to __proto__ via literal key', () => {
			const code = 'const x = {}; x["__proto__"] = {};';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should reject assignment to prototype via literal key', () => {
			const code = 'const x = {}; x["prototype"] = {};';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should reject assignment to constructor via literal key', () => {
			const code = 'const x = {}; x["constructor"] = {};';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should reject assignment with dynamic property', () => {
			const code = 'const x = {}; const k = "a"; x[k] = 1;';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should reject named exports', () => {
			const code = 'export const x = 1;';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(UnsupportedNodeError);
		});

		it('should reject return statements', () => {
			const code = 'return 42;';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow();
		});
	});

	describe('Property assignment', () => {
		let sdkFunctions: SDKFunctions;

		beforeEach(() => {
			sdkFunctions = createMockSDKFunctions();
		});

		it('should allow single-level property assignment', () => {
			const code = 'const x = { a: 1 }; x.config = { key: "value" }; export default x;';
			const result = interpretSDKCode(code, sdkFunctions) as Record<string, unknown>;
			expect(result.config).toEqual({ key: 'value' });
		});

		it('should allow nested property assignment (e.g. config.subnodes)', () => {
			const code = `
				const splitter = textSplitter({ type: 'test', version: 1, config: {} });
				const docLoader = documentLoader({ type: 'test', version: 1, config: { subnodes: {} } });
				docLoader.config.subnodes = { textSplitter: splitter };
				export default docLoader;
			`;
			const result = interpretSDKCode(code, sdkFunctions) as {
				config: { subnodes: { textSplitter: unknown } };
			};
			expect(result.config.subnodes.textSplitter).toBeDefined();
		});

		it('should allow literal key property assignment', () => {
			const code = 'const x = {}; x["key"] = 42; export default x;';
			const result = interpretSDKCode(code, sdkFunctions) as Record<string, unknown>;
			expect(result.key).toBe(42);
		});
	});

	describe('Security - reserved SDK names', () => {
		let sdkFunctions: SDKFunctions;

		beforeEach(() => {
			sdkFunctions = createMockSDKFunctions();
		});

		it('should reject using workflow as variable name', () => {
			const code = 'const workflow = 1; export default workflow;';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should reject using node as variable name', () => {
			const code = 'const node = 1; export default node;';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should reject using trigger as variable name', () => {
			const code = 'const trigger = 1; export default trigger;';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should allow user-defined variable names', () => {
			const code = "const myWorkflow = workflow('id', 'name'); export default myWorkflow;";
			const result = interpretSDKCode(code, sdkFunctions) as { id: string };
			expect(result.id).toBe('id');
		});
	});

	describe('Auto-rename subnode SDK function names used as variables', () => {
		let sdkFunctions: SDKFunctions;

		beforeEach(() => {
			sdkFunctions = createMockSDKFunctions();
		});

		it('should auto-rename embeddings used as variable name', () => {
			const code =
				"const embeddings = embedding({ model: 'text-embedding-3-small' }); export default embeddings;";
			const result = interpretSDKCode(code, sdkFunctions) as { type: string };
			expect(result.type).toBe('embedding');
		});

		it('should auto-rename textSplitter used as variable name', () => {
			const code =
				'const textSplitter = textSplitter({ chunkSize: 1000 }); export default textSplitter;';
			const result = interpretSDKCode(code, sdkFunctions) as { type: string };
			expect(result.type).toBe('textSplitter');
		});

		it('should auto-rename memory used as variable name', () => {
			const code = "const memory = memory({ sessionId: '123' }); export default memory;";
			const result = interpretSDKCode(code, sdkFunctions) as { type: string };
			expect(result.type).toBe('memory');
		});

		it('should auto-rename vectorStore used as variable name', () => {
			const code =
				"const vectorStore = vectorStore({ mode: 'insert' }); export default vectorStore;";
			const result = interpretSDKCode(code, sdkFunctions) as { type: string };
			expect(result.type).toBe('vectorStore');
		});

		it('should auto-rename multiple subnode variables in the same code', () => {
			const code = [
				"const embeddings = embedding({ model: 'text-embedding-3-small' });",
				'const textSplitter = textSplitter({ chunkSize: 1000 });',
				'export default { embeddings, textSplitter };',
			].join('\n');
			const result = interpretSDKCode(code, sdkFunctions) as {
				embeddings: { type: string };
				textSplitter: { type: string };
			};
			expect(result.embeddings.type).toBe('embedding');
			expect(result.textSplitter.type).toBe('textSplitter');
		});

		it('should still reject core SDK names like workflow as variable name', () => {
			const code = 'const workflow = 1; export default workflow;';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should still reject core SDK names like node as variable name', () => {
			const code = 'const node = 1; export default node;';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should still reject core SDK names like trigger as variable name', () => {
			const code = 'const trigger = 1; export default trigger;';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});
	});

	describe('interpretSDKCode - unknown identifiers', () => {
		let sdkFunctions: SDKFunctions;

		beforeEach(() => {
			sdkFunctions = createMockSDKFunctions();
		});

		it('should throw for undefined variables', () => {
			const code = 'export default undefinedVar;';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(UnknownIdentifierError);
		});

		it('should throw for non-SDK functions', () => {
			const code = 'export default someRandomFunction();';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(UnknownIdentifierError);
		});
	});

	describe('interpretSDKCode - complete workflow examples', () => {
		let sdkFunctions: SDKFunctions;

		beforeEach(() => {
			sdkFunctions = createMockSDKFunctions();
		});

		it('should interpret a simple workflow', () => {
			const code = `
				const wf = workflow('test-id', 'Test Workflow');
				wf.add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} }));
				export default wf;
			`;
			const result = interpretSDKCode(code, sdkFunctions) as { id: string; name: string };
			expect(result.id).toBe('test-id');
			expect(result.name).toBe('Test Workflow');
		});

		it('should interpret workflow with node chain', () => {
			const code = `
				const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
				const n = node({ type: 'n8n-nodes-base.set', version: 3, config: {} });
				export default workflow('id', 'name').add(t).add(n);
			`;
			const result = interpretSDKCode(code, sdkFunctions) as { nodes: unknown[] };
			expect(result.nodes.length).toBe(2);
		});

		it('should interpret workflow with subnodes', () => {
			const code = `
				const model = languageModel({
					type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					version: 1,
					config: { parameters: { model: 'gpt-4' } }
				});
				export default node({
					type: '@n8n/n8n-nodes-langchain.agent',
					version: 1,
					config: { subnodes: { model: model } }
				});
			`;
			interpretSDKCode(code, sdkFunctions);
			// Verify languageModel was called
			expect(sdkFunctions.languageModel).toHaveBeenCalledWith({
				type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				version: 1,
				config: { parameters: { model: 'gpt-4' } },
			});
			// Verify node was called with the subnode
			expect(sdkFunctions.node).toHaveBeenCalled();
			const nodeCallArgs = getFirstCallArg<{ config: { subnodes: { model: unknown } } }>(
				sdkFunctions.node as Mock,
			);
			expect(nodeCallArgs.config.subnodes.model).toBeDefined();
		});

		it('should interpret workflow with subnodes assigned after creation', () => {
			const code = `
				const splitter = textSplitter({
					type: '@n8n/n8n-nodes-langchain.textSplitterTokenSplitter',
					version: 1,
					config: { parameters: { chunkSize: 500 } }
				});
				const loader = documentLoader({
					type: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader',
					version: 1,
					config: { subnodes: {} }
				});
				loader.config.subnodes = { textSplitter: splitter };
				export default loader;
			`;
			// Mock returns { type: 'documentLoader', config: <arg> }
			// so loader.config is the full arg object passed to documentLoader()
			const result = interpretSDKCode(code, sdkFunctions) as {
				type: string;
				config: { config: { subnodes: { textSplitter: { type: string } } }; subnodes: unknown };
			};
			// The assignment sets loader.config.subnodes (a new prop on the arg object)
			// splitter mock wraps as { type: 'textSplitter', config: <full-arg> }
			const subnodes = result.config.subnodes as { textSplitter: { type: string } };
			expect(subnodes.textSplitter.type).toBe('textSplitter');
		});

		it('should interpret workflow with fromAi', () => {
			const code = `
				export default tool({
					type: 'n8n-nodes-base.gmailTool',
					version: 1,
					config: { parameters: { sendTo: fromAi('email', 'Recipient email') } }
				});
			`;
			interpretSDKCode(code, sdkFunctions);
			// Verify fromAi was called with correct arguments
			expect(sdkFunctions.fromAi).toHaveBeenCalledWith('email', 'Recipient email');
			// Verify tool was called with the fromAi result
			expect(sdkFunctions.tool).toHaveBeenCalled();
			const toolCallArgs = getFirstCallArg<{ config: { parameters: { sendTo: string } } }>(
				sdkFunctions.tool as Mock,
			);
			expect(toolCallArgs.config.parameters.sendTo).toContain('$fromAI');
		});
	});

	describe('Security - method allowlist enforcement', () => {
		let sdkFunctions: SDKFunctions;

		beforeEach(() => {
			sdkFunctions = createMockSDKFunctions();
		});

		it('should reject unlisted methods on SDK objects', () => {
			const code = `
				const wf = workflow('id', 'name');
				export default wf.settings({});
			`;
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should reject update() on node objects', () => {
			const code = `
				const n = node({ type: 'n8n-nodes-base.set', version: 3, config: {} });
				export default n.update({});
			`;
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should reject native JS string methods', () => {
			const code = 'export default "hello".toUpperCase();';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should reject native JS array methods', () => {
			const code = 'export default [1, 2, 3].reverse();';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should reject slice() on strings', () => {
			const code = 'export default "hello".slice(0, 2);';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('reports an actionable, non-double-wrapped message for disallowed methods', () => {
			const code = `
				const wf = workflow('id', 'name');
				export default wf.join(', ');
			`;
			let caught: unknown;
			try {
				interpretSDKCode(code, sdkFunctions);
			} catch (error) {
				caught = error;
			}
			expect(caught).toBeInstanceOf(SecurityError);
			const message = (caught as SecurityError).message;
			expect(message).toContain("Method 'join' is not an allowed SDK method");
			expect(message).toContain('Allowed methods:');
			expect(message).toContain('add');
			// No double-wrap: the sentence must not be quoted inside "Security violation: '...'".
			expect(message).not.toContain("Security violation: 'Method");
			// Internal methods are not advertised as allowed.
			expect(message).not.toContain('toJSON');
		});

		it('should allow connect() method on workflow builder', () => {
			const connectMock = vi.fn();
			sdkFunctions.workflow = vi.fn(() => ({
				connect: connectMock,
			}));
			const code = `
				const wf = workflow('id', 'name');
				export default wf.connect("source", 0, "target", 0);
			`;
			interpretSDKCode(code, sdkFunctions);
			expect(connectMock).toHaveBeenCalledWith('source', 0, 'target', 0);
		});

		it("should forward group()'s options object to the workflow builder", () => {
			const groupMock = vi.fn();
			sdkFunctions.workflow = vi.fn(() => ({
				group: groupMock,
			}));
			// Members are irrelevant here — this pins the third argument surviving evaluation.
			const code = `
				const wf = workflow('id', 'name');
				export default wf.group('Ingestion', [], { description: 'Pulls the CRM contacts' });
			`;
			interpretSDKCode(code, sdkFunctions);
			expect(groupMock).toHaveBeenCalledWith('Ingestion', [], {
				description: 'Pulls the CRM contacts',
			});
		});
	});

	describe('Security - dangerous globals (defense-in-depth)', () => {
		let sdkFunctions: SDKFunctions;

		beforeEach(() => {
			sdkFunctions = createMockSDKFunctions();
		});

		it('should reject Object access', () => {
			const code = 'export default Object;';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should reject Array access', () => {
			const code = 'export default Array;';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should reject raw JSON access', () => {
			const code = 'export default JSON;';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should reject Math access', () => {
			const code = 'export default Math;';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should reject console access', () => {
			const code = 'export default console;';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should reject Promise access', () => {
			const code = 'export default Promise;';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should reject fetch access', () => {
			const code = 'export default fetch;';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should reject Error access', () => {
			const code = 'export default Error;';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should reject WebAssembly access', () => {
			const code = 'export default WebAssembly;';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should report SecurityError with a clean (non-doubled) message', () => {
			const code = 'export default fetch;';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(
				/Security violation: 'fetch' is not allowed/,
			);
		});
	});

	describe('Security - dangerous globals shadowed by declared variables', () => {
		let sdkFunctions: SDKFunctions;

		beforeEach(() => {
			sdkFunctions = createMockSDKFunctions();
		});

		const shadowable = [
			'fetch',
			'process',
			'require',
			'console',
			'Object',
			'Array',
			'Math',
			'Date',
			'Error',
			'Promise',
			'Buffer',
		];

		for (const name of shadowable) {
			it(`should allow '${name}' as a node variable name`, () => {
				const code = `
					const ${name} = node({ name: 'X', type: 'n8n-nodes-base.set' });
					export default workflow('id', 'name').add(${name});
				`;
				const result = interpretSDKCode(code, sdkFunctions) as { nodes: unknown[] };
				expect(result.nodes).toHaveLength(1);
			});
		}

		it('should still reject undeclared fetch reference', () => {
			const code = 'export default fetch;';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should still reject member access on undeclared process', () => {
			const code = 'export default process.env.PATH;';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should still reject member access on undeclared Math', () => {
			const code = 'export default Math.PI;';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should resolve member access against the user-declared shadow', () => {
			const code = `
				const Math = { custom: 42 };
				export default Math.custom;
			`;
			expect(interpretSDKCode(code, sdkFunctions)).toBe(42);
		});
	});

	describe('JSON.stringify', () => {
		let sdkFunctions: SDKFunctions;

		beforeEach(() => {
			sdkFunctions = createMockSDKFunctions();
		});

		it('should allow JSON.stringify with an object', () => {
			const code = 'export default JSON.stringify({ a: 1, b: "hello" });';
			const result = interpretSDKCode(code, sdkFunctions);
			expect(result).toBe('{"a":1,"b":"hello"}');
		});

		it('should allow JSON.stringify with indent argument', () => {
			const code = 'export default JSON.stringify({ a: 1 }, null, 2);';
			const result = interpretSDKCode(code, sdkFunctions);
			expect(result).toBe('{\n  "a": 1\n}');
		});

		it('should reject JSON.parse', () => {
			const code = 'export default JSON.parse("{\\"x\\": 42}");';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should reject unlisted JSON methods', () => {
			const code = 'export default JSON.rawJSON("123");';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});

		it('should still reject raw JSON identifier access', () => {
			const code = 'export default JSON;';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});
	});

	describe('String.repeat', () => {
		let sdkFunctions: SDKFunctions;

		beforeEach(() => {
			sdkFunctions = createMockSDKFunctions();
		});

		it('should allow "abc".repeat(3)', () => {
			const code = 'export default "abc".repeat(3);';
			const result = interpretSDKCode(code, sdkFunctions);
			expect(result).toBe('abcabcabc');
		});

		it('should allow repeat with zero', () => {
			const code = 'export default "hello".repeat(0);';
			const result = interpretSDKCode(code, sdkFunctions);
			expect(result).toBe('');
		});

		it('should allow repeat on a variable holding a string', () => {
			const code = 'const sep = "-"; export default sep.repeat(5);';
			const result = interpretSDKCode(code, sdkFunctions);
			expect(result).toBe('-----');
		});

		it('should still reject other string methods', () => {
			const code = 'export default "hello".toUpperCase();';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(SecurityError);
		});
	});

	describe('String.trim', () => {
		let sdkFunctions: SDKFunctions;

		beforeEach(() => {
			sdkFunctions = createMockSDKFunctions();
		});

		it('should allow "  abc  ".trim()', () => {
			const code = 'export default "  abc  ".trim();';
			const result = interpretSDKCode(code, sdkFunctions);
			expect(result).toBe('abc');
		});

		it('should allow trim on a template literal', () => {
			const code = 'export default `\n  hello\n`.trim();';
			const result = interpretSDKCode(code, sdkFunctions);
			expect(result).toBe('hello');
		});

		it('should allow trim on a variable holding a string', () => {
			const code = 'const padded = "  x  "; export default padded.trim();';
			const result = interpretSDKCode(code, sdkFunctions);
			expect(result).toBe('x');
		});
	});

	describe('Resource limits', () => {
		let sdkFunctions: SDKFunctions;

		beforeEach(() => {
			sdkFunctions = createMockSDKFunctions();
		});

		it('should reject exponential array-spread doubling before completing', () => {
			const doublings = 25; // 2^25 elements if unbounded — must abort far earlier
			const lines = ['const a0 = [1];'];
			for (let i = 1; i <= doublings; i++) {
				lines.push(`const a${i} = [...a${i - 1}, ...a${i - 1}];`);
			}
			lines.push(`export default a${doublings};`);
			const code = lines.join('\n');
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(ResourceLimitError);
		});

		it('should reject cumulative object-spread growth across many statements', () => {
			// Object spread merges by key (duplicate keys overwrite rather than
			// duplicate), so it can't blow up exponentially the way array spread
			// does — but copying a large object's keys over and over still adds
			// up, so the shared budget must catch it across statements.
			const keyCount = 2000;
			const props = Array.from({ length: keyCount }, (_, i) => `k${i}: ${i}`).join(', ');
			// Each merge copies keyCount slots but adds only ~23 characters of
			// source, so the cost outgrows the source-derived budget.
			const mergeCount = 500;
			const lines = [`const big = { ${props} };`];

			for (let i = 0; i < mergeCount; i++) {
				lines.push(`const m${i} = { ...big };`);
			}

			lines.push('export default m0;');
			const code = lines.join('\n');

			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(ResourceLimitError);
		});

		it('should reject a huge String.repeat count', () => {
			const code = 'export default "a".repeat(100000000);';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(ResourceLimitError);
		});

		it('should reject a huge String.repeat count passed as a numeric string', () => {
			// Native String.prototype.repeat coerces its argument, so a string-typed
			// count must be charged the same as a numeric one.
			const code = 'export default "a".repeat("100000000");';
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(ResourceLimitError);
		});

		it('should reject exponential string growth from repeated + concatenation', () => {
			const doublings = 25; // 2^25 characters if unbounded — must abort far earlier
			const lines = ['const s0 = "a";'];
			for (let i = 1; i <= doublings; i++) {
				lines.push(`const s${i} = s${i - 1} + s${i - 1};`);
			}

			lines.push(`export default s${doublings};`);
			const code = lines.join('\n');

			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(ResourceLimitError);
		});

		it('should reject a reference DAG (Directed Acyclic Graph) that doubles without ever spreading', () => {
			// [a, a] is two references, no copy — must still cost what `a` holds.
			const doublings = 25;
			const lines = ['const a0 = [1];'];
			for (let i = 1; i <= doublings; i++) {
				lines.push(`const a${i} = [a${i - 1}, a${i - 1}];`);
			}

			lines.push(`export default a${doublings};`);
			const code = lines.join('\n');

			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(ResourceLimitError);
		});

		it('should count empty containers when sizing repeated references', () => {
			const doublings = 18;
			const lines = ['const a0 = [];'];
			for (let i = 1; i <= doublings; i++) {
				lines.push(`const a${i} = [a${i - 1}, a${i - 1}];`);
			}

			lines.push(`export default a${doublings};`);
			const code = lines.join('\n');

			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(ResourceLimitError);
		});

		it('should reject chained JSON.stringify that doubles its own output each round', () => {
			// Each round wraps the previous string in a 2-element array and
			// re-serializes it. Serializing writes both references out in full,
			// so the output doubles while the structure stays tiny.
			const rounds = 15;
			const lines = ['const s0 = "x".repeat(1000);'];
			for (let i = 1; i <= rounds; i++) {
				lines.push(`const a${i} = [s${i - 1}, s${i - 1}];`, `const s${i} = JSON.stringify(a${i});`);
			}

			lines.push(`export default s${rounds};`);
			const code = lines.join('\n');

			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(ResourceLimitError);
		});

		it('should reject a DAG whose members were filled in by property assignment', () => {
			// Nothing is serialized here, so only the recorded size of `holder` can
			// catch the doubling: left at the size it had when it was built, the
			// whole chain measures empty.
			const code = [
				'const big = "x".repeat(50000);',
				'const holder = {};',
				'holder.a = big;',
				'const a0 = [holder, holder];',
				'const a1 = [a0, a0];',
				'const a2 = [a1, a1];',
				'export default a2;',
			].join('\n');

			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(ResourceLimitError);
		});

		it('should reject a DAG that repeats a long property name', () => {
			// The name is written out once per occurrence, so it counts towards the
			// output even though it is not part of any value. Sized like the case
			// above, so a late limit would surface as a RangeError instead.
			const doublings = 14;
			const lines = [`const k = { "${'K'.repeat(20_000)}": 1 };`, 'const a0 = [k, k];'];
			for (let i = 1; i <= doublings; i++) {
				lines.push(`const a${i} = [a${i - 1}, a${i - 1}];`);
			}

			lines.push(`export default JSON.stringify(a${doublings});`);
			const code = lines.join('\n');

			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(ResourceLimitError);
		});

		it('should still allow ordinary property assignment', () => {
			const code = [
				'const cfg = {};',
				'cfg.name = "hello";',
				'cfg.items = [1, 2, 3];',
				'export default JSON.stringify(cfg);',
			].join('\n');

			expect(() => interpretSDKCode(code, sdkFunctions)).not.toThrow();
		});

		it('should reject deep nesting serialized with a wide indent', () => {
			// Indentation grows with depth, so it has to be counted per node: left
			// out, this reaches the engine's string ceiling and raises a RangeError
			// while building instead.
			const depth = 4900;
			const lines = ['const d0 = [1];'];
			for (let i = 1; i <= depth; i++) {
				lines.push(`const d${i} = [d${i - 1}];`);
			}

			lines.push(`export default JSON.stringify(d${depth}, null, 10);`);
			const code = lines.join('\n');

			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(ResourceLimitError);
		});

		it('should reject JSON.stringify traversing an externally produced oversized structure', () => {
			// Untracked value (no tracked size) must still trip the JSON.stringify guard.
			const bigArray = Array.from({ length: 200_001 }, (_, i) => i); // above the floor budget
			const funcs: SDKFunctions = {
				...sdkFunctions,
				getBig: vi.fn(() => bigArray),
			};
			const code = 'export default JSON.stringify(getBig());';

			expect(() => interpretSDKCode(code, funcs)).toThrow(ResourceLimitError);
		});

		it('should accumulate JSON.stringify traversal across separate calls', () => {
			// Each call stays under the limit on its own; together they must not.
			const bigArray = Array.from({ length: 50_000 }, (_, i) => i);
			const funcs: SDKFunctions = {
				...sdkFunctions,
				getBig: vi.fn(() => bigArray),
			};
			const code = [
				'const s1 = JSON.stringify(getBig());',
				'const s2 = JSON.stringify(getBig());',
				'const s3 = JSON.stringify(getBig());',
				'const s4 = JSON.stringify(getBig());',
				'const s5 = JSON.stringify(getBig());',
				'export default s5;',
			].join('\n');

			expect(() => interpretSDKCode(code, funcs)).toThrow(ResourceLimitError);
		});

		it('should reject a JSON.stringify replacer, which would displace the size guard', () => {
			const code = 'export default JSON.stringify({ a: 1, b: 2 }, ["a"]);';

			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(UnsupportedNodeError);
		});

		it('should still allow JSON.stringify on a reasonably large legitimate structure', () => {
			const code = [
				'const items = [1, 2, 3, 4, 5];',
				'export default JSON.stringify({ items, name: "test" });',
			].join('\n');

			expect(() => interpretSDKCode(code, sdkFunctions)).not.toThrow();
		});

		it('should allow a large embedded literal to be serialized into a parameter', () => {
			// The documented way to embed a page in a Code node. Passing the same
			// string along must not be charged again for every hop it makes.
			const html = 'y'.repeat(150_000);
			const code = [
				`const html = "${html}";`,
				'const jsCode = JSON.stringify(html);',
				'export default { parameters: { jsCode } };',
			].join('\n');

			expect(() => interpretSDKCode(code, sdkFunctions)).not.toThrow();
		});

		it('should allow a multi-part concatenation around a large embedded literal', () => {
			// Charging each step its whole result would make this cost O(n^2).
			const html = 'y'.repeat(120_000);
			const code = [
				`const html = "${html}";`,
				'const jsCode = "var h=" + JSON.stringify(html) + "; return h;";',
				'export default { parameters: { jsCode } };',
			].join('\n');

			expect(() => interpretSDKCode(code, sdkFunctions)).not.toThrow();
		});

		it('should reject unbounded template-literal growth from repeated big values', () => {
			const code = [
				'const big = "x".repeat(150000);',
				'const t1 = `${big}${big}`;',
				'const t2 = `${t1}${t1}`;',
				'export default t2;',
			].join('\n');

			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(ResourceLimitError);
		});

		it('should reject programs with too many top-level statements', () => {
			const lines: string[] = [];
			for (let i = 0; i < 6000; i++) {
				lines.push(`const v${i} = ${i};`);
			}

			lines.push('export default v0;');
			const code = lines.join('\n');

			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(ResourceLimitError);
		});

		it('should still allow reasonably large legitimate literals and spreads', () => {
			const items = Array.from({ length: 500 }, (_, i) => i).join(',');
			const code = `const items = [${items}]; export default { ...{ items } };`;

			expect(() => interpretSDKCode(code, sdkFunctions)).not.toThrow();
		});

		it('should cap unbounded recursion reached via template-literal runtime-variable detection', () => {
			// Builds a deeply nested $-prefixed member chain inside a template literal,
			// which is resolved via isN8nRuntimeVariable/expressionToString, not evaluate().
			let expression = '$json';
			for (let i = 0; i < 600; i++) {
				expression += '.a';
			}

			const code = `export default \`\${${expression}}\`;`;
			expect(() => interpretSDKCode(code, sdkFunctions)).toThrow(ResourceLimitError);
		});
	});

	describe('expr(placeholder(...)) round-trip', () => {
		it('prepends = to the placeholder marker so it parses as an n8n expression', () => {
			const funcs: SDKFunctions = {
				...createMockSDKFunctions(),
				expr,
			};
			const code = `const val = expr(placeholder('Your ID'));
export default val;`;
			expect(interpretSDKCode(code, funcs)).toBe('=<__PLACEHOLDER_VALUE__Your ID__>');
		});
	});
});
