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
import { LowerCaseUserEmail1648740597343 } from './1648740597343-LowerCaseUserEmail';
import { AddUserSettings1652367743993 } from './1652367743993-AddUserSettings';
import { CommunityNodes1652254514002 } from './1652254514002-CommunityNodes';
import { AddAPIKeyColumn1652905585850 } from './1652905585850-AddAPIKeyColumn';
import { IntroducePinData1654090467022 } from './1654090467022-IntroducePinData';
import { AddNodeIds1658932090381 } from './1658932090381-AddNodeIds';
import { AddJsonKeyPinData1659902242948 } from './1659902242948-AddJsonKeyPinData';
import { CreateCredentialsUserRole1660062385367 } from './1660062385367-CreateCredentialsUserRole';
import { WorkflowStatistics1664196174001 } from './1664196174001-WorkflowStatistics';
import { CreateWorkflowsEditorRole1663755770893 } from './1663755770893-CreateWorkflowsEditorRole';
import { CreateCredentialUsageTable1665484192212 } from './1665484192212-CreateCredentialUsageTable';
import { RemoveCredentialUsageTable1665754637025 } from './1665754637025-RemoveCredentialUsageTable';
import { AddWorkflowVersionIdColumn1669739707126 } from './1669739707126-AddWorkflowVersionIdColumn';
import { AddTriggerCountColumn1669823906995 } from './1669823906995-AddTriggerCountColumn';
import { RemoveWorkflowDataLoadedFlag1671726148421 } from './1671726148421-RemoveWorkflowDataLoadedFlag';
import { MessageEventBusDestinations1671535397530 } from './1671535397530-MessageEventBusDestinations';
import { DeleteExecutionsWithWorkflows1673268682475 } from './1673268682475-DeleteExecutionsWithWorkflows';
import { CreateLdapEntities1674509946020 } from './1674509946020-CreateLdapEntities';
import { PurgeInvalidWorkflowConnections1675940580449 } from './1675940580449-PurgeInvalidWorkflowConnections';
import { AddStatusToExecutions1674138566000 } from './1674138566000-AddStatusToExecutions';
import { MigrateExecutionStatus1676996103000 } from './1676996103000-MigrateExecutionStatus';

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
	LowerCaseUserEmail1648740597343,
	AddUserSettings1652367743993,
	CommunityNodes1652254514002,
	AddAPIKeyColumn1652905585850,
	IntroducePinData1654090467022,
	CreateCredentialsUserRole1660062385367,
	AddNodeIds1658932090381,
	AddJsonKeyPinData1659902242948,
	CreateWorkflowsEditorRole1663755770893,
	CreateCredentialUsageTable1665484192212,
	RemoveCredentialUsageTable1665754637025,
	AddWorkflowVersionIdColumn1669739707126,
	WorkflowStatistics1664196174001,
	AddTriggerCountColumn1669823906995,
	RemoveWorkflowDataLoadedFlag1671726148421,
	MessageEventBusDestinations1671535397530,
	DeleteExecutionsWithWorkflows1673268682475,
	CreateLdapEntities1674509946020,
	PurgeInvalidWorkflowConnections1675940580449,
	AddStatusToExecutions1674138566000,
	MigrateExecutionStatus1676996103000,
];
