/* eslint-disable import/no-cycle */
import { IDataObject } from 'n8n-workflow';
import { Db } from '..';
import config = require('../../config');
import { Role } from '../databases/entities/Role';
import { SharedWorkflow } from '../databases/entities/SharedWorkflow';
import { User } from '../databases/entities/User';
import { WorkflowEntity } from '../databases/entities/WorkflowEntity';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function saveWorkflowOwnership(
	savedWorkflow: WorkflowEntity,
	incomingData: IDataObject,
): Promise<SharedWorkflow | undefined> {
	if (!config.get('userManagement.enabled')) {
		return;
	}
	// TODO: check if incoming data is in this format

	// eslint-disable-next-line consistent-return, @typescript-eslint/return-await
	return await Db.collections.SharedWorkflow?.save({
		role: incomingData.role as Role,
		user: incomingData.user as User,
		workflow: savedWorkflow,
	});
}
