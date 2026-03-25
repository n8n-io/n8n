// Copyright 2024 Roy T. Hashimoto. All Rights Reserved.
// This file should be included in the build with --post-js.

(function() {
  // This list of methods must match exactly with libvfs.c.
  const VFS_METHODS = [
    'xOpen',
    'xDelete',
    'xAccess',
    'xFullPathname',
    'xRandomness',
    'xSleep',
    'xCurrentTime',
    'xGetLastError',
    'xCurrentTimeInt64',

    'xClose',
    'xRead',
    'xWrite',
    'xTruncate',
    'xSync',
    'xFileSize',
    'xLock',
    'xUnlock',
    'xCheckReservedLock',
    'xFileControl',
    'xSectorSize',
    'xDeviceCharacteristics',
    'xShmMap',
    'xShmLock',
    'xShmBarrier',
    'xShmUnmap'
  ];

  const mapVFSNameToKey = new Map();

  Module['vfs_register'] = function(vfs, makeDefault) {
    // Determine which methods exist and which are asynchronous. This is
    // needed for the C wrapper to know which relaying function to call.
    let methodMask = 0;
    let asyncMask = 0;
    VFS_METHODS.forEach((method, i) => {
      if (vfs[method]) {
        methodMask |= 1 << i;
        if (vfs['hasAsyncMethod'](method)) {
          asyncMask |= 1 << i;
        }
      }
    });

    // Allocate space for libvfs_vfs_register to write the sqlite3_vfs
    // pointer. This pointer will be used to look up the JavaScript VFS
    // object.
    const vfsReturn = Module['_sqlite3_malloc'](4);
    try {
      // Call the C function that makes the sqlite3_vfs_register() call.
      const result = ccall(
        'libvfs_vfs_register',
        'number',
        ['string', 'number', 'number', 'number', 'number', 'number'],
        [vfs.name, vfs.mxPathname, methodMask, asyncMask, makeDefault ? 1 : 0, vfsReturn]);
      if (!result) {
        if (mapVFSNameToKey.has(vfs.name)) {
          // Reclaim the old resources used with this name.
          const oldKey = mapVFSNameToKey.get(vfs.name);
          Module['deleteCallback'](oldKey);
        }

        // Associate the sqlite3_vfs* pointer with the JavaScript VFS instance.
        const key = getValue(vfsReturn, '*');
        mapVFSNameToKey.set(vfs.name, key);
        Module['setCallback'](key, vfs);
      }
      return result;
    } finally {
      Module['_sqlite3_free'](vfsReturn);
    }
  };
})();