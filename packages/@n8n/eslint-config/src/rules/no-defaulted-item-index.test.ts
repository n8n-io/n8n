import { RuleTester } from '@typescript-eslint/rule-tester';

import { NoDefaultedItemIndexRule } from './no-defaulted-item-index.js';

const ruleTester = new RuleTester();

ruleTester.run('no-defaulted-item-index', NoDefaultedItemIndexRule, {
	valid: [
		// Required `itemIndex`, the shape every call site has to satisfy.
		{
			code: 'function resolveTarget(this: IExecuteFunctions, itemIndex: number) { return this.getNodeParameter("target", itemIndex); }',
		},
		// Required and placed before defaulted params, so call sites need no padding.
		{
			code: 'function resolveTarget(this: IExecuteFunctions, itemIndex: number, cache = new Map()) { return this.getNodeParameter("target", itemIndex); }',
		},
		// A default is harmless when the index is only carried for error attribution.
		{
			code: 'function checkAccess(node: INode, itemIndex = 0) { throw new NodeOperationError(node, "no access", { itemIndex }); }',
		},
		// Unrelated defaulted parameter.
		{
			code: 'function resolveTarget(this: IExecuteFunctions, itemIndex: number, mode = "user") { return this.getNodeParameter(mode, itemIndex); }',
		},
		// Reads a node-level parameter at a literal 0 and only carries `itemIndex`
		// for error attribution, so the default cannot mis-resolve anything.
		{
			code: 'async function apiRequest(this: IExecuteFunctions, endpoint: string, itemIndex = 0) { const auth = this.getNodeParameter("authentication", 0); return await request(endpoint, auth, itemIndex); }',
		},
		// The read uses the loop's own binding, which shadows the outer default.
		{
			code: 'function resolveAll(this: IExecuteFunctions, itemIndex = 0) { for (let itemIndex = 0; itemIndex < items.length; itemIndex++) { this.getNodeParameter("target", itemIndex); } }',
		},
		// Destructured, but the call site cannot omit it.
		{
			code: 'function resolveTarget(this: IExecuteFunctions, { itemIndex }: { itemIndex: number }) { return this.getNodeParameter("target", itemIndex); }',
		},
		// `&&` is not a fallback: it cannot stand in for a missing index.
		{
			code: 'function resolveTarget(this: IExecuteFunctions, itemIndex: number) { return this.getNodeParameter("target", itemIndex && offset); }',
		},
	],
	invalid: [
		{
			code: 'function resolveTarget(this: IExecuteFunctions, itemIndex = 0) { return this.getNodeParameter("target", itemIndex); }',
			errors: [{ messageId: 'requireItemIndex' }],
		},
		{
			code: 'function resolveTarget(this: IExecuteFunctions, itemIndex?: number) { return this.getNodeParameter("target", itemIndex ?? 0); }',
			errors: [{ messageId: 'noItemIndexFallback' }],
		},
		// An optional property of a required destructured parameter: scope alone
		// cannot see that callers may omit it, the fallback gives it away.
		{
			code: 'function resolveTarget(this: IExecuteFunctions, { itemIndex }: { itemIndex?: number }) { return this.getNodeParameter("target", itemIndex ?? 0); }',
			errors: [{ messageId: 'noItemIndexFallback' }],
		},
		// Same for a named parameter type, which the rule cannot resolve without
		// type information.
		{
			code: 'function resolveTarget(this: IExecuteFunctions, { itemIndex }: SendOptions) { return this.getNodeParameter("target", itemIndex || 0); }',
			errors: [{ messageId: 'noItemIndexFallback' }],
		},
		// Defaulted index sitting before other defaulted params is still defaulted.
		{
			code: 'async function resolveRoot(this: AuthContext, itemIndex = 0, cache = new Map()) { return this.getNodeParameter("workbook", itemIndex); }',
			errors: [{ messageId: 'requireItemIndex' }],
		},
		{
			code: 'const resolveTarget = (ctx: IExecuteFunctions, itemIndex = 0) => ctx.getNodeParameter("target", itemIndex);',
			errors: [{ messageId: 'requireItemIndex' }],
		},
		// A nested parameter that only mentions the name must not hide the outer
		// defaulted index the callback actually reads.
		{
			code: 'function resolveAll(this: IExecuteFunctions, itemIndex = 0) { return items.map((item: ItemWithItemIndex) => this.getNodeParameter("target", itemIndex)); }',
			errors: [{ messageId: 'requireItemIndex' }],
		},
		{
			code: 'function resolveAll(this: IExecuteFunctions, itemIndex = 0) { return items.map((itemIndexes: number[]) => this.getNodeParameter("target", itemIndex)); }',
			errors: [{ messageId: 'requireItemIndex' }],
		},
		// Destructured with a default: the call site can still omit it.
		{
			code: 'function resolveTarget(this: IExecuteFunctions, { itemIndex = 0 }: { itemIndex?: number }) { return this.getNodeParameter("target", itemIndex); }',
			errors: [{ messageId: 'requireItemIndex' }],
		},
		// Optional destructured binding, same hole.
		{
			code: 'function resolveTarget(this: IExecuteFunctions, { itemIndex }: { itemIndex?: number } = {}) { return this.getNodeParameter("target", itemIndex); }',
			errors: [{ messageId: 'requireItemIndex' }],
		},
	],
});
