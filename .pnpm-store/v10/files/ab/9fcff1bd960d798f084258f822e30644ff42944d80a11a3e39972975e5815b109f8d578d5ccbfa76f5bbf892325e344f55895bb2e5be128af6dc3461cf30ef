/**
 * This file provides utility functions and classes to assist with evaluation tasks.
 *
 * Key functionalities:
 * - String normalization and fuzzy comparison utility functions to compare output strings
 *   against expected results in a flexible and robust way.
 * - Generation of unique experiment names based on the current timestamp, environment,
 *   and eval name or category.
 */
import { LogLine } from "@/dist";
/**
 * normalizeString:
 * Prepares a string for comparison by:
 * - Converting to lowercase
 * - Collapsing multiple spaces to a single space
 * - Removing punctuation and special characters that are not alphabetic or numeric
 * - Normalizing spacing around commas
 * - Trimming leading and trailing whitespace
 *
 * This helps create a stable string representation to compare against expected outputs,
 * even if the actual output contains minor formatting differences.
 */
export declare function normalizeString(str: string): string;
/**
 * compareStrings:
 * Compares two strings (actual vs. expected) using a similarity metric (Jaro-Winkler).
 *
 * Arguments:
 * - actual: The actual output string to be checked.
 * - expected: The expected string we want to match against.
 * - similarityThreshold: A number between 0 and 1. Default is 0.85.
 *   If the computed similarity is greater than or equal to this threshold,
 *   we consider the strings sufficiently similar.
 *
 * Returns:
 * - similarity: A number indicating how similar the two strings are.
 * - meetsThreshold: A boolean indicating if the similarity meets or exceeds the threshold.
 *
 * This function is useful for tasks where exact string matching is too strict,
 * allowing for fuzzy matching that tolerates minor differences in formatting or spelling.
 */
export declare function compareStrings(actual: string, expected: string, similarityThreshold?: number): {
    similarity: number;
    meetsThreshold: boolean;
};
/**
 * generateTimestamp:
 * Generates a timestamp string formatted as "YYYYMMDDHHMMSS".
 * Used to create unique experiment names, ensuring that results can be
 * distinguished by the time they were generated.
 */
export declare function generateTimestamp(): string;
/**
 * generateExperimentName:
 * Creates a unique name for the experiment based on optional evalName or category,
 * the environment (e.g., dev or CI), and the current timestamp.
 * This is used to label the output files and directories.
 */
export declare function generateExperimentName({ evalName, category, environment, }: {
    evalName?: string;
    category?: string;
    environment: string;
}): string;
export declare function logLineToString(logLine: LogLine): string;
