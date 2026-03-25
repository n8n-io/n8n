import { AsyncCaller, AsyncCallerParams } from "@langchain/core/utils/async_caller";
import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";
import { UnknownHandling } from "@langchain/classic/document_loaders/fs/directory";
import { Ignore } from "ignore";

//#region src/document_loaders/web/github.d.ts

/**
 * An interface that represents a file in a GitHub repository. It has
 * properties for the file name, path, SHA, size, URLs, type, and links.
 */
interface GithubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: string;
  _links: {
    self: string;
    git: string;
    html: string;
  };
}
/**
 * An interface that represents the parameters for the GithubRepoLoader
 * class. It extends the AsyncCallerParams interface and adds additional
 * properties specific to the GitHub repository loader.
 */
interface GithubRepoLoaderParams extends AsyncCallerParams {
  /**
   * The base URL of the GitHub instance.
   * To be used when you are not targeting github.com, e.g. a GitHub Enterprise instance.
   */
  baseUrl?: string;
  /**
   * The API endpoint URL of the GitHub instance.
   * To be used when you are not targeting github.com, e.g. a GitHub Enterprise instance.
   */
  apiUrl?: string;
  branch?: string;
  recursive?: boolean;
  /**
   * Set to true to recursively process submodules. Is only effective, when recursive=true.
   */
  processSubmodules?: boolean;
  unknown?: UnknownHandling;
  accessToken?: string;
  ignoreFiles?: (string | RegExp)[];
  ignorePaths?: string[];
  verbose?: boolean;
  /**
   * The maximum number of concurrent calls that can be made. Defaults to 2.
   */
  maxConcurrency?: number;
  /**
   * The maximum number of retries that can be made for a single call,
   * with an exponential backoff between each attempt. Defaults to 2.
   */
  maxRetries?: number;
}
/**
 * A class that extends the BaseDocumentLoader and implements the
 * GithubRepoLoaderParams interface. It represents a document loader for
 * loading files from a GitHub repository.
 */
declare class GithubRepoLoader extends BaseDocumentLoader implements GithubRepoLoaderParams {
  baseUrl: string;
  apiUrl: string;
  private readonly owner;
  private readonly repo;
  private readonly initialPath;
  private headers;
  branch: string;
  recursive: boolean;
  processSubmodules: boolean;
  unknown: UnknownHandling;
  accessToken?: string;
  ignoreFiles: (string | RegExp)[];
  ignore?: Ignore;
  verbose?: boolean;
  maxConcurrency?: number;
  maxRetries?: number;
  protected caller: AsyncCaller;
  ignorePaths?: string[];
  private submoduleInfos;
  constructor(githubUrl: string, {
    accessToken,
    baseUrl,
    apiUrl,
    branch,
    recursive,
    processSubmodules,
    unknown,
    ignoreFiles,
    ignorePaths,
    verbose,
    maxConcurrency,
    maxRetries,
    ...rest
  }?: GithubRepoLoaderParams);
  /**
   * Extracts the owner, repository, and path from a GitHub URL.
   * @param url The GitHub URL to extract information from.
   * @returns An object containing the owner, repository, and path extracted from the GitHub URL.
   */
  private extractOwnerAndRepoAndPath;
  /**
   * Fetches the files from the GitHub repository and creates Document
   * instances for each file. It also handles error handling based on the
   * unknown handling option.
   * @returns A promise that resolves to an array of Document instances.
   */
  load(): Promise<Document[]>;
  /**
   * Asynchronously streams documents from the entire GitHub repository.
   * It is suitable for situations where processing large repositories in a memory-efficient manner is required.
   * @yields Yields a Promise that resolves to a Document object for each file or submodule content found in the repository.
   */
  loadAsStream(): AsyncGenerator<Document, void, undefined>;
  private getSubmoduleInfo;
  private parseGitmodules;
  private loadSubmodule;
  private loadSubmoduleAsStream;
  /**
   * Determines whether a file or directory should be ignored based on its
   * path and type.
   * @param path The path of the file or directory.
   * @param fileType The type of the file or directory.
   * @returns A boolean indicating whether the file or directory should be ignored.
   */
  protected shouldIgnore(path: string, fileType: string): boolean;
  private fetchFileContentWrapper;
  private getCurrentDirectoryFilePromises;
  private processRepo;
  private processRepoAsStream;
  private processDirectory;
  private processDirectoryAsStream;
  private fetchRepoFiles;
  private fetchFileContent;
  /**
   * Handles errors based on the unknown handling option.
   * @param message The error message.
   * @returns void
   */
  private handleError;
  /**
   * Logs the given message to the console, if parameter 'verbose' is set to true.
   * @param message the message to be logged.
   */
  private log;
}
//#endregion
export { GithubFile, GithubRepoLoader, GithubRepoLoaderParams };
//# sourceMappingURL=github.d.cts.map