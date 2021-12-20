/* eslint-disable import/no-cycle */
import { IDataObject } from 'n8n-workflow';
import { IsNull, Not } from 'typeorm';
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
	// TODO: check if incoming data is in this format
	// eslint-disable-next-line consistent-return, @typescript-eslint/return-await
	return await Db.collections.SharedWorkflow?.save({
		role: incomingData.role as Role,
		user: incomingData.user as User,
		workflow: savedWorkflow,
	});
}

export function isEmailSetup(): boolean {
	const emailMode = config.get('userManagement.emails.mode') as string;
	return !!emailMode;
}

export async function isInstanceOwnerSetup(): Promise<boolean> {
	const users = await Db.collections.User!.find({ email: Not(IsNull()) });
	return users.length !== 0;
}
