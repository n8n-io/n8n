import {
	MCP_SERVER_SLUG_MAX_LENGTH,
	mcpServerSlugFromName,
	mcpServerSlugInput,
	mcpServerSlugSchema,
} from '../mcp-server.schema';

describe('mcpServerSlugFromName', () => {
	it.each([
		['Sales tools', 'sales-tools'],
		['  Marketing   Tools  ', 'marketing-tools'],
		['Q4 / EMEA: pipeline!', 'q4-emea-pipeline'],
		['Crème brûlée', 'creme-brulee'],
		['support_desk', 'support-desk'],
		['---', ''],
		['日本語', ''],
	])('makes %j into %j', (name, slug) => {
		expect(mcpServerSlugFromName(name)).toBe(slug);
	});

	it('cuts the slug to the maximum length, with no dash at the end', () => {
		const slug = mcpServerSlugFromName(`${'a'.repeat(63)} tools`);

		expect(slug).toBe('a'.repeat(63));
		expect(MCP_SERVER_SLUG_MAX_LENGTH).toBe(64);
	});

	it('makes a slug that the slug schema accepts', () => {
		for (const name of ['Sales tools', 'Crème brûlée 2', `${'x'.repeat(70)}`]) {
			expect(mcpServerSlugSchema.safeParse(mcpServerSlugFromName(name)).success).toBe(true);
		}
	});
});

describe('mcpServerSlugInput', () => {
	it('keeps a dash at the end, so that the builder can type the next word', () => {
		expect(mcpServerSlugInput('sales-')).toBe('sales-');
		expect(mcpServerSlugInput('Sales Tools ')).toBe('sales-tools-');
	});

	it('removes a dash at the start and joins dashes that follow each other', () => {
		expect(mcpServerSlugInput('-sales--tools')).toBe('sales-tools');
	});

	it('cuts the input to the maximum length', () => {
		expect(mcpServerSlugInput('a'.repeat(80))).toHaveLength(MCP_SERVER_SLUG_MAX_LENGTH);
	});
});
