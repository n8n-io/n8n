import { InitialMigration1588157391238 } from './1588157391238-InitialMigration';
import { WebhookModel1592447867632 } from './1592447867632-WebhookModel';
import { CreateIndexStoppedAt1594902918301 } from './1594902918301-CreateIndexStoppedAt';
import { AddWebhookId1611149998770 } from './1611149998770-AddWebhookId';
import { MakeStoppedAtNullable1607431743767 } from './1607431743767-MakeStoppedAtNullable';
import { ChangeDataSize1615306975123 } from './1615306975123-ChangeDataSize';

export const mysqlMigrations = [
	InitialMigration1588157391238,
	WebhookModel1592447867632,
	CreateIndexStoppedAt1594902918301,
	AddWebhookId1611149998770,
	MakeStoppedAtNullable1607431743767,
	ChangeDataSize1615306975123,
];
