// Copyright 2024 Roy T. Hashimoto. All Rights Reserved.
#include <stdio.h>
#include <string.h>
#include <strings.h>
#include <emscripten.h>
#include <sqlite3.h>

#include "libadapters.h"

// This list of methods must match exactly with libvfs.js.
enum {
  xOpen,
  xDelete,
  xAccess,
  xFullPathname,
  xRandomness,
  xSleep,
  xCurrentTime,
  xGetLastError,
  xCurrentTimeInt64,

  xClose,
  xRead,
  xWrite,
  xTruncate,
  xSync,
  xFileSize,
  xLock,
  xUnlock,
  xCheckReservedLock,
  xFileControl,
  xSectorSize,
  xDeviceCharacteristics,
  xShmMap,
  xShmLock,
  xShmBarrier,
  xShmUnmap
};

// Attach extra information to the VFS and file objects.
typedef struct VFS {
  sqlite3_vfs base;
  int methodMask; // Bitmask of methods defined in JavaScript.
  int asyncMask;  // Bitmask of methods that are asynchronous.
} VFS;

typedef struct VFSFile {
  sqlite3_file base;
  VFS* pVfs; // Pointer back to the VFS.
} VFSFile;

#define VFS_JS(SIGNATURE, KEY, METHOD, ...) \
  (((VFS*)KEY)->asyncMask & (1 << METHOD) ? \
    SIGNATURE##_async(KEY, #METHOD, __VA_ARGS__) : \
    SIGNATURE(KEY, #METHOD, __VA_ARGS__))

static int libvfs_xClose(sqlite3_file* pFile) {
  return VFS_JS(ippp, ((VFSFile*)pFile)->pVfs, xClose, pFile);
}

static int libvfs_xRead(sqlite3_file* pFile, void* pData, int iAmt, sqlite3_int64 iOffset) {
  return VFS_JS(ippppij, ((VFSFile*)pFile)->pVfs, xRead, pFile, pData, iAmt, iOffset);
}

static int libvfs_xWrite(sqlite3_file* pFile, const void* pData, int iAmt, sqlite3_int64 iOffset) {
  return VFS_JS(ippppij, ((VFSFile*)pFile)->pVfs, xWrite, pFile, pData, iAmt, iOffset);
}

static int libvfs_xTruncate(sqlite3_file* pFile, sqlite3_int64 size) {
  return VFS_JS(ipppj, ((VFSFile*)pFile)->pVfs, xTruncate, pFile, size);
}

static int libvfs_xSync(sqlite3_file* pFile, int flags) {
  return VFS_JS(ipppi, ((VFSFile*)pFile)->pVfs, xSync, pFile, flags);
}

static int libvfs_xFileSize(sqlite3_file* pFile, sqlite3_int64* pSize) {
  return VFS_JS(ipppp, ((VFSFile*)pFile)->pVfs, xFileSize, pFile, pSize);
}

static int libvfs_xLock(sqlite3_file* pFile, int lockType) {
  return VFS_JS(ipppi, ((VFSFile*)pFile)->pVfs, xLock, pFile, lockType);
}

static int libvfs_xUnlock(sqlite3_file* pFile, int lockType) {
  return VFS_JS(ipppi, ((VFSFile*)pFile)->pVfs, xUnlock, pFile, lockType);
}

static int libvfs_xCheckReservedLock(sqlite3_file* pFile, int* pResOut) {
  return VFS_JS(ipppp, ((VFSFile*)pFile)->pVfs, xCheckReservedLock, pFile, pResOut);
}

static int libvfs_xFileControl(sqlite3_file* pFile, int flags, void* pOut) {
  return VFS_JS(ipppip, ((VFSFile*)pFile)->pVfs, xFileControl, pFile, flags, pOut);
}

static int libvfs_xSectorSize(sqlite3_file* pFile) {
  return VFS_JS(ippp, ((VFSFile*)pFile)->pVfs, xSectorSize, pFile);
}

static int libvfs_xDeviceCharacteristics(sqlite3_file* pFile) {
  return VFS_JS(ippp, ((VFSFile*)pFile)->pVfs, xDeviceCharacteristics, pFile);
}

static int libvfs_xShmMap(sqlite3_file* pFile, int iPg, int pgsz, int unused, void volatile** p) {
  return VFS_JS(ipppiiip, ((VFSFile*)pFile)->pVfs, xShmMap, pFile, iPg, pgsz, unused, p);
}

static int libvfs_xShmLock(sqlite3_file* pFile, int offset, int n, int flags) {
  return VFS_JS(ipppiii, ((VFSFile*)pFile)->pVfs, xShmLock, pFile, offset, n, flags);
}

static void libvfs_xShmBarrier(sqlite3_file* pFile) {
  VFS_JS(vppp, ((VFSFile*)pFile)->pVfs, xShmBarrier, pFile);
}

static int libvfs_xShmUnmap(sqlite3_file* pFile, int deleteFlag) {
  return VFS_JS(ipppi, ((VFSFile*)pFile)->pVfs, xShmUnmap, pFile, deleteFlag);
}


static int libvfs_xOpen(sqlite3_vfs* pVfs, const char* zName, sqlite3_file* pFile, int flags, int* pOutFlags) {
  const int result = VFS_JS(ipppppip, pVfs, xOpen, pVfs, (void*)zName, pFile, flags, pOutFlags);

  VFS* pVfsExt = (VFS*)pVfs;
  sqlite3_io_methods* pMethods = (sqlite3_io_methods*)sqlite3_malloc(sizeof(sqlite3_io_methods));
  pMethods->iVersion = 2;
#define METHOD(NAME) pMethods->NAME = (pVfsExt->methodMask & (1 << NAME)) ? libvfs_##NAME : NULL
  METHOD(xClose);
  METHOD(xRead);
  METHOD(xWrite);
  METHOD(xTruncate);
  METHOD(xSync);
  METHOD(xFileSize);
  METHOD(xLock);
  METHOD(xUnlock);
  METHOD(xCheckReservedLock);
  METHOD(xFileControl);
  METHOD(xSectorSize);
  METHOD(xDeviceCharacteristics);
  METHOD(xShmMap);
  METHOD(xShmLock);
  METHOD(xShmBarrier);
  METHOD(xShmUnmap);
#undef METHOD
  pFile->pMethods = pMethods;
  ((VFSFile*)pFile)->pVfs = pVfsExt;
  return result;
}

static int libvfs_xDelete(sqlite3_vfs* pVfs, const char* zName, int syncDir) {
  return VFS_JS(ippppi, pVfs, xDelete, pVfs, zName, syncDir);
}

static int libvfs_xAccess(sqlite3_vfs* pVfs, const char* zName, int flags, int* pResOut) {
  return VFS_JS(ippppip, pVfs, xAccess, pVfs, zName, flags, pResOut);
}

static int libvfs_xFullPathname(sqlite3_vfs* pVfs, const char* zName, int nOut, char* zOut) {
  return VFS_JS(ippppip, pVfs, xFullPathname, pVfs, zName, nOut, zOut);
}

static int libvfs_xRandomness(sqlite3_vfs* pVfs, int nBuf, char* zBuf) {
  return VFS_JS(ipppip, pVfs, xRandomness, pVfs, nBuf, zBuf);
}

static int libvfs_xSleep(sqlite3_vfs* pVfs, int microseconds) {
  return VFS_JS(ipppi, pVfs, xSleep, pVfs, microseconds);
}

static int libvfs_xCurrentTime(sqlite3_vfs* pVfs, double* pJulianDay) {
  return VFS_JS(ipppp, pVfs, xCurrentTime, pVfs, pJulianDay);
}

static int libvfs_xGetLastError(sqlite3_vfs* pVfs, int nBuf, char* zBuf) {
  return VFS_JS(ipppip, pVfs, xGetLastError, pVfs, nBuf, zBuf);
}

static int libvfs_xCurrentTimeInt64(sqlite3_vfs* pVfs, sqlite3_int64* pTime) {
  return VFS_JS(ipppp, pVfs, xCurrentTimeInt64, pVfs, pTime);
}

int EMSCRIPTEN_KEEPALIVE libvfs_vfs_register(
  const char* zName,
  int mxPathName,
  int methodMask,
  int asyncMask,
  int makeDefault,
  void** ppVfs) {
  // Get the current default VFS to use if methods are not defined.
  const sqlite3_vfs* backupVfs = sqlite3_vfs_find(NULL);

  // Allocate and populate the new VFS.
  VFS* vfs = (VFS*)sqlite3_malloc(sizeof(VFS));
  if (!vfs) return SQLITE_NOMEM;
  bzero(vfs, sizeof(VFS));

  vfs->base.iVersion = 2;
  vfs->base.szOsFile = sizeof(VFSFile);
  vfs->base.mxPathname = mxPathName;
  vfs->base.zName = strdup(zName);

  // The VFS methods go to the adapter implementations in this file,
  // or to the default VFS if the JavaScript method is not defined.
#define METHOD(NAME) vfs->base.NAME = \
  (methodMask & (1 << NAME)) ? libvfs_##NAME : backupVfs->NAME

  METHOD(xOpen);
  METHOD(xDelete);
  METHOD(xAccess);
  METHOD(xFullPathname);
  METHOD(xRandomness);
  METHOD(xSleep);
  METHOD(xCurrentTime);
  METHOD(xGetLastError);
  METHOD(xCurrentTimeInt64);
#undef METHOD

  vfs->methodMask = methodMask;
  vfs->asyncMask = asyncMask;

  *ppVfs = vfs;
  return sqlite3_vfs_register(&vfs->base, makeDefault);
}

