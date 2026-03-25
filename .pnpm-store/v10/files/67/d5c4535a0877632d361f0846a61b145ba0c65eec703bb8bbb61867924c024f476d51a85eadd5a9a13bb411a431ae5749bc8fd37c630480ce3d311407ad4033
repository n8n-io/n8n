import {
  PANEL_ID
} from "../_browser-chunks/chunk-TJXI7EIW.js";

// src/vitest-plugin/setup-file.ts
import { afterEach, beforeAll, vi } from "vitest";
import { Channel } from "storybook/internal/channels";
var transport = { setHandler: vi.fn(), send: vi.fn() };
globalThis.__STORYBOOK_ADDONS_CHANNEL__ ??= new Channel({ transport });
var modifyErrorMessage = ({ task }) => {
  let meta = task.meta;
  if (task.type === "test" && task.result?.state === "fail" && meta.storyId && task.result.errors?.[0]) {
    let currentError = task.result.errors[0], storyUrl = `${import.meta.env.__STORYBOOK_URL__}/?path=/story/${meta.storyId}&addonPanel=${PANEL_ID}`;
    currentError.message = `
\x1B[34mClick to debug the error directly in Storybook: ${storyUrl}\x1B[39m

${currentError.message}`;
  }
};
beforeAll(() => {
  if (globalThis.globalProjectAnnotations)
    return globalThis.globalProjectAnnotations.beforeAll();
});
afterEach(modifyErrorMessage);
export {
  modifyErrorMessage
};
