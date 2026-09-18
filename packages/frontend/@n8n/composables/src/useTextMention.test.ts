import { ref } from 'vue';

import { useTextMention } from './useTextMention';

interface Result {
	id: string;
	disabled?: boolean;
}

function setup(initialResults: Result[] = [{ id: 'workflow-1' }, { id: 'workflow-2' }]) {
	const results = ref(initialResults);
	const mention = useTextMention({
		results,
		getResultId: (result) => result.id,
		isResultDisabled: (result) => result.disabled === true,
	});
	return { mention, results };
}

describe('useTextMention', () => {
	it('opens after an at sign at the start of text', () => {
		const { mention } = setup();
		mention.handleTextInput('@work', 5, 5);

		expect(mention.isOpen.value).toBe(true);
		expect(mention.query.value).toBe('work');
		expect(mention.activeRange.value).toEqual({ start: 0, end: 5 });
	});

	it('opens after whitespace and tracks a multi-word query', () => {
		const { mention } = setup();
		mention.handleTextInput('Review @support triage', 22, 22);

		expect(mention.isOpen.value).toBe(true);
		expect(mention.query.value).toBe('support triage');
	});

	it('does not open inside an email address', () => {
		const { mention } = setup();
		mention.handleTextInput('help@example.com', 16, 16);

		expect(mention.isOpen.value).toBe(false);
	});

	it('closes when the caret moves before the trigger', () => {
		const { mention } = setup();
		mention.handleTextInput('Review @work', 12, 12);
		mention.handleSelectionChange('Review @work', 6, 6);

		expect(mention.isOpen.value).toBe(false);
	});

	it('closes when the trigger is deleted', () => {
		const { mention } = setup();
		mention.handleTextInput('@work', 5, 5);
		mention.handleTextInput('work', 4, 4);

		expect(mention.isOpen.value).toBe(false);
	});

	it('moves the highlight with ArrowDown and ArrowUp', () => {
		const { mention } = setup();
		mention.handleTextInput('@', 1, 1);
		expect(mention.highlightedId.value).toBe('workflow-1');

		mention.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
		expect(mention.highlightedId.value).toBe('workflow-2');
		mention.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
		expect(mention.highlightedId.value).toBe('workflow-1');
	});

	it.each(['Enter', 'Tab'])('selects the highlighted result with %s', (key) => {
		const { mention } = setup();
		mention.handleTextInput('@', 1, 1);
		const event = new KeyboardEvent('keydown', { key, cancelable: true });

		expect(mention.handleKeydown(event)).toEqual({
			type: 'select',
			result: { id: 'workflow-1' },
		});
		expect(event.defaultPrevented).toBe(true);
	});

	it('closes with Escape', () => {
		const { mention } = setup();
		mention.handleTextInput('@', 1, 1);

		expect(
			mention.handleKeydown(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })),
		).toEqual({ type: 'close' });
		expect(mention.isOpen.value).toBe(false);
	});

	it('does not select during IME composition', () => {
		const { mention } = setup();
		mention.handleTextInput('@', 1, 1);
		mention.startComposition();

		expect(
			mention.handleKeydown(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true })),
		).toBeUndefined();
		expect(mention.isOpen.value).toBe(true);
	});

	it('returns a controlled text edit and caret position', () => {
		const { mention } = setup();
		mention.handleTextInput('Review @supp now', 12, 12);

		expect(mention.applySelection('Review @supp now', 'Support triage')).toEqual({
			value: 'Review Support triage  now',
			selectionStart: 22,
			selectionEnd: 22,
		});
	});

	it('opens from a button with a saved selection', () => {
		const { mention } = setup();
		mention.openFromButton(7, 11);

		expect(mention.origin.value).toBe('button');
		expect(mention.applySelection('Review this workflow', 'Support triage')).toEqual({
			value: 'Review Support triage  workflow',
			selectionStart: 22,
			selectionEnd: 22,
		});
	});

	it('keeps the current query when provider results arrive out of order', async () => {
		const { mention, results } = setup([]);
		mention.handleTextInput('@support', 8, 8);

		results.value = [{ id: 'old-result' }];
		await Promise.resolve();
		results.value = [{ id: 'current-result' }];
		await Promise.resolve();

		expect(mention.query.value).toBe('support');
		expect(mention.highlightedId.value).toBe('current-result');
	});

	it('keeps disabled results discoverable but does not select them', () => {
		const { mention } = setup([{ id: 'selected', disabled: true }, { id: 'available' }]);
		mention.handleTextInput('@', 1, 1);
		const enter = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });

		expect(mention.highlightedId.value).toBe('selected');
		expect(mention.handleKeydown(enter)).toBeUndefined();
		expect(enter.defaultPrevented).toBe(true);
		mention.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
		expect(mention.highlightedId.value).toBe('available');
	});

	it('consumes Enter while an open picker has no result', () => {
		const { mention } = setup([]);
		mention.handleTextInput('@missing', 8, 8);
		const enter = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });

		expect(mention.handleKeydown(enter)).toBeUndefined();
		expect(enter.defaultPrevented).toBe(true);
	});
});
