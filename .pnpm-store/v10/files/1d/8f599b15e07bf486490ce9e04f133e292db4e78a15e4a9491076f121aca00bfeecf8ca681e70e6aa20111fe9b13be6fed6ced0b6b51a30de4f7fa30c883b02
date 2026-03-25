/**
 * This file was automatically generated. DO NOT MODIFY IT BY HAND.
 */
import { RequestPattern } from './request-pattern.model';
import { ResponseDefinition } from './response-definition.model';
export interface StubMapping {
    /**
     * This stub mapping's unique identifier
     */
    id?: string;
    /**
     * Alias for the id
     */
    uuid?: string;
    /**
     * The stub mapping's name
     */
    name?: string;
    request?: RequestPattern;
    response?: ResponseDefinition;
    /**
     * Indicates that the stub mapping should be persisted immediately on create/update/delete and
     * survive resets to default.
     */
    persistent?: boolean;
    /**
     * This stub mapping's priority relative to others. 1 is highest.
     */
    priority?: number;
    /**
     * The name of the scenario that this stub mapping is part of
     */
    scenarioName?: string;
    /**
     * The required state of the scenario in order for this stub to be matched.
     */
    requiredScenarioState?: string;
    /**
     * The new state for the scenario to be updated to after this stub is served.
     */
    newScenarioState?: string;
    /**
     * A map of the names of post serve action extensions to trigger and their parameters.
     */
    postServeActions?: {
        [k: string]: any;
    };
    /**
     * Arbitrary metadata to be used for e.g. tagging, documentation. Can also be used to find and
     * remove stubs.
     */
    metadata?: {
        [k: string]: any;
    };
    [k: string]: any;
}
