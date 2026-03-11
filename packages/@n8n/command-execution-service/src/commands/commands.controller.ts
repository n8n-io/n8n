import { BadRequestException, Body, Controller, Post } from '@nestjs/common';

import type { ExecuteCommandRequest, VolumeMount } from '../types';
import { CommandsService } from './commands.service';

@Controller('execute')
export class CommandsController {
	constructor(private readonly commandsService: CommandsService) {}

	@Post()
	async execute(@Body() body: ExecuteCommandRequest) {
		if (!body.command) {
			throw new BadRequestException('Missing required field: command');
		}

		if (body.volumes?.length) {
			this.validateVolumes(body.volumes);
		}

		return await this.commandsService.execute({
			command: body.command,
			volumes: body.volumes,
			timeoutMs: body.timeoutMs,
			env: body.env,
		});
	}

	private validateVolumes(volumes: VolumeMount[]): void {
		const mountPaths = new Set<string>();

		for (const vol of volumes) {
			if (!vol.volumeId) {
				throw new BadRequestException('Each volume mount must have a volumeId');
			}

			if (!vol.mountPath) {
				throw new BadRequestException(`Volume '${vol.volumeId}' is missing a mountPath`);
			}

			if (!vol.mountPath.startsWith('/')) {
				throw new BadRequestException(
					`mountPath '${vol.mountPath}' must be an absolute path (start with /)`,
				);
			}

			// Normalize trailing slashes for comparison
			const normalized = vol.mountPath.replace(/\/+$/, '') || '/';

			if (mountPaths.has(normalized)) {
				throw new BadRequestException(
					`Duplicate mountPath '${vol.mountPath}' — each volume must have a unique mount path`,
				);
			}

			// Check for overlapping mount paths (one is a prefix of another)
			for (const existing of mountPaths) {
				if (normalized.startsWith(existing + '/') || existing.startsWith(normalized + '/')) {
					throw new BadRequestException(
						`Overlapping mount paths: '${vol.mountPath}' conflicts with '${existing}'`,
					);
				}
			}

			mountPaths.add(normalized);
		}
	}
}
