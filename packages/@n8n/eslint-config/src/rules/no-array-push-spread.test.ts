import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoArrayPushSpreadRule } from './no-array-push-spread.js';

const typeAwareRuleTester = new RuleTester({
	languageOptions: {
		parserOptions: {
			projectService: {
				allowDefaultProject: ['*.ts*'],
			},
		},
	},
});

typeAwareRuleTester.run('no-array-push-spread', NoArrayPushSpreadRule, {
	valid: [
		// Non-array push calls (should be ignored)
		{ name: 'regular function call', code: 'fn(1, 2, 3)' },
		{ name: 'function with spread', code: 'fn(...deps)' },
		{ name: 'object method with spread', code: 'obj.method(...args)' },
		{ name: 'constructor with spread', code: 'new Foo(...args)' },

		// Custom objects with push methods (not arrays)
		{
			name: 'custom object with push method',
			code: 'const customObj = { push: () => {} }; customObj.push(...stuff);',
		},
		{
			name: 'custom queue class with push method',
			code: 'const queue = { push() {} }; queue.push(...values);',
		},
		{
			name: 'interface with push method',
			code: `
				interface CustomQueue { push(...items: any[]): void; }
				declare const queue: CustomQueue;
				queue.push(...items);
			`,
		},
		{
			name: 'class with custom push method',
			code: `
				class Stack { push(item: any) {} }
				const stack = new Stack();
				stack.push(...values);
			`,
		},

		// Inline array literals (should be ignored)
		{ name: 'empty array with inline literal spread', code: '[].push(...[1, 2, 3]);' },
		{ name: 'array with mixed args and inline literal', code: '[1, 2].push(item, ...[4, 5, 6]);' },
		{
			name: 'typed array with inline literal',
			code: 'const arr: number[] = []; arr.push(...[1, 2, 3]);',
		},
		{
			name: 'string array with inline literal',
			code: 'const arr: string[] = ["a"]; arr.push(...["b", "c"]);',
		},

		// Regular push calls (no spread)
		{ name: 'array push without spread', code: '[].push(1, 2, 3);' },
		{ name: 'Array constructor push without spread', code: 'new Array().push(item);' },
		{
			name: 'typed array push without spread',
			code: 'const arr: number[] = []; arr.push(1, 2, 3);',
		},
		{
			name: 'string array push without spread',
			code: 'const myArray: string[] = []; myArray.push("item");',
		},

		// Concat calls (preferred alternative)
		{ name: 'array concat', code: '[].concat(items);' },
		{ name: 'array concat with multiple items', code: '[1, 2].concat(items1, items2);' },
		{
			name: 'typed array concat',
			code: 'const arr: number[] = []; const result = arr.concat(items);',
		},
		{
			name: 'string array concat assignment',
			code: 'let arr: string[] = []; arr = arr.concat(items1, items2);',
		},

		// Undeclared variables (type checker can't determine if array)
		{ name: 'undeclared variable push', code: 'arr.push(...items);' },
		{ name: 'undeclared variable push with values', code: 'myArray.push(...values);' },

		// Apply pattern edge cases (should be ignored)
		{
			name: 'apply with inline array literal',
			code: 'arr.push.apply(arr, [1, 2, 3]);',
		},
		{
			name: 'apply on non-array object',
			code: 'const customObj = { push: () => {} }; customObj.push.apply(customObj, items);',
		},
		{
			name: 'apply with too many arguments',
			code: 'arr.push.apply(arr, items, extraArg);',
		},
		{
			name: 'apply with too few arguments',
			code: 'arr.push.apply(arr);',
		},
		{
			name: 'apply on string (not an array)',
			code: 'const str = "hello"; str.push.apply(str, items);',
		},

		// Array.prototype.push.apply pattern edge cases (should be ignored)
		{
			name: 'Array.prototype.push.apply with inline array literal',
			code: 'Array.prototype.push.apply(arr, [1, 2, 3]);',
		},
		{
			name: 'Array.prototype.push.apply with too many arguments',
			code: 'Array.prototype.push.apply(arr, items, extraArg);',
		},
		{
			name: 'Array.prototype.push.apply with too few arguments',
			code: 'Array.prototype.push.apply(arr);',
		},

		// Edge cases for various contexts
		{
			name: 'spread in function argument (should not interfere)',
			code: 'const result = someFunction(arr.push(...items));',
		},
		{
			name: 'spread in object property (should not interfere)',
			code: '{ push: arr.push(...items) }',
		},
	],

	invalid: [
		// SPREAD PATTERN TESTS
		{
			name: 'empty array literal',
			code: '[].push(...items);',
			output: '[] = [].concat(items);',
			errors: [{ messageId: 'noArrayPushSpread' }],
		},
		{
			name: 'array literal with initial values',
			code: '[1, 2].push(...newItems);',
			output: '[1, 2] = [1, 2].concat(newItems);',
			errors: [{ messageId: 'noArrayPushSpread' }],
		},
		{
			name: 'assignment expression',
			code: 'result = [].push(...things);',
			output: 'result = [].concat(things);',
			errors: [{ messageId: 'noArrayPushSpread' }],
		},
		{
			name: 'mixed regular and spread arguments',
			code: '[1, 2, 3].push(item, ...moreItems);',
			output: '[1, 2, 3] = [1, 2, 3].concat([item]).concat(moreItems);',
			errors: [{ messageId: 'noArrayPushSpread' }],
		},
		{
			name: 'multiple spread arguments',
			code: 'new Array().push(...items1, ...items2);',
			output: 'new Array() = new Array().concat(items1).concat(items2);',
			errors: [{ messageId: 'noArrayPushSpread' }],
		},
		{
			name: 'regular args before spread',
			code: '[].push(a, b, ...items);',
			output: '[] = [].concat([a, b]).concat(items);',
			errors: [{ messageId: 'noArrayPushSpread' }],
		},
		{
			name: 'const array converted to let',
			code: 'const array: number[] = []; array.push(...items);',
			output: 'let array: number[] = []; array = array.concat(items);',
			errors: [{ messageId: 'noArrayPushSpread' }],
		},
		{
			name: 'const with generic Array constructor',
			code: 'const myArray = new Array<number>(); myArray.push(...items);',
			output: 'let myArray = new Array<number>(); myArray = myArray.concat(items);',
			errors: [{ messageId: 'noArrayPushSpread' }],
		},
		{
			name: 'const with multiple declarations',
			code: 'const arr = [], other = 1; arr.push(...items);',
			output: 'let arr = [], other = 1; arr = arr.concat(items);',
			errors: [{ messageId: 'noArrayPushSpread' }],
		},
		{
			name: 'const array in nested scope',
			code: `
				const array = [];

				function bar() {
					const array = [];
				}

			    function foo() {
					const array = [];
					array.push(...items);
				}
			`,
			output: `
				const array = [];

				function bar() {
					const array = [];
				}

			    function foo() {
					let array = [];
					array = array.concat(items);
				}
			`,
			errors: [{ messageId: 'noArrayPushSpread' }],
		},
		{
			name: 'class property array',
			code: `
				class Test {
					items: string[] = [];
					test() { this.items.push(...newItems); }
				}
			`,
			output: `
				class Test {
					items: string[] = [];
					test() { this.items = this.items.concat(newItems); }
				}
			`,
			errors: [{ messageId: 'noArrayPushSpread' }],
		},

		// Type system integration
		{
			name: 'generic Array with multiple spreads',
			code: 'let myArray = new Array<number>(); myArray.push(...items1, ...items2);',
			output: 'let myArray = new Array<number>(); myArray = myArray.concat(items1).concat(items2);',
			errors: [{ messageId: 'noArrayPushSpread' }],
		},
		{
			name: 'ReadonlyArray parameter',
			code: 'function test(arr: ReadonlyArray<string>) { arr.push(...items); }',
			output: 'function test(arr: ReadonlyArray<string>) { arr = arr.concat(items); }',
			errors: [{ messageId: 'noArrayPushSpread' }],
		},
		{
			name: 'tuple type',
			code: 'let tuple: [string, number] = ["a", 1]; tuple.push(...items);',
			output: 'let tuple: [string, number] = ["a", 1]; tuple = tuple.concat(items);',
			errors: [{ messageId: 'noArrayPushSpread' }],
		},

		// Type casting
		{
			name: 'type cast expression',
			code: '(obj.prop as SomeType[]).push(...items);',
			output: 'obj.prop = (obj.prop as SomeType[]).concat(items);',
			errors: [{ messageId: 'noArrayPushSpread' }],
		},
		{
			name: 'const with type cast',
			code: 'const arr: SomeType[] = []; (arr as SomeType[]).push(...items);',
			output: 'let arr: SomeType[] = []; arr = (arr as SomeType[]).concat(items);',
			errors: [{ messageId: 'noArrayPushSpread' }],
		},

		// Cases that cannot be auto-fixed
		{
			name: 'regular args after spread (no autofix)',
			code: 'new Array().push(a, ...items, b);',
			output: null,
			errors: [{ messageId: 'noArrayPushSpread' }],
		},
		{
			name: 'typed array with args after spread (no autofix)',
			code: 'const numbers: number[] = []; numbers.push(a, ...items, b);',
			output: null,
			errors: [{ messageId: 'noArrayPushSpread' }],
		},

		// APPLY PATTERN TESTS
		// Basic cases
		{
			name: 'empty array literal with apply',
			code: '[].push.apply([], items);',
			output: '[] = [].concat(items);',
			errors: [{ messageId: 'noArrayPushApply' }],
		},
		{
			name: 'const array with apply',
			code: 'const array: number[] = []; array.push.apply(array, items);',
			output: 'let array: number[] = []; array = array.concat(items);',
			errors: [{ messageId: 'noArrayPushApply' }],
		},
		{
			name: 'let array with apply',
			code: 'let myArray = new Array(); myArray.push.apply(myArray, largeArray);',
			output: 'let myArray = new Array(); myArray = myArray.concat(largeArray);',
			errors: [{ messageId: 'noArrayPushApply' }],
		},

		// Assignment expressions
		{
			name: 'apply in assignment expression',
			code: 'const arr: number[] = []; const result = arr.push.apply(arr, values);',
			output: 'const arr: number[] = []; const result = arr.concat(values);',
			errors: [{ messageId: 'noArrayPushApply' }],
		},

		// Class properties
		{
			name: 'class property with apply',
			code: `
				class Test {
					items: string[] = [];
					test() { this.items.push.apply(this.items, newItems); }
				}
			`,
			output: `
				class Test {
					items: string[] = [];
					test() { this.items = this.items.concat(newItems); }
				}
			`,
			errors: [{ messageId: 'noArrayPushApply' }],
		},

		// Type casting with apply
		{
			name: 'type cast with apply',
			code: '(obj.prop as SomeType[]).push.apply((obj.prop as SomeType[]), items);',
			output: 'obj.prop = (obj.prop as SomeType[]).concat(items);',
			errors: [{ messageId: 'noArrayPushApply' }],
		},

		// Array constructors with apply
		{
			name: 'generic Array constructor with apply',
			code: 'const arr = new Array<number>(); arr.push.apply(arr, bigNumbers);',
			output: 'let arr = new Array<number>(); arr = arr.concat(bigNumbers);',
			errors: [{ messageId: 'noArrayPushApply' }],
		},

		// Type system with apply
		{
			name: 'ReadonlyArray parameter with apply',
			code: 'function test(arr: ReadonlyArray<string>) { arr.push.apply(arr, items); }',
			output: 'function test(arr: ReadonlyArray<string>) { arr = arr.concat(items); }',
			errors: [{ messageId: 'noArrayPushApply' }],
		},

		// ARRAY.PROTOTYPE.PUSH.APPLY PATTERN TESTS
		// Basic cases
		{
			name: 'basic Array.prototype.push.apply pattern',
			code: 'const arr: number[] = []; Array.prototype.push.apply(arr, items);',
			output: 'let arr: number[] = []; arr = arr.concat(items);',
			errors: [{ messageId: 'noArrayPrototypePushApply' }],
		},
		{
			name: 'Array.prototype.push.apply with let array',
			code: 'let myArray = new Array(); Array.prototype.push.apply(myArray, largeArray);',
			output: 'let myArray = new Array(); myArray = myArray.concat(largeArray);',
			errors: [{ messageId: 'noArrayPrototypePushApply' }],
		},
		{
			name: 'Array.prototype.push.apply with const converted to let',
			code: 'const result = []; Array.prototype.push.apply(result, newItems);',
			output: 'let result = []; result = result.concat(newItems);',
			errors: [{ messageId: 'noArrayPrototypePushApply' }],
		},

		// Assignment expressions with prototype pattern
		{
			name: 'Array.prototype.push.apply in assignment expression',
			code: 'const arr: number[] = []; const length = Array.prototype.push.apply(arr, values);',
			output: 'const arr: number[] = []; const length = arr.concat(values);',
			errors: [{ messageId: 'noArrayPrototypePushApply' }],
		},

		// Class properties with prototype pattern
		{
			name: 'Array.prototype.push.apply with class property',
			code: `
				class Test {
					items: string[] = [];
					test() { Array.prototype.push.apply(this.items, newItems); }
				}
			`,
			output: `
				class Test {
					items: string[] = [];
					test() { this.items = this.items.concat(newItems); }
				}
			`,
			errors: [{ messageId: 'noArrayPrototypePushApply' }],
		},

		// Complex expressions with prototype pattern
		{
			name: 'Array.prototype.push.apply with complex array expression',
			code: 'const data = { arr: [] }; Array.prototype.push.apply(data.arr, serverResponse);',
			output: 'const data = { arr: [] }; data.arr = data.arr.concat(serverResponse);',
			errors: [{ messageId: 'noArrayPrototypePushApply' }],
		},

		// Type casting with prototype pattern
		{
			name: 'Array.prototype.push.apply with type cast',
			code: 'Array.prototype.push.apply((obj.prop as SomeType[]), items);',
			output: 'obj.prop = (obj.prop as SomeType[]).concat(items);',
			errors: [{ messageId: 'noArrayPrototypePushApply' }],
		},

		// Real-world example like the one shown
		{
			name: 'Array.prototype.push.apply real-world usage pattern',
			code: `
				const result = [];
				Array.prototype.push.apply(
					result,
					await getData()
				);
			`,
			output: `
				let result = [];
				result = result.concat(await getData());
			`,
			errors: [{ messageId: 'noArrayPrototypePushApply' }],
		},
	],
});
