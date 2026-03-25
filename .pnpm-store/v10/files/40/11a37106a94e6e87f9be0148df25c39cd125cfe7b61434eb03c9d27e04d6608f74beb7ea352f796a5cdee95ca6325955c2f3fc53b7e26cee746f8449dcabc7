import { Tool } from "@langchain/core/tools";

//#region src/tools/stackexchange.d.ts
interface StackExchangeAnswer {
  items: StackExchangeItem[];
  has_more: boolean;
  quota_max: number;
  quota_remaining: number;
}
interface StackExchangeItem {
  tags: string[];
  question_score: number;
  is_accepted: boolean;
  has_accepted_answer?: boolean;
  answer_count?: number;
  is_answered: boolean;
  question_id: number;
  item_type: string;
  score: number;
  last_activity_date: number;
  creation_date: number;
  body: string;
  excerpt: string;
  title: string;
  answer_id?: number;
}
type StackExchangeOptions = Record<string, string | number | boolean>;
interface StackExchangeAPIParams {
  /**
   * The maximum number of results to return from the search.
   * Limiting to 10 to avoid context overload.
   * @default 3
   */
  maxResult?: number;
  /**
   * Which part of StackOverflows items to match against. One of 'all', 'title',
   * 'body'.
   * @default "all"
   */
  queryType?: "all" | "title" | "body";
  /**
   * Additional params to pass to the StackExchange API
   */
  options?: StackExchangeOptions;
  /**
   * Separator between question,answer pairs.
   * @default "\n\n"
   */
  resultSeparator?: string;
}
/**
 * Class for interacting with the StackExchange API
 * It extends the base Tool class to perform retrieval.
 */
declare class StackExchangeAPI extends Tool {
  name: string;
  description: string;
  private pageSize;
  private maxResult;
  private key;
  private accessToken;
  private site;
  private version;
  private baseUrl;
  private queryType;
  private options?;
  private resultSeparator?;
  constructor(params?: StackExchangeAPIParams);
  _call(query: string): Promise<string>;
  private _fetch;
  private _makeRequest;
}
//#endregion
export { StackExchangeAPI, StackExchangeAPIParams, StackExchangeAnswer, StackExchangeItem };
//# sourceMappingURL=stackexchange.d.ts.map