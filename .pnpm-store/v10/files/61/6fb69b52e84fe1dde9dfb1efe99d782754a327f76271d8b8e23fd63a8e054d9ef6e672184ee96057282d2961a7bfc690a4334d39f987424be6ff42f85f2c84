import { createAggregatedClient } from "@smithy/smithy-client";
import { AssociateEntitiesToExperienceCommand, } from "./commands/AssociateEntitiesToExperienceCommand";
import { AssociatePersonasToEntitiesCommand, } from "./commands/AssociatePersonasToEntitiesCommand";
import { BatchDeleteDocumentCommand, } from "./commands/BatchDeleteDocumentCommand";
import { BatchDeleteFeaturedResultsSetCommand, } from "./commands/BatchDeleteFeaturedResultsSetCommand";
import { BatchGetDocumentStatusCommand, } from "./commands/BatchGetDocumentStatusCommand";
import { BatchPutDocumentCommand, } from "./commands/BatchPutDocumentCommand";
import { ClearQuerySuggestionsCommand, } from "./commands/ClearQuerySuggestionsCommand";
import { CreateAccessControlConfigurationCommand, } from "./commands/CreateAccessControlConfigurationCommand";
import { CreateDataSourceCommand, } from "./commands/CreateDataSourceCommand";
import { CreateExperienceCommand, } from "./commands/CreateExperienceCommand";
import { CreateFaqCommand } from "./commands/CreateFaqCommand";
import { CreateFeaturedResultsSetCommand, } from "./commands/CreateFeaturedResultsSetCommand";
import { CreateIndexCommand } from "./commands/CreateIndexCommand";
import { CreateQuerySuggestionsBlockListCommand, } from "./commands/CreateQuerySuggestionsBlockListCommand";
import { CreateThesaurusCommand, } from "./commands/CreateThesaurusCommand";
import { DeleteAccessControlConfigurationCommand, } from "./commands/DeleteAccessControlConfigurationCommand";
import { DeleteDataSourceCommand, } from "./commands/DeleteDataSourceCommand";
import { DeleteExperienceCommand, } from "./commands/DeleteExperienceCommand";
import { DeleteFaqCommand } from "./commands/DeleteFaqCommand";
import { DeleteIndexCommand } from "./commands/DeleteIndexCommand";
import { DeletePrincipalMappingCommand, } from "./commands/DeletePrincipalMappingCommand";
import { DeleteQuerySuggestionsBlockListCommand, } from "./commands/DeleteQuerySuggestionsBlockListCommand";
import { DeleteThesaurusCommand, } from "./commands/DeleteThesaurusCommand";
import { DescribeAccessControlConfigurationCommand, } from "./commands/DescribeAccessControlConfigurationCommand";
import { DescribeDataSourceCommand, } from "./commands/DescribeDataSourceCommand";
import { DescribeExperienceCommand, } from "./commands/DescribeExperienceCommand";
import { DescribeFaqCommand } from "./commands/DescribeFaqCommand";
import { DescribeFeaturedResultsSetCommand, } from "./commands/DescribeFeaturedResultsSetCommand";
import { DescribeIndexCommand, } from "./commands/DescribeIndexCommand";
import { DescribePrincipalMappingCommand, } from "./commands/DescribePrincipalMappingCommand";
import { DescribeQuerySuggestionsBlockListCommand, } from "./commands/DescribeQuerySuggestionsBlockListCommand";
import { DescribeQuerySuggestionsConfigCommand, } from "./commands/DescribeQuerySuggestionsConfigCommand";
import { DescribeThesaurusCommand, } from "./commands/DescribeThesaurusCommand";
import { DisassociateEntitiesFromExperienceCommand, } from "./commands/DisassociateEntitiesFromExperienceCommand";
import { DisassociatePersonasFromEntitiesCommand, } from "./commands/DisassociatePersonasFromEntitiesCommand";
import { GetQuerySuggestionsCommand, } from "./commands/GetQuerySuggestionsCommand";
import { GetSnapshotsCommand, } from "./commands/GetSnapshotsCommand";
import { ListAccessControlConfigurationsCommand, } from "./commands/ListAccessControlConfigurationsCommand";
import { ListDataSourcesCommand, } from "./commands/ListDataSourcesCommand";
import { ListDataSourceSyncJobsCommand, } from "./commands/ListDataSourceSyncJobsCommand";
import { ListEntityPersonasCommand, } from "./commands/ListEntityPersonasCommand";
import { ListExperienceEntitiesCommand, } from "./commands/ListExperienceEntitiesCommand";
import { ListExperiencesCommand, } from "./commands/ListExperiencesCommand";
import { ListFaqsCommand } from "./commands/ListFaqsCommand";
import { ListFeaturedResultsSetsCommand, } from "./commands/ListFeaturedResultsSetsCommand";
import { ListGroupsOlderThanOrderingIdCommand, } from "./commands/ListGroupsOlderThanOrderingIdCommand";
import { ListIndicesCommand } from "./commands/ListIndicesCommand";
import { ListQuerySuggestionsBlockListsCommand, } from "./commands/ListQuerySuggestionsBlockListsCommand";
import { ListTagsForResourceCommand, } from "./commands/ListTagsForResourceCommand";
import { ListThesauriCommand, } from "./commands/ListThesauriCommand";
import { PutPrincipalMappingCommand, } from "./commands/PutPrincipalMappingCommand";
import { QueryCommand } from "./commands/QueryCommand";
import { RetrieveCommand } from "./commands/RetrieveCommand";
import { StartDataSourceSyncJobCommand, } from "./commands/StartDataSourceSyncJobCommand";
import { StopDataSourceSyncJobCommand, } from "./commands/StopDataSourceSyncJobCommand";
import { SubmitFeedbackCommand, } from "./commands/SubmitFeedbackCommand";
import { TagResourceCommand } from "./commands/TagResourceCommand";
import { UntagResourceCommand, } from "./commands/UntagResourceCommand";
import { UpdateAccessControlConfigurationCommand, } from "./commands/UpdateAccessControlConfigurationCommand";
import { UpdateDataSourceCommand, } from "./commands/UpdateDataSourceCommand";
import { UpdateExperienceCommand, } from "./commands/UpdateExperienceCommand";
import { UpdateFeaturedResultsSetCommand, } from "./commands/UpdateFeaturedResultsSetCommand";
import { UpdateIndexCommand } from "./commands/UpdateIndexCommand";
import { UpdateQuerySuggestionsBlockListCommand, } from "./commands/UpdateQuerySuggestionsBlockListCommand";
import { UpdateQuerySuggestionsConfigCommand, } from "./commands/UpdateQuerySuggestionsConfigCommand";
import { UpdateThesaurusCommand, } from "./commands/UpdateThesaurusCommand";
import { KendraClient } from "./KendraClient";
import { paginateGetSnapshots } from "./pagination/GetSnapshotsPaginator";
import { paginateListAccessControlConfigurations } from "./pagination/ListAccessControlConfigurationsPaginator";
import { paginateListDataSources } from "./pagination/ListDataSourcesPaginator";
import { paginateListDataSourceSyncJobs } from "./pagination/ListDataSourceSyncJobsPaginator";
import { paginateListEntityPersonas } from "./pagination/ListEntityPersonasPaginator";
import { paginateListExperienceEntities } from "./pagination/ListExperienceEntitiesPaginator";
import { paginateListExperiences } from "./pagination/ListExperiencesPaginator";
import { paginateListFaqs } from "./pagination/ListFaqsPaginator";
import { paginateListGroupsOlderThanOrderingId } from "./pagination/ListGroupsOlderThanOrderingIdPaginator";
import { paginateListIndices } from "./pagination/ListIndicesPaginator";
import { paginateListQuerySuggestionsBlockLists } from "./pagination/ListQuerySuggestionsBlockListsPaginator";
import { paginateListThesauri } from "./pagination/ListThesauriPaginator";
const commands = {
    AssociateEntitiesToExperienceCommand,
    AssociatePersonasToEntitiesCommand,
    BatchDeleteDocumentCommand,
    BatchDeleteFeaturedResultsSetCommand,
    BatchGetDocumentStatusCommand,
    BatchPutDocumentCommand,
    ClearQuerySuggestionsCommand,
    CreateAccessControlConfigurationCommand,
    CreateDataSourceCommand,
    CreateExperienceCommand,
    CreateFaqCommand,
    CreateFeaturedResultsSetCommand,
    CreateIndexCommand,
    CreateQuerySuggestionsBlockListCommand,
    CreateThesaurusCommand,
    DeleteAccessControlConfigurationCommand,
    DeleteDataSourceCommand,
    DeleteExperienceCommand,
    DeleteFaqCommand,
    DeleteIndexCommand,
    DeletePrincipalMappingCommand,
    DeleteQuerySuggestionsBlockListCommand,
    DeleteThesaurusCommand,
    DescribeAccessControlConfigurationCommand,
    DescribeDataSourceCommand,
    DescribeExperienceCommand,
    DescribeFaqCommand,
    DescribeFeaturedResultsSetCommand,
    DescribeIndexCommand,
    DescribePrincipalMappingCommand,
    DescribeQuerySuggestionsBlockListCommand,
    DescribeQuerySuggestionsConfigCommand,
    DescribeThesaurusCommand,
    DisassociateEntitiesFromExperienceCommand,
    DisassociatePersonasFromEntitiesCommand,
    GetQuerySuggestionsCommand,
    GetSnapshotsCommand,
    ListAccessControlConfigurationsCommand,
    ListDataSourcesCommand,
    ListDataSourceSyncJobsCommand,
    ListEntityPersonasCommand,
    ListExperienceEntitiesCommand,
    ListExperiencesCommand,
    ListFaqsCommand,
    ListFeaturedResultsSetsCommand,
    ListGroupsOlderThanOrderingIdCommand,
    ListIndicesCommand,
    ListQuerySuggestionsBlockListsCommand,
    ListTagsForResourceCommand,
    ListThesauriCommand,
    PutPrincipalMappingCommand,
    QueryCommand,
    RetrieveCommand,
    StartDataSourceSyncJobCommand,
    StopDataSourceSyncJobCommand,
    SubmitFeedbackCommand,
    TagResourceCommand,
    UntagResourceCommand,
    UpdateAccessControlConfigurationCommand,
    UpdateDataSourceCommand,
    UpdateExperienceCommand,
    UpdateFeaturedResultsSetCommand,
    UpdateIndexCommand,
    UpdateQuerySuggestionsBlockListCommand,
    UpdateQuerySuggestionsConfigCommand,
    UpdateThesaurusCommand,
};
const paginators = {
    paginateGetSnapshots,
    paginateListAccessControlConfigurations,
    paginateListDataSources,
    paginateListDataSourceSyncJobs,
    paginateListEntityPersonas,
    paginateListExperienceEntities,
    paginateListExperiences,
    paginateListFaqs,
    paginateListGroupsOlderThanOrderingId,
    paginateListIndices,
    paginateListQuerySuggestionsBlockLists,
    paginateListThesauri,
};
export class Kendra extends KendraClient {
}
createAggregatedClient(commands, Kendra, { paginators });
