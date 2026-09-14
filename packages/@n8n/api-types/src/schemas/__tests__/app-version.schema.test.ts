import { appVersionSnapshotSchema } from '../app-version.schema';

describe('appVersionSnapshotSchema', () => {
	const page = { id: 'p1', route: '', parentPageId: null, content: [] };

	test('defaults components to null for a snapshot published before they existed', () => {
		const parsed = appVersionSnapshotSchema.parse({ pages: [page], theme: null });

		expect(parsed.components).toBeNull();
		expect(parsed.pages[0].layout).toBeNull();
	});

	test('keeps the components source', () => {
		const parsed = appVersionSnapshotSchema.parse({
			pages: [page],
			theme: null,
			components: 'export const Card = () => <div />;',
		});

		expect(parsed.components).toContain('Card');
	});
});
