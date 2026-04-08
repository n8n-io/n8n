import type { WorkflowBundle } from '@n8n/api-types';
import { ExportWorkflowBundleDto, ImportWorkflowBundleDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Post, RestController } from '@n8n/decorators';
import type { Response } from 'express';
import { InstanceSettings } from 'n8n-core';

import { WorkflowBundleExportService } from './workflow-bundle-export.service';
import { WorkflowBundleImportService } from './workflow-bundle-import.service';

@RestController('/workflow-bundles')
export class WorkflowBundleController {
	constructor(
		private readonly exportService: WorkflowBundleExportService,
		private readonly importService: WorkflowBundleImportService,
		private readonly instanceSettings: InstanceSettings,
	) {}

	@Post('/export')
	async exportBundle(
		req: AuthenticatedRequest,
		_res: Response,
		@Body dto: ExportWorkflowBundleDto,
	) {
		return await this.exportService.exportBundle(
			dto.workflowId,
			req.user,
			this.instanceSettings.instanceId,
		);
	}

	@Post('/import')
	async importBundle(
		req: AuthenticatedRequest,
		_res: Response,
		@Body dto: ImportWorkflowBundleDto,
	) {
		return await this.importService.importBundle(
			dto.bundle as unknown as WorkflowBundle,
			dto.projectId,
			req.user,
		);
	}
}
