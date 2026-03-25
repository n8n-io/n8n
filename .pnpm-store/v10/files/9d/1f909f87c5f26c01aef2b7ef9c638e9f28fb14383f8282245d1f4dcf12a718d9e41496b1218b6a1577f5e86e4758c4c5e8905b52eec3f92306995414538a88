// Copyright 2024 Roy T. Hashimoto. All Rights Reserved.
// This file should be included in the build with --post-js.

(function() {
  const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
  let pAsyncFlags = 0;

  Module['progress_handler'] = function(db, nOps, xProgress, pApp) {
    if (pAsyncFlags) {
      Module['deleteCallback'](pAsyncFlags);
      Module['_sqlite3_free'](pAsyncFlags);
      pAsyncFlags = 0;
    }

    pAsyncFlags = Module['_sqlite3_malloc'](4);
    setValue(pAsyncFlags, xProgress instanceof AsyncFunction ? 1 : 0, 'i32');

    ccall(
      'libprogress_progress_handler',
      'number',
      ['number', 'number', 'number', 'number'],
      [db, nOps, xProgress ? 1 : 0, pAsyncFlags]);
    if (xProgress) {
      Module['setCallback'](pAsyncFlags, _ => xProgress(pApp));
    }
  };
})();