import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";

//#region src/document_loaders/web/taskade.d.ts

/**
 * Interface representing the parameters for configuring the TaskadeLoader.
 * It includes optional properties for the personal access token and project id.
 */
interface TaskadeLoaderParams {
  personalAccessToken?: string;
  projectId: string;
}
/**
 * Interface representing a Taskade project. It includes properties for the
 * id, text, parentId and completed.
 */
interface TaskadeProject {
  tasks: Array<{
    id: string;
    text: string;
    parentId: string;
    completed: boolean;
  }>;
}
/**
 * Class representing a document loader for loading Taskade project. It
 * extends the BaseDocumentLoader and implements the TaskadeLoaderParams
 * interface. The constructor takes a config object as a parameter, which
 * contains the personal access token and project ID.
 * @example
 * ```typescript
 * const loader = new TaskadeProjectLoader({
 *   personalAccessToken: "TASKADE_PERSONAL_ACCESS_TOKEN",
 *   projectId: "projectId",
 * });
 * const docs = await loader.load();
 * ```
 */
declare class TaskadeProjectLoader extends BaseDocumentLoader implements TaskadeLoaderParams {
  readonly personalAccessToken?: string;
  readonly projectId: string;
  private headers;
  constructor({
    personalAccessToken,
    projectId
  }: TaskadeLoaderParams);
  private getTaskadeProject;
  /**
   * Fetches the Taskade project using the Taskade API, creates a Document instance
   * with the JSON representation of the file as the page content and the
   * API URL as the metadata, and returns it.
   * @returns A Promise that resolves to an array of Document instances.
   */
  load(): Promise<Document[]>;
}
//#endregion
export { TaskadeLoaderParams, TaskadeProject, TaskadeProjectLoader };
//# sourceMappingURL=taskade.d.cts.map