import { EditorState } from '@codemirror/state';
import { EditorView, getTooltip, showTooltip, type Tooltip } from '@codemirror/view';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { n8nLang } from '@/plugins/codemirror/n8nLang';
import { hoverTooltipSource, infoBoxTooltips } from './InfoBoxTooltip';
import * as utils from '@/plugins/codemirror/completions/utils';
import * as workflowHelpers from '@/composables/useWorkflowHelpers';
import { completionStatus } from '@codemirror/autocomplete';

vi.mock('@codemirror/autocomplete', async (importOriginal) => {
	const actual = await importOriginal<{}>();

	return {
		...actual,
		completionStatus: vi.fn(() => null),
	};
});

describe('Infobox tooltips', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		vi.spyOn(utils, 'hasActiveNode').mockReturnValue(true);
	});

	describe('Cursor tooltips', () => {
		test('should NOT show a tooltip for: {{ $max(1,2) }} foo|', () => {
			const tooltips = cursorTooltips('{{ $max(1,2) }} foo|');
			expect(tooltips.length).toBe(0);
		});

		test('should NOT show a tooltip for: {{ $ma|x() }}', () => {
			const tooltips = cursorTooltips('{{ $ma|x() }}');
			expect(tooltips.length).toBe(0);
		});

		test('should show a tooltip for: {{ $max(|) }}', () => {
			const tooltips = cursorTooltips('{{ $max(|) }}');
			expect(tooltips.length).toBe(1);
			expect(infoBoxHeader(tooltips[0].view)).toHaveTextContent('$max(...numbers)');
			expect(highlightedArgIndex(tooltips[0].view)).toBe(0);
		});

		test('should show a tooltip for: {{ $max(1,2,3,|) }}', () => {
			const tooltips = cursorTooltips('{{ $max(1, 2|) }}');
			expect(tooltips.length).toBe(1);
			expect(infoBoxHeader(tooltips[0].view)).toHaveTextContent('$max(...numbers)');
			expect(highlightedArgIndex(tooltips[0].view)).toBe(0);
		});

		test('should NOT show a tooltip for: {{ $json.str|.includes("test") }}', () => {
			const tooltips = cursorTooltips('{{ $json.str|.includes("test") }}');
			expect(tooltips.length).toBe(0);
		});

		test('should show a tooltip for: {{ $json.str.includes(|) }}', () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValue('a string');
			const tooltips = cursorTooltips('{{ $json.str.includes(|) }}');
			expect(tooltips.length).toBe(1);
			expect(infoBoxHeader(tooltips[0].view)).toHaveTextContent('includes(searchString, start?)');
			expect(highlightedArgIndex(tooltips[0].view)).toBe(0);
		});

		test('should show a tooltip for: {{ $json.str.includes("tes|t") }}', () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValue('a string');
			const tooltips = cursorTooltips('{{ $json.str.includes("tes|t") }}');
			expect(tooltips.length).toBe(1);
			expect(infoBoxHeader(tooltips[0].view)).toHaveTextContent('includes(searchString, start?)');
			expect(highlightedArgIndex(tooltips[0].view)).toBe(0);
		});

		test('should show a tooltip for: {{ $json.str.includes("test",|) }}', () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValue('a string');
			const tooltips = cursorTooltips('{{ $json.str.includes("test",|) }}');
			expect(tooltips.length).toBe(1);
			expect(infoBoxHeader(tooltips[0].view)).toHaveTextContent('includes(searchString, start?)');
			expect(highlightedArgIndex(tooltips[0].view)).toBe(1);
		});
	});

	describe('Hover tooltips', () => {
		test('should NOT show a tooltip for: {{ $max(1,2) }} foo|', () => {
			const tooltip = hoverTooltip('{{ $max(1,2) }} foo|');
			expect(tooltip).toBeNull();
		});

		test('should show a tooltip for: {{ $jso|n }}', () => {
			const tooltip = hoverTooltip('{{ $jso|n }}');
			expect(tooltip).not.toBeNull();
			expect(infoBoxHeader(tooltip?.view)).toHaveTextContent('$json');
		});

		test('should show a tooltip for: {{ $execution.mo|de }}', () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValue({ mode: 'foo' });
			const tooltip = hoverTooltip('{{ $execution.mo|de }}');
			expect(tooltip).not.toBeNull();
			expect(infoBoxHeader(tooltip?.view)).toHaveTextContent('mode');
		});

		test('should show a tooltip for: {{ $jmespa|th() }}', () => {
			const tooltip = hoverTooltip('{{ $jmespa|th() }}');
			expect(tooltip).not.toBeNull();
			expect(infoBoxHeader(tooltip?.view)).toHaveTextContent('$jmespath(obj, expression)');
		});

		test('should show a tooltip for: {{ $json.str.includ|es() }}', () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValue('foo');
			const tooltip = hoverTooltip('{{ $json.str.includ|es() }}');
			expect(tooltip).not.toBeNull();
			expect(infoBoxHeader(tooltip?.view)).toHaveTextContent('includes(searchString, start?)');
		});

		test('should not show a tooltip when autocomplete is open', () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValue('foo');
			vi.mocked(completionStatus).mockReturnValue('active');
			const tooltip = hoverTooltip('{{ $json.str.includ|es() }}');
			expect(tooltip).toBeNull();
		});
	});
});

function highlightedArgIndex(infoBox: HTMLElement | undefined) {
	return Array.from(infoBox?.querySelectorAll('.autocomplete-info-arg-name') ?? []).findIndex(
		(arg) => arg.localName === 'strong',
	);
}

function infoBoxHeader(infoBox: HTMLElement | undefined) {
	return infoBox?.querySelector('.autocomplete-info-header');
}

function cursorTooltips(docWithCursor: string) {
	const cursorPosition = docWithCursor.indexOf('|');

	const doc = docWithCursor.slice(0, cursorPosition) + docWithCursor.slice(cursorPosition + 1);

	const state = EditorState.create({
		doc,
		selection: { anchor: cursorPosition },
		extensions: [n8nLang(), infoBoxTooltips()],
	});
	const view = new EditorView({ parent: document.createElement('div'), state });

	return state
		.facet(showTooltip)
		.filter((t): t is Tooltip => !!t)
		.map((tooltip) => ({ tooltip, view: getTooltip(view, tooltip)?.dom }));
}

function hoverTooltip(docWithCursor: string) {
	const hoverPosition = docWithCursor.indexOf('|');

	const doc = docWithCursor.slice(0, hoverPosition) + docWithCursor.slice(hoverPosition + 1);

	const state = EditorState.create({
		doc,
		extensions: [n8nLang(), infoBoxTooltips()],
	});

	const view = new EditorView({ state, parent: document.createElement('div') });

	const tooltip = hoverTooltipSource(view, hoverPosition);

	if (!tooltip) {
		return null;
	}

	return { tooltip, view: tooltip.create(view).dom };
}
