// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { AnthropicError } from './error';
import { FinalRequestOptions } from '../internal/request-options';
import { defaultParseResponse, WithRequestID } from '../internal/parse';
import { type BaseAnthropic } from '../client';
import { APIPromise } from './api-promise';
import { type APIResponseProps } from '../internal/parse';
import { maybeObj } from '../internal/utils/values';

export type PageRequestOptions = Pick<FinalRequestOptions, 'query' | 'headers' | 'body' | 'path' | 'method'>;

export abstract class AbstractPage<Item> implements AsyncIterable<Item> {
  #client: BaseAnthropic;
  protected options: FinalRequestOptions;

  protected response: Response;
  protected body: unknown;

  constructor(client: BaseAnthropic, response: Response, body: unknown, options: FinalRequestOptions) {
    this.#client = client;
    this.options = options;
    this.response = response;
    this.body = body;
  }

  abstract nextPageRequestOptions(): PageRequestOptions | null;

  abstract getPaginatedItems(): Item[];

  hasNextPage(): boolean {
    const items = this.getPaginatedItems();
    if (!items.length) return false;
    return this.nextPageRequestOptions() != null;
  }

  async getNextPage(): Promise<this> {
    const nextOptions = this.nextPageRequestOptions();
    if (!nextOptions) {
      throw new AnthropicError(
        'No next page expected; please check `.hasNextPage()` before calling `.getNextPage()`.',
      );
    }

    return await this.#client.requestAPIList(this.constructor as any, nextOptions);
  }

  async *iterPages(): AsyncGenerator<this> {
    let page: this = this;
    yield page;
    while (page.hasNextPage()) {
      page = await page.getNextPage();
      yield page;
    }
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<Item> {
    for await (const page of this.iterPages()) {
      for (const item of page.getPaginatedItems()) {
        yield item;
      }
    }
  }
}

/**
 * This subclass of Promise will resolve to an instantiated Page once the request completes.
 *
 * It also implements AsyncIterable to allow auto-paginating iteration on an unawaited list call, eg:
 *
 *    for await (const item of client.items.list()) {
 *      console.log(item)
 *    }
 */
export class PagePromise<
    PageClass extends AbstractPage<Item>,
    Item = ReturnType<PageClass['getPaginatedItems']>[number],
  >
  extends APIPromise<PageClass>
  implements AsyncIterable<Item>
{
  constructor(
    client: BaseAnthropic,
    request: Promise<APIResponseProps>,
    Page: new (...args: ConstructorParameters<typeof AbstractPage>) => PageClass,
  ) {
    super(
      client,
      request,
      async (client, props) =>
        new Page(
          client,
          props.response,
          await defaultParseResponse(client, props),
          props.options,
        ) as WithRequestID<PageClass>,
    );
  }

  /**
   * Allow auto-paginating iteration on an unawaited list call, eg:
   *
   *    for await (const item of client.items.list()) {
   *      console.log(item)
   *    }
   */
  async *[Symbol.asyncIterator](): AsyncGenerator<Item> {
    const page = await this;
    for await (const item of page) {
      yield item;
    }
  }
}

export interface PageResponse<Item> {
  data: Array<Item>;

  has_more: boolean;

  first_id: string | null;

  last_id: string | null;
}

export interface PageParams {
  /**
   * Number of items per page.
   */
  limit?: number;

  before_id?: string;

  after_id?: string;
}

export class Page<Item> extends AbstractPage<Item> implements PageResponse<Item> {
  data: Array<Item>;

  has_more: boolean;

  first_id: string | null;

  last_id: string | null;

  constructor(
    client: BaseAnthropic,
    response: Response,
    body: PageResponse<Item>,
    options: FinalRequestOptions,
  ) {
    super(client, response, body, options);

    this.data = body.data || [];
    this.has_more = body.has_more || false;
    this.first_id = body.first_id || null;
    this.last_id = body.last_id || null;
  }

  getPaginatedItems(): Item[] {
    return this.data ?? [];
  }

  override hasNextPage(): boolean {
    if (this.has_more === false) {
      return false;
    }

    return super.hasNextPage();
  }

  nextPageRequestOptions(): PageRequestOptions | null {
    if ((this.options.query as Record<string, unknown>)?.['before_id']) {
      // in reverse
      const first_id = this.first_id;
      if (!first_id) {
        return null;
      }

      return {
        ...this.options,
        query: {
          ...maybeObj(this.options.query),
          before_id: first_id,
        },
      };
    }

    const cursor = this.last_id;
    if (!cursor) {
      return null;
    }

    return {
      ...this.options,
      query: {
        ...maybeObj(this.options.query),
        after_id: cursor,
      },
    };
  }
}

export interface TokenPageResponse<Item> {
  data: Array<Item>;

  has_more: boolean;

  next_page: string | null;
}

export interface TokenPageParams {
  /**
   * Number of items per page.
   */
  limit?: number;

  page_token?: string;
}

export class TokenPage<Item> extends AbstractPage<Item> implements TokenPageResponse<Item> {
  data: Array<Item>;

  has_more: boolean;

  next_page: string | null;

  constructor(
    client: BaseAnthropic,
    response: Response,
    body: TokenPageResponse<Item>,
    options: FinalRequestOptions,
  ) {
    super(client, response, body, options);

    this.data = body.data || [];
    this.has_more = body.has_more || false;
    this.next_page = body.next_page || null;
  }

  getPaginatedItems(): Item[] {
    return this.data ?? [];
  }

  override hasNextPage(): boolean {
    if (this.has_more === false) {
      return false;
    }

    return super.hasNextPage();
  }

  nextPageRequestOptions(): PageRequestOptions | null {
    const cursor = this.next_page;
    if (!cursor) {
      return null;
    }

    return {
      ...this.options,
      query: {
        ...maybeObj(this.options.query),
        page_token: cursor,
      },
    };
  }
}

export interface PageCursorResponse<Item> {
  data: Array<Item>;

  has_more: boolean;

  next_page: string | null;
}

export interface PageCursorParams {
  /**
   * Number of items per page.
   */
  limit?: number;

  page?: string | null;
}

export class PageCursor<Item> extends AbstractPage<Item> implements PageCursorResponse<Item> {
  data: Array<Item>;

  has_more: boolean;

  next_page: string | null;

  constructor(
    client: BaseAnthropic,
    response: Response,
    body: PageCursorResponse<Item>,
    options: FinalRequestOptions,
  ) {
    super(client, response, body, options);

    this.data = body.data || [];
    this.has_more = body.has_more || false;
    this.next_page = body.next_page || null;
  }

  getPaginatedItems(): Item[] {
    return this.data ?? [];
  }

  override hasNextPage(): boolean {
    if (this.has_more === false) {
      return false;
    }

    return super.hasNextPage();
  }

  nextPageRequestOptions(): PageRequestOptions | null {
    const cursor = this.next_page;
    if (!cursor) {
      return null;
    }

    return {
      ...this.options,
      query: {
        ...maybeObj(this.options.query),
        page: cursor,
      },
    };
  }
}
