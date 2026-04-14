import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, Param, Post, RestController } from '@n8n/decorators';
import { FAVORITE_RESOURCE_TYPES, type FavoriteResourceType } from '@n8n/api-types';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { FavoritesService } from './favorites.service';
import { AddFavoriteDto } from './dto/add-favorite.dto';

function isFavoriteResourceType(value: string): value is FavoriteResourceType {
	return (FAVORITE_RESOURCE_TYPES as readonly string[]).includes(value);
}

@RestController('/favorites')
export class FavoritesController {
	constructor(private readonly favoritesService: FavoritesService) {}

	@Get('/')
	async getFavorites(req: AuthenticatedRequest) {
		return await this.favoritesService.getEnrichedFavorites(req.user.id);
	}

	@Post('/')
	async addFavorite(req: AuthenticatedRequest, _res: unknown, @Body body: AddFavoriteDto) {
		return await this.favoritesService.addFavorite(req.user.id, body.resourceId, body.resourceType);
	}

	@Delete('/:resourceType/:resourceId')
	async removeFavorite(
		req: AuthenticatedRequest,
		_res: unknown,
		@Param('resourceId') resourceId: string,
		@Param('resourceType') resourceType: string,
	) {
		if (!isFavoriteResourceType(resourceType)) {
			throw new BadRequestError(`Invalid resourceType: ${resourceType}`);
		}
		await this.favoritesService.removeFavorite(req.user.id, resourceId, resourceType);
		return true;
	}
}
