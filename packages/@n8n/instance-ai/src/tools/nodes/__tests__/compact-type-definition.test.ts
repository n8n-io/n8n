import { compactTypeDefinition } from '../compact-type-definition';

const HINT =
	'NEVER put static authentication values (API keys, tokens, PATs) in parameters. Set authentication to "genericCredentialType" and add a credential instead of a header or body value.';

const DEFINITION = `/**
 * HTTP Request Node - Version 4.5
 */

export interface HttpRequestV45Params {
/**
 * The request method to use
 * @default GET
 */
    method?: 'GET' | 'POST' | 'COPY' | 'COPY' | Expression<string>;
/**
 * Should evaluate to the URL of the next page. &lt;a href="https://docs.n8n.io/x" target="_blank"&gt;More info&lt;/a&gt;.
 * @displayOptions.show { paginationMode: ["responseContainsNextURL"] }
 */
    nextURL?: string | Expression<string>;
/**
 * Body Parameters
 * @builderHint ${HINT}
 * @displayOptions.show { sendBody: [true] }
 */
    bodyParameters?: {
        /** Value
       */
      value?: string | Expression<string>;
  };
/**
 * JSON
 * @builderHint ${HINT}
 */
    jsonBody?: string | Expression<string>;
/**
 * Whether to optimize the tool response
 * @displayOptions.show { @tool: [true] }
 * @default false
 */
    optimizeResponse?: boolean;
}
`;

describe('compactTypeDefinition', () => {
	it('keeps every member, type, default, and display condition of the base node', () => {
		const compact = compactTypeDefinition(DEFINITION, 'n8n-nodes-base.httpRequest');

		expect(compact).toContain('method?:');
		expect(compact).toContain('nextURL?: string | Expression<string>;');
		expect(compact).toContain('bodyParameters?: {');
		expect(compact).toContain('value?: string | Expression<string>;');
		expect(compact).toContain('jsonBody?:');
		expect(compact).toContain('// @default GET');
		expect(compact).toContain(
			'// @displayOptions.show { paginationMode: ["responseContainsNextURL"] }',
		);
		expect(compact).toContain(`// @builderHint ${HINT}`);
	});

	it('is shorter than the generated definition', () => {
		const compact = compactTypeDefinition(DEFINITION, 'n8n-nodes-base.httpRequest');
		expect(compact.length).toBeLessThan(DEFINITION.length * 0.8);
	});

	it('removes duplicate literals from a union', () => {
		const compact = compactTypeDefinition(DEFINITION, 'n8n-nodes-base.httpRequest');
		expect(compact).toContain("method?: 'GET' | 'POST' | 'COPY' | Expression<string>;");
	});

	it('decodes HTML entities and strips link markup in comments', () => {
		const compact = compactTypeDefinition(DEFINITION, 'n8n-nodes-base.httpRequest');
		expect(compact).toContain('// Should evaluate to the URL of the next page. More info.');
		expect(compact).not.toContain('&lt;');
		expect(compact).not.toContain('href=');
	});

	it('replaces a repeated long builder hint with a back-reference', () => {
		const compact = compactTypeDefinition(DEFINITION, 'n8n-nodes-base.httpRequest');
		expect(compact.split(HINT)).toHaveLength(2);
		expect(compact).toContain('// @builderHint Same as the identical @builderHint above.');
	});

	it('drops a title comment that only repeats the member name', () => {
		const compact = compactTypeDefinition(DEFINITION, 'n8n-nodes-base.httpRequest');
		expect(compact).not.toContain('// Value');
	});

	it('drops members that only show while the node runs as a tool', () => {
		const compact = compactTypeDefinition(DEFINITION, 'n8n-nodes-base.httpRequest');
		expect(compact).not.toContain('optimizeResponse');
	});

	it('keeps tool-only members on the tool variant of the node', () => {
		const compact = compactTypeDefinition(DEFINITION, 'n8n-nodes-base.httpRequestTool');
		expect(compact).toContain('optimizeResponse?: boolean;');
	});

	it('indents nested members one space deeper than their parent', () => {
		const compact = compactTypeDefinition(DEFINITION, 'n8n-nodes-base.httpRequest');
		const lines = compact.split('\n');
		const parent = lines.find((line) => line.includes('bodyParameters?: {'));
		const child = lines.find((line) => line.includes('value?: string'));

		expect(parent).toBe(' bodyParameters?: {');
		expect(child).toBe('  value?: string | Expression<string>;');
	});

	it('returns empty content unchanged', () => {
		expect(compactTypeDefinition('', 'n8n-nodes-base.set')).toBe('');
	});
});
