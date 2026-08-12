import type { INodeTypeDescription } from 'n8n-workflow';
import {
	fieldPathFromJsonPath,
	isRenderedField,
	renderedFieldPaths,
	renderedFieldValue,
} from './outputFieldRendering';

const nodeType = (outputFieldRendering?: INodeTypeDescription['outputFieldRendering']) =>
	({ outputFieldRendering }) as INodeTypeDescription;

describe('renderedFieldPaths', () => {
	it('lists the paths declared for the kind', () => {
		expect(renderedFieldPaths(nodeType({ html: 'html' }), 'html')).toEqual(['html']);
	});

	it('is empty for a node type that declares nothing', () => {
		expect(renderedFieldPaths(nodeType(), 'html')).toEqual([]);
		expect(renderedFieldPaths(null, 'html')).toEqual([]);
	});
});

describe('isRenderedField', () => {
	it('matches a declared path', () => {
		expect(isRenderedField(nodeType({ 'page.html': 'html' }), 'html', 'page.html')).toBe(true);
	});

	it('does not match an undeclared path', () => {
		expect(isRenderedField(nodeType({ html: 'html' }), 'html', 'body')).toBe(false);
	});
});

describe('renderedFieldValue', () => {
	it('reads a dotted path', () => {
		expect(renderedFieldValue({ page: { html: '<p>hi</p>' } }, 'page.html')).toBe('<p>hi</p>');
	});

	it('ignores a missing, empty or non-string value', () => {
		expect(renderedFieldValue({}, 'html')).toBe('');
		expect(renderedFieldValue({ html: '' }, 'html')).toBe('');
		expect(renderedFieldValue({ html: 42 }, 'html')).toBe('');
		expect(renderedFieldValue(undefined, 'html')).toBe('');
	});
});

describe('fieldPathFromJsonPath', () => {
	test.each([
		['[0].html', 'html'],
		['.html', 'html'],
		['[12].page.html', 'page.html'],
		['html', 'html'],
	])('%s -> %s', (jsonPath, fieldPath) => {
		expect(fieldPathFromJsonPath(jsonPath)).toBe(fieldPath);
	});
});
