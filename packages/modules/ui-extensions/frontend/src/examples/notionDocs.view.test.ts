import { fireEvent } from '@testing-library/vue';
import { nextTick } from 'vue';

import { NOW, otherPage, renderBuiltinView } from '../__tests__/render-builtin-view';

const render = () => renderBuiltinView('builtin:notion-docs', otherPage, null);

describe('Notion docs page', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['Date', 'setTimeout'] });
		vi.setSystemTime(NOW);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('lists the documents and renders the first one, block by block', () => {
		const { getAllByTestId, getByTestId } = render();

		expect(getAllByTestId('notion-docs-document').map((el) => el.textContent)).toEqual([
			expect.stringContaining('On-call runbook'),
			expect.stringContaining('Lead routing spec'),
			expect.stringContaining('Credential rotation'),
		]);
		expect(getByTestId('notion-docs-title').textContent).toBe('On-call runbook');
		expect(getByTestId('notion-docs-properties').textContent).toContain('Platform team');
		expect(getByTestId('notion-docs-callout').textContent).toContain('three steps');
		expect(getByTestId('notion-docs-code').textContent).toContain('FROM execution_entity');
		expect(getByTestId('notion-docs-sample').textContent).toBe('Sample data');
	});

	it('renders another document when the user picks it', async () => {
		const { getAllByTestId, getByTestId, queryByTestId } = render();

		await fireEvent.click(getAllByTestId('notion-docs-document')[1]);

		expect(getByTestId('notion-docs-title').textContent).toBe('Lead routing spec');
		expect(getByTestId('notion-docs-article').textContent).toContain('round-robin');
		expect(queryByTestId('notion-docs-code')).toBeNull();
		expect(getAllByTestId('notion-docs-document')[1].getAttribute('aria-current')).toBe('page');
	});

	it('counts the tasks and keeps a ticked task for each document', async () => {
		const { getAllByTestId, getByTestId } = render();
		expect(getByTestId('notion-docs-tasks').textContent).toBe('1 of 3 done');

		await fireEvent.click(getAllByTestId('notion-docs-todo')[1]);
		expect(getByTestId('notion-docs-tasks').textContent).toBe('2 of 3 done');

		await fireEvent.click(getAllByTestId('notion-docs-document')[2]);
		expect(getByTestId('notion-docs-tasks').textContent).toBe('2 of 4 done');

		await fireEvent.click(getAllByTestId('notion-docs-document')[0]);
		expect(getByTestId('notion-docs-tasks').textContent).toBe('2 of 3 done');
	});

	it('syncs again on request', async () => {
		const { getByTestId } = render();
		expect(getByTestId('notion-docs-synced').textContent).toBe('Synced now');

		vi.setSystemTime(new Date(NOW.getTime() + 5 * 60_000));
		await fireEvent.click(getByTestId('notion-docs-sync'));
		expect(getByTestId('notion-docs-synced').textContent).toBe('Syncing…');

		vi.advanceTimersByTime(600);
		await nextTick();
		expect(getByTestId('notion-docs-synced').textContent).toBe('Synced now');
	});

	it('opens the document in Notion', async () => {
		const { getAllByTestId, getByTestId, actions } = render();

		await fireEvent.click(getAllByTestId('notion-docs-document')[2]);
		await fireEvent.click(getByTestId('notion-docs-open'));

		expect(actions).toEqual([
			{ type: 'openUrl', url: 'https://www.notion.so/acme-corp/credential-rotation' },
		]);
	});

	it('only translates keys that the host sends it', () => {
		const { usedKeys, strings, getAllByTestId } = render();
		for (const button of getAllByTestId('notion-docs-document')) button.click();

		for (const key of usedKeys) expect(Object.keys(strings), key).toContain(key);
	});
});
