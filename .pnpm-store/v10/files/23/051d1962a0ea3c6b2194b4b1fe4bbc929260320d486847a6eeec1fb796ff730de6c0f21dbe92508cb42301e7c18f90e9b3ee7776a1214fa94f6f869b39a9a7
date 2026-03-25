import { LogLine } from "../../types/log";
import { BaseCache, CacheEntry } from "./BaseCache";
export interface PlaywrightCommand {
    method: string;
    args: string[];
}
export interface ActionEntry extends CacheEntry {
    data: {
        playwrightCommand: PlaywrightCommand;
        componentString: string;
        xpaths: string[];
        newStepString: string;
        completed: boolean;
        previousSelectors: string[];
        action: string;
    };
}
/**
 * ActionCache handles logging and retrieving actions along with their Playwright commands.
 */
export declare class ActionCache extends BaseCache<ActionEntry> {
    constructor(logger: (message: LogLine) => void, cacheDir?: string, cacheFile?: string);
    addActionStep({ url, action, previousSelectors, playwrightCommand, componentString, xpaths, newStepString, completed, requestId, }: {
        url: string;
        action: string;
        previousSelectors: string[];
        playwrightCommand: PlaywrightCommand;
        componentString: string;
        requestId: string;
        xpaths: string[];
        newStepString: string;
        completed: boolean;
    }): Promise<void>;
    /**
     * Retrieves all actions for a specific trajectory.
     * @param trajectoryId - Unique identifier for the trajectory.
     * @param requestId - The identifier for the current request.
     * @returns An array of TrajectoryEntry objects or null if not found.
     */
    getActionStep({ url, action, previousSelectors, requestId, }: {
        url: string;
        action: string;
        previousSelectors: string[];
        requestId: string;
    }): Promise<ActionEntry["data"] | null>;
    removeActionStep(cacheHashObj: {
        url: string;
        action: string;
        previousSelectors: string[];
        requestId: string;
    }): Promise<void>;
    /**
     * Clears all actions for a specific trajectory.
     * @param trajectoryId - Unique identifier for the trajectory.
     * @param requestId - The identifier for the current request.
     */
    clearAction(requestId: string): Promise<void>;
    /**
     * Resets the entire action cache.
     */
    resetCache(): Promise<void>;
}
