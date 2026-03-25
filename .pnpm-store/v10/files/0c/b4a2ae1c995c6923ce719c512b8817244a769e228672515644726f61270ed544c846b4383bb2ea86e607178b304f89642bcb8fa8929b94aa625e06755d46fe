import { AnnotationProperties } from './core';
import { CommandProperties } from './command';
/**
 * Sanitizes an input into a string so it can be passed into issueCommand safely
 * @param input input to sanitize into a string
 */
export declare function toCommandValue(input: any): string;
/**
 *
 * @param annotationProperties
 * @returns The command properties to send with the actual annotation command
 * See IssueCommandProperties: https://github.com/actions/runner/blob/main/src/Runner.Worker/ActionCommandManager.cs#L646
 */
export declare function toCommandProperties(annotationProperties: AnnotationProperties): CommandProperties;
