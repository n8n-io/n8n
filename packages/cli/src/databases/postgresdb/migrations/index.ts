import { InitialMigration1587669153312 } from './1587669153312-InitialMigration';
import { WebhookModel1589476000887 } from './1589476000887-WebhookModel';
import { CreateIndexStoppedAt1594828256133 } from './1594828256133-CreateIndexStoppedAt';
import { AddWebhookId1611144599516 } from './1611144599516-AddWebhookId';
import { MakeStoppedAtNullable1607431743768 } from './1607431743768-MakeStoppedAtNullable';

export const postgresMigrations = [
	InitialMigration1587669153312,
	WebhookModel1589476000887,
	CreateIndexStoppedAt1594828256133,
	AddWebhookId1611144599516,
	MakeStoppedAtNullable1607431743768,
];
