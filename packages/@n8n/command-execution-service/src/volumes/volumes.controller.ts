import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	NotFoundException,
	Param,
	Post,
} from '@nestjs/common';

import type { CreateVolumeRequest } from '../types';
import { VolumesService } from './volumes.service';

@Controller('volumes')
export class VolumesController {
	constructor(private readonly volumesService: VolumesService) {}

	@Post()
	async create(@Body() body?: CreateVolumeRequest) {
		return await this.volumesService.create(body?.name);
	}

	@Get()
	async list() {
		const volumes = await this.volumesService.list();
		return { volumes };
	}

	@Delete(':id')
	@HttpCode(204)
	async delete(@Param('id') id: string) {
		const exists = await this.volumesService.exists(id);
		if (!exists) {
			throw new NotFoundException(`Volume '${id}' not found`);
		}
		await this.volumesService.delete(id);
	}
}
