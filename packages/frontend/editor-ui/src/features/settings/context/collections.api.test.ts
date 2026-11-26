import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

import {
	createCollection,
	deleteCollection,
	deleteCollectionFile,
	fetchCollections,
	getCollection,
	listCollectionAgents,
	listCollectionFiles,
	updateCollection,
	uploadCollectionFiles,
} from './collections.api';

vi.mock('@n8n/rest-api-client', () => ({
	makeRestApiRequest: vi.fn(),
}));

const context = {} as IRestApiContext;

describe('collections.api', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('lists the collections from the knowledge route', async () => {
		const list = { count: 1, data: [{ id: 'c1', name: 'Support' }] };
		vi.mocked(makeRestApiRequest).mockResolvedValue(list);

		await expect(fetchCollections(context)).resolves.toBe(list);

		expect(makeRestApiRequest).toHaveBeenCalledWith(context, 'GET', '/knowledge/collections');
	});

	it('creates the collection in the project of the URL', async () => {
		const created = { id: 'c1', name: 'Support' };
		vi.mocked(makeRestApiRequest).mockResolvedValue(created);

		await expect(
			createCollection(context, 'proj-1', { name: 'Support', description: 'Refunds' }),
		).resolves.toBe(created);

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'POST',
			'/projects/proj-1/knowledge/collections',
			{ name: 'Support', description: 'Refunds' },
		);
	});

	it('gets one collection', async () => {
		vi.mocked(makeRestApiRequest).mockResolvedValue({ id: 'c1' });

		await getCollection(context, 'proj-1', 'c1');

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'GET',
			'/projects/proj-1/knowledge/collections/c1',
		);
	});

	it('lists the files of a collection', async () => {
		const list = { count: 0, totalSizeBytes: 0, data: [] };
		vi.mocked(makeRestApiRequest).mockResolvedValue(list);

		await expect(listCollectionFiles(context, 'proj-1', 'c1')).resolves.toBe(list);

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'GET',
			'/projects/proj-1/knowledge/collections/c1/files',
		);
	});

	it('uploads the files as the "files" parts of one multipart request', async () => {
		vi.mocked(makeRestApiRequest).mockResolvedValue([]);
		const files = [new File(['a'], 'a.txt'), new File(['b'], 'b.txt')];

		await uploadCollectionFiles(context, 'proj-1', 'c1', files);

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'POST',
			'/projects/proj-1/knowledge/collections/c1/files',
			expect.any(FormData),
		);
		const formData = vi.mocked(makeRestApiRequest).mock.calls[0][3] as FormData;
		expect(formData.getAll('files')).toEqual(files);
	});

	it('deletes one file of a collection', async () => {
		vi.mocked(makeRestApiRequest).mockResolvedValue({ success: true });

		await deleteCollectionFile(context, 'proj-1', 'c1', 'f1');

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'DELETE',
			'/projects/proj-1/knowledge/collections/c1/files/f1',
		);
	});

	it('lists the agents that use a collection', async () => {
		vi.mocked(makeRestApiRequest).mockResolvedValue([]);

		await expect(listCollectionAgents(context, 'proj-1', 'c1')).resolves.toEqual([]);

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'GET',
			'/projects/proj-1/knowledge/collections/c1/agents',
		);
	});

	it('sends only the given fields of an update to the route of the collection', async () => {
		const updated = { id: 'c1', name: 'Support handbook' };
		vi.mocked(makeRestApiRequest).mockResolvedValue(updated);

		await expect(
			updateCollection(context, 'proj-1', 'c1', { name: 'Support handbook' }),
		).resolves.toBe(updated);

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'PATCH',
			'/projects/proj-1/knowledge/collections/c1',
			{ name: 'Support handbook' },
		);
	});

	it('deletes the collection on the route of the collection, with no body', async () => {
		vi.mocked(makeRestApiRequest).mockResolvedValue({ success: true });

		await expect(deleteCollection(context, 'proj-1', 'c1')).resolves.toEqual({ success: true });

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'DELETE',
			'/projects/proj-1/knowledge/collections/c1',
		);
	});
});
