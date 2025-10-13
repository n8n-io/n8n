import { AddAudienceColumnToApiKeys1758731786132 } from './../common/1758731786132-AddAudienceColumnToApiKey';
import { InitialMigration1588102412422 } from './1588102412422-InitialMigration';
import { WebhookModel1592445003908 } from './1592445003908-WebhookModel';
import { CreateIndexStoppedAt1594825041918 } from './1594825041918-CreateIndexStoppedAt';
import { MakeStoppedAtNullable1607431743769 } from './1607431743769-MakeStoppedAtNullable';
import { AddWebhookId1611071044839 } from './1611071044839-AddWebhookId';
import { CreateTagEntity1617213344594 } from './1617213344594-CreateTagEntity';
import { AddWaitColumn1621707690587 } from './1621707690587-AddWaitColumn';
import { AddExecutionEntityIndexes1644421939510 } from './1644421939510-AddExecutionEntityIndexes';
import { CreateUserManagement1646992772331 } from './1646992772331-CreateUserManagement';
import { LowerCaseUserEmail1648740597343 } from './1648740597343-LowerCaseUserEmail';
import { CommunityNodes1652254514001 } from './1652254514001-CommunityNodes';
import { AddUserSettings1652367743993 } from './1652367743993-AddUserSettings';
import { AddAPIKeyColumn1652905585850 } from './1652905585850-AddAPIKeyColumn';
import { IntroducePinData1654089251344 } from './1654089251344-IntroducePinData';
import { CreateCredentialsUserRole1660062385367 } from './1660062385367-CreateCredentialsUserRole';
import { CreateWorkflowsEditorRole1663755770892 } from './1663755770892-CreateWorkflowsUserRole';
import { WorkflowStatistics1664196174000 } from './1664196174000-WorkflowStatistics';
import { CreateCredentialUsageTable1665484192211 } from './1665484192211-CreateCredentialUsageTable';
import { RemoveCredentialUsageTable1665754637024 } from './1665754637024-RemoveCredentialUsageTable';
import { AddTriggerCountColumn1669823906993 } from './1669823906993-AddTriggerCountColumn';
import { MessageEventBusDestinations1671535397530 } from './1671535397530-MessageEventBusDestinations';
import { DeleteExecutionsWithWorkflows1673268682475 } from './1673268682475-DeleteExecutionsWithWorkflows';
import { AddStatusToExecutions1674138566000 } from './1674138566000-AddStatusToExecutions';
import { MigrateExecutionStatus1676996103000 } from './1676996103000-MigrateExecutionStatus';
import { UpdateRunningExecutionStatus1677237073720 } from './1677237073720-UpdateRunningExecutionStatus';
import { CreateVariables1677501636752 } from './1677501636752-CreateVariables';
import { CreateExecutionMetadataTable1679416281777 } from './1679416281777-CreateExecutionMetadataTable';
import { AddUserActivatedProperty1681134145996 } from './1681134145996-AddUserActivatedProperty';
import { RemoveSkipOwnerSetup1681134145997 } from './1681134145997-RemoveSkipOwnerSetup';
import { MigrateIntegerKeysToString1690000000002 } from './1690000000002-MigrateIntegerKeysToString';
import { SeparateExecutionData1690000000010 } from './1690000000010-SeparateExecutionData';
import { FixMissingIndicesFromStringIdMigration1690000000020 } from './1690000000020-FixMissingIndicesFromStringIdMigration';
import { RemoveResetPasswordColumns1690000000030 } from './1690000000030-RemoveResetPasswordColumns';
import { AddMfaColumns1690000000030 } from './1690000000040-AddMfaColumns';
import { ExecutionSoftDelete1693491613982 } from './1693491613982-ExecutionSoftDelete';
import { DropRoleMapping1705429061930 } from './1705429061930-DropRoleMapping';
import { AddActivatedAtUserSetting1717498465931 } from './1717498465931-AddActivatedAtUserSetting';
import { AddApiKeysTable1724951148974 } from './1724951148974-AddApiKeysTable';
import { AddMissingPrimaryKeyOnAnnotationTagMapping1728659839644 } from './1728659839644-AddMissingPrimaryKeyOnAnnotationTagMapping';
import { AddProjectIcons1729607673469 } from './1729607673469-AddProjectIcons';
import { AddDescriptionToTestDefinition1731404028106 } from './1731404028106-AddDescriptionToTestDefinition';
import { MigrateTestDefinitionKeyToString1731582748663 } from './1731582748663-MigrateTestDefinitionKeyToString';
import { CreateFolderTable1738709609940 } from './1738709609940-CreateFolderTable';
import { UpdateParentFolderIdColumn1740445074052 } from './1740445074052-UpdateParentFolderIdColumn';
import { AddScopesColumnToApiKeys1742918400000 } from './1742918400000-AddScopesColumnToApiKeys';
import { UniqueWorkflowNames1620821879465 } from '../common/1620821879465-UniqueWorkflowNames';
import { UpdateWorkflowCredentials1630330987096 } from '../common/1630330987096-UpdateWorkflowCredentials';
import { AddNodeIds1658930531669 } from '../common/1658930531669-AddNodeIds';
import { AddJsonKeyPinData1659888469333 } from '../common/1659888469333-AddJsonKeyPinData';
import { AddWorkflowVersionIdColumn1669739707124 } from '../common/1669739707124-AddWorkflowVersionIdColumn';
import { RemoveWorkflowDataLoadedFlag1671726148419 } from '../common/1671726148419-RemoveWorkflowDataLoadedFlag';
import { CreateLdapEntities1674509946020 } from '../common/1674509946020-CreateLdapEntities';
import { PurgeInvalidWorkflowConnections1675940580449 } from '../common/1675940580449-PurgeInvalidWorkflowConnections';
import { CreateWorkflowNameIndex1691088862123 } from '../common/1691088862123-CreateWorkflowNameIndex';
import { CreateWorkflowHistoryTable1692967111175 } from '../common/1692967111175-CreateWorkflowHistoryTable';
import { DisallowOrphanExecutions1693554410387 } from '../common/1693554410387-DisallowOrphanExecutions';
import { AddWorkflowMetadata1695128658538 } from '../common/1695128658538-AddWorkflowMetadata';
import { ModifyWorkflowHistoryNodesAndConnections1695829275184 } from '../common/1695829275184-ModifyWorkflowHistoryNodesAndConnections';
import { AddGlobalAdminRole1700571993961 } from '../common/1700571993961-AddGlobalAdminRole';
import { RemoveFailedExecutionStatus1711018413374 } from '../common/1711018413374-RemoveFailedExecutionStatus';
import { MoveSshKeysToDatabase1711390882123 } from '../common/1711390882123-MoveSshKeysToDatabase';
import { RemoveNodesAccess1712044305787 } from '../common/1712044305787-RemoveNodesAccess';
import { CreateProject1714133768519 } from '../common/1714133768519-CreateProject';
import { MakeExecutionStatusNonNullable1714133768521 } from '../common/1714133768521-MakeExecutionStatusNonNullable';
import { AddConstraintToExecutionMetadata1720101653148 } from '../common/1720101653148-AddConstraintToExecutionMetadata';
import { CreateInvalidAuthTokenTable1723627610222 } from '../common/1723627610222-CreateInvalidAuthTokenTable';
import { RefactorExecutionIndices1723796243146 } from '../common/1723796243146-RefactorExecutionIndices';
import { CreateAnnotationTables1724753530828 } from '../common/1724753530828-CreateExecutionAnnotationTables';
import { CreateProcessedDataTable1726606152711 } from '../common/1726606152711-CreateProcessedDataTable';
import { SeparateExecutionCreationFromStart1727427440136 } from '../common/1727427440136-SeparateExecutionCreationFromStart';
import { UpdateProcessedDataValueColumnToText1729607673464 } from '../common/1729607673464-UpdateProcessedDataValueColumnToText';
import { CreateTestDefinitionTable1730386903556 } from '../common/1730386903556-CreateTestDefinitionTable';
import { CreateTestMetricTable1732271325258 } from '../common/1732271325258-CreateTestMetricTable';
import { CreateTestRun1732549866705 } from '../common/1732549866705-CreateTestRunTable';
import { AddMockedNodesColumnToTestDefinition1733133775640 } from '../common/1733133775640-AddMockedNodesColumnToTestDefinition';
import { AddManagedColumnToCredentialsTable1734479635324 } from '../common/1734479635324-AddManagedColumnToCredentialsTable';
import { AddStatsColumnsToTestRun1736172058779 } from '../common/1736172058779-AddStatsColumnsToTestRun';
import { CreateTestCaseExecutionTable1736947513045 } from '../common/1736947513045-CreateTestCaseExecutionTable';
import { AddErrorColumnsToTestRuns1737715421462 } from '../common/1737715421462-AddErrorColumnsToTestRuns';
import { CreateAnalyticsTables1739549398681 } from '../common/1739549398681-CreateAnalyticsTables';
import { RenameAnalyticsToInsights1741167584277 } from '../common/1741167584277-RenameAnalyticsToInsights';
import { ClearEvaluation1745322634000 } from '../common/1745322634000-CleanEvaluations';
import { AddWorkflowStatisticsRootCount1745587087521 } from '../common/1745587087521-AddWorkflowStatisticsRootCount';
import { AddWorkflowArchivedColumn1745934666076 } from '../common/1745934666076-AddWorkflowArchivedColumn';
import { DropRoleTable1745934666077 } from '../common/1745934666077-DropRoleTable';
import { AddProjectDescriptionColumn1747824239000 } from '../common/1747824239000-AddProjectDescriptionColumn';
import { AddLastActiveAtColumnToUser1750252139166 } from '../common/1750252139166-AddLastActiveAtColumnToUser';
import { AddScopeTables1750252139166 } from '../common/1750252139166-AddScopeTables';
import { AddRolesTables1750252139167 } from '../common/1750252139167-AddRolesTables';
import { LinkRoleToUserTable1750252139168 } from '../common/1750252139168-LinkRoleToUserTable';
import { RemoveOldRoleColumn1750252139170 } from '../common/1750252139170-RemoveOldRoleColumn';
import { AddInputsOutputsToTestCaseExecution1752669793000 } from '../common/1752669793000-AddInputsOutputsToTestCaseExecution';
import { CreateDataStoreTables1754475614601 } from '../common/1754475614601-CreateDataStoreTables';
import { ReplaceDataStoreTablesWithDataTables1754475614602 } from '../common/1754475614602-ReplaceDataStoreTablesWithDataTables';
import { AddTimestampsToRoleAndRoleIndexes1756906557570 } from '../common/1756906557570-AddTimestampsToRoleAndRoleIndexes';
import { ChangeValueTypesForInsights1759399811000 } from '../common/1759399811000-ChangeValueTypesForInsights';
import type { Migration } from '../migration-types';
import { LinkRoleToProjectRelationTable1753953244168 } from './../common/1753953244168-LinkRoleToProjectRelationTable';
import { AddProjectIdToVariableTable1758794506893 } from './1758794506893-AddProjectIdToVariableTable';

const sqliteMigrations: Migration[] = [
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
	LowerCaseUserEmail1648740597343,
	AddUserSettings1652367743993,
	CommunityNodes1652254514001,
	AddAPIKeyColumn1652905585850,
	IntroducePinData1654089251344,
	AddNodeIds1658930531669,
	AddJsonKeyPinData1659888469333,
	CreateCredentialsUserRole1660062385367,
	CreateWorkflowsEditorRole1663755770892,
	CreateCredentialUsageTable1665484192211,
	RemoveCredentialUsageTable1665754637024,
	AddWorkflowVersionIdColumn1669739707124,
	WorkflowStatistics1664196174000,
	AddTriggerCountColumn1669823906993,
	RemoveWorkflowDataLoadedFlag1671726148419,
	MessageEventBusDestinations1671535397530,
	DeleteExecutionsWithWorkflows1673268682475,
	CreateLdapEntities1674509946020,
	PurgeInvalidWorkflowConnections1675940580449,
	AddStatusToExecutions1674138566000,
	MigrateExecutionStatus1676996103000,
	UpdateRunningExecutionStatus1677237073720,
	CreateVariables1677501636752,
	CreateExecutionMetadataTable1679416281777,
	AddUserActivatedProperty1681134145996,
	MigrateIntegerKeysToString1690000000002,
	SeparateExecutionData1690000000010,
	RemoveSkipOwnerSetup1681134145997,
	FixMissingIndicesFromStringIdMigration1690000000020,
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
	AddActivatedAtUserSetting1717498465931,
	AddConstraintToExecutionMetadata1720101653148,
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
	AddWorkflowStatisticsRootCount1745587087521,
	AddWorkflowArchivedColumn1745934666076,
	DropRoleTable1745934666077,
	ClearEvaluation1745322634000,
	AddProjectDescriptionColumn1747824239000,
	AddLastActiveAtColumnToUser1750252139166,
	AddScopeTables1750252139166,
	AddRolesTables1750252139167,
	LinkRoleToUserTable1750252139168,
	AddInputsOutputsToTestCaseExecution1752669793000,
	CreateDataStoreTables1754475614601,
	RemoveOldRoleColumn1750252139170,
	ReplaceDataStoreTablesWithDataTables1754475614602,
	LinkRoleToProjectRelationTable1753953244168,
	AddTimestampsToRoleAndRoleIndexes1756906557570,
	AddProjectIdToVariableTable1758794506893,
	AddAudienceColumnToApiKeys1758731786132,
	ChangeValueTypesForInsights1759399811000,
];

export { sqliteMigrations };
