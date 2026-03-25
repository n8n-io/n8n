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
var tasks_exports = {};
__export(tasks_exports, {
  TestRun: () => TestRun,
  createApplyRebaselinesTask: () => createApplyRebaselinesTask,
  createClearCacheTask: () => createClearCacheTask,
  createGlobalSetupTasks: () => createGlobalSetupTasks,
  createListFilesTask: () => createListFilesTask,
  createLoadTask: () => createLoadTask,
  createPluginSetupTasks: () => createPluginSetupTasks,
  createReportBeginTask: () => createReportBeginTask,
  createRunTestsTasks: () => createRunTestsTasks,
  createStartDevServerTask: () => createStartDevServerTask,
  runTasks: () => runTasks,
  runTasksDeferCleanup: () => runTasksDeferCleanup
});
module.exports = __toCommonJS(tasks_exports);
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_util = require("util");
var import_utils = require("playwright-core/lib/utils");
var import_utilsBundle = require("playwright-core/lib/utilsBundle");
var import_dispatcher = require("./dispatcher");
var import_failureTracker = require("./failureTracker");
var import_loadUtils = require("./loadUtils");
var import_projectUtils = require("./projectUtils");
var import_rebase = require("./rebase");
var import_taskRunner = require("./taskRunner");
var import_vcs = require("./vcs");
var import_test = require("../common/test");
var import_testGroups = require("../runner/testGroups");
var import_compilationCache = require("../transform/compilationCache");
var import_util2 = require("../util");
const readDirAsync = (0, import_util.promisify)(import_fs.default.readdir);
class TestRun {
  constructor(config, reporter, options) {
    this.rootSuite = void 0;
    this.phases = [];
    this.projectFiles = /* @__PURE__ */ new Map();
    this.projectSuites = /* @__PURE__ */ new Map();
    this.topLevelProjects = [];
    this.config = config;
    this.reporter = reporter;
    this.failureTracker = new import_failureTracker.FailureTracker(config, options);
  }
}
async function runTasks(testRun, tasks, globalTimeout, cancelPromise) {
  const deadline = globalTimeout ? (0, import_utils.monotonicTime)() + globalTimeout : 0;
  const taskRunner = new import_taskRunner.TaskRunner(testRun.reporter, globalTimeout || 0);
  for (const task of tasks)
    taskRunner.addTask(task);
  testRun.reporter.onConfigure(testRun.config.config);
  const status = await taskRunner.run(testRun, deadline, cancelPromise);
  return await finishTaskRun(testRun, status);
}
async function runTasksDeferCleanup(testRun, tasks) {
  const taskRunner = new import_taskRunner.TaskRunner(testRun.reporter, 0);
  for (const task of tasks)
    taskRunner.addTask(task);
  testRun.reporter.onConfigure(testRun.config.config);
  const { status, cleanup } = await taskRunner.runDeferCleanup(testRun, 0);
  return { status: await finishTaskRun(testRun, status), cleanup };
}
async function finishTaskRun(testRun, status) {
  if (status === "passed")
    status = testRun.failureTracker.result();
  const modifiedResult = await testRun.reporter.onEnd({ status });
  if (modifiedResult && modifiedResult.status)
    status = modifiedResult.status;
  await testRun.reporter.onExit();
  return status;
}
function createGlobalSetupTasks(config) {
  const tasks = [];
  if (!config.configCLIOverrides.preserveOutputDir)
    tasks.push(createRemoveOutputDirsTask());
  tasks.push(
    ...createPluginSetupTasks(config),
    ...config.globalTeardowns.map((file) => createGlobalTeardownTask(file, config)).reverse(),
    ...config.globalSetups.map((file) => createGlobalSetupTask(file, config))
  );
  return tasks;
}
function createRunTestsTasks(config) {
  return [
    createPhasesTask(),
    createReportBeginTask(),
    ...config.plugins.map((plugin) => createPluginBeginTask(plugin)),
    createRunTestsTask()
  ];
}
function createClearCacheTask(config) {
  return {
    title: "clear cache",
    setup: async () => {
      await (0, import_util2.removeDirAndLogToConsole)(import_compilationCache.cacheDir);
      for (const plugin of config.plugins)
        await plugin.instance?.clearCache?.();
    }
  };
}
function createReportBeginTask() {
  return {
    title: "report begin",
    setup: async (testRun) => {
      testRun.reporter.onBegin?.(testRun.rootSuite);
    },
    teardown: async ({}) => {
    }
  };
}
function createPluginSetupTasks(config) {
  return config.plugins.map((plugin) => ({
    title: "plugin setup",
    setup: async ({ reporter }) => {
      if (typeof plugin.factory === "function")
        plugin.instance = await plugin.factory();
      else
        plugin.instance = plugin.factory;
      await plugin.instance?.setup?.(config.config, config.configDir, reporter);
    },
    teardown: async () => {
      await plugin.instance?.teardown?.();
    }
  }));
}
function createPluginBeginTask(plugin) {
  return {
    title: "plugin begin",
    setup: async (testRun) => {
      await plugin.instance?.begin?.(testRun.rootSuite);
    },
    teardown: async () => {
      await plugin.instance?.end?.();
    }
  };
}
function createGlobalSetupTask(file, config) {
  let title = "global setup";
  if (config.globalSetups.length > 1)
    title += ` (${file})`;
  let globalSetupResult;
  return {
    title,
    setup: async ({ config: config2 }) => {
      const setupHook = await (0, import_loadUtils.loadGlobalHook)(config2, file);
      globalSetupResult = await setupHook(config2.config);
    },
    teardown: async () => {
      if (typeof globalSetupResult === "function")
        await globalSetupResult();
    }
  };
}
function createGlobalTeardownTask(file, config) {
  let title = "global teardown";
  if (config.globalTeardowns.length > 1)
    title += ` (${file})`;
  return {
    title,
    teardown: async ({ config: config2 }) => {
      const teardownHook = await (0, import_loadUtils.loadGlobalHook)(config2, file);
      await teardownHook(config2.config);
    }
  };
}
function createRemoveOutputDirsTask() {
  return {
    title: "clear output",
    setup: async ({ config }) => {
      const outputDirs = /* @__PURE__ */ new Set();
      const projects = (0, import_projectUtils.filterProjects)(config.projects, config.cliProjectFilter);
      projects.forEach((p) => outputDirs.add(p.project.outputDir));
      await Promise.all(Array.from(outputDirs).map((outputDir) => (0, import_utils.removeFolders)([outputDir]).then(async ([error]) => {
        if (!error)
          return;
        if (error.code === "EBUSY") {
          const entries = await readDirAsync(outputDir).catch((e) => []);
          await Promise.all(entries.map((entry) => (0, import_utils.removeFolders)([import_path.default.join(outputDir, entry)])));
        } else {
          throw error;
        }
      })));
    }
  };
}
function createListFilesTask() {
  return {
    title: "load tests",
    setup: async (testRun, errors) => {
      const { rootSuite, topLevelProjects } = await (0, import_loadUtils.createRootSuite)(testRun, errors, false);
      testRun.rootSuite = rootSuite;
      testRun.failureTracker.onRootSuite(rootSuite, topLevelProjects);
      await (0, import_loadUtils.collectProjectsAndTestFiles)(testRun, false);
      for (const [project, files] of testRun.projectFiles) {
        const projectSuite = new import_test.Suite(project.project.name, "project");
        projectSuite._fullProject = project;
        testRun.rootSuite._addSuite(projectSuite);
        const suites = files.map((file) => {
          const title = import_path.default.relative(testRun.config.config.rootDir, file);
          const suite = new import_test.Suite(title, "file");
          suite.location = { file, line: 0, column: 0 };
          projectSuite._addSuite(suite);
          return suite;
        });
        testRun.projectSuites.set(project, suites);
      }
    }
  };
}
function createLoadTask(mode, options) {
  return {
    title: "load tests",
    setup: async (testRun, errors, softErrors) => {
      await (0, import_loadUtils.collectProjectsAndTestFiles)(testRun, !!options.doNotRunDepsOutsideProjectFilter);
      await (0, import_loadUtils.loadFileSuites)(testRun, mode, options.failOnLoadErrors ? errors : softErrors);
      if (testRun.config.cliOnlyChanged || options.populateDependencies) {
        for (const plugin of testRun.config.plugins)
          await plugin.instance?.populateDependencies?.();
      }
      if (testRun.config.cliOnlyChanged) {
        const changedFiles = await (0, import_vcs.detectChangedTestFiles)(testRun.config.cliOnlyChanged, testRun.config.configDir);
        testRun.config.preOnlyTestFilters.push((test) => changedFiles.has(test.location.file));
      }
      if (testRun.config.cliTestList) {
        const testListFilter = await (0, import_loadUtils.loadTestList)(testRun.config, testRun.config.cliTestList);
        testRun.config.preOnlyTestFilters.push(testListFilter);
      }
      if (testRun.config.cliTestListInvert) {
        const testListInvertFilter = await (0, import_loadUtils.loadTestList)(testRun.config, testRun.config.cliTestListInvert);
        testRun.config.preOnlyTestFilters.push((test) => !testListInvertFilter(test));
      }
      const { rootSuite, topLevelProjects } = await (0, import_loadUtils.createRootSuite)(testRun, options.failOnLoadErrors ? errors : softErrors, !!options.filterOnly);
      testRun.rootSuite = rootSuite;
      testRun.failureTracker.onRootSuite(rootSuite, topLevelProjects);
      if (options.failOnLoadErrors && !testRun.rootSuite.allTests().length && !testRun.config.cliPassWithNoTests && !testRun.config.config.shard && !testRun.config.cliOnlyChanged && !testRun.config.cliTestList && !testRun.config.cliTestListInvert) {
        if (testRun.config.cliArgs.length) {
          throw new Error([
            `No tests found.`,
            `Make sure that arguments are regular expressions matching test files.`,
            `You may need to escape symbols like "$" or "*" and quote the arguments.`
          ].join("\n"));
        }
        throw new Error(`No tests found`);
      }
    }
  };
}
function createApplyRebaselinesTask() {
  return {
    title: "apply rebaselines",
    setup: async () => {
      (0, import_rebase.clearSuggestedRebaselines)();
    },
    teardown: async ({ config, reporter }) => {
      await (0, import_rebase.applySuggestedRebaselines)(config, reporter);
    }
  };
}
function createPhasesTask() {
  return {
    title: "create phases",
    setup: async (testRun) => {
      let maxConcurrentTestGroups = 0;
      const processed = /* @__PURE__ */ new Set();
      const projectToSuite = new Map(testRun.rootSuite.suites.map((suite) => [suite._fullProject, suite]));
      const allProjects = [...projectToSuite.keys()];
      const teardownToSetups = (0, import_projectUtils.buildTeardownToSetupsMap)(allProjects);
      const teardownToSetupsDependents = /* @__PURE__ */ new Map();
      for (const [teardown, setups] of teardownToSetups) {
        const closure = (0, import_projectUtils.buildDependentProjects)(setups, allProjects);
        closure.delete(teardown);
        teardownToSetupsDependents.set(teardown, [...closure]);
      }
      for (let i = 0; i < projectToSuite.size; i++) {
        const phaseProjects = [];
        for (const project of projectToSuite.keys()) {
          if (processed.has(project))
            continue;
          const projectsThatShouldFinishFirst = [...project.deps, ...teardownToSetupsDependents.get(project) || []];
          if (projectsThatShouldFinishFirst.find((p) => !processed.has(p)))
            continue;
          phaseProjects.push(project);
        }
        for (const project of phaseProjects)
          processed.add(project);
        if (phaseProjects.length) {
          let testGroupsInPhase = 0;
          const phase = { dispatcher: new import_dispatcher.Dispatcher(testRun.config, testRun.reporter, testRun.failureTracker), projects: [] };
          testRun.phases.push(phase);
          for (const project of phaseProjects) {
            const projectSuite = projectToSuite.get(project);
            const testGroups = (0, import_testGroups.createTestGroups)(projectSuite, testRun.config.config.workers);
            phase.projects.push({ project, projectSuite, testGroups });
            testGroupsInPhase += Math.min(project.workers ?? Number.MAX_SAFE_INTEGER, testGroups.length);
          }
          (0, import_utilsBundle.debug)("pw:test:task")(`created phase #${testRun.phases.length} with ${phase.projects.map((p) => p.project.project.name).sort()} projects, ${testGroupsInPhase} testGroups`);
          maxConcurrentTestGroups = Math.max(maxConcurrentTestGroups, testGroupsInPhase);
        }
      }
      testRun.config.config.metadata.actualWorkers = Math.min(testRun.config.config.workers, maxConcurrentTestGroups);
    }
  };
}
function createRunTestsTask() {
  return {
    title: "test suite",
    setup: async ({ phases, failureTracker }) => {
      const successfulProjects = /* @__PURE__ */ new Set();
      const extraEnvByProjectId = /* @__PURE__ */ new Map();
      const teardownToSetups = (0, import_projectUtils.buildTeardownToSetupsMap)(phases.map((phase) => phase.projects.map((p) => p.project)).flat());
      for (const { dispatcher, projects } of phases) {
        const phaseTestGroups = [];
        for (const { project, testGroups } of projects) {
          let extraEnv = {};
          for (const dep of project.deps)
            extraEnv = { ...extraEnv, ...extraEnvByProjectId.get(dep.id) };
          for (const setup of teardownToSetups.get(project) || [])
            extraEnv = { ...extraEnv, ...extraEnvByProjectId.get(setup.id) };
          extraEnvByProjectId.set(project.id, extraEnv);
          const hasFailedDeps = project.deps.some((p) => !successfulProjects.has(p));
          if (!hasFailedDeps)
            phaseTestGroups.push(...testGroups);
        }
        if (phaseTestGroups.length) {
          await dispatcher.run(phaseTestGroups, extraEnvByProjectId);
          await dispatcher.stop();
          for (const [projectId, envProduced] of dispatcher.producedEnvByProjectId()) {
            const extraEnv = extraEnvByProjectId.get(projectId) || {};
            extraEnvByProjectId.set(projectId, { ...extraEnv, ...envProduced });
          }
        }
        if (!failureTracker.hasWorkerErrors()) {
          for (const { project, projectSuite } of projects) {
            const hasFailedDeps = project.deps.some((p) => !successfulProjects.has(p));
            if (!hasFailedDeps && !projectSuite.allTests().some((test) => !test.ok()))
              successfulProjects.add(project);
          }
        }
      }
    },
    teardown: async ({ phases }) => {
      for (const { dispatcher } of phases.reverse())
        await dispatcher.stop();
    }
  };
}
function createStartDevServerTask() {
  return {
    title: "start dev server",
    setup: async ({ config }, errors, softErrors) => {
      if (config.plugins.some((plugin) => !!plugin.devServerCleanup)) {
        errors.push({ message: `DevServer is already running` });
        return;
      }
      for (const plugin of config.plugins)
        plugin.devServerCleanup = await plugin.instance?.startDevServer?.();
      if (!config.plugins.some((plugin) => !!plugin.devServerCleanup))
        errors.push({ message: `DevServer is not available in the package you are using. Did you mean to use component testing?` });
    },
    teardown: async ({ config }) => {
      for (const plugin of config.plugins) {
        await plugin.devServerCleanup?.();
        plugin.devServerCleanup = void 0;
      }
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TestRun,
  createApplyRebaselinesTask,
  createClearCacheTask,
  createGlobalSetupTasks,
  createListFilesTask,
  createLoadTask,
  createPluginSetupTasks,
  createReportBeginTask,
  createRunTestsTasks,
  createStartDevServerTask,
  runTasks,
  runTasksDeferCleanup
});
