export declare function makeDebug(...scope: string[]): (..._: any) => void;
export declare function getPermutations(arr: string[]): Array<string[]>;
export declare function getCommandIdPermutations(commandId: string): string[];
/**
 * Return an array of ids that represent all the usable combinations that a user could enter.
 *
 * For example, if the command ids are:
 * - foo:bar:baz
 * - one:two:three
 * Then the usable ids would be:
 * - foo
 * - foo:bar
 * - foo:bar:baz
 * - one
 * - one:two
 * - one:two:three
 *
 * This allows us to determine which parts of the argv array belong to the command id whenever the topicSeparator is a space.
 *
 * @param commandIds string[]
 * @returns string[]
 */
export declare const collectUsableIds: (commandIds: string[]) => Set<string>;
