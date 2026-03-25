// Type definitions for Bowser v2
// Project: https://github.com/lancedikson/bowser
// Definitions by: Alexander P. Cerutti <https://github.com/alexandercerutti>,

export = Bowser;
export as namespace Bowser;

declare namespace Bowser {
  /**
   * Creates a Parser instance
   * @param {string} UA - User agent string
   * @param {boolean} skipParsing
   */

  function getParser(UA: string, skipParsing?: boolean): Parser.Parser;

  /**
   * Creates a Parser instance and runs Parser.getResult immediately
   * @param UA - User agent string
   * @returns {Parser.ParsedResult}
   */

  function parse(UA: string): Parser.ParsedResult;

  /**
   * Constants exposed via bowser getters
   */
  const BROWSER_MAP: Record<string, string>;
  const ENGINE_MAP: Record<string, string>;
  const OS_MAP: Record<string, string>;
  const PLATFORMS_MAP: Record<string, string>;

  namespace Parser {
    interface Parser {
      constructor(UA: string, skipParsing?: boolean): Parser.Parser;

      /**
       * Get parsed browser object
       * @return {BrowserDetails} Browser's details
       */

      getBrowser(): BrowserDetails;

      /**
       * Get browser's name
       * @param {Boolean} [toLowerCase] return lower-cased value
       * @return {String} Browser's name or an empty string
       */

      getBrowserName(toLowerCase?: boolean): string;

      /**
       * Get browser's version
       * @return {String} version of browser
       */

      getBrowserVersion(): string;

      /**
       * Get OS
       * @return {OSDetails} - OS Details
       *
       * @example
       * this.getOS(); // {
       * //   name: 'macOS',
       * //   version: '10.11.12',
       * // }
       */

      getOS(): OSDetails;

      /**
       * Get OS name
       * @param {Boolean} [toLowerCase] return lower-cased value
       * @return {String} name of the OS — macOS, Windows, Linux, etc.
       */

      getOSName(toLowerCase?: boolean): string;

      /**
       * Get OS version
       * @return {String} full version with dots ('10.11.12', '5.6', etc)
       */

      getOSVersion(): string;

      /**
       * Get parsed platform
       * @returns {PlatformDetails}
       */

      getPlatform(): PlatformDetails;

      /**
       * Get platform name
       * @param {boolean} toLowerCase
       */

      getPlatformType(toLowerCase?: boolean): string;

      /**
       * Get parsed engine
       * @returns {EngineDetails}
       */

      getEngine(): EngineDetails;

      /**
       * Get parsed engine's name
       * @returns {String} Engine's name or an empty string
       */

      getEngineName(): string;

      /**
       * Get parsed result
       * @return {ParsedResult}
       */

      getResult(): ParsedResult;

      /**
       * Get UserAgent string of current Parser instance
       * @return {String} User-Agent String of the current <Parser> object
       */

      getUA(): string;

      /**
       * Is anything? Check if the browser is called "anything",
       * the OS called "anything" or the platform called "anything"
       * @param {String} anything
       * @returns {Boolean}
       */

      is(anything: any): boolean;

      /**
       * Parse full information about the browser
       * @returns {Parser.Parser}
       */

      parse(): Parser.Parser;

      /**
       * Get parsed browser object
       * @returns {BrowserDetails}
       */

      parseBrowser(): BrowserDetails;

      /**
       * Get parsed engine
       * @returns {EngineDetails}
       */

      parseEngine(): EngineDetails;

      /**
       * Parse OS and save it to this.parsedResult.os
       * @returns {OSDetails}
       */

      parseOS(): OSDetails;

      /**
       * Get parsed platform
       * @returns {PlatformDetails}
       */

      parsePlatform(): PlatformDetails;

      /**
       * Check if parsed browser matches certain conditions
       *
       * @param {checkTree} checkTree It's one or two layered object,
       * which can include a platform or an OS on the first layer
       * and should have browsers specs on the bottom-laying layer
       *
       * @returns {Boolean|undefined} Whether the browser satisfies the set conditions or not.
       * Returns `undefined` when the browser is no described in the checkTree object.
       *
       * @example
       * const browser = new Bowser(UA);
       * if (browser.check({chrome: '>118.01.1322' }))
       * // or with os
       * if (browser.check({windows: { chrome: '>118.01.1322' } }))
       * // or with platforms
       * if (browser.check({desktop: { chrome: '>118.01.1322' } }))
       */

      satisfies(checkTree: checkTree): boolean | undefined;

       /**
       * Check if the browser name equals the passed string
       * @param browserName The string to compare with the browser name
       * @param [includingAlias=false] The flag showing whether alias will be included into comparison
       * @returns {boolean}
       */


      isBrowser(browserName: string, includingAlias?: boolean): boolean;

      /**
       * Check if any of the given values satifies `.is(anything)`
       * @param {string[]} anythings
       * @returns {boolean} true if at least one condition is satisfied, false otherwise.
       */

      some(anythings: string[]): boolean | undefined;

      /**
       * Test a UA string for a regexp
       * @param regex
       * @returns {boolean} true if the regex matches the UA, false otherwise.
       */

      test(regex: RegExp): boolean;
    }

    interface ParsedResult {
      browser: BrowserDetails;
      os: OSDetails;
      platform: PlatformDetails;
      engine: EngineDetails;
    }

    interface Details {
      name?: string;
      version?: string;
    }

    interface OSDetails extends Details {
      versionName?: string;
    }

    interface PlatformDetails {
      type?: string;
      vendor?: string;
      model?: string;
    }

    type BrowserDetails = Details;
    type EngineDetails = Details;

    interface checkTree {
      [key: string]: any;
    }
  }
}
