import { BadRequestException, Body, Controller, Logger, Post } from '@nestjs/common';

import type { ExecuteCommandRequest, VolumeMount } from '../types';
import { CommandsService } from './commands.service';

@Controller('execute')
export class CommandsController {
	private readonly logger = new Logger(CommandsController.name);

	constructor(private readonly commandsService: CommandsService) {}

	@Post()
	async execute(@Body() body: ExecuteCommandRequest) {
		if (!body.command) {
			throw new BadRequestException('Missing required field: command');
		}

		if (body.volumes?.length) {
			this.validateVolumes(body.volumes);
		}

		if (body.workspacePath !== undefined && !body.workspacePath.startsWith('/')) {
			throw new BadRequestException(
				`workspacePath '${body.workspacePath}' must be an absolute path (start with /)`,
			);
		}

		const volumeCount = body.volumes?.length ?? 0;
		const envCount = Object.keys(body.env ?? {}).length;
		const timeoutMs = body.timeoutMs ?? 'default';

		this.logger.log(
			`Executing command="${body.command}" volumes=${volumeCount} env=${envCount} timeoutMs=${timeoutMs} workspacePath=${body.workspacePath ?? 'default'}`,
		);

		const startTime = Date.now();

		try {
			const result = await this.commandsService.execute({
				command: body.command,
				volumes: body.volumes,
				timeoutMs: body.timeoutMs,
				env: body.env,
				workspacePath: body.workspacePath,
			});

			const duration = Date.now() - startTime;
			this.logger.log(`Command completed exitCode=${result.exitCode} duration=${duration}ms`);

			return result;
		} catch (error) {
			const duration = Date.now() - startTime;
			this.logger.error(
				`Command failed duration=${duration}ms error=${(error as Error).message}`,
				(error as Error).stack,
			);
			throw error;
		}
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
