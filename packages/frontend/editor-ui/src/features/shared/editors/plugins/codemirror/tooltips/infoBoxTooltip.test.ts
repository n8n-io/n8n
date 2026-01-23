import { EditorState } from '@codemirror/state';
import { EditorView, getTooltip, showTooltip, type Tooltip } from '@codemirror/view';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { n8nLang } from '@/features/shared/editors/plugins/codemirror/n8nLang';
import { hoverTooltipSource, infoBoxTooltips } from './InfoBoxTooltip';
import * as utils from '@/features/shared/editors/plugins/codemirror/completions/utils';
import * as workflowHelpers from '@/app/composables/useWorkflowHelpers';
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
		test('should NOT show a tooltip for: {{ $max(1,2) }} foo|', async () => {
			const tooltips = await cursorTooltips('{{ $max(1,2) }} foo|');
			expect(tooltips.length).toBe(0);
		});

		test('should NOT show a tooltip for: {{ $ma|x() }}', async () => {
			const tooltips = await cursorTooltips('{{ $ma|x() }}');
			expect(tooltips.length).toBe(0);
		});

		test('should show a tooltip for: {{ $max(|) }}', async () => {
			const tooltips = await cursorTooltips('{{ $max(|) }}');
			expect(tooltips.length).toBe(1);
			expect(infoBoxHeader(tooltips[0].view)).toHaveTextContent('$max(...numbers)');
			expect(highlightedArgIndex(tooltips[0].view)).toBe(0);
		});

		test('should show a tooltip for: {{ $max(1,2,3,|) }}', async () => {
			const tooltips = await cursorTooltips('{{ $max(1, 2|) }}');
			expect(tooltips.length).toBe(1);
			expect(infoBoxHeader(tooltips[0].view)).toHaveTextContent('$max(...numbers)');
			expect(highlightedArgIndex(tooltips[0].view)).toBe(0);
		});

		test('should NOT show a tooltip for: {{ $json.str|.includes("test") }}', async () => {
			const tooltips = await cursorTooltips('{{ $json.str|.includes("test") }}');
			expect(tooltips.length).toBe(0);
		});

		test('should show a tooltip for: {{ $json.str.includes(|) }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValue('a string');
			const tooltips = await cursorTooltips('{{ $json.str.includes(|) }}');
			expect(tooltips.length).toBe(1);
			expect(infoBoxHeader(tooltips[0].view)).toHaveTextContent('includes(searchString, start?)');
			expect(highlightedArgIndex(tooltips[0].view)).toBe(0);
		});

		test('should show a tooltip for: {{ $json.str.includes("tes|t") }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValue('a string');
			const tooltips = await cursorTooltips('{{ $json.str.includes("tes|t") }}');
			expect(tooltips.length).toBe(1);
			expect(infoBoxHeader(tooltips[0].view)).toHaveTextContent('includes(searchString, start?)');
			expect(highlightedArgIndex(tooltips[0].view)).toBe(0);
		});

		test('should show a tooltip for: {{ $json.str.includes("test",|) }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValue('a string');
			const tooltips = await cursorTooltips('{{ $json.str.includes("test",|) }}');
			expect(tooltips.length).toBe(1);
			expect(infoBoxHeader(tooltips[0].view)).toHaveTextContent('includes(searchString, start?)');
			expect(highlightedArgIndex(tooltips[0].view)).toBe(1);
		});
	});

	describe('Hover tooltips', () => {
		test('should NOT show a tooltip for: {{ $max(1,2) }} foo|', async () => {
			const tooltip = await hoverTooltip('{{ $max(1,2) }} foo|');
			expect(tooltip).toBeNull();
		});

		test('should show a tooltip for: {{ $jso|n }}', async () => {
			const tooltip = await hoverTooltip('{{ $jso|n }}');
			expect(tooltip).not.toBeNull();
			expect(infoBoxHeader(tooltip?.view)).toHaveTextContent('$json');
		});

		test('should show a tooltip for: {{ $execution.mo|de }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValue({ mode: 'foo' });
			const tooltip = await hoverTooltip('{{ $execution.mo|de }}');
			expect(tooltip).not.toBeNull();
			expect(infoBoxHeader(tooltip?.view)).toHaveTextContent('mode');
		});

		test('should show a tooltip for: {{ $jmespa|th() }}', async () => {
			const tooltip = await hoverTooltip('{{ $jmespa|th() }}');
			expect(tooltip).not.toBeNull();
			expect(infoBoxHeader(tooltip?.view)).toHaveTextContent('$jmespath(obj, expression)');
		});

		test('should show a tooltip for: {{ $json.str.includ|es() }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValue('foo');
			const tooltip = await hoverTooltip('{{ $json.str.includ|es() }}');
			expect(tooltip).not.toBeNull();
			expect(infoBoxHeader(tooltip?.view)).toHaveTextContent('includes(searchString, start?)');
		});

		test('should not show a tooltip when autocomplete is open', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValue('foo');
			vi.mocked(completionStatus).mockReturnValue('active');
			const tooltip = await hoverTooltip('{{ $json.str.includ|es() }}');
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

async function cursorTooltips(docWithCursor: string) {
	const cursorPosition = docWithCursor.indexOf('|');

	const doc = docWithCursor.slice(0, cursorPosition) + docWithCursor.slice(cursorPosition + 1);

	const state = EditorState.create({
		doc,
		selection: { anchor: cursorPosition },
		extensions: [n8nLang(), infoBoxTooltips()],
	});
	const view = new EditorView({ parent: document.createElement('div'), state });

	// Wait for async tooltip loading to complete
	// The async loader runs on initial create, so we need to wait for it
	await new Promise((resolve) => setTimeout(resolve, 50));

	// Force a state read to ensure any pending updates are processed
	view.requestMeasure();
	await new Promise((resolve) => setTimeout(resolve, 10));

	return view.state
		.facet(showTooltip)
		.filter((t): t is Tooltip => !!t)
		.map((tooltip) => ({ tooltip, view: getTooltip(view, tooltip)?.dom }));
}

async function hoverTooltip(docWithCursor: string) {
	const hoverPosition = docWithCursor.indexOf('|');

	const doc = docWithCursor.slice(0, hoverPosition) + docWithCursor.slice(hoverPosition + 1);

	const state = EditorState.create({
		doc,
		extensions: [n8nLang(), infoBoxTooltips()],
	});

	const view = new EditorView({ state, parent: document.createElement('div') });

	const tooltip = await hoverTooltipSource(view, hoverPosition);

	if (!tooltip) {
		return null;
	}

	return { tooltip, view: tooltip.create(view).dom };
}
