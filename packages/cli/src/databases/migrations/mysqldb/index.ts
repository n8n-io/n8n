import type { Migration } from '@db/types';
import { InitialMigration1588157391238 } from './1588157391238-InitialMigration';
import { WebhookModel1592447867632 } from './1592447867632-WebhookModel';
import { CreateIndexStoppedAt1594902918301 } from './1594902918301-CreateIndexStoppedAt';
import { AddWebhookId1611149998770 } from './1611149998770-AddWebhookId';
import { MakeStoppedAtNullable1607431743767 } from './1607431743767-MakeStoppedAtNullable';
import { ChangeDataSize1615306975123 } from './1615306975123-ChangeDataSize';
import { ChangeCredentialDataSize1620729500000 } from './1620729500000-ChangeCredentialDataSize';
import { CreateTagEntity1617268711084 } from './1617268711084-CreateTagEntity';
import { UniqueWorkflowNames1620826335440 } from './1620826335440-UniqueWorkflowNames';
import { CertifyCorrectCollation1623936588000 } from './1623936588000-CertifyCorrectCollation';
import { AddWaitColumnId1626183952959 } from './1626183952959-AddWaitColumn';
import { UpdateWorkflowCredentials1630451444017 } from './1630451444017-UpdateWorkflowCredentials';
import { AddExecutionEntityIndexes1644424784709 } from './1644424784709-AddExecutionEntityIndexes';
import { CreateUserManagement1646992772331 } from './1646992772331-CreateUserManagement';
import { LowerCaseUserEmail1648740597343 } from './1648740597343-LowerCaseUserEmail';
import { AddUserSettings1652367743993 } from './1652367743993-AddUserSettings';
import { CommunityNodes1652254514003 } from './1652254514003-CommunityNodes';
import { AddAPIKeyColumn1652905585850 } from './1652905585850-AddAPIKeyColumn';
import { IntroducePinData1654090101303 } from './1654090101303-IntroducePinData';
import { AddNodeIds1658932910559 } from './1658932910559-AddNodeIds';
import { AddJsonKeyPinData1659895550980 } from './1659895550980-AddJsonKeyPinData';
import { CreateCredentialsUserRole1660062385367 } from './1660062385367-CreateCredentialsUserRole';
import { WorkflowStatistics1664196174002 } from './1664196174002-WorkflowStatistics';
import { CreateWorkflowsEditorRole1663755770894 } from './1663755770894-CreateWorkflowsEditorRole';
import { CreateCredentialUsageTable1665484192213 } from './1665484192213-CreateCredentialUsageTable';
import { RemoveCredentialUsageTable1665754637026 } from './1665754637026-RemoveCredentialUsageTable';
import { AddWorkflowVersionIdColumn1669739707125 } from './1669739707125-AddWorkflowVersionIdColumn';
import { AddTriggerCountColumn1669823906994 } from './1669823906994-AddTriggerCountColumn';
import { RemoveWorkflowDataLoadedFlag1671726148420 } from './1671726148420-RemoveWorkflowDataLoadedFlag';
import { MessageEventBusDestinations1671535397530 } from './1671535397530-MessageEventBusDestinations';
import { DeleteExecutionsWithWorkflows1673268682475 } from './1673268682475-DeleteExecutionsWithWorkflows';
import { CreateLdapEntities1674509946020 } from '../common/1674509946020-CreateLdapEntities';
import { PurgeInvalidWorkflowConnections1675940580449 } from '../common/1675940580449-PurgeInvalidWorkflowConnections';
import { AddStatusToExecutions1674138566000 } from './1674138566000-AddStatusToExecutions';
import { MigrateExecutionStatus1676996103000 } from './1676996103000-MigrateExecutionStatus';
import { UpdateRunningExecutionStatus1677236788851 } from './1677236788851-UpdateRunningExecutionStatus';
import { CreateExecutionMetadataTable1679416281779 } from './1679416281779-CreateExecutionMetadataTable';
import { CreateVariables1677501636753 } from './1677501636753-CreateVariables';
import { AddUserActivatedProperty1681134145996 } from './1681134145996-AddUserActivatedProperty';
import { MigrateIntegerKeysToString1690000000001 } from './1690000000001-MigrateIntegerKeysToString';
import { SeparateExecutionData1690000000030 } from './1690000000030-SeparateExecutionData';
import { FixExecutionDataType1690000000031 } from './1690000000031-FixExecutionDataType';
import { RemoveSkipOwnerSetup1681134145997 } from './1681134145997-RemoveSkipOwnerSetup';
import { RemoveResetPasswordColumns1690000000030 } from '../common/1690000000030-RemoveResetPasswordColumns';
import { CreateWorkflowNameIndex1691088862123 } from '../common/1691088862123-CreateWorkflowNameIndex';
import { AddMfaColumns1690000000030 } from './../common/1690000000040-AddMfaColumns';
import { CreateWorkflowHistoryTable1692967111175 } from '../common/1692967111175-CreateWorkflowHistoryTable';
import { DisallowOrphanExecutions1693554410387 } from '../common/1693554410387-DisallowOrphanExecutions';
import { ExecutionSoftDelete1693491613982 } from '../common/1693491613982-ExecutionSoftDelete';
import { AddWorkflowMetadata1695128658538 } from '../common/1695128658538-AddWorkflowMetadata';
import { ModifyWorkflowHistoryNodesAndConnections1695829275184 } from '../common/1695829275184-ModifyWorkflowHistoryNodesAndConnections';
import { AddGlobalAdminRole1700571993961 } from '../common/1700571993961-AddGlobalAdminRole';
import { CreateProject1714133768519 } from '../common/1714133768519-CreateProject';
import { DropRoleMapping1705429061930 } from '../common/1705429061930-DropRoleMapping';
import { RemoveFailedExecutionStatus1711018413374 } from '../common/1711018413374-RemoveFailedExecutionStatus';
import { MoveSshKeysToDatabase1711390882123 } from '../common/1711390882123-MoveSshKeysToDatabase';
import { RemoveNodesAccess1712044305787 } from '../common/1712044305787-RemoveNodesAccess';
import { MakeExecutionStatusNonNullable1714133768521 } from '../common/1714133768521-MakeExecutionStatusNonNullable';

export const mysqlMigrations: Migration[] = [
	InitialMigration1588157391238,
	WebhookModel1592447867632,
	CreateIndexStoppedAt1594902918301,
	AddWebhookId1611149998770,
	MakeStoppedAtNullable1607431743767,
	ChangeDataSize1615306975123,
	ChangeCredentialDataSize1620729500000,
	CreateTagEntity1617268711084,
	UniqueWorkflowNames1620826335440,
	CertifyCorrectCollation1623936588000,
	AddWaitColumnId1626183952959,
	UpdateWorkflowCredentials1630451444017,
	AddExecutionEntityIndexes1644424784709,
	CreateUserManagement1646992772331,
	LowerCaseUserEmail1648740597343,
	AddUserSettings1652367743993,
	CommunityNodes1652254514003,
	AddAPIKeyColumn1652905585850,
	IntroducePinData1654090101303,
	AddNodeIds1658932910559,
	AddJsonKeyPinData1659895550980,
	CreateCredentialsUserRole1660062385367,
	CreateWorkflowsEditorRole1663755770894,
	CreateCredentialUsageTable1665484192213,
	RemoveCredentialUsageTable1665754637026,
	AddWorkflowVersionIdColumn1669739707125,
	WorkflowStatistics1664196174002,
	AddTriggerCountColumn1669823906994,
	RemoveWorkflowDataLoadedFlag1671726148420,
	MessageEventBusDestinations1671535397530,
	DeleteExecutionsWithWorkflows1673268682475,
	CreateLdapEntities1674509946020,
	PurgeInvalidWorkflowConnections1675940580449,
	AddStatusToExecutions1674138566000,
	MigrateExecutionStatus1676996103000,
	UpdateRunningExecutionStatus1677236788851,
	CreateExecutionMetadataTable1679416281779,
	CreateVariables1677501636753,
	AddUserActivatedProperty1681134145996,
	MigrateIntegerKeysToString1690000000001,
	SeparateExecutionData1690000000030,
	FixExecutionDataType1690000000031,
	RemoveSkipOwnerSetup1681134145997,
	RemoveResetPasswordColumns1690000000030,
	CreateWorkflowNameIndex1691088862123,
	AddMfaColumns1690000000030,
	CreateWorkflowHistoryTable1692967111175,
	DisallowOrphanExecutions1693554410387,
	ExecutionSoftDelete1693491613982,
	AddWorkflowMetadata1695128658538,
	ModifyWorkflowHistoryNodesAndConnections1695829275184,
	AddGlobalAdminRole1700571993961,
	DropRoleMapping1705429061930,
	RemoveFailedExecutionStatus1711018413374,
	MoveSshKeysToDatabase1711390882123,
	RemoveNodesAccess1712044305787,
	CreateProject1714133768519,
	MakeExecutionStatusNonNullable1714133768521,
];
