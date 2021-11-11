/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable import/no-cycle */
import config = require('../../../config');
import { CredentialsEntity } from './CredentialsEntity';
import { ExecutionEntity } from './ExecutionEntity';
import { WorkflowEntity } from './WorkflowEntity';
import { WebhookEntity } from './WebhookEntity';
import { TagEntity } from './TagEntity';
import { User } from './User';
import { Role } from './Role';
import { SharedWorkflow } from './SharedWorkflow';
import { SharedCredentials } from './SharedCredentials';

const entities = {
	CredentialsEntity,
	ExecutionEntity,
	WorkflowEntity,
	WebhookEntity,
	TagEntity,
};

if (config.get('userManagement.enabled')) {
	Object.assign(entities, {
		User,
		Role,
		SharedWorkflow,
		SharedCredentials,
	});
}

export { entities };
