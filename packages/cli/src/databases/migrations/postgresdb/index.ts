import type { Migration } from '@/databases/types';

import { AddMfaColumns1690000000030 } from './../common/1690000000040-AddMfaColumns';
import { InitialMigration1587669153312 } from './1587669153312-InitialMigration';
import { WebhookModel1589476000887 } from './1589476000887-WebhookModel';
import { CreateIndexStoppedAt1594828256133 } from './1594828256133-CreateIndexStoppedAt';
import { MakeStoppedAtNullable1607431743768 } from './1607431743768-MakeStoppedAtNullable';
import { AddWebhookId1611144599516 } from './1611144599516-AddWebhookId';
import { CreateTagEntity1617270242566 } from './1617270242566-CreateTagEntity';
import { UniqueWorkflowNames1620824779533 } from './1620824779533-UniqueWorkflowNames';
import { AddwaitTill1626176912946 } from './1626176912946-AddwaitTill';
import { UpdateWorkflowCredentials1630419189837 } from './1630419189837-UpdateWorkflowCredentials';
import { AddExecutionEntityIndexes1644422880309 } from './1644422880309-AddExecutionEntityIndexes';
import { IncreaseTypeVarcharLimit1646834195327 } from './1646834195327-IncreaseTypeVarcharLimit';
import { CreateUserManagement1646992772331 } from './1646992772331-CreateUserManagement';
import { LowerCaseUserEmail1648740597343 } from './1648740597343-LowerCaseUserEmail';
import { CommunityNodes1652254514002 } from './1652254514002-CommunityNodes';
import { AddUserSettings1652367743993 } from './1652367743993-AddUserSettings';
import { AddAPIKeyColumn1652905585850 } from './1652905585850-AddAPIKeyColumn';
import { IntroducePinData1654090467022 } from './1654090467022-IntroducePinData';
import { AddNodeIds1658932090381 } from './1658932090381-AddNodeIds';
import { AddJsonKeyPinData1659902242948 } from './1659902242948-AddJsonKeyPinData';
import { CreateCredentialsUserRole1660062385367 } from './1660062385367-CreateCredentialsUserRole';
import { CreateWorkflowsEditorRole1663755770893 } from './1663755770893-CreateWorkflowsEditorRole';
import { WorkflowStatistics1664196174001 } from './1664196174001-WorkflowStatistics';
import { CreateCredentialUsageTable1665484192212 } from './1665484192212-CreateCredentialUsageTable';
import { RemoveCredentialUsageTable1665754637025 } from './1665754637025-RemoveCredentialUsageTable';
import { AddWorkflowVersionIdColumn1669739707126 } from './1669739707126-AddWorkflowVersionIdColumn';
import { AddTriggerCountColumn1669823906995 } from './1669823906995-AddTriggerCountColumn';
import { MessageEventBusDestinations1671535397530 } from './1671535397530-MessageEventBusDestinations';
import { RemoveWorkflowDataLoadedFlag1671726148421 } from './1671726148421-RemoveWorkflowDataLoadedFlag';
import { DeleteExecutionsWithWorkflows1673268682475 } from './1673268682475-DeleteExecutionsWithWorkflows';
import { AddStatusToExecutions1674138566000 } from './1674138566000-AddStatusToExecutions';
import { MigrateExecutionStatus1676996103000 } from './1676996103000-MigrateExecutionStatus';
import { UpdateRunningExecutionStatus1677236854063 } from './1677236854063-UpdateRunningExecutionStatus';
import { CreateVariables1677501636754 } from './1677501636754-CreateVariables';
import { CreateExecutionMetadataTable1679416281778 } from './1679416281778-CreateExecutionMetadataTable';
import { AddUserActivatedProperty1681134145996 } from './1681134145996-AddUserActivatedProperty';
import { RemoveSkipOwnerSetup1681134145997 } from './1681134145997-RemoveSkipOwnerSetup';
import { MigrateIntegerKeysToString1690000000000 } from './1690000000000-MigrateIntegerKeysToString';
import { SeparateExecutionData1690000000020 } from './1690000000020-SeparateExecutionData';
import { AddMissingPrimaryKeyOnExecutionData1690787606731 } from './1690787606731-AddMissingPrimaryKeyOnExecutionData';
import { MigrateToTimestampTz1694091729095 } from './1694091729095-MigrateToTimestampTz';
import { AddActivatedAtUserSetting1717498465931 } from './1717498465931-AddActivatedAtUserSetting';
import { FixExecutionMetadataSequence1721377157740 } from './1721377157740-FixExecutionMetadataSequence';
import { MigrateTestDefinitionKeyToString1731582748663 } from './1731582748663-MigrateTestDefinitionKeyToString';
import { UpdateParentFolderIdColumn1740445074052 } from './1740445074052-UpdateParentFolderIdColumn';
import { CreateLdapEntities1674509946020 } from '../common/1674509946020-CreateLdapEntities';
import { PurgeInvalidWorkflowConnections1675940580449 } from '../common/1675940580449-PurgeInvalidWorkflowConnections';
import { RemoveResetPasswordColumns1690000000030 } from '../common/1690000000030-RemoveResetPasswordColumns';
import { CreateWorkflowNameIndex1691088862123 } from '../common/1691088862123-CreateWorkflowNameIndex';
import { CreateWorkflowHistoryTable1692967111175 } from '../common/1692967111175-CreateWorkflowHistoryTable';
import { ExecutionSoftDelete1693491613982 } from '../common/1693491613982-ExecutionSoftDelete';
import { DisallowOrphanExecutions1693554410387 } from '../common/1693554410387-DisallowOrphanExecutions';
import { AddWorkflowMetadata1695128658538 } from '../common/1695128658538-AddWorkflowMetadata';
import { ModifyWorkflowHistoryNodesAndConnections1695829275184 } from '../common/1695829275184-ModifyWorkflowHistoryNodesAndConnections';
import { AddGlobalAdminRole1700571993961 } from '../common/1700571993961-AddGlobalAdminRole';
import { DropRoleMapping1705429061930 } from '../common/1705429061930-DropRoleMapping';
import { RemoveFailedExecutionStatus1711018413374 } from '../common/1711018413374-RemoveFailedExecutionStatus';
import { MoveSshKeysToDatabase1711390882123 } from '../common/1711390882123-MoveSshKeysToDatabase';
import { RemoveNodesAccess1712044305787 } from '../common/1712044305787-RemoveNodesAccess';
import { CreateProject1714133768519 } from '../common/1714133768519-CreateProject';
import { MakeExecutionStatusNonNullable1714133768521 } from '../common/1714133768521-MakeExecutionStatusNonNullable';
import { AddConstraintToExecutionMetadata1720101653148 } from '../common/1720101653148-AddConstraintToExecutionMetadata';
import { CreateInvalidAuthTokenTable1723627610222 } from '../common/1723627610222-CreateInvalidAuthTokenTable';
import { RefactorExecutionIndices1723796243146 } from '../common/1723796243146-RefactorExecutionIndices';
import { CreateAnnotationTables1724753530828 } from '../common/1724753530828-CreateExecutionAnnotationTables';
import { AddApiKeysTable1724951148974 } from '../common/1724951148974-AddApiKeysTable';
import { CreateProcessedDataTable1726606152711 } from '../common/1726606152711-CreateProcessedDataTable';
import { SeparateExecutionCreationFromStart1727427440136 } from '../common/1727427440136-SeparateExecutionCreationFromStart';
import { AddMissingPrimaryKeyOnAnnotationTagMapping1728659839644 } from '../common/1728659839644-AddMissingPrimaryKeyOnAnnotationTagMapping';
import { UpdateProcessedDataValueColumnToText1729607673464 } from '../common/1729607673464-UpdateProcessedDataValueColumnToText';
import { AddProjectIcons1729607673469 } from '../common/1729607673469-AddProjectIcons';
import { CreateTestDefinitionTable1730386903556 } from '../common/1730386903556-CreateTestDefinitionTable';
import { AddDescriptionToTestDefinition1731404028106 } from '../common/1731404028106-AddDescriptionToTestDefinition';
import { CreateTestMetricTable1732271325258 } from '../common/1732271325258-CreateTestMetricTable';
import { CreateTestRun1732549866705 } from '../common/1732549866705-CreateTestRunTable';
import { AddMockedNodesColumnToTestDefinition1733133775640 } from '../common/1733133775640-AddMockedNodesColumnToTestDefinition';
import { AddManagedColumnToCredentialsTable1734479635324 } from '../common/1734479635324-AddManagedColumnToCredentialsTable';
import { AddStatsColumnsToTestRun1736172058779 } from '../common/1736172058779-AddStatsColumnsToTestRun';
import { CreateTestCaseExecutionTable1736947513045 } from '../common/1736947513045-CreateTestCaseExecutionTable';
import { AddErrorColumnsToTestRuns1737715421462 } from '../common/1737715421462-AddErrorColumnsToTestRuns';
import { CreateFolderTable1738709609940 } from '../common/1738709609940-CreateFolderTable';
import { CreateAnalyticsTables1739549398681 } from '../common/1739549398681-CreateAnalyticsTables';
import { RenameAnalyticsToInsights1741167584277 } from '../common/1741167584277-RenameAnalyticsToInsights';
import { AddScopesColumnToApiKeys1742918400000 } from '../common/1742918400000-AddScopesColumnToApiKeys';

export const postgresMigrations: Migration[] = [
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
	UpdateRunningExecutionStatus1677236854063,
	CreateExecutionMetadataTable1679416281778,
	CreateVariables1677501636754,
	AddUserActivatedProperty1681134145996,
	MigrateIntegerKeysToString1690000000000,
	SeparateExecutionData1690000000020,
	RemoveSkipOwnerSetup1681134145997,
	RemoveResetPasswordColumns1690000000030,
	AddMissingPrimaryKeyOnExecutionData1690787606731,
	CreateWorkflowNameIndex1691088862123,
	AddMfaColumns1690000000030,
	CreateWorkflowHistoryTable1692967111175,
	DisallowOrphanExecutions1693554410387,
	ExecutionSoftDelete1693491613982,
	AddWorkflowMetadata1695128658538,
	MigrateToTimestampTz1694091729095,
	ModifyWorkflowHistoryNodesAndConnections1695829275184,
	AddGlobalAdminRole1700571993961,
	DropRoleMapping1705429061930,
	RemoveFailedExecutionStatus1711018413374,
	MoveSshKeysToDatabase1711390882123,
	RemoveNodesAccess1712044305787,
	CreateProject1714133768519,
	MakeExecutionStatusNonNullable1714133768521,
	AddActivatedAtUserSetting1717498465931,
	AddConstraintToExecutionMetadata1720101653148,
	FixExecutionMetadataSequence1721377157740,
	CreateInvalidAuthTokenTable1723627610222,
	RefactorExecutionIndices1723796243146,
	CreateAnnotationTables1724753530828,
	AddApiKeysTable1724951148974,
	SeparateExecutionCreationFromStart1727427440136,
	CreateProcessedDataTable1726606152711,
	AddMissingPrimaryKeyOnAnnotationTagMapping1728659839644,
	UpdateProcessedDataValueColumnToText1729607673464,
	CreateTestDefinitionTable1730386903556,
	AddDescriptionToTestDefinition1731404028106,
	MigrateTestDefinitionKeyToString1731582748663,
	CreateTestMetricTable1732271325258,
	CreateTestRun1732549866705,
	AddMockedNodesColumnToTestDefinition1733133775640,
	AddManagedColumnToCredentialsTable1734479635324,
	AddProjectIcons1729607673469,
	AddStatsColumnsToTestRun1736172058779,
	CreateTestCaseExecutionTable1736947513045,
	AddErrorColumnsToTestRuns1737715421462,
	CreateFolderTable1738709609940,
	CreateAnalyticsTables1739549398681,
	UpdateParentFolderIdColumn1740445074052,
	RenameAnalyticsToInsights1741167584277,
	AddScopesColumnToApiKeys1742918400000,
];
