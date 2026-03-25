// Copyright 2024 Roy T. Hashimoto. All Rights Reserved.
// This file should be included in the build with --post-js.

(function() {
  const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
  let pAsyncFlags = 0;

  Module['update_hook'] = function(db, xUpdateHook) {
    if (pAsyncFlags) {
      Module['deleteCallback'](pAsyncFlags);
      Module['_sqlite3_free'](pAsyncFlags);
      pAsyncFlags = 0;
    }

    pAsyncFlags = Module['_sqlite3_malloc'](4);
    setValue(pAsyncFlags, xUpdateHook instanceof AsyncFunction ? 1 : 0, 'i32');

    ccall(
      'libhook_update_hook',
      'void',
      ['number', 'number', 'number'],
      [db, xUpdateHook ? 1 : 0, pAsyncFlags]);
    if (xUpdateHook) {
      Module['setCallback'](pAsyncFlags, (_, iUpdateType, dbName, tblName, lo32, hi32) => {
        return xUpdateHook(iUpdateType, dbName, tblName, lo32, hi32);
      });
    }
  };
})();

(function() {
  const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
  let pAsyncFlags = 0;

  Module['commit_hook'] = function(db, xCommitHook) {
    if (pAsyncFlags) {
      Module['deleteCallback'](pAsyncFlags);
      Module['_sqlite3_free'](pAsyncFlags);
      pAsyncFlags = 0;
    }

    pAsyncFlags = Module['_sqlite3_malloc'](4);
    setValue(pAsyncFlags, xCommitHook instanceof AsyncFunction ? 1 : 0, 'i32');

    ccall(
      'libhook_commit_hook',
      'void',
      ['number', 'number', 'number'],
      [db, xCommitHook ? 1 : 0, pAsyncFlags]);
    if (xCommitHook) {
      Module['setCallback'](pAsyncFlags, (_) => {
        return xCommitHook();
      });
    }
  };
})();
