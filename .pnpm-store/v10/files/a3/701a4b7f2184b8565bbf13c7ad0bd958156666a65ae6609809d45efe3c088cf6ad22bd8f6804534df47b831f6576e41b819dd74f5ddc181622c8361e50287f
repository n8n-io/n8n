import { TextLoader } from "./text.js";

//#region src/document_loaders/fs/json.d.ts

/**
 * Class that extends the `TextLoader` class. It represents a document
 * loader that loads documents from JSON files. It has a constructor that
 * takes a `filePathOrBlob` parameter representing the path to the JSON
 * file or a `Blob` object, and an optional `pointers` parameter that
 * specifies the JSON pointers to extract.
 */
declare class JSONLoader extends TextLoader {
  pointers: string[];
  constructor(filePathOrBlob: string | Blob, pointers?: string | string[]);
  /**
   * Method that takes a `raw` string as a parameter and returns a promise
   * that resolves to an array of strings. It parses the raw JSON string and
   * extracts the values based on the specified JSON pointers. If no JSON
   * pointers are specified, it extracts all the strings from the JSON
   * object.
   * @param raw The raw JSON string to parse.
   * @returns A promise that resolves to an array of strings.
   */
  protected parse(raw: string): Promise<string[]>;
  /**
   * If JSON pointers are specified, return all strings below any of them
   * and exclude all other nodes expect if they match a JSON pointer (to allow to extract strings from different levels)
   *
   * If no JSON pointer is specified then return all string in the object
   */
  private extractArrayStringsFromObject;
  /**
   * Method that takes a `json` object and an array of `pointers` as
   * parameters and returns an array of targeted entries. It iterates over
   * the JSON pointers and uses the `jsonpointer.get()` function to get the
   * targeted entries from the JSON object.
   * @param json The JSON object to get targeted entries from.
   * @param pointers The JSON pointers to get targeted entries.
   * @returns An array of targeted entries.
   */
  private getTargetedEntries;
}
/**
 * Class that extends the `TextLoader` class. It represents a document
 * loader that loads documents from JSON Lines files. It has a constructor
 * that takes a `filePathOrBlob` parameter representing the path to the
 * JSON Lines file or a `Blob` object, and a `pointer` parameter that
 * specifies the JSON pointer to extract.
 */
declare class JSONLinesLoader extends TextLoader {
  pointer: string;
  constructor(filePathOrBlob: string | Blob, pointer: string);
  /**
   * Method that takes a `raw` string as a parameter and returns a promise
   * that resolves to an array of strings. It parses the raw JSON Lines
   * string, splits it into lines, parses each line as JSON, and extracts
   * the values based on the specified JSON pointer.
   * @param raw The raw JSON Lines string to parse.
   * @returns A promise that resolves to an array of strings.
   */
  protected parse(raw: string): Promise<string[]>;
}
//#endregion
export { JSONLinesLoader, JSONLoader };
//# sourceMappingURL=json.d.ts.map