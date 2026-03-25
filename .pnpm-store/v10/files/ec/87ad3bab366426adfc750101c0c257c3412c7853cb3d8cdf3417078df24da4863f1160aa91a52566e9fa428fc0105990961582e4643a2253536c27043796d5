// Copyright 2024 Roy T. Hashimoto. All Rights Reserved.
// This file should be included in the build with --post-js.

(function() {
  const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
  let pAsyncFlags = 0;

  Module['set_authorizer'] = function(db, xAuthorizer, pApp) {
    if (pAsyncFlags) {
      Module['deleteCallback'](pAsyncFlags);
      Module['_sqlite3_free'](pAsyncFlags);
      pAsyncFlags = 0;
    }

    pAsyncFlags = Module['_sqlite3_malloc'](4);
    setValue(pAsyncFlags, xAuthorizer instanceof AsyncFunction ? 1 : 0, 'i32');

    const result = ccall(
      'libauthorizer_set_authorizer',
      'number',
      ['number', 'number', 'number'],
      [db, xAuthorizer ? 1 : 0, pAsyncFlags]);
    if (!result && xAuthorizer) {
      Module['setCallback'](pAsyncFlags, (_, iAction, p3, p4, p5, p6) => {
        return xAuthorizer(pApp, iAction, p3, p4, p5, p6);
      });
    }
    return result;
  };
})();