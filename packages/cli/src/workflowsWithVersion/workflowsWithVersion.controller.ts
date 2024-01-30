/* eslint-disable no-param-reassign */

import express from 'express';
// import { LoggerProxy } from 'n8n-workflow';

import * as Db from '@/Db';
import * as ResponseHelper from '@/ResponseHelper';
// import { getLogger } from '@/Logger';
import type { WorkflowWithVersionRequest } from '@/requests';
import { WorkflowsWithVersionService } from '@/workflowsWithVersion/workflowsWithVersion.service';

export const WorkflowsWithVersionController = express.Router();

/**
 * Initialize Logger if needed
 */
WorkflowsWithVersionController.use((req, res, next) => {
    // TODO: Find out if we need to get the LoggerProxy Instance
	// try {
	// 	LoggerProxy.getInstance();
	// } catch (error) {
	// 	LoggerProxy.init(getLogger());
	// }
	next();
});

/**
 * GET /workflows-with-version
 */
WorkflowsWithVersionController.get(
	'/',
	ResponseHelper.send(async () => {
		return WorkflowsWithVersionService.getAll();
	}),
);

/**
 * GET /workflows-with-version/:id
 */
WorkflowsWithVersionController.get(
	'/:id(\\w+)',
	ResponseHelper.send(async (req: WorkflowWithVersionRequest.Get) => {
		const { id } = req.params;
		const { versionId } = req.query;

		if (!versionId) {
			return WorkflowsWithVersionService.getAllForWorkflow(id);
		} else {
			return WorkflowsWithVersionService.getOneForWorkflowAndVersion(id, versionId);
		}
	}),
);
