import {
  EVENTS,
  PANEL_ID
} from "./chunk-3FKQRDK3.js";
import {
  __export
} from "./chunk-4BE7D4DS.js";

// src/preview.tsx
var preview_exports = {};
__export(preview_exports, {
  afterEach: () => afterEach,
  initialGlobals: () => initialGlobals,
  parameters: () => parameters
});
import { expect } from "storybook/test";

// src/a11yRunner.ts
import { ElementA11yParameterError } from "storybook/internal/preview-errors";
import { global as global2 } from "@storybook/global";
import { addons, waitForAnimations } from "storybook/preview-api";

// src/a11yRunnerUtils.ts
import { global } from "@storybook/global";
var { document } = global, withLinkPaths = (results, storyId) => {
  let pathname = document.location.pathname.replace(/iframe\.html$/, ""), enhancedResults = { ...results };
  return ["incomplete", "passes", "violations"].forEach((key) => {
    Array.isArray(results[key]) && (enhancedResults[key] = results[key].map((result) => ({
      ...result,
      nodes: result.nodes.map((node, index) => {
        let id = `${key}.${result.id}.${index + 1}`, linkPath = `${pathname}?path=/story/${storyId}&addonPanel=${PANEL_ID}&a11ySelection=${id}`;
        return { id, ...node, linkPath };
      })
    })));
  }), enhancedResults;
};

// src/a11yRunner.ts
var { document: document2 } = global2, channel = addons.getChannel(), DEFAULT_PARAMETERS = { config: {}, options: {} }, DISABLED_RULES = [
  // In component testing, landmarks are not always present
  // and the rule check can cause false positives
  "region"
], queue = [], isRunning = !1, runNext = async () => {
  if (queue.length === 0) {
    isRunning = !1;
    return;
  }
  isRunning = !0;
  let next = queue.shift();
  next && await next(), runNext();
}, run = async (input = DEFAULT_PARAMETERS, storyId) => {
  let axe = (await import("axe-core"))?.default || globalThis.axe, { config = {}, options = {} } = input;
  if (input.element)
    throw new ElementA11yParameterError();
  let context = {
    include: document2?.body,
    exclude: [".sb-wrapper", "#storybook-docs", "#storybook-highlights-root"]
    // Internal Storybook elements that are always in the document
  };
  if (input.context) {
    let hasInclude = typeof input.context == "object" && "include" in input.context && input.context.include !== void 0, hasExclude = typeof input.context == "object" && "exclude" in input.context && input.context.exclude !== void 0;
    hasInclude ? context.include = input.context.include : !hasInclude && !hasExclude && (context.include = input.context), hasExclude && (context.exclude = context.exclude.concat(input.context.exclude));
  }
  axe.reset();
  let configWithDefault = {
    ...config,
    rules: [...DISABLED_RULES.map((id) => ({ id, enabled: !1 })), ...config?.rules ?? []]
  };
  return axe.configure(configWithDefault), new Promise((resolve, reject) => {
    let highlightsRoot = document2?.getElementById("storybook-highlights-root");
    highlightsRoot && (highlightsRoot.style.display = "none");
    let task = async () => {
      try {
        let result = await axe.run(context, options), resultWithLinks = withLinkPaths(result, storyId);
        resolve(resultWithLinks);
      } catch (error) {
        reject(error);
      }
    };
    queue.push(task), isRunning || runNext(), highlightsRoot && (highlightsRoot.style.display = "");
  });
};
channel.on(EVENTS.MANUAL, async (storyId, input = DEFAULT_PARAMETERS) => {
  try {
    await waitForAnimations();
    let result = await run(input, storyId), resultJson = JSON.parse(JSON.stringify(result));
    channel.emit(EVENTS.RESULT, resultJson, storyId);
  } catch (error) {
    channel.emit(EVENTS.ERROR, error);
  }
});

// src/utils.ts
function getIsVitestStandaloneRun() {
  try {
    return import.meta.env.VITEST_STORYBOOK === "false";
  } catch {
    return !1;
  }
}

// src/preview.tsx
var vitestMatchersExtended = !1, afterEach = async ({
  id: storyId,
  reporting,
  parameters: parameters2,
  globals,
  viewMode
}) => {
  let a11yParameter = parameters2.a11y, a11yGlobals = globals.a11y, shouldRunEnvironmentIndependent = a11yParameter?.disable !== !0 && a11yParameter?.test !== "off" && a11yGlobals?.manual !== !0, getMode = () => {
    switch (a11yParameter?.test) {
      case "todo":
        return "warning";
      case "error":
      default:
        return "failed";
    }
  };
  if (shouldRunEnvironmentIndependent && viewMode === "story")
    try {
      let result = await run(a11yParameter, storyId);
      if (result) {
        let hasViolations = (result?.violations.length ?? 0) > 0;
        if (reporting.addReport({
          type: "a11y",
          version: 1,
          result,
          status: hasViolations ? getMode() : "passed"
        }), getIsVitestStandaloneRun() && hasViolations && getMode() === "failed") {
          if (!vitestMatchersExtended) {
            let { toHaveNoViolations } = await import("./matchers-DMFSMG2O.js");
            expect.extend({ toHaveNoViolations }), vitestMatchersExtended = !0;
          }
          expect(result).toHaveNoViolations();
        }
      }
    } catch (e) {
      if (reporting.addReport({
        type: "a11y",
        version: 1,
        result: {
          error: e
        },
        status: "failed"
      }), getIsVitestStandaloneRun())
        throw e;
    }
}, initialGlobals = {
  a11y: {
    manual: !1
  }
}, parameters = {
  a11y: {
    test: "todo"
  }
};

export {
  afterEach,
  initialGlobals,
  parameters,
  preview_exports
};
