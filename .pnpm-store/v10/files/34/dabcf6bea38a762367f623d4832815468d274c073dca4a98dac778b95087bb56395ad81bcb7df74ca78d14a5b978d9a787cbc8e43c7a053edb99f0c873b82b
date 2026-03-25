"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var pageAgent_exports = {};
__export(pageAgent_exports, {
  pageAgentExpect: () => pageAgentExpect,
  pageAgentExtract: () => pageAgentExtract,
  pageAgentPerform: () => pageAgentPerform
});
module.exports = __toCommonJS(pageAgent_exports);
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_tool = require("./tool");
var import_utilsBundle = require("../../utilsBundle");
var import_mcpBundle = require("../../mcpBundle");
var import_actionRunner = require("./actionRunner");
var import_performTools = __toESM(require("./performTools"));
var import_expectTools = __toESM(require("./expectTools"));
var actions = __toESM(require("./actions"));
async function pageAgentPerform(progress, context, userTask, callParams) {
  const cacheKey = (callParams.cacheKey ?? userTask).trim();
  if (await cachedPerform(progress, context, cacheKey))
    return;
  const task = `
### Instructions
- Perform the following task on the page.
- Your reply should be a tool call that performs action the page".

### Task
${userTask}
`;
  progress.disableTimeout();
  await runLoop(progress, context, import_performTools.default, task, void 0, callParams);
  await updateCache(context, cacheKey);
}
async function pageAgentExpect(progress, context, expectation, callParams) {
  const cacheKey = (callParams.cacheKey ?? expectation).trim();
  if (await cachedPerform(progress, context, cacheKey))
    return;
  const task = `
### Instructions
- Call one of the "browser_expect_*" tools to verify / assert the condition.
- You can call exactly one tool and it can't be report_results, must be one of the assertion tools.

### Expectation
${expectation}
`;
  progress.disableTimeout();
  await runLoop(progress, context, import_expectTools.default, task, void 0, callParams);
  await updateCache(context, cacheKey);
}
async function pageAgentExtract(progress, context, query, schema, callParams) {
  const task = `
### Instructions
Extract the following information from the page. Do not perform any actions, just extract the information.

### Query
${query}`;
  const { result } = await runLoop(progress, context, [], task, schema, callParams);
  return result;
}
async function runLoop(progress, context, toolDefinitions, userTask, resultSchema, params) {
  if (!context.agentParams.api || !context.agentParams.model)
    throw new Error(`This action requires the API and API key to be set on the page agent. Did you mean to --run-agents=missing?`);
  if (!context.agentParams.apiKey)
    throw new Error(`This action requires API key to be set on the page agent.`);
  if (context.agentParams.apiEndpoint && !URL.canParse(context.agentParams.apiEndpoint))
    throw new Error(`Agent API endpoint "${context.agentParams.apiEndpoint}" is not a valid URL.`);
  const snapshot = await context.takeSnapshot(progress);
  const { tools, callTool, reportedResult, refusedToPerformReason } = (0, import_tool.toolsForLoop)(progress, context, toolDefinitions, { resultSchema, refuseToPerform: "allow" });
  const secrets = Object.fromEntries((context.agentParams.secrets || [])?.map((s) => [s.name, s.value]));
  const apiCacheTextBefore = context.agentParams.apiCacheFile ? await import_fs.default.promises.readFile(context.agentParams.apiCacheFile, "utf-8").catch(() => "{}") : "{}";
  const apiCacheBefore = JSON.parse(apiCacheTextBefore || "{}");
  const loop = new import_mcpBundle.Loop({
    api: context.agentParams.api,
    apiEndpoint: context.agentParams.apiEndpoint,
    apiKey: context.agentParams.apiKey,
    apiTimeout: context.agentParams.apiTimeout ?? 0,
    model: context.agentParams.model,
    maxTokens: params.maxTokens ?? context.maxTokensRemaining(),
    maxToolCalls: params.maxActions ?? context.agentParams.maxActions ?? 10,
    maxToolCallRetries: params.maxActionRetries ?? context.agentParams.maxActionRetries ?? 3,
    summarize: true,
    debug: import_utilsBundle.debug,
    callTool,
    tools,
    secrets,
    cache: apiCacheBefore,
    ...context.events
  });
  const task = [];
  if (context.agentParams.systemPrompt) {
    task.push("### System");
    task.push(context.agentParams.systemPrompt);
    task.push("");
  }
  task.push("### Task");
  task.push(userTask);
  if (context.history().length) {
    task.push("### Context history");
    task.push(context.history().map((h) => `- ${h.type}: ${h.description}`).join("\n"));
    task.push("");
  }
  task.push("### Page snapshot");
  task.push(snapshot);
  task.push("");
  const { error, usage } = await loop.run(task.join("\n"), { signal: progress.signal });
  context.consumeTokens(usage.input + usage.output);
  if (context.agentParams.apiCacheFile) {
    const apiCacheAfter = { ...apiCacheBefore, ...loop.cache() };
    const sortedCache = Object.fromEntries(Object.entries(apiCacheAfter).sort(([a], [b]) => a.localeCompare(b)));
    const apiCacheTextAfter = JSON.stringify(sortedCache, void 0, 2);
    if (apiCacheTextAfter !== apiCacheTextBefore) {
      await import_fs.default.promises.mkdir(import_path.default.dirname(context.agentParams.apiCacheFile), { recursive: true });
      await import_fs.default.promises.writeFile(context.agentParams.apiCacheFile, apiCacheTextAfter);
    }
  }
  if (refusedToPerformReason())
    throw new Error(`Agent refused to perform action: ${refusedToPerformReason()}`);
  if (error)
    throw new Error(`Agentic loop failed: ${error}`);
  return { result: reportedResult ? reportedResult() : void 0 };
}
async function cachedPerform(progress, context, cacheKey) {
  if (!context.agentParams?.cacheFile)
    return;
  const cache = await cachedActions(context.agentParams?.cacheFile);
  const entry = cache.actions[cacheKey];
  if (!entry)
    return;
  for (const action of entry.actions)
    await (0, import_actionRunner.runAction)(progress, "run", context.page, action, context.agentParams.secrets ?? []);
  return entry.actions;
}
async function updateCache(context, cacheKey) {
  const cacheFile = context.agentParams?.cacheFile;
  const cacheOutFile = context.agentParams?.cacheOutFile;
  const cacheFileKey = cacheFile ?? cacheOutFile;
  const cache = cacheFileKey ? await cachedActions(cacheFileKey) : { actions: {}, newActions: {} };
  const newEntry = { actions: context.actions() };
  cache.actions[cacheKey] = newEntry;
  cache.newActions[cacheKey] = newEntry;
  if (cacheOutFile) {
    const entries = Object.entries(cache.newActions);
    entries.sort((e1, e2) => e1[0].localeCompare(e2[0]));
    await import_fs.default.promises.writeFile(cacheOutFile, JSON.stringify(Object.fromEntries(entries), void 0, 2));
  } else if (cacheFile) {
    const entries = Object.entries(cache.actions);
    entries.sort((e1, e2) => e1[0].localeCompare(e2[0]));
    await import_fs.default.promises.writeFile(cacheFile, JSON.stringify(Object.fromEntries(entries), void 0, 2));
  }
}
const allCaches = /* @__PURE__ */ new Map();
async function cachedActions(cacheFile) {
  let cache = allCaches.get(cacheFile);
  if (!cache) {
    const content = await import_fs.default.promises.readFile(cacheFile, "utf-8").catch(() => "");
    let json;
    try {
      json = JSON.parse(content.trim() || "{}");
    } catch (error) {
      throw new Error(`Failed to parse cache file ${cacheFile}:
${error.message}`);
    }
    const parsed = actions.cachedActionsSchema.safeParse(json);
    if (parsed.error)
      throw new Error(`Failed to parse cache file ${cacheFile}:
${import_mcpBundle.z.prettifyError(parsed.error)}`);
    cache = { actions: parsed.data, newActions: {} };
    allCaches.set(cacheFile, cache);
  }
  return cache;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  pageAgentExpect,
  pageAgentExtract,
  pageAgentPerform
});
