import {
	assertAllRequestedEntitiesFound,
	PackageEntityAccessDeniedError,
	PackageEntityNotFoundError,
} from '../package-export.errors';

describe('assertAllRequestedEntitiesFound', () => {
	it('does not throw when every requested id was found', async () => {
		await expect(
			assertAllRequestedEntitiesFound('workflow', ['a'], [{ id: 'a' }], async () => new Set()),
		).resolves.toBeUndefined();
	});

	it('throws PackageEntityNotFoundError when a missing id does not exist', async () => {
		await expect(
			assertAllRequestedEntitiesFound('workflow', ['missing'], [], async () => new Set()),
		).rejects.toBeInstanceOf(PackageEntityNotFoundError);
	});

	it('throws PackageEntityAccessDeniedError when a missing id exists but is inaccessible', async () => {
		await expect(
			assertAllRequestedEntitiesFound('workflow', ['denied'], [], async () => new Set(['denied'])),
		).rejects.toBeInstanceOf(PackageEntityAccessDeniedError);
	});

	it('truncates the description to 20 ids and notes how many more were omitted', async () => {
		const missingIds = Array.from({ length: 25 }, (_, i) => `wf-${i}`);

		await expect(
			assertAllRequestedEntitiesFound('workflow', missingIds, [], async () => new Set()),
		).rejects.toMatchObject({
			message: '25 workflow(s) not found or not accessible. Export aborted.',
			description: expect.stringContaining(', and 5 more'),
		});
	});
});
