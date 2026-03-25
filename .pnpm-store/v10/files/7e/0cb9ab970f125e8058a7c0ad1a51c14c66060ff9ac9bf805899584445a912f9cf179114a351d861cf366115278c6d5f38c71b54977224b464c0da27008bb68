/**
 * Detect if a user agent is a bot, crawler or spider
 * @param {string} ua A user agent string. Non strings will be cast to string before the check
 * @returns {boolean}
 */
declare function isbot(ua: any): boolean;

declare namespace isbot {
  /**
   * Extend the built-in list of bot user agent
   * @param {string[]} filters An array of regular expression patterns
   * @returns {void}
   */
  function extend(filters: string[]): void;

  /**
   * Removes a set of user agent from the built-in list
   * @param {string[]} filters An array of regular expression patterns
   * @returns {void}
   */
  function exclude(filters: string[]): void;

  /**
   * Return the respective match for bot user agent rule
   * @param {string} ua A user agent string
   * @returns {string|null}
   */
  function find(ua: string): string|null;

  /**
   * Get the patterns that match user agent string if any
   * @param  {string} ua User Agent string
   * @returns {string[]}
   */
  function matches(ua: string): string[];

  /**
   * Clear all patterns that match user agent
   * @param  {string} ua User Agent string
   * @returns {void}
   */
  function clear(ua: string): void;

  /**
   * Create a new isbot function complete with all its interface
   * @param {string[]} list of strings representing regular expression patterns
   * @returns isbot function with full interface
   */
  function spawn(list?: string[]): typeof isbot;

  /**
   * A copy of the regular expression pattern
   */
  const pattern: RegExp;
}

export = isbot;
