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
		['info', 'message-info'],
		['debug', 'message-debug'],
	] as const)('tints a %s message', (level, expectedClass) => {
		const { getByText } = renderWith(level);

		const message = getByText('Skipped browserId check');

		expect(message.className).toContain(expectedClass);
	});

	it('gives a level exactly one tint', () => {
		// Guards against a record picking up two level classes, which would leave
		// the colour down to stylesheet order.
		const { getByText } = renderWith('warn');

		const classes = getByText('Skipped browserId check').className;

		expect(classes).toContain('message-warn');
		expect(classes).not.toContain('message-error');
		expect(classes).not.toContain('message-info');
		expect(classes).not.toContain('message-debug');
	});
});
