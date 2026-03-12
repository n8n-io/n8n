import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	Logger,
	NotFoundException,
	Param,
	Post,
} from '@nestjs/common';

import type { CreateVolumeRequest } from '../types';
import { VolumesService } from './volumes.service';

@Controller('volumes')
export class VolumesController {
	private readonly logger = new Logger(VolumesController.name);

	constructor(private readonly volumesService: VolumesService) {}

	@Post()
	async create(@Body() body?: CreateVolumeRequest) {
		this.logger.log(`Creating volume name="${body?.name ?? 'unnamed'}"`);
		const volume = await this.volumesService.create(body?.name);
		this.logger.log(`Volume created id="${volume.id}"`);
		return volume;
	}

	@Get()
	async list() {
		const volumes = await this.volumesService.list();
		this.logger.log(`Listed volumes count=${volumes.length}`);
		return { volumes };
	}

	@Delete(':id')
	@HttpCode(204)
	async delete(@Param('id') id: string) {
		this.logger.log(`Deleting volume id="${id}"`);
		const exists = await this.volumesService.exists(id);
		if (!exists) {
			throw new NotFoundException(`Volume '${id}' not found`);
		}
		await this.volumesService.delete(id);
		this.logger.log(`Volume deleted id="${id}"`);
	}
}
