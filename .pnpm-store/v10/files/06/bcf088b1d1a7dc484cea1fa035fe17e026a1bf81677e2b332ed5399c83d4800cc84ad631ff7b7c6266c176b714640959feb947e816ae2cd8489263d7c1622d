import { Options } from 'xml2js';
import { RequestOptions } from 'https';

declare namespace Parser {
  type CustomFieldItem<U> = keyof U | (string | { keepArray: boolean })[]
    
  export interface CustomFields<T, U> {
    readonly feed?: Array<keyof T>;
    readonly item?: CustomFieldItem<U>[] | CustomFieldItem<U>[][];
  }

  export interface ParserOptions<T, U> {
    readonly xml2js?: Options;
    readonly requestOptions?: RequestOptions;
    readonly headers?: Record<string, string>;
    readonly defaultRSS?: number;
    readonly maxRedirects?: number;
    readonly customFields?: CustomFields<T, U>;
    readonly timeout?: number;
  }

  export interface Enclosure {
    url: string;
    length?: number;
    type?: string;
  }

  export interface Item {
    link?: string;
    guid?: string;
    title?: string;
    pubDate?: string;
    creator?: string;
    summary?: string;
    content?: string;
    isoDate?: string;
    categories?: string[];
    contentSnippet?: string;
    enclosure?: Enclosure;
  }

  export interface PaginationLinks {
    self?: string;
    first?: string;
    next?: string;
    last?: string;
    prev?: string;
  }

  export interface Output<U> {
    image?: {
      link?: string;
      url: string;
      title?: string;
    },
    paginationLinks?: PaginationLinks;
    link?: string;
    title?: string;
    items: (U & Item)[];
    feedUrl?: string;
    description?: string;
    itunes?: {
      [key: string]: any;
      image?: string;
      owner?: {
        name?: string;
        email?: string;
      };
      author?: string;
      summary?: string;
      explicit?: string;
      categories?: string[];
      keywords?: string[];
    };
  }
}

/**
 * Class that handles all parsing or URL, or even XML, RSS feed to JSON.
 */
declare class Parser<T = {[key: string]: any}, U = {[key: string]: any}> {
  /**
   * @param options - Parser options.
   */
  constructor(options?: Parser.ParserOptions<T, U>);
  /**
   * Parse XML content to JSON.
   *
   * @param xml - The xml to be parsed.
   * @param callback - Traditional callback.
   *
   * @returns Promise that has the same Output as the callback.
   */
  parseString(
    xml: string,
    callback?: (err: Error, feed: Parser.Output<U>) => void
  ): Promise<T & Parser.Output<U>>;

  /**
   * Parse URL content to JSON.
   *
   * @param feedUrl - The url that needs to be parsed to JSON.
   * @param callback - Traditional callback.
   * @param redirectCount - Max of redirects, default is set to five.
   *
   * @example
   * await parseURL('https://www.reddit.com/.rss');
   * parseURL('https://www.reddit.com/.rss', (err, feed) => { ... });
   *
   * @returns Promise that has the same Output as the callback.
   */
  parseURL(
    feedUrl: string,
    callback?: (err: Error, feed: Parser.Output<U>) => void,
    redirectCount?: number
  ): Promise<T & Parser.Output<U>>;
}

export = Parser;
