import { InitialMigration1587669153312 } from './1587669153312-InitialMigration';
import { WebhookModel1589476000887 } from './1589476000887-WebhookModel';
import { CreateIndexStoppedAt1594828256133 } from './1594828256133-CreateIndexStoppedAt';
import { AddWebhookId1611144599516 } from './1611144599516-AddWebhookId';
import { MakeStoppedAtNullable1607431743768 } from './1607431743768-MakeStoppedAtNullable';
import { CreateTagEntity1617270242566 } from './1617270242566-CreateTagEntity';
import { UniqueWorkflowNames1620824779533 } from './1620824779533-UniqueWorkflowNames';
import { AddwaitTill1626176912946 } from './1626176912946-AddwaitTill';
import { UpdateWorkflowCredentials1630419189837 } from './1630419189837-UpdateWorkflowCredentials';
import { AddExecutionEntityIndexes1644422880309 } from './1644422880309-AddExecutionEntityIndexes';
import { IncreaseTypeVarcharLimit1646834195327 } from './1646834195327-IncreaseTypeVarcharLimit';
import { CreateUserManagement1646992772331 } from './1646992772331-CreateUserManagement';

export const postgresMigrations = [
	InitialMigration1587669153312,
	WebhookModel1589476000887,
	CreateIndexStoppedAt1594828256133,
	AddWebhookId1611144599516,
	MakeStoppedAtNullable1607431743768,
	CreateTagEntity1617270242566,
	UniqueWorkflowNames1620824779533,
	AddwaitTill1626176912946,
	UpdateWorkflowCredentials1630419189837,
	AddExecutionEntityIndexes1644422880309,
	IncreaseTypeVarcharLimit1646834195327,
	CreateUserManagement1646992772331,
];
