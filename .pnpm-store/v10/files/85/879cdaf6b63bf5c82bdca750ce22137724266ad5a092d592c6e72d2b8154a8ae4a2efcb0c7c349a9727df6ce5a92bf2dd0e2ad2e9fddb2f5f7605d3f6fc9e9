import {
  entry_preview_exports,
  renderToCanvas,
  setup
} from "./_browser-chunks/chunk-YJYABENR.js";
import "./_browser-chunks/chunk-4BE7D4DS.js";

// src/globals.ts
import { global } from "@storybook/global";
var { window: globalWindow } = global;
globalWindow.STORYBOOK_ENV = "vue3";
globalWindow.PLUGINS_SETUP_FUNCTIONS ||= /* @__PURE__ */ new Set();

// src/portable-stories.ts
import {
  composeStories as originalComposeStories,
  composeStory as originalComposeStory,
  setProjectAnnotations as originalSetProjectAnnotations,
  setDefaultProjectAnnotations
} from "storybook/preview-api";
import { h } from "vue";
function setProjectAnnotations(projectAnnotations) {
  return setDefaultProjectAnnotations(vueProjectAnnotations), originalSetProjectAnnotations(
    projectAnnotations
  );
}
var vueProjectAnnotations = {
  ...entry_preview_exports,
  /** @deprecated */
  renderToCanvas: (renderContext, canvasElement) => {
    if (renderContext.storyContext.testingLibraryRender == null)
      return renderToCanvas(renderContext, canvasElement);
    let {
      storyFn,
      storyContext: { testingLibraryRender: render }
    } = renderContext, { unmount } = render(storyFn(), { container: canvasElement });
    return unmount;
  }
};
function composeStory(story, componentAnnotations, projectAnnotations, exportsName) {
  let composedStory = originalComposeStory(
    story,
    componentAnnotations,
    projectAnnotations,
    globalThis.globalProjectAnnotations ?? vueProjectAnnotations,
    exportsName
  ), renderable = (...args) => h(composedStory(...args));
  return Object.assign(renderable, composedStory), renderable;
}
function composeStories(csfExports, projectAnnotations) {
  return originalComposeStories(csfExports, projectAnnotations, composeStory);
}
export {
  composeStories,
  composeStory,
  setProjectAnnotations,
  setup,
  vueProjectAnnotations
};
