/* eslint-disable @typescript-eslint/naming-convention */
import { AuthIdentity } from './AuthIdentity';
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
import { WorkflowStatistics } from './WorkflowStatistics';
import { EventDestinations } from './MessageEventBusDestinationEntity';
import { LdapSyncHistory } from './LdapSyncHistory';

export const entities = {
	AuthIdentity,
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
	WorkflowStatistics,
	EventDestinations,
	LdapSyncHistory,
};
