/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable import/no-cycle */
import { CredentialsEntity } from './CredentialsEntity';
import { ExecutionEntity } from './ExecutionEntity';
import { WorkflowEntity } from './WorkflowEntity';
import { WebhookEntity } from './WebhookEntity';
import { TagEntity } from './TagEntity';
import { User } from './User';
import { Role } from './Role';
import { Settings } from './Settings';
import { SharedWorkflow } from './SharedWorkflow';
import { SharedCredentials } from './SharedCredentials';
import { InstalledPackages } from './InstalledPackages';
import { InstalledNodes } from './InstalledNodes';
import { CredentialUsage } from './CredentialUsage';

export const entities = {
	CredentialsEntity,
	ExecutionEntity,
	WorkflowEntity,
	WebhookEntity,
	TagEntity,
	User,
	Role,
	Settings,
	SharedWorkflow,
	SharedCredentials,
	InstalledPackages,
	InstalledNodes,
	CredentialUsage,
};
