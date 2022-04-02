import config = require('../../../../config');

import { InitialMigration1588102412422 } from './1588102412422-InitialMigration';
import { WebhookModel1592445003908 } from './1592445003908-WebhookModel';
import { CreateIndexStoppedAt1594825041918 } from './1594825041918-CreateIndexStoppedAt';
import { AddWebhookId1611071044839 } from './1611071044839-AddWebhookId';
import { MakeStoppedAtNullable1607431743769 } from './1607431743769-MakeStoppedAtNullable';
import { CreateTagEntity1617213344594 } from './1617213344594-CreateTagEntity';
import { UniqueWorkflowNames1620821879465 } from './1620821879465-UniqueWorkflowNames';
import { AddWaitColumn1621707690587 } from './1621707690587-AddWaitColumn';
import { UpdateWorkflowCredentials1630330987096 } from './1630330987096-UpdateWorkflowCredentials';
import { AddExecutionEntityIndexes1644421939510 } from './1644421939510-AddExecutionEntityIndexes';
import { CreateUserManagement1646992772331 } from './1646992772331-CreateUserManagement';

const sqliteMigrations = [
	InitialMigration1588102412422,
	WebhookModel1592445003908,
	CreateIndexStoppedAt1594825041918,
	AddWebhookId1611071044839,
	MakeStoppedAtNullable1607431743769,
	CreateTagEntity1617213344594,
	UniqueWorkflowNames1620821879465,
	AddWaitColumn1621707690587,
	UpdateWorkflowCredentials1630330987096,
	AddExecutionEntityIndexes1644421939510,
	CreateUserManagement1646992772331,
];

export { sqliteMigrations };
