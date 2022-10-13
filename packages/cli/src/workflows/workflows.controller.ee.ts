import express from 'express';
import { Db, ResponseHelper } from '..';
import config from '../../config';
import type { WorkflowRequest } from '../requests';
import { isSharingEnabled, rightDiff } from '../UserManagement/UserManagementHelper';
import { EEWorkflowsService as EEWorkflows } from './workflows.services.ee';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const EEWorkflowController = express.Router();

EEWorkflowController.use((req, res, next) => {
	if (!isSharingEnabled() || !config.getEnv('enterprise.workflowSharingEnabled')) {
		// skip ee router and use free one
		next('router');
		return;
	}
	// use ee router
	next();
});

/**
 * (EE) PUT /workflows/:id/share
 *
 * Grant or remove users' access to a workflow.
 */

EEWorkflowController.put('/:workflowId/share', async (req: WorkflowRequest.Share, res) => {
	const { workflowId } = req.params;
	const { shareWithIds } = req.body;

	if (!Array.isArray(shareWithIds) || !shareWithIds.every((userId) => typeof userId === 'string')) {
		return res.status(400).send('Bad Request');
	}

	const { ownsWorkflow, workflow } = await EEWorkflows.isOwned(req.user, workflowId);

	if (!ownsWorkflow || !workflow) {
		return res.status(403).send();
	}

	let newShareeIds: string[] = [];
	await Db.transaction(async (trx) => {
		// remove all sharings that are not supposed to exist anymore
		await EEWorkflows.pruneSharings(trx, workflowId, [req.user.id, ...shareWithIds]);

		const sharings = await EEWorkflows.getSharings(trx, workflowId);

		// extract the new sharings that need to be added
		newShareeIds = rightDiff(
			[sharings, (sharing) => sharing.userId],
			[shareWithIds, (shareeId) => shareeId],
		);

		if (newShareeIds.length) {
			await EEWorkflows.share(trx, workflow, newShareeIds);
		}
	});

	return res.status(200).send();
});

EEWorkflowController.get(
	'/:id',
	(req: WorkflowRequest.Get, res, next) => (req.params.id === 'new' ? next('router') : next()), // skip ee router and use free one for naming
	ResponseHelper.send(async (req: WorkflowRequest.Get) => {
		const { id: workflowId } = req.params;

		if (Number.isNaN(Number(workflowId))) {
			throw new ResponseHelper.ResponseError(`Workflow ID must be a number.`, undefined, 400);
		}

		const workflow = await EEWorkflows.get(
			{ id: parseInt(workflowId, 10) },
			{ relations: ['shared', 'shared.user', 'shared.role'] },
		);

		if (!workflow) {
			throw new ResponseHelper.ResponseError(
				`Workflow with ID "${workflowId}" could not be found.`,
				undefined,
				404,
			);
		}

		const userSharing = workflow.shared?.find((shared) => shared.user.id === req.user.id);

		if (!userSharing && req.user.globalRole.name !== 'owner') {
			throw new ResponseHelper.ResponseError(`Forbidden.`, undefined, 403);
		}
		// @TODO: also return the credentials used by the workflow

		return EEWorkflows.addOwnerAndSharings(workflow);
	}),
);
