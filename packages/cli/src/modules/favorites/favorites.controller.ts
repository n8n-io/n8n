import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, Param, Post, RestController } from '@n8n/decorators';

import { FavoritesService } from './favorites.service';
import { AddFavoriteDto } from './dto/add-favorite.dto';

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
		await this.favoritesService.removeFavorite(req.user.id, resourceId, resourceType);
		return true;
	}
}
