import { compactNodeDefinition, stripExpressionUnions } from '../compact-node-definition';

describe('stripExpressionUnions', () => {
	it('removes Expression members, including nested generics', () => {
		expect(stripExpressionUnions('  a?: string | Expression<string>;')).toBe('  a?: string;');
		expect(stripExpressionUnions('  b?: Array<string | Expression<Array<string>>>;')).toBe(
			'  b?: Array<string>;',
		);
	});

	it('leaves lines without Expression unions unchanged', () => {
		expect(stripExpressionUnions("  mode: 'list' | 'id';")).toBe("  mode: 'list' | 'id';");
	});
});

describe('compactNodeDefinition', () => {
	const source = [
		'export interface NotionV2Params {',
		'    /**',
		'     * Title',
		'     */',
		'    title?: string | Expression<string>;',
		'',
		'    /**',
		'     * The ID of the page. Choose from the list, or specify an ID using an <a href="x">expression</a>.',
		'     * @displayOptions.show { resource: ["page"] }',
		'     * @searchListMethod getPages',
		'     * @default ""',
		'     */',
		"    pageId?: { __rl: true; mode: 'list' | 'id'; value: string } | Expression<string>;",
		'}',
	].join('\n');

	const compact = compactNodeDefinition(source);

	it('adds one note about expressions instead of a union on every field', () => {
		expect(compact.split('\n')[0]).toContain('expr(');
		expect(compact.split('\n').slice(1).join('\n')).not.toContain('Expression<');
	});

	it('drops doc lines that only repeat the field name', () => {
		expect(compact).not.toMatch(/\/\*\* Title \*\//);
		expect(compact).toContain('title?: string;');
	});

	it('keeps real descriptions and the tags the model needs, on one line', () => {
		expect(compact).toContain(
			'/** The ID of the page. @show { resource: ["page"] } @searchListMethod getPages @default "" */',
		);
		expect(compact).not.toContain('Choose from the list');
		expect(compact).not.toContain('<a href');
	});

	it('removes blank lines and halves indentation', () => {
		expect(compact).not.toMatch(/\n\s*\n/);
		expect(compact).toContain("\n  pageId?: { __rl: true; mode: 'list' | 'id'; value: string };");
	});

	it('returns empty content unchanged', () => {
		expect(compactNodeDefinition('')).toBe('');
	});
});
