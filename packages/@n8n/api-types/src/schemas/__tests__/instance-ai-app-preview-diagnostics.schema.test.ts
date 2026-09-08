import { describe, expect, it } from 'vitest';

import { instanceAiAppPreviewDiagnosticsAttachmentSchema } from '../instance-ai.schema';

const item = { kind: 'uncaught', message: 'boom', at: '2026-09-08T10:00:00.000Z' };

describe('instanceAiAppPreviewDiagnosticsAttachmentSchema', () => {
	it('accepts up to 50 items', () => {
		const items = Array.from({ length: 50 }, () => item);
		expect(
			instanceAiAppPreviewDiagnosticsAttachmentSchema.safeParse({
				type: 'app-preview-diagnostics',
				appId: 'app-1',
				items,
			}).success,
		).toBe(true);
	});

	it('rejects 51 items', () => {
		const items = Array.from({ length: 51 }, () => item);
		expect(
			instanceAiAppPreviewDiagnosticsAttachmentSchema.safeParse({
				type: 'app-preview-diagnostics',
				appId: 'app-1',
				items,
			}).success,
		).toBe(false);
	});

	it('rejects a message over 2 KiB', () => {
		expect(
			instanceAiAppPreviewDiagnosticsAttachmentSchema.safeParse({
				type: 'app-preview-diagnostics',
				appId: 'app-1',
				items: [{ ...item, message: 'x'.repeat(2049) }],
			}).success,
		).toBe(false);
	});

	it('rejects an empty item list', () => {
		expect(
			instanceAiAppPreviewDiagnosticsAttachmentSchema.safeParse({
				type: 'app-preview-diagnostics',
				appId: 'app-1',
				items: [],
			}).success,
		).toBe(false);
	});
});
