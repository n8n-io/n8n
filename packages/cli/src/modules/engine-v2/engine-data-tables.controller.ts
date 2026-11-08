import { Service } from '@n8n/di';
import type { Request, Response } from 'express';

import { BadRequestError } from '@n8n/errors';

import { dataTableCallRequestSchema } from './engine-data-tables.contract';
import { EngineDataTablesService } from './engine-data-tables.service';

/**
 * Serves `POST /internal/data-tables/call` for the engine v2 data plane.
 * Validates the body and writes the response. `EngineDataTablesService`
 * decides access and runs the operation.
 */
@Service()
export class EngineDataTablesController {
	constructor(private readonly dataTablesService: EngineDataTablesService) {}

	async call(req: Request, res: Response): Promise<void> {
		const parsed = dataTableCallRequestSchema.safeParse(req.body);

		if (!parsed.success) throw new BadRequestError('Invalid data table call request');

		const outcome = await this.dataTablesService.call(parsed.data);

		// A refusal is a complete answer, not a transport failure: the body says
		// which v1 error the data plane raises. 422 keeps it apart from the 400
		// of a malformed request, which carries no such body.
		res.status('error' in outcome ? 422 : 200).json(outcome);
	}
}
