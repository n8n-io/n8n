import type { OperatorLogRecord } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { createRouter, createWebHistory } from 'vue-router';

import { createComponentRenderer } from '@/__tests__/render';

import OperatorConsoleLogRow from './OperatorConsoleLogRow.vue';

const router = createRouter({
	history: createWebHistory(),
	routes: [{ path: '/', name: 'home', component: { template: '<div></div>' } }],
});

const renderRow = createComponentRenderer(OperatorConsoleLogRow, {
	global: { plugins: [router] },
});

const record = (overrides: Partial<OperatorLogRecord> = {}): OperatorLogRecord => ({
	seq: 1,
	ts: '2026-08-12T13:06:28.497Z',
	hostId: 'main-1',
	role: 'main',
	stream: 'log',
	level: 'debug',
	origin: 'live',
	message: 'Skipped browserId check',
	...overrides,
});

describe('OperatorConsoleLogRow', () => {
	const renderWith = (level: OperatorLogRecord['level']) =>
		renderRow({
			pinia: createTestingPinia(),
			props: { record: record({ level }), expanded: false },
		});

	/**
	 * The message carries the level's colour, the way the dev-mode console does.
	 * Asserting on the generated class rather than the computed colour keeps this
	 * from breaking every time a design token is retuned.
	 */
	it.each([
		['error', 'message-error'],
		['warn', 'message-warn'],
		['debug', 'message-debug'],
	] as const)('tints a %s message', (level, expectedClass) => {
		const { getByText } = renderWith(level);

		const message = getByText('Skipped browserId check');

		expect(message.className).toContain(expectedClass);
	});

	it('leaves an info message at the default body colour', () => {
		// `info` is the baseline level and the most read; winston's green would
		// also collide with the success meaning it carries elsewhere.
		const { getByText } = renderWith('info');

		const message = getByText('Skipped browserId check');

		expect(message.className).not.toContain('message-error');
		expect(message.className).not.toContain('message-warn');
		expect(message.className).not.toContain('message-debug');
	});
});
