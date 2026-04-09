import { Skillsets } from "../operationsInterfaces/index.js";
import { SearchServiceClient } from "../searchServiceClient.js";
import { SearchIndexerSkillset, SkillsetsCreateOrUpdateOptionalParams, SkillsetsCreateOrUpdateResponse, SkillsetsDeleteOptionalParams, SkillsetsGetOptionalParams, SkillsetsGetResponse, SkillsetsListOptionalParams, SkillsetsListResponse, SkillsetsCreateOptionalParams, SkillsetsCreateResponse } from "../models/index.js";
/** Class containing Skillsets operations. */
export declare class SkillsetsImpl implements Skillsets {
    private readonly client;
    /**
     * Initialize a new instance of the class Skillsets class.
     * @param client Reference to the service client
     */
    constructor(client: SearchServiceClient);
    /**
     * Creates a new skillset in a search service or updates the skillset if it already exists.
     * @param skillsetName The name of the skillset to create or update.
     * @param skillset The skillset containing one or more skills to create or update in a search service.
     * @param options The options parameters.
     */
    createOrUpdate(skillsetName: string, skillset: SearchIndexerSkillset, options?: SkillsetsCreateOrUpdateOptionalParams): Promise<SkillsetsCreateOrUpdateResponse>;
    /**
     * Deletes a skillset in a search service.
     * @param skillsetName The name of the skillset to delete.
     * @param options The options parameters.
     */
    delete(skillsetName: string, options?: SkillsetsDeleteOptionalParams): Promise<void>;
    /**
     * Retrieves a skillset in a search service.
     * @param skillsetName The name of the skillset to retrieve.
     * @param options The options parameters.
     */
    get(skillsetName: string, options?: SkillsetsGetOptionalParams): Promise<SkillsetsGetResponse>;
    /**
     * List all skillsets in a search service.
     * @param options The options parameters.
     */
    list(options?: SkillsetsListOptionalParams): Promise<SkillsetsListResponse>;
    /**
     * Creates a new skillset in a search service.
     * @param skillset The skillset containing one or more skills to create in a search service.
     * @param options The options parameters.
     */
    create(skillset: SearchIndexerSkillset, options?: SkillsetsCreateOptionalParams): Promise<SkillsetsCreateResponse>;
}
//# sourceMappingURL=skillsets.d.ts.map