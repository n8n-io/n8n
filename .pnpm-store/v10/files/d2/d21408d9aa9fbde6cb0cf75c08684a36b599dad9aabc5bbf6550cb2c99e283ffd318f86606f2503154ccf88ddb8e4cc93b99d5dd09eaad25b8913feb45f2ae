import { Scenario } from '../model/scenario.model';
export declare class ScenarioService {
    baseUri: string;
    constructor(baseUri: string);
    /**
     * Get all scenarios
     */
    getAllScenarios(): Promise<Scenario[]>;
    /**
     * Reset the state of all scenarios
     */
    resetAllScenarios(): Promise<void>;
    /**
     * Reset the state of a single scenario
     */
    resetScenario(scenarioId: string): Promise<void>;
    /**
     * Set the state of a single scenario
     */
    setScenarioState(scenarioId: string, state: string): Promise<void>;
}
