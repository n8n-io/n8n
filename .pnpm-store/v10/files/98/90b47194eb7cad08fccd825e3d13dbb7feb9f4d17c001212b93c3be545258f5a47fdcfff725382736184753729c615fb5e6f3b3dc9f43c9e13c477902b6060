// Copyright 2024 Roy T. Hashimoto. All Rights Reserved.
// This file should be included in the build with --post-js.

(function() {
  const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

  // This list of methods must match exactly with libfunction.c.
  const FUNC_METHODS = [
    'xFunc',
    'xStep',
    'xFinal'
  ];

  const mapFunctionNameToKey = new Map();

  Module['create_function'] = function(db, zFunctionName, nArg, eTextRep, pApp, xFunc, xStep, xFinal) {
    // Allocate some memory to store the async flags. In addition, this
    // pointer is passed to SQLite as the application data (the user's
    // application data is ignored), and is used to look up the JavaScript
    // target object.
    const pAsyncFlags = Module['_sqlite3_malloc'](4);
    const target = { xFunc, xStep, xFinal };
    setValue(pAsyncFlags, FUNC_METHODS.reduce((mask, method, i) => {
      if (target[method] instanceof AsyncFunction) {
        return mask | 1 << i;
      }
      return mask;
    }, 0), 'i32');

    const result = ccall(
      'libfunction_create_function',
      'number',
      ['number', 'string', 'number', 'number', 'number', 'number', 'number', 'number'],
      [
        db,
        zFunctionName,
        nArg,
        eTextRep,
        pAsyncFlags,
        xFunc ? 1 : 0,
        xStep ? 1 : 0,
        xFinal? 1 : 0
      ]);
    if (!result) {
      if (mapFunctionNameToKey.has(zFunctionName)) {
        // Reclaim the old resources used with this name.
        const oldKey = mapFunctionNameToKey.get(zFunctionName);
        Module['deleteCallback'](oldKey);
      }
      mapFunctionNameToKey.set(zFunctionName, pAsyncFlags);
      Module['setCallback'](pAsyncFlags, { xFunc, xStep, xFinal });
    }
    return result;
  };
})();