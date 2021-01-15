import { InitialMigration1587563438936 } from './1587563438936-InitialMigration';
import { WebhookModel1592679094242 } from './1592679094242-WebhookModel';
import { CreateIndexStoppedAt1594910478695 } from './151594910478695-CreateIndexStoppedAt';

export const mongodbMigrations = [
	InitialMigration1587563438936,
	WebhookModel1592679094242,
	CreateIndexStoppedAt1594910478695,
];
