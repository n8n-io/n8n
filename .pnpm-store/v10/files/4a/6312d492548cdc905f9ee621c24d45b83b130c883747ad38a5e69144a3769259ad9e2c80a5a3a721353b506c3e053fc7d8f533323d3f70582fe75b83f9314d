(() => {
  function wrapModule(moduleCallback) {
    if (typeof moduleCallback !== "function") {
      return moduleCallback
    }

    if (typeof __vitest_mocker__ === "undefined" || typeof __vitest_worker__ === 'undefined') {
      return moduleCallback()
    }

    const { evaluatedModules } = __vitest_worker__
    const moduleId = crypto.randomUUID()
    const viteModule = evaluatedModules.ensureModule(moduleId, moduleId)

    viteModule.evaluated = false
    viteModule.promise = new Promise((resolve, reject) => {
      __vitest_mocker__.prepare().finally(() => {
        moduleCallback().then(resolve, reject)
      });
    });
    return viteModule.promise.finally(() => {
      viteModule.evaluated = true
      viteModule.promise = undefined

      evaluatedModules.idToModuleMap.delete(viteModule.id)
      evaluatedModules.fileToModulesMap.delete(viteModule.file)
      evaluatedModules.urlToIdModuleMap.delete(viteModule.url)
    });
  }

  window.__vitest_browser_runner__ = {
    wrapModule,
    wrapDynamicImport: wrapModule,
    disposeExceptionTracker: () => {},
    cleanups: [],
    config: { __VITEST_CONFIG__ },
    viteConfig: { __VITEST_VITE_CONFIG__ },
    type: { __VITEST_TYPE__ },
    sessionId: { __VITEST_SESSION_ID__ },
    testerId: { __VITEST_TESTER_ID__ },
    provider: { __VITEST_PROVIDER__ },
    method: { __VITEST_METHOD__ },
    providedContext: { __VITEST_PROVIDED_CONTEXT__ },
  };
  window.VITEST_API_TOKEN = { __VITEST_API_TOKEN__ };

  const config = __vitest_browser_runner__.config;

  if (config.testNamePattern)
    config.testNamePattern = parseRegexp(config.testNamePattern);

  function parseRegexp(input) {
    // Parse input
    const m = input.match(/(\/?)(.+)\1([a-z]*)/i);

    // match nothing
    if (!m) return /$^/;

    // Invalid flags
    if (m[3] && !/^(?!.*?(.).*?\1)[gmixXsuUAJ]+$/.test(m[3]))
      return RegExp(input);

    // Create the regular expression
    return new RegExp(m[2], m[3]);
  }
})();
