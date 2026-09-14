import { DeleteFolderQueryPublicDto } from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { FoldersPublicController } from '../folders.public.controller';

/**
 * Contract of the migrated route: the decorator metadata must keep the path, method, success
 * status, API-key scope and licence gate that the legacy handler and its YAML declared.
 */
describe('FoldersPublicController route metadata', () => {
	const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
		FoldersPublicController as never,
	);
	const route = metadata.routes.get('deleteFolder');

	it('serves DELETE /projects/:projectId/folders/:folderId', () => {
		expect(metadata.isPublicApi).toBe(true);
		expect(metadata.basePath).toBe('/projects/:projectId/folders');
		expect(route?.method).toBe('delete');
		expect(route?.path).toBe('/:folderId');
	});

	it('answers 204 with no response body', () => {
		expect(route?.successStatus).toBe(204);
		expect(route?.responseDto).toBeUndefined();
	});

	it('requires the folder:delete API key scope and the folders licence', () => {
		expect(route?.apiKeyScope).toBe('folder:delete');
		expect(route?.licenseFeature).toBe(LICENSE_FEATURES.FOLDERS);
	});

	it('keeps the project access check in the handler so an unknown project answers 404', () => {
		expect(route?.accessScope).toBeUndefined();
	});

	it('documents the 404 the folder and project lookups answer', () => {
		expect(route?.errorResponses).toEqual([{ status: 404 }]);
	});
});

describe('DeleteFolderQueryPublicDto', () => {
	it('accepts an absent transferToFolderId', () => {
		expect(DeleteFolderQueryPublicDto.safeParse({}).success).toBe(true);
	});

	it('accepts a single transferToFolderId', () => {
		const result = DeleteFolderQueryPublicDto.safeParse({ transferToFolderId: 'folder-a' });

		expect(result.success).toBe(true);
		expect(result.data).toEqual({ transferToFolderId: 'folder-a' });
	});

	it('rejects a repeated transferToFolderId', () => {
		expect(
			DeleteFolderQueryPublicDto.safeParse({ transferToFolderId: ['folder-a', 'folder-b'] })
				.success,
		).toBe(false);
	});

	it('rejects an undocumented query parameter', () => {
		expect(DeleteFolderQueryPublicDto.safeParse({ unknownParam: 'x' }).success).toBe(false);
	});
});
