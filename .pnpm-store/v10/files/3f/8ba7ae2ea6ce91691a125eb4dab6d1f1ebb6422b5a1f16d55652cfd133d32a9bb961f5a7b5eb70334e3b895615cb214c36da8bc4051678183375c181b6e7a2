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
     * Given an agent retrieve an agent entity with its attributes.
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
     * Update an agent version.
     *
     * @remarks
     * Switch the version of an agent.
     */
    updateVersion(request: operations.AgentsApiV1AgentsUpdateVersionRequest, options?: RequestOptions): Promise<components.Agent>;
}
//# sourceMappingURL=mistralagents.d.ts.map