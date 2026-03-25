import { TextLoader } from "@langchain/classic/document_loaders/fs/text";

//#region src/document_loaders/fs/csv.d.ts

/**
 * Loads a CSV file into a list of documents.
 * Each document represents one row of the CSV file.
 *
 * When `column` is not specified, each row is converted into a key/value pair
 * with each key/value pair outputted to a new line in the document's pageContent.
 *
 * @example
 * // CSV file:
 * // id,html
 * // 1,<i>Corruption discovered at the core of the Banking Clan!</i>
 * // 2,<i>Corruption discovered at the core of the Banking Clan!</i>
 *
 * const loader = new CSVLoader("path/to/file.csv");
 * const docs = await loader.load();
 *
 * // docs[0].pageContent:
 * // id: 1
 * // html: <i>Corruption discovered at the core of the Banking Clan!</i>
 *
 * When `column` is specified, one document is created for each row, and the
 * value of the specified column is used as the document's pageContent.
 *
 * @example
 * // CSV file:
 * // id,html
 * // 1,<i>Corruption discovered at the core of the Banking Clan!</i>
 * // 2,<i>Corruption discovered at the core of the Banking Clan!</i>
 *
 * const loader = new CSVLoader("path/to/file.csv", "html");
 * const docs = await loader.load();
 *
 * // docs[0].pageContent:
 * // <i>Corruption discovered at the core of the Banking Clan!</i>
 */
type CSVLoaderOptions = {
  column?: string;
  separator?: string;
};
/**
 * A class that extends the TextLoader class. It represents a document
 * loader that loads documents from a CSV file. It has a constructor that
 * takes a `filePathOrBlob` parameter representing the path to the CSV
 * file or a Blob object, and an optional `options` parameter of type
 * `CSVLoaderOptions` or a string representing the column to use as the
 * document's pageContent.
 */
declare class CSVLoader extends TextLoader {
  protected options: CSVLoaderOptions;
  constructor(filePathOrBlob: string | Blob, options?: CSVLoaderOptions | string);
  /**
   * A protected method that parses the raw CSV data and returns an array of
   * strings representing the pageContent of each document. It uses the
   * `dsvFormat` function from the `d3-dsv` module to parse the CSV data. If
   * the `column` option is specified, it checks if the column exists in the
   * CSV file and returns the values of that column as the pageContent. If
   * the `column` option is not specified, it converts each row of the CSV
   * data into key/value pairs and joins them with newline characters.
   * @param raw The raw CSV data to be parsed.
   * @returns An array of strings representing the pageContent of each document.
   */
  protected parse(raw: string): Promise<string[]>;
}
//#endregion
export { CSVLoader };
//# sourceMappingURL=csv.d.ts.map