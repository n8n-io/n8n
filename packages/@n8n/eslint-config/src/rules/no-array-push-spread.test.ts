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
		{ code: 'fn(1, 2, 3)' },
		{ code: 'fn(...deps)' },
		{ code: 'obj.method(...args)' },
		{ code: 'new Foo(...args)' },
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
		{ code: '[].push(...[1, 2, 3]);' },
		{ code: '[1, 2].push(item, ...[4, 5, 6]);' },
		{ code: 'const arr: number[] = []; arr.push(...[1, 2, 3]);' },
		{ code: 'const arr: string[] = ["a"]; arr.push(...["b", "c"]);' },
		{ code: '[].push(1, 2, 3);' },
		{ code: 'new Array().push(item);' },
		{ code: 'const arr: number[] = []; arr.push(1, 2, 3);' },
		{ code: 'const myArray: string[] = []; myArray.push("item");' },
		{ code: '[].concat(items);' },
		{ code: '[1, 2].concat(items1, items2);' },
		{ code: 'const arr: number[] = []; const result = arr.concat(items);' },
		{ code: 'let arr: string[] = []; arr = arr.concat(items1, items2);' },
		{ code: 'arr.push(...items);' },
		{ code: 'myArray.push(...values);' },
	],
	invalid: [
		{
			code: '[].push(...items);',
			output: '[] = [].concat(items);',
			errors: [{ messageId: 'noArrayPushSpread' }],
		},
		{
			code: '[1, 2].push(...newItems);',
			output: '[1, 2] = [1, 2].concat(newItems);',
			errors: [{ messageId: 'noArrayPushSpread' }],
		},
		{
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
			name: 'const array converted to let with reassignment',
			code: 'const array: number[] = []; array.push(...items);',
			output: 'let array: number[] = []; array = array.concat(items);',
			errors: [{ messageId: 'noArrayPushSpread' }],
		},
		{
			name: 'const array converted to let with reassignment (multiple scopes)',
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
			name: 'const with new Array constructor converted to let',
			code: 'const myArray = new Array<number>(); myArray.push(...items);',
			output: 'let myArray = new Array<number>(); myArray = myArray.concat(items);',
			errors: [{ messageId: 'noArrayPushSpread' }],
		},
		{
			name: 'const with multiple declarations converted to let',
			code: 'const arr = [], other = 1; arr.push(...items);',
			output: 'let arr = [], other = 1; arr = arr.concat(items);',
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
		{
			name: 'generic Array constructor with multiple spreads',
			code: 'let myArray = new Array<number>(); myArray.push(...items1, ...items2);',
			output: 'let myArray = new Array<number>(); myArray = myArray.concat(items1).concat(items2);',
			errors: [{ messageId: 'noArrayPushSpread' }],
		},
		{
			name: 'function parameter with ReadonlyArray',
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
		{
			name: 'regular args after spread (cannot autofix)',
			code: 'new Array().push(a, ...items, b);',
			output: null,
			errors: [{ messageId: 'noArrayPushSpread' }],
		},
		{
			name: 'typed array with args after spread (cannot autofix)',
			code: 'const numbers: number[] = []; numbers.push(a, ...items, b);',
			output: null,
			errors: [{ messageId: 'noArrayPushSpread' }],
		},
		{
			name: 'type cast expression - can autofix with proper assignment',
			code: '(obj.prop as SomeType[]).push(...items);',
			output: 'obj.prop = (obj.prop as SomeType[]).concat(items);',
			errors: [{ messageId: 'noArrayPushSpread' }],
		},
	],
});
