import { CleanSummary } from '../../../typings';
import { StringTask } from '../types';
export declare const CONFIG_ERROR_INTERACTIVE_MODE = "Git clean interactive mode is not supported";
export declare const CONFIG_ERROR_MODE_REQUIRED = "Git clean mode parameter (\"n\" or \"f\") is required";
export declare const CONFIG_ERROR_UNKNOWN_OPTION = "Git clean unknown option found in: ";
/**
 * All supported option switches available for use in a `git.clean` operation
 */
export declare enum CleanOptions {
    DRY_RUN = "n",
    FORCE = "f",
    IGNORED_INCLUDED = "x",
    IGNORED_ONLY = "X",
    EXCLUDING = "e",
    QUIET = "q",
    RECURSIVE = "d"
}
/**
 * The two modes `git.clean` can run in - one of these must be supplied in order
 * for the command to not throw a `TaskConfigurationError`
 */
export type CleanMode = CleanOptions.FORCE | CleanOptions.DRY_RUN;
export declare function cleanWithOptionsTask(mode: CleanMode | string, customArgs: string[]): import("./task").EmptyTask | StringTask<CleanSummary>;
export declare function cleanTask(mode: CleanMode, customArgs: string[]): StringTask<CleanSummary>;
export declare function isCleanOptionsArray(input: string[]): input is CleanOptions[];
