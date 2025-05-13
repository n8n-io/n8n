import { RestController, Get } from '@n8n/decorators';
import { Response } from 'express';
import { access as fsAccess } from 'fs/promises';

import { Time } from '@/constants';
import { AuthlessRequest } from '@/requests';

import { ModulesService } from './modules.service';

@RestController('/modules')
export class ModulesController {
	constructor(private readonly modulesService: ModulesService) {}

	@Get('/')
	async listModules(_req: AuthlessRequest, res: Response) {
		const modules = await this.modulesService.getModuleManifests();

		res.json({ data: modules });
	}

	@Get('/:name/frontend.js')
	async serveModuleFrontend(req: AuthlessRequest<{ name: string }>, res: Response) {
		const filePath = this.modulesService.getModuleFrontendFile(req.params.name);
		if (filePath) {
			try {
				await fsAccess(filePath);
				return res.sendFile(filePath, { maxAge: Time.days.toMilliseconds });
			} catch {
				res.sendStatus(404);
			}
		}
		res.sendStatus(404);
	}
}
