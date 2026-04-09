import { ClientSDK, RequestOptions } from "../lib/sdks.js";
import * as components from "../models/components/index.js";
import * as operations from "../models/operations/index.js";
import { Records } from "./records.js";
export declare class Datasets extends ClientSDK {
    private _records?;
    get records(): Records;
    /**
     * Create a new empty dataset
     */
    create(request: components.PostDatasetInSchema, options?: RequestOptions): Promise<components.Dataset>;
    /**
     * List existing datasets
     */
    list(request?: operations.GetDatasetsV1ObservabilityDatasetsGetRequest | undefined, options?: RequestOptions): Promise<components.DatasetPreviews>;
    /**
     * Get dataset by id
     */
    fetch(request: operations.GetDatasetByIdV1ObservabilityDatasetsDatasetIdGetRequest, options?: RequestOptions): Promise<components.DatasetPreview>;
    /**
     * Delete a dataset
     */
    delete(request: operations.DeleteDatasetV1ObservabilityDatasetsDatasetIdDeleteRequest, options?: RequestOptions): Promise<void>;
    /**
     * Patch dataset
     */
    update(request: operations.UpdateDatasetV1ObservabilityDatasetsDatasetIdPatchRequest, options?: RequestOptions): Promise<components.DatasetPreview>;
    /**
     * List existing records in the dataset
     */
    listRecords(request: operations.GetDatasetRecordsV1ObservabilityDatasetsDatasetIdRecordsGetRequest, options?: RequestOptions): Promise<components.DatasetRecords>;
    /**
     * Add a conversation to the dataset
     */
    createRecord(request: operations.CreateDatasetRecordV1ObservabilityDatasetsDatasetIdRecordsPostRequest, options?: RequestOptions): Promise<components.DatasetRecord>;
    /**
     * Populate the dataset with a campaign
     */
    importFromCampaign(request: operations.PostDatasetRecordsFromCampaignV1ObservabilityDatasetsDatasetIdImportsFromCampaignPostRequest, options?: RequestOptions): Promise<components.DatasetImportTask>;
    /**
     * Populate the dataset with samples from the explorer
     */
    importFromExplorer(request: operations.PostDatasetRecordsFromExplorerV1ObservabilityDatasetsDatasetIdImportsFromExplorerPostRequest, options?: RequestOptions): Promise<components.DatasetImportTask>;
    /**
     * Populate the dataset with samples from an uploaded file
     */
    importFromFile(request: operations.PostDatasetRecordsFromFileV1ObservabilityDatasetsDatasetIdImportsFromFilePostRequest, options?: RequestOptions): Promise<components.DatasetImportTask>;
    /**
     * Populate the dataset with samples from the playground
     */
    importFromPlayground(request: operations.PostDatasetRecordsFromPlaygroundV1ObservabilityDatasetsDatasetIdImportsFromPlaygroundPostRequest, options?: RequestOptions): Promise<components.DatasetImportTask>;
    /**
     * Populate the dataset with samples from another dataset
     */
    importFromDatasetRecords(request: operations.PostDatasetRecordsFromDatasetV1ObservabilityDatasetsDatasetIdImportsFromDatasetPostRequest, options?: RequestOptions): Promise<components.DatasetImportTask>;
    /**
     * Export to the Files API and retrieve presigned URL to download the resulting JSONL file
     */
    exportToJsonl(request: operations.ExportDatasetToJsonlV1ObservabilityDatasetsDatasetIdExportsToJsonlGetRequest, options?: RequestOptions): Promise<components.DatasetExport>;
    /**
     * Get status of a dataset import task
     */
    fetchTask(request: operations.GetDatasetImportTaskV1ObservabilityDatasetsDatasetIdTasksTaskIdGetRequest, options?: RequestOptions): Promise<components.DatasetImportTask>;
    /**
     * List import tasks for the given dataset
     */
    listTasks(request: operations.GetDatasetImportTasksV1ObservabilityDatasetsDatasetIdTasksGetRequest, options?: RequestOptions): Promise<components.DatasetImportTasks>;
}
//# sourceMappingURL=datasets.d.ts.map