import { ClientSDK, RequestOptions } from "../lib/sdks.js";
import * as components from "../models/components/index.js";
import * as operations from "../models/operations/index.js";
export declare class MistralAgents extends ClientSDK {
    /**
     * Create a agent that can be used within a conversation.
     *
     * @remarks
     * Create a new agent giving it instructions, tools, description. The agent is then available to be used as a regular assistant in a conversation or as part of an agent pool from which it can be used.
     */
    create(request: components.AgentCreationRequest, options?: RequestOptions): Promise<components.Agent>;
    /**
     * List agent entities.
     *
     * @remarks
     * Retrieve a list of agent entities sorted by creation time.
     */
    list(request?: operations.AgentsApiV1AgentsListRequest | undefined, options?: RequestOptions): Promise<Array<components.Agent>>;
    /**
     * Retrieve an agent entity.
     *
     * @remarks
     * Given an agent, retrieve an agent entity with its attributes. The agent_version parameter can be an integer version number or a string alias.
     */
    get(request: operations.AgentsApiV1AgentsGetRequest, options?: RequestOptions): Promise<components.Agent>;
    /**
     * Update an agent entity.
     *
     * @remarks
     * Update an agent attributes and create a new version.
     */
    update(request: operations.AgentsApiV1AgentsUpdateRequest, options?: RequestOptions): Promise<components.Agent>;
    /**
     * Delete an agent entity.
     */
    delete(request: operations.AgentsApiV1AgentsDeleteRequest, options?: RequestOptions): Promise<void>;
    /**
     * Update an agent version.
     *
     * @remarks
     * Switch the version of an agent.
     */
    updateVersion(request: operations.AgentsApiV1AgentsUpdateVersionRequest, options?: RequestOptions): Promise<components.Agent>;
    /**
     * List all versions of an agent.
     *
     * @remarks
     * Retrieve all versions for a specific agent with full agent context. Supports pagination.
     */
    listVersions(request: operations.AgentsApiV1AgentsListVersionsRequest, options?: RequestOptions): Promise<Array<components.Agent>>;
    /**
     * Retrieve a specific version of an agent.
     *
     * @remarks
     * Get a specific agent version by version number.
     */
    getVersion(request: operations.AgentsApiV1AgentsGetVersionRequest, options?: RequestOptions): Promise<components.Agent>;
    /**
     * Create or update an agent version alias.
     *
     * @remarks
     * Create a new alias or update an existing alias to point to a specific version. Aliases are unique per agent and can be reassigned to different versions.
     */
    createVersionAlias(request: operations.AgentsApiV1AgentsCreateOrUpdateAliasRequest, options?: RequestOptions): Promise<components.AgentAliasResponse>;
    /**
     * List all aliases for an agent.
     *
     * @remarks
     * Retrieve all version aliases for a specific agent.
     */
    listVersionAliases(request: operations.AgentsApiV1AgentsListVersionAliasesRequest, options?: RequestOptions): Promise<Array<components.AgentAliasResponse>>;
    /**
     * Delete an agent version alias.
     *
     * @remarks
     * Delete an existing alias for an agent.
     */
    deleteVersionAlias(request: operations.AgentsApiV1AgentsDeleteAliasRequest, options?: RequestOptions): Promise<void>;
}
//# sourceMappingURL=mistralagents.d.ts.map