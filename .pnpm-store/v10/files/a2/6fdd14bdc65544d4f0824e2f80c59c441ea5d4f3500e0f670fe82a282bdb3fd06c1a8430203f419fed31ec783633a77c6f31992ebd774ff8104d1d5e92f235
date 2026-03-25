import { Runnable } from "@langchain/core/runnables";
import { BaseLanguageModel } from "@langchain/core/language_models/base";

//#region src/hub/base.d.ts

/**
 * Push a prompt to the hub.
 * If the specified repo doesn't already exist, it will be created.
 * @param repoFullName The full name of the repo.
 * @param runnable The prompt to push.
 * @param options
 * @returns The URL of the newly pushed prompt in the hub.
 */
declare function basePush(repoFullName: string, runnable: Runnable, options?: {
  apiKey?: string;
  apiUrl?: string;
  parentCommitHash?: string;
  /** @deprecated Use isPublic instead. */
  newRepoIsPublic?: boolean;
  isPublic?: boolean;
  /** @deprecated Use description instead. */
  newRepoDescription?: string;
  description?: string;
  readme?: string;
  tags?: string[];
}): Promise<string>;
//#endregion
export { basePush };
//# sourceMappingURL=base.d.ts.map