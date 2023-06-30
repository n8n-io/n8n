/* eslint-disable no-param-reassign */

import express from 'express';
import { LoggerProxy } from 'n8n-workflow';

import * as Db from '@/Db';
import * as ResponseHelper from '@/ResponseHelper';
import { getLogger } from '@/Logger';
import type { WorkflowWithVersionRequest } from '@/requests';
import { WorkflowsWithVersionService } from '@/workflowsWithVersion/workflowsWithVersion.service';

export const workflowsWithVersionController = express.Router();

/**
 * Initialize Logger if needed
 */
workflowsWithVersionController.use((req, res, next) => {
	try {
		LoggerProxy.getInstance();
	} catch (error) {
		LoggerProxy.init(getLogger());
	}
	next();
});

/**
 * GET /workflows-with-version
 */
workflowsWithVersionController.get(
	'/',
	ResponseHelper.send(async () => {
		return WorkflowsWithVersionService.getAll();
	}),
);

/**
 * GET /workflows-with-version/:id
 */
workflowsWithVersionController.get(
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
