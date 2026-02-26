import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

export type UserFavorite = {
	id: number;
	userId: string;
	resourceId: string;
	resourceType: string;
	resourceName: string;
	resourceProjectId?: string;
};

export type FavoriteResourceType = 'workflow' | 'project' | 'dataTable' | 'folder';

export async function getFavorites(context: IRestApiContext): Promise<UserFavorite[]> {
	return await makeRestApiRequest<UserFavorite[]>(context, 'GET', '/favorites');
}

export async function addFavorite(
	context: IRestApiContext,
	resourceId: string,
	resourceType: FavoriteResourceType,
): Promise<UserFavorite> {
	return await makeRestApiRequest<UserFavorite>(context, 'POST', '/favorites', {
		resourceId,
		resourceType,
	});
}

export async function removeFavorite(
	context: IRestApiContext,
	resourceId: string,
	resourceType: FavoriteResourceType,
): Promise<never> {
	return await makeRestApiRequest<never>(
		context,
		'DELETE',
		`/favorites/${resourceType}/${resourceId}`,
	);
}
