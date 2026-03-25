import { CheerioWebBaseLoader, CheerioWebBaseLoaderParams } from "./cheerio.cjs";
import { Document, DocumentInterface } from "@langchain/core/documents";

//#region src/document_loaders/web/sitemap.d.ts

/**
 * Interface representing the parameters for initializing a SitemapLoader.
 * @interface SitemapLoaderParams
 * @extends CheerioWebBaseLoaderParams
 */
interface SitemapLoaderParams extends CheerioWebBaseLoaderParams {
  /**
   * @property {(string | RegExp)[] | undefined} filterUrls - A list of regexes. Only URLs that match one of the filter URLs will be loaded.
   * WARNING: The filter URLs are interpreted as regular expressions. Escape special characters if needed.
   */
  filterUrls?: (string | RegExp)[];
  /**
   * The size to chunk the sitemap URLs into for scraping.
   * @default {300}
   */
  chunkSize?: number;
}
type SiteMapElement = {
  loc: string;
  changefreq?: string;
  lastmod?: string;
  priority?: string;
};
declare class SitemapLoader extends CheerioWebBaseLoader implements SitemapLoaderParams {
  webPath: string;
  allowUrlPatterns: (string | RegExp)[] | undefined;
  chunkSize: number;
  constructor(webPath: string, params?: SitemapLoaderParams);
  _checkUrlPatterns(url: string): boolean;
  parseSitemap(): Promise<SiteMapElement[]>;
  _loadSitemapUrls(elements: Array<SiteMapElement>): Promise<DocumentInterface[]>;
  load(): Promise<Document[]>;
}
//#endregion
export { SitemapLoader, SitemapLoaderParams };
//# sourceMappingURL=sitemap.d.cts.map