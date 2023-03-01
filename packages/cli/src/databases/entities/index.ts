/* eslint-disable @typescript-eslint/naming-convention */
import { AuthIdentity } from './AuthIdentity';
import { AuthProviderSyncHistory } from './AuthProviderSyncHistory';
import { CredentialsEntity } from './CredentialsEntity';
import { EventDestinations } from './MessageEventBusDestinationEntity';
import { ExecutionEntity } from './ExecutionEntity';
import { InstalledNodes } from './InstalledNodes';
import { InstalledPackages } from './InstalledPackages';
import { Role } from './Role';
import { Settings } from './Settings';
import { SharedCredentials } from './SharedCredentials';
import { SharedWorkflow } from './SharedWorkflow';
import { TagEntity } from './TagEntity';
import { User } from './User';
import { WebhookEntity } from './WebhookEntity';
import { WorkflowEntity } from './WorkflowEntity';
import { WorkflowStatistics } from './WorkflowStatistics';
import { ExecutionMetadata } from './ExecutionMetadata';

export const entities = {
	AuthIdentity,
	AuthProviderSyncHistory,
	CredentialsEntity,
	EventDestinations,
	ExecutionEntity,
	InstalledNodes,
	InstalledPackages,
	Role,
	Settings,
	SharedCredentials,
	SharedWorkflow,
	TagEntity,
	User,
	WebhookEntity,
	WorkflowEntity,
	WorkflowStatistics,
	ExecutionMetadata,
};
