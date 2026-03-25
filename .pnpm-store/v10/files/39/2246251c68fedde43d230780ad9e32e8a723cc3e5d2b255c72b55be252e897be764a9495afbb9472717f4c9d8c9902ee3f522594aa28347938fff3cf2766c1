import CJS_COMPAT_NODE_URL_3fsumx86qru from 'node:url';
import CJS_COMPAT_NODE_PATH_3fsumx86qru from 'node:path';
import CJS_COMPAT_NODE_MODULE_3fsumx86qru from "node:module";

var __filename = CJS_COMPAT_NODE_URL_3fsumx86qru.fileURLToPath(import.meta.url);
var __dirname = CJS_COMPAT_NODE_PATH_3fsumx86qru.dirname(__filename);
var require = CJS_COMPAT_NODE_MODULE_3fsumx86qru.createRequire(import.meta.url);

// ------------------------------------------------------------
// end of CJS compatibility banner, injected by Storybook's esbuild configuration
// ------------------------------------------------------------
import {
  log
} from "../_node-chunks/chunk-W67ZPRYX.js";
import {
  any
} from "../_node-chunks/chunk-FP3NZPJI.js";
import {
  ADDON_ID,
  COVERAGE_DIRECTORY,
  STATUS_TYPE_ID_A11Y,
  STATUS_TYPE_ID_COMPONENT_TEST,
  storeOptions
} from "../_node-chunks/chunk-DJNGUF47.js";
import "../_node-chunks/chunk-QHPWHTRG.js";
import {
  dirname,
  join,
  normalize,
  path
} from "../_node-chunks/chunk-PKYWPFA6.js";
import "../_node-chunks/chunk-4LSYFR5U.js";

// src/node/vitest.ts
import process2 from "node:process";
import { Channel } from "storybook/internal/channels";
import {
  experimental_UniversalStore,
  experimental_getStatusStore,
  experimental_getTestProviderStore
} from "storybook/internal/core-server";

// ../../node_modules/es-toolkit/dist/function/debounce.mjs
function debounce(func, debounceMs, { signal, edges } = {}) {
  let pendingThis, pendingArgs = null, leading = edges != null && edges.includes("leading"), trailing = edges == null || edges.includes("trailing"), invoke = () => {
    pendingArgs !== null && (func.apply(pendingThis, pendingArgs), pendingThis = void 0, pendingArgs = null);
  }, onTimerEnd = () => {
    trailing && invoke(), cancel();
  }, timeoutId = null, schedule = () => {
    timeoutId != null && clearTimeout(timeoutId), timeoutId = setTimeout(() => {
      timeoutId = null, onTimerEnd();
    }, debounceMs);
  }, cancelTimer = () => {
    timeoutId !== null && (clearTimeout(timeoutId), timeoutId = null);
  }, cancel = () => {
    cancelTimer(), pendingThis = void 0, pendingArgs = null;
  }, flush = () => {
    invoke();
  }, debounced = function(...args) {
    if (signal?.aborted)
      return;
    pendingThis = this, pendingArgs = args;
    let isFirstCall = timeoutId == null;
    schedule(), leading && isFirstCall && invoke();
  };
  return debounced.schedule = schedule, debounced.cancel = cancel, debounced.flush = flush, signal?.addEventListener("abort", cancel, { once: !0 }), debounced;
}

// ../../node_modules/es-toolkit/dist/function/partial.mjs
function partial(func, ...partialArgs) {
  return partialImpl(func, placeholderSymbol, ...partialArgs);
}
function partialImpl(func, placeholder, ...partialArgs) {
  let partialed = function(...providedArgs) {
    let providedArgsIndex = 0, substitutedArgs = partialArgs.slice().map((arg) => arg === placeholder ? providedArgs[providedArgsIndex++] : arg), remainingArgs = providedArgs.slice(providedArgsIndex);
    return func.apply(this, substitutedArgs.concat(remainingArgs));
  };
  return func.prototype && (partialed.prototype = Object.create(func.prototype)), partialed;
}
var placeholderSymbol = Symbol("partial.placeholder");
partial.placeholder = placeholderSymbol;

// ../../node_modules/es-toolkit/dist/function/partialRight.mjs
function partialRight(func, ...partialArgs) {
  return partialRightImpl(func, placeholderSymbol2, ...partialArgs);
}
function partialRightImpl(func, placeholder, ...partialArgs) {
  let partialedRight = function(...providedArgs) {
    let placeholderLength = partialArgs.filter((arg) => arg === placeholder).length, rangeLength = Math.max(providedArgs.length - placeholderLength, 0), remainingArgs = providedArgs.slice(0, rangeLength), providedArgsIndex = rangeLength, substitutedArgs = partialArgs.slice().map((arg) => arg === placeholder ? providedArgs[providedArgsIndex++] : arg);
    return func.apply(this, remainingArgs.concat(substitutedArgs));
  };
  return func.prototype && (partialedRight.prototype = Object.create(func.prototype)), partialedRight;
}
var placeholderSymbol2 = Symbol("partialRight.placeholder");
partialRight.placeholder = placeholderSymbol2;

// ../../node_modules/es-toolkit/dist/function/retry.mjs
var DEFAULT_RETRIES = Number.POSITIVE_INFINITY;

// ../../node_modules/es-toolkit/dist/function/throttle.mjs
function throttle(func, throttleMs, { signal, edges = ["leading", "trailing"] } = {}) {
  let pendingAt = null, debounced = debounce(func, throttleMs, { signal, edges }), throttled = function(...args) {
    pendingAt == null ? pendingAt = Date.now() : Date.now() - pendingAt >= throttleMs && (pendingAt = Date.now(), debounced.cancel()), debounced.apply(this, args);
  };
  return throttled.cancel = debounced.cancel, throttled.flush = debounced.flush, throttled;
}

// src/utils.ts
function errorToErrorLike(error) {
  return {
    message: error.message,
    name: error.name,
    // avoid duplicating the error message in the stack trace
    stack: error.stack?.replace(error.message, ""),
    cause: error.cause && error.cause instanceof Error ? errorToErrorLike(error.cause) : void 0
  };
}

// src/node/vitest-manager.ts
import { existsSync } from "node:fs";
import { getProjectRoot, resolvePathInStorybookCache } from "storybook/internal/common";

// ../../node_modules/slash/index.js
function slash(path2) {
  return path2.startsWith("\\\\?\\") ? path2 : path2.replace(/\\/g, "/");
}

// src/node/reporter.ts
var StorybookReporter = class {
  constructor(testManager) {
    this.testManager = testManager;
  }
  onInit(ctx) {
    this.ctx = ctx;
  }
  onTestCaseResult(testCase) {
    let { storyId, reports } = testCase.meta(), testResult = testCase.result();
    this.testManager.onTestCaseResult({
      storyId,
      testResult,
      reports
    });
  }
  async onTestRunEnd(testModules, unhandledErrors) {
    let totalTestCount = testModules.flatMap(
      (t) => Array.from(t.children.allTests("passed")).concat(Array.from(t.children.allTests("failed")))
    ).length, testModulesErrors = testModules.flatMap((t) => t.errors()), serializedErrors = unhandledErrors.concat(testModulesErrors).map((e) => ({
      ...e,
      name: e.name,
      message: e.message,
      stack: e.stack?.replace(e.message, ""),
      cause: e.cause
    }));
    this.testManager.onTestRunEnd({
      totalTestCount,
      unhandledErrors: serializedErrors
    }), this.clearVitestState();
  }
  // TODO: Clearing the whole internal state of Vitest might be too aggressive
  async clearVitestState() {
    this.ctx.state.filesMap.clear(), this.ctx.state.pathsSet.clear(), this.ctx.state.idMap.clear(), this.ctx.state.errorsSet.clear(), this.ctx.state.processTimeoutCauses?.clear();
  }
};

// src/node/vitest-manager.ts
var VITEST_CONFIG_FILE_EXTENSIONS = ["mts", "mjs", "cts", "cjs", "ts", "tsx", "js", "jsx"], VITEST_WORKSPACE_FILE_EXTENSION = ["ts", "js", "json"];
process.env.VITEST_STORYBOOK = "true";
var DOUBLE_SPACES = "  ", getTestName = (name) => `${name}${DOUBLE_SPACES}`, VitestManager = class {
  constructor(testManager) {
    this.testManager = testManager;
    this.vitest = null;
    this.vitestStartupCounter = 0;
    this.vitestRestartPromise = null;
    this.runningPromise = null;
  }
  async startVitest({ coverage }) {
    let { createVitest } = await import("vitest/node"), storybookCoverageReporter = [
      "@storybook/addon-vitest/internal/coverage-reporter",
      {
        testManager: this.testManager,
        coverageOptions: this.vitest?.config?.coverage
      }
    ], coverageOptions = coverage ? {
      enabled: !0,
      clean: !0,
      cleanOnRerun: !0,
      reportOnFailure: !0,
      reporter: [["html", {}], storybookCoverageReporter],
      reportsDirectory: resolvePathInStorybookCache(COVERAGE_DIRECTORY)
    } : { enabled: !1 }, vitestWorkspaceConfig = any(
      [
        ...VITEST_WORKSPACE_FILE_EXTENSION.map((ext) => `vitest.workspace.${ext}`),
        ...VITEST_CONFIG_FILE_EXTENSIONS.map((ext) => `vitest.config.${ext}`)
      ],
      { last: getProjectRoot() }
    ), projectName = "storybook:" + process.env.STORYBOOK_CONFIG_DIR;
    try {
      this.vitest = await createVitest("test", {
        root: vitestWorkspaceConfig ? dirname(vitestWorkspaceConfig) : process.cwd(),
        watch: !0,
        passWithNoTests: !1,
        project: [projectName],
        // TODO:
        // Do we want to enable Vite's default reporter?
        // The output in the terminal might be too spamy and it might be better to
        // find a way to just show errors and warnings for example
        // Otherwise it might be hard for the user to discover Storybook related logs
        reporters: ["default", new StorybookReporter(this.testManager)],
        coverage: coverageOptions
      });
    } catch (err) {
      let originalMessage = String(err.message);
      if (originalMessage.includes("Found multiple projects")) {
        let custom = [
          "Storybook was unable to start the test run because you have multiple Vitest projects (or browsers) in headed mode.",
          "Please set `headless: true` in your Storybook vitest config.\n\n"
        ].join(`
`);
        originalMessage.startsWith(custom) || (err.message = `${custom}${originalMessage}`);
      }
      throw err;
    }
    this.vitest && this.vitest.onCancel(() => {
    });
    try {
      await this.vitest.init();
    } catch (e) {
      let message = "Failed to initialize Vitest", isV8 = e.message?.includes("@vitest/coverage-v8"), isIstanbul = e.message?.includes("@vitest/coverage-istanbul");
      (e.message?.includes("Failed to load url") && (isIstanbul || isV8) || // Vitest will sometimes not throw the correct missing-package-detection error, so we have to check for this as well
      e instanceof TypeError && e?.message === "Cannot read properties of undefined (reading 'name')") && (message += `

Please install the @vitest/${isIstanbul ? "coverage-istanbul" : "coverage-v8"} package to collect coverage
`), this.testManager.reportFatalError(message, e);
      return;
    }
    await this.setupWatchers();
  }
  async restartVitest({ coverage }) {
    return await this.vitestRestartPromise, this.vitestRestartPromise = new Promise(async (resolve, reject) => {
      try {
        await this.runningPromise, await this.vitest?.close(), await this.startVitest({ coverage }), resolve();
      } catch (e) {
        reject(e);
      } finally {
        this.vitestRestartPromise = null;
      }
    }), this.vitestRestartPromise;
  }
  resetGlobalTestNamePattern() {
    this.vitest?.setGlobalTestNamePattern("");
  }
  updateLastChanged(filepath) {
    this.vitest.projects.forEach(({ browser, vite, server }) => {
      server && server.moduleGraph.getModulesByFile(filepath)?.forEach((mod) => server.moduleGraph.invalidateModule(mod)), vite && vite.moduleGraph.getModulesByFile(filepath)?.forEach((mod) => vite.moduleGraph.invalidateModule(mod)), browser && browser.vite.moduleGraph.getModulesByFile(filepath)?.forEach((mod) => browser.vite.moduleGraph.invalidateModule(mod));
    });
  }
  async fetchStories(requestStoryIds) {
    let indexUrl = this.testManager.store.getState().indexUrl;
    if (!indexUrl)
      throw new Error(
        "Tried to fetch stories to test, but the index URL was not set in the store yet."
      );
    try {
      let index = await Promise.race([
        fetch(indexUrl).then((res) => res.json()),
        new Promise((_, reject) => setTimeout(reject, 3e3, new Error("Request took too long")))
      ]);
      return (requestStoryIds || Object.keys(index.entries)).map((id) => index.entries[id]).filter((story) => story.type === "story");
    } catch (e) {
      return log("Failed to fetch story index: " + e.message), [];
    }
  }
  filterTestSpecifications(testSpecifications, stories) {
    let filteredTestSpecifications = [], filteredStoryIds = [], storiesByImportPath = {};
    for (let story of stories) {
      let absoluteImportPath = path.join(process.cwd(), story.importPath);
      storiesByImportPath[absoluteImportPath] || (storiesByImportPath[absoluteImportPath] = []), storiesByImportPath[absoluteImportPath].push(story);
    }
    for (let testSpecification of testSpecifications) {
      let { env = {} } = testSpecification.project.config, include = env.__VITEST_INCLUDE_TAGS__?.split(",").filter(Boolean) ?? ["test"], exclude = env.__VITEST_EXCLUDE_TAGS__?.split(",").filter(Boolean) ?? [], skip = env.__VITEST_SKIP_TAGS__?.split(",").filter(Boolean) ?? [], filteredStories = (storiesByImportPath[testSpecification.moduleId] ?? []).filter((story) => !(include.length && !include.some((tag) => story.tags?.includes(tag)) || exclude.some((tag) => story.tags?.includes(tag))));
      filteredStories.length && (this.testManager.store.getState().watching || this.updateLastChanged(testSpecification.moduleId), filteredTestSpecifications.push(testSpecification), filteredStoryIds.push(
        ...filteredStories.filter((story) => !skip.some((tag) => story.tags?.includes(tag))).map((story) => story.id)
      ));
    }
    return { filteredTestSpecifications, filteredStoryIds };
  }
  async runTests(runPayload) {
    let { watching, config } = this.testManager.store.getState(), coverageShouldBeEnabled = config.coverage && !watching && (runPayload?.storyIds?.length ?? 0) === 0, currentCoverage = this.vitest?.config.coverage?.enabled;
    this.vitest ? currentCoverage !== coverageShouldBeEnabled ? await this.restartVitest({ coverage: coverageShouldBeEnabled }) : await this.vitestRestartPromise : await this.startVitest({ coverage: coverageShouldBeEnabled }), this.resetGlobalTestNamePattern(), await this.cancelCurrentRun();
    let testSpecifications = await this.getStorybookTestSpecifications(), allStories = await this.fetchStories(), filteredStories = runPayload.storyIds ? allStories.filter((story) => runPayload.storyIds?.includes(story.id)) : allStories;
    if (runPayload.storyIds?.length === 1) {
      let selectedStory = filteredStories.find((story) => story.id === runPayload.storyIds?.[0]);
      if (!selectedStory)
        throw new Error(`Story ${runPayload.storyIds?.[0]} not found`);
      let storyName = selectedStory.name, regex, isParentStory = allStories.some((story) => selectedStory.id === story.parent), hasParentStory = allStories.some((story) => selectedStory.parent === story.id);
      if (isParentStory) {
        let parentName = getTestName(selectedStory.name);
        regex = new RegExp(`^${parentName}`);
      } else if (hasParentStory) {
        let parentStory = allStories.find((story) => story.id === selectedStory.parent);
        if (!parentStory)
          throw new Error(`Parent story not found for story ${selectedStory.id}`);
        let parentName = getTestName(parentStory.name);
        regex = new RegExp(`^${parentName} ${storyName}$`);
      } else
        regex = new RegExp(`^${storyName}$`);
      this.vitest.setGlobalTestNamePattern(regex);
    }
    let { filteredTestSpecifications, filteredStoryIds } = this.filterTestSpecifications(
      testSpecifications,
      filteredStories
    );
    this.testManager.store.setState((s) => ({
      ...s,
      currentRun: {
        ...s.currentRun,
        totalTestCount: filteredStoryIds.length
      }
    })), await this.vitest.runTestSpecifications(filteredTestSpecifications, !0), this.resetGlobalTestNamePattern();
  }
  async cancelCurrentRun() {
    await this.vitest?.cancelCurrentRun("keyboard-input"), await this.runningPromise;
  }
  async getStorybookTestSpecifications() {
    return (await this.vitest?.globTestSpecifications() ?? []).filter(
      (workspaceSpec) => this.isStorybookProject(workspaceSpec.project)
    ) ?? [];
  }
  async runAffectedTestsAfterChange(changedFilePath, event) {
    let id = slash(changedFilePath);
    if (this.vitest?.logger.clearHighlightCache(id), this.updateLastChanged(id), event === "add" && this.vitest?.projects.find(this.isStorybookProject.bind(this))?.matchesTestGlob(id), !this.testManager.store.getState().watching || !this.vitest)
      return;
    this.resetGlobalTestNamePattern();
    let storybookProject = this.vitest.projects.find((p) => this.isStorybookProject(p)), previewAnnotationSpecifications = this.testManager.store.getState().previewAnnotations.map((previewAnnotation) => ({
      project: storybookProject ?? this.vitest.projects[0],
      moduleId: typeof previewAnnotation == "string" ? previewAnnotation : previewAnnotation.absolute
    })), setupFilesSpecifications = this.vitest.projects.flatMap(
      (project) => project.config.setupFiles.map((setupFile) => ({
        project,
        moduleId: setupFile
      }))
    ), syntheticGlobalTestSpecifications = previewAnnotationSpecifications.concat(setupFilesSpecifications), testSpecifications = await this.getStorybookTestSpecifications(), allStories = await this.fetchStories(), affectsGlobalFiles = !1, affectedTestSpecifications = (await Promise.all(
      syntheticGlobalTestSpecifications.concat(testSpecifications).map(async (testSpecification) => {
        let dependencies = await this.getTestDependencies(testSpecification);
        if (changedFilePath === testSpecification.moduleId || dependencies.has(changedFilePath))
          return syntheticGlobalTestSpecifications.includes(testSpecification) && (affectsGlobalFiles = !0), testSpecification;
      })
    )).filter(Boolean), testSpecificationsToRun = affectsGlobalFiles ? testSpecifications : affectedTestSpecifications;
    if (!testSpecificationsToRun.length)
      return;
    let { filteredTestSpecifications, filteredStoryIds } = this.filterTestSpecifications(
      testSpecificationsToRun,
      allStories
    );
    await this.testManager.runTestsWithState({
      storyIds: filteredStoryIds,
      triggeredBy: "watch",
      callback: async () => {
        this.testManager.store.setState((s) => ({
          ...s,
          currentRun: {
            ...s.currentRun,
            totalTestCount: filteredStoryIds.length
          }
        })), await this.vitest.cancelCurrentRun("keyboard-input"), await this.runningPromise, await this.vitest.runTestSpecifications(filteredTestSpecifications, !1);
      }
    });
  }
  // This is an adaptation of Vitest's own implementation
  // see https://github.com/vitest-dev/vitest/blob/14409088166152c920ce7fa4ad4c0ba57149b869/packages/vitest/src/node/specifications.ts#L171-L198
  async getTestDependencies(spec) {
    let deps = /* @__PURE__ */ new Set(), addImports = async (project, filepath) => {
      if (deps.has(filepath))
        return;
      deps.add(filepath);
      let transformed = project.vite.moduleGraph.getModuleById(filepath)?.ssrTransformResult || await project.vite.transformRequest(filepath, { ssr: !0 });
      if (!transformed)
        return;
      let dependencies = [...transformed.deps ?? [], ...transformed.dynamicDeps ?? []];
      await Promise.all(
        dependencies.map(async (dep) => {
          let fsPath = dep.startsWith("/@fs/") ? dep.slice(process.platform === "win32" ? 5 : 4) : join(project.config.root, dep);
          !fsPath.includes("node_modules") && !deps.has(fsPath) && existsSync(fsPath) && await addImports(project, fsPath);
        })
      );
    };
    return await addImports(spec.project, spec.moduleId), deps.delete(spec.moduleId), deps;
  }
  async registerVitestConfigListener() {
    this.vitest.vite.watcher.on("change", async (file) => {
      if (normalize(file) === this.vitest?.vite?.config.configFile) {
        log("Restarting Vitest due to config change");
        let { watching, config } = this.testManager.store.getState();
        await this.restartVitest({ coverage: config.coverage && !watching });
      }
    });
  }
  async setupWatchers() {
    this.resetGlobalTestNamePattern(), this.vitest.vite.watcher.removeAllListeners("change"), this.vitest.vite.watcher.removeAllListeners("add"), this.vitest.vite.watcher.on(
      "change",
      (file) => this.runAffectedTestsAfterChange(file, "change")
    ), this.vitest.vite.watcher.on("add", (file) => {
      this.runAffectedTestsAfterChange(file, "add");
    }), this.registerVitestConfigListener();
  }
  isStorybookProject(project) {
    return !!project.config.env?.__STORYBOOK_URL__;
  }
};

// src/node/test-manager.ts
var testStateToStatusValueMap = {
  pending: "status-value:pending",
  passed: "status-value:success",
  warning: "status-value:warning",
  failed: "status-value:error",
  skipped: "status-value:unknown"
}, TestManager = class _TestManager {
  constructor(options) {
    this.batchedTestCaseResults = [];
    /**
     * Throttled function to process batched test case results.
     *
     * This function:
     *
     * 1. Takes all batched test case results and clears the batch
     * 2. Updates the store state with new test counts (component tests and a11y tests)
     * 3. Adjusts the totalTestCount if more tests were run than initially anticipated
     * 4. Creates status objects for component tests and updates the component test status store
     * 5. Creates status objects for a11y tests (if any) and updates the a11y status store
     *
     * The throttling (500ms) is necessary as the channel would otherwise get overwhelmed with events,
     * eventually causing the manager and dev server to lose connection.
     */
    this.throttledFlushTestCaseResults = throttle(() => {
      let testCaseResultsToFlush = this.batchedTestCaseResults;
      this.batchedTestCaseResults = [], this.store.setState((s) => {
        let { success: ctSuccess, error: ctError } = s.currentRun.componentTestCount, { success: a11ySuccess, warning: a11yWarning, error: a11yError } = s.currentRun.a11yCount;
        testCaseResultsToFlush.forEach(({ testResult, reports }) => {
          testResult.state === "passed" ? ctSuccess++ : testResult.state === "failed" && ctError++, reports?.filter((r) => r.type === "a11y").forEach((report) => {
            report.status === "passed" ? a11ySuccess++ : report.status === "warning" ? a11yWarning++ : report.status === "failed" && a11yError++;
          });
        });
        let finishedTestCount = ctSuccess + ctError;
        return {
          ...s,
          currentRun: {
            ...s.currentRun,
            componentTestCount: { success: ctSuccess, error: ctError },
            a11yCount: { success: a11ySuccess, warning: a11yWarning, error: a11yError },
            // in some cases successes and errors can exceed the anticipated totalTestCount
            // e.g. when testing more tests than the stories we know about upfront
            // in those cases, we set the totalTestCount to the sum of successes and errors
            totalTestCount: finishedTestCount > (s.currentRun.totalTestCount ?? 0) ? finishedTestCount : s.currentRun.totalTestCount
          }
        };
      });
      let componentTestStatuses = testCaseResultsToFlush.map(({ storyId, testResult }) => ({
        storyId,
        typeId: STATUS_TYPE_ID_COMPONENT_TEST,
        value: testStateToStatusValueMap[testResult.state],
        title: "Component tests",
        description: testResult.errors?.map((error) => error.stack || error.message).join(`
`) ?? "",
        sidebarContextMenu: !1
      }));
      this.componentTestStatusStore.set(componentTestStatuses);
      let a11yStatuses = testCaseResultsToFlush.flatMap(
        ({ storyId, reports }) => reports?.filter((r) => r.type === "a11y").map((a11yReport) => ({
          storyId,
          typeId: STATUS_TYPE_ID_A11Y,
          value: testStateToStatusValueMap[a11yReport.status],
          title: "Accessibility tests",
          description: "",
          sidebarContextMenu: !1
        }))
      ).filter((a11yStatus) => a11yStatus !== void 0);
      a11yStatuses.length > 0 && this.a11yStatusStore.set(a11yStatuses);
    }, 500);
    this.store = options.store, this.componentTestStatusStore = options.componentTestStatusStore, this.a11yStatusStore = options.a11yStatusStore, this.testProviderStore = options.testProviderStore, this.onReady = options.onReady, this.storybookOptions = options.storybookOptions, this.vitestManager = new VitestManager(this), this.store.subscribe("TRIGGER_RUN", this.handleTriggerRunEvent.bind(this)), this.store.subscribe("CANCEL_RUN", this.handleCancelEvent.bind(this)), this.store.untilReady().then(() => this.vitestManager.startVitest({ coverage: this.store.getState().config.coverage })).then(() => this.onReady?.()).catch((e) => {
      this.reportFatalError("Failed to start Vitest", e);
    });
  }
  async handleTriggerRunEvent(event) {
    await this.runTestsWithState({
      storyIds: event.payload.storyIds,
      triggeredBy: event.payload.triggeredBy,
      callback: async () => {
        try {
          await this.vitestManager.vitestRestartPromise, await this.vitestManager.runTests(event.payload);
        } catch (err) {
          throw this.reportFatalError("Failed to run tests", err), err;
        }
      }
    });
  }
  async handleCancelEvent() {
    try {
      this.store.setState((s) => ({
        ...s,
        cancelling: !0
      })), await this.vitestManager.cancelCurrentRun();
    } catch (err) {
      this.reportFatalError("Failed to cancel tests", err);
    } finally {
      this.store.setState((s) => ({
        ...s,
        cancelling: !1
      }));
    }
  }
  async runTestsWithState({
    storyIds,
    triggeredBy,
    callback
  }) {
    this.componentTestStatusStore.unset(storyIds), this.a11yStatusStore.unset(storyIds), this.store.setState((s) => ({
      ...s,
      currentRun: {
        ...storeOptions.initialState.currentRun,
        triggeredBy,
        startedAt: Date.now(),
        storyIds,
        config: s.config
      }
    })), process.env.VITEST_STORYBOOK_CONFIG = JSON.stringify(this.store.getState().config), await this.testProviderStore.runWithState(async () => {
      if (await callback(), this.store.send({
        type: "TEST_RUN_COMPLETED",
        payload: this.store.getState().currentRun
      }), this.store.getState().currentRun.unhandledErrors.length > 0)
        throw new Error("Tests completed but there are unhandled errors");
    });
  }
  onTestModuleCollected(collectedTestCount) {
    this.store.setState((s) => ({
      ...s,
      currentRun: {
        ...s.currentRun,
        totalTestCount: (s.currentRun.totalTestCount ?? 0) + collectedTestCount
      }
    }));
  }
  onTestCaseResult(result) {
    let { storyId, testResult, reports } = result;
    storyId && (this.batchedTestCaseResults.push({ storyId, testResult, reports }), this.throttledFlushTestCaseResults());
  }
  onTestRunEnd(endResult) {
    this.throttledFlushTestCaseResults.flush(), this.store.setState((s) => ({
      ...s,
      currentRun: {
        ...s.currentRun,
        // when the test run is finished, we can set the totalTestCount to the actual number of tests run
        // this number can be lower than the total number of tests we anticipated upfront
        // e.g. when some tests where skipped without us knowing about it upfront
        totalTestCount: endResult.totalTestCount,
        unhandledErrors: endResult.unhandledErrors,
        finishedAt: Date.now()
      }
    }));
  }
  onCoverageCollected(coverageSummary) {
    this.store.setState((s) => ({
      ...s,
      currentRun: { ...s.currentRun, coverageSummary }
    }));
  }
  async reportFatalError(message, error) {
    await this.store.untilReady(), this.store.send({
      type: "FATAL_ERROR",
      payload: {
        message,
        error: errorToErrorLike(error)
      }
    });
  }
  static async start(options) {
    return new Promise((resolve) => {
      let testManager = new _TestManager({
        ...options,
        onReady: () => {
          resolve(testManager), options.onReady?.();
        }
      });
    });
  }
};

// src/node/vitest.ts
var UniversalStore = experimental_UniversalStore, getStatusStore = experimental_getStatusStore, getTestProviderStore = experimental_getTestProviderStore, channel = new Channel({
  async: !0,
  transport: {
    send: (event) => {
      process2.send?.(event);
    },
    setHandler: (handler) => {
      process2.on("message", handler);
    }
  }
});
UniversalStore.__prepare(channel, UniversalStore.Environment.SERVER);
var store = UniversalStore.create(storeOptions);
new TestManager({
  store,
  componentTestStatusStore: getStatusStore(STATUS_TYPE_ID_COMPONENT_TEST),
  a11yStatusStore: getStatusStore(STATUS_TYPE_ID_A11Y),
  testProviderStore: getTestProviderStore(ADDON_ID),
  onReady: () => {
    process2.send?.({ type: "ready" });
  },
  storybookOptions: {
    configDir: process2.env.STORYBOOK_CONFIG_DIR || ""
  }
});
var exit = (code = 0) => {
  channel?.removeAllListeners(), process2.exit(code);
}, createUnhandledErrorHandler = (message) => async (error) => {
  try {
    let payload = {
      message,
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack,
        cause: error.cause
      }
    };
    process2.send?.({
      type: "uncaught-error",
      payload
    });
  } finally {
    exit(1);
  }
};
process2.on(
  "uncaughtException",
  createUnhandledErrorHandler("Uncaught exception in the test runner process")
);
process2.on(
  "unhandledRejection",
  createUnhandledErrorHandler("Unhandled rejection in the test runner process")
);
process2.on("exit", exit);
process2.on("SIGINT", () => exit(0));
process2.on("SIGTERM", () => exit(0));
