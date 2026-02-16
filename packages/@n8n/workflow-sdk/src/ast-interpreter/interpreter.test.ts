/**
 * Unit tests for the AST interpreter.
 */
import {
	InterpreterError,
	SecurityError,
	UnsupportedNodeError,
	UnknownIdentifierError,
} from './errors';
import { expr } from '../expression';
import type { SDKFunctions } from './interpreter';
import { interpretSDKCode } from './interpreter';
import { parseSDKCode } from './parser';

/** Helper to get the first call argument from a Jest mock with proper typing */
function getFirstCallArg<T>(mockFn: jest.Mock): T {
	const calls = mockFn.mock.calls as unknown[][];
	return calls[0][0] as T;
}

// Mock SDK functions for testing
const createMockSDKFunctions = (): SDKFunctions => ({
	workflow: jest.fn((id: string, name: string) => ({
		id,
		name,
		nodes: [] as unknown[],
		add: jest.fn(function (this: { nodes: unknown[] }, node: unknown) {
			this.nodes.push(node);
			return this;
		}),
		then: jest.fn(function (this: { nodes: unknown[] }, node: unknown) {
			this.nodes.push(node);
			return this;
		}),
		toJSON: jest.fn(function (this: { id: string; name: string; nodes: unknown[] }) {
			return { id: this.id, name: this.name, nodes: this.nodes };
		}),
	})),
	node: jest.fn((config: unknown) => ({
		type: 'node',
		config,
		then: jest.fn((target: unknown) => target),
		to: jest.fn((target: unknown) => target),
		input: jest.fn(() => ({ index: 0 })),
		output: jest.fn(() => ({ index: 0 })),
		onError: jest.fn(),
	})),
	trigger: jest.fn((config: unknown) => ({
		type: 'trigger',
		config,
		then: jest.fn((target: unknown) => target),
		to: jest.fn((target: unknown) => target),
	})),
	sticky: jest.fn((content: string, options?: unknown) => ({
		type: 'sticky',
		content,
		options,
	})),
	placeholder: jest.fn((value: string) => ({
		__placeholder: true as const,
		hint: value,
		toString: () => `<__PLACEHOLDER_VALUE__${value}__>`,
		toJSON() {
			return this.toString();
		},
	})),
	newCredential: jest.fn((name: string) => ({ __newCredential: true, name })),
	ifElse: jest.fn(),
	switchCase: jest.fn(),
	merge: jest.fn((config: unknown) => ({ type: 'merge', config, input: jest.fn() })),
	splitInBatches: jest.fn(),
	nextBatch: jest.fn(),
	languageModel: jest.fn((config: unknown) => ({ type: 'languageModel', config })),
	memory: jest.fn((config: unknown) => ({ type: 'memory', config })),
	tool: jest.fn((config: unknown) => ({ type: 'tool', config })),
	outputParser: jest.fn((config: unknown) => ({ type: 'outputParser', config })),
	embedding: jest.fn((config: unknown) => ({ type: 'embedding', config })),
	embeddings: jest.fn((config: unknown) => ({ type: 'embeddings', config })),
	vectorStore: jest.fn((config: unknown) => ({ type: 'vectorStore', config })),
	retriever: jest.fn((config: unknown) => ({ type: 'retriever', config })),
	documentLoader: jest.fn((config: unknown) => ({ type: 'documentLoader', config })),
	textSplitter: jest.fn((config: unknown) => ({ type: 'textSplitter', config })),
	reranker: jest.fn((config: unknown) => ({ type: 'reranker', config })),
	fromAi: jest.fn(
		(key: string, desc?: string) => `={{ $fromAI('${key}'${desc ? `, '${desc}'` : ''}) }}`,
	),
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
				fail('Should have thrown');
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
				sdkFunctions.node as jest.Mock,
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
				sdkFunctions.tool as jest.Mock,
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

		it('should allow connect() method on workflow builder', () => {
			const connectMock = jest.fn();
			sdkFunctions.workflow = jest.fn(() => ({
				connect: connectMock,
			}));
			const code = `
				const wf = workflow('id', 'name');
				export default wf.connect("source", 0, "target", 0);
			`;
			interpretSDKCode(code, sdkFunctions);
			expect(connectMock).toHaveBeenCalledWith('source', 0, 'target', 0);
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

	describe('expr(placeholder(...)) error', () => {
		it('should throw clear error when expr receives a PlaceholderValue', () => {
			const funcs: SDKFunctions = {
				...createMockSDKFunctions(),
				expr,
			};
			const code = `const val = expr(placeholder('Your ID'));
export default val;`;
			expect(() => interpretSDKCode(code, funcs)).toThrow(
				"expr(placeholder('Your ID')) is invalid",
			);
		});
	});
});
