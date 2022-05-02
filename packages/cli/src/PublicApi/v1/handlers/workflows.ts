import express = require('express');
import { ActiveWorkflowRunner } from '../../..';
import { WorkflowEntity } from '../../../databases/entities/WorkflowEntity';
import { authorize, instanceOwnerSetup } from '../../middlewares';
import { WorkflowRequest } from '../../publicApiRequest';
import { isInstanceOwner } from '../../Services/user';
import { getWorkflowById, getWorkflowAccess, activeWorkflow } from '../../Services/workflow';

export = {
	createWorkflow: [],
	deleteWorkflow: [],
	getWorkflow: [],
	getWorkflows: [],
	updateWorkflow: [],
	activateWorkflow: [
		instanceOwnerSetup,
		authorize(['owner', 'member']),
		async (req: WorkflowRequest.Activate, res: express.Response): Promise<express.Response> => {
			const { workflowId } = req.params;

			const workflow = await getWorkflowById(workflowId);
			if (workflow === undefined) {
				return res.status(404).json();
			}

			const workflowRunner = ActiveWorkflowRunner.getInstance();

			const activateWorkflow = async (w: WorkflowEntity) => {
				await workflowRunner.add(w.id.toString(), 'activate');
				// change the status to active in the DB
				await activeWorkflow(workflow);
			};

			if (isInstanceOwner(req.user)) {
				if (!workflow.active) {
					try {
						await activateWorkflow(workflow);
						return res.json(workflow);
					} catch (error) {
						// todo
						// remove the type assertion
						const errorObject = error as unknown as { message: string };
						return res.status(400).json({ error: errorObject.message });
					}
				}
				// nothing to do as the wokflow is already active
				return res.json(workflow);
			}

			const userHasAccessToWorkflow = await getWorkflowAccess(req.user, workflowId.toString());

			if (userHasAccessToWorkflow) {
				if (!workflow.active) {
					try {
						await activateWorkflow(workflow);
						return res.json(workflow);
					} catch (error) {
						// todo
						// remove the type assertion
						const errorObject = error as unknown as { message: string };
						return res.status(400).json({ error: errorObject.message });
					}
				}
				return res.json(workflow);
			}
			// member trying to access workflow that does not own
			// 404 or 403?
			// 403 will let him know about the existance of the workflow
			return res.status(404).json();
		},
	],
	desactivateWorkflow: [],
};
