import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type { FavoriteResourceType } from '@n8n/api-types';

export type { FavoriteResourceType };

export type UserFavorite = {
	id: number;
	userId: string;
	resourceId: string;
	resourceType: FavoriteResourceType;
	resourceName: string;
	resourceProjectId?: string;
};

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
): Promise<boolean> {
	return await makeRestApiRequest<boolean>(
		context,
		'DELETE',
		`/favorites/${resourceType}/${resourceId}`,
	);
}
