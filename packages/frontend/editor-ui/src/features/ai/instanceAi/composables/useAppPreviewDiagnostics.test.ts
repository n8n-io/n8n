import type { InstanceAiAppPreviewDiagnostic } from '@n8n/api-types';

import { APP_PREVIEW_DIAGNOSTICS_MAX, useAppPreviewDiagnostics } from './useAppPreviewDiagnostics';

function diagnostic(
	overrides: Partial<InstanceAiAppPreviewDiagnostic> = {},
): InstanceAiAppPreviewDiagnostic {
	return {
		kind: 'uncaught',
		message: 'boom',
		file: '/src/pages/Home.vue',
		line: 12,
		at: '2026-09-08T10:00:00.000Z',
		...overrides,
	};
}

describe('useAppPreviewDiagnostics', () => {
	it('drops a repeat of the same error at the same place', () => {
		const buffer = useAppPreviewDiagnostics();

		buffer.add(diagnostic());
		buffer.add(diagnostic({ at: '2026-09-08T10:00:05.000Z', stack: 'other stack' }));
		buffer.add(diagnostic({ line: 13 }));
		buffer.add(diagnostic({ kind: 'vite-error' }));

		expect(buffer.count.value).toBe(3);
	});

	it('keeps only the newest 50', () => {
		const buffer = useAppPreviewDiagnostics();

		for (let index = 0; index < APP_PREVIEW_DIAGNOSTICS_MAX + 5; index++) {
			buffer.add(diagnostic({ message: `error ${index}` }));
		}

		expect(buffer.count.value).toBe(APP_PREVIEW_DIAGNOSTICS_MAX);
		const items = buffer.takeAll();
		expect(items[0].message).toBe('error 5');
		expect(items.at(-1)?.message).toBe(`error ${APP_PREVIEW_DIAGNOSTICS_MAX + 4}`);
	});

	it('empties on takeAll and on clear', () => {
		const buffer = useAppPreviewDiagnostics();

		buffer.add(diagnostic());
		expect(buffer.takeAll()).toEqual([diagnostic()]);
		expect(buffer.count.value).toBe(0);

		buffer.add(diagnostic());
		buffer.clear();
		expect(buffer.count.value).toBe(0);
		expect(buffer.takeAll()).toEqual([]);
	});
});
