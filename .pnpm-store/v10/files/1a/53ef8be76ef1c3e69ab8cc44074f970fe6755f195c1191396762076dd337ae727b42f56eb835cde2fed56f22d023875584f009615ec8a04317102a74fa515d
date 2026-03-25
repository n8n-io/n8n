// Copyright 2024 Roy T. Hashimoto. All Rights Reserved.
#include <stdio.h>
#include <emscripten.h>
#include <sqlite3.h>

#include "libadapters.h"

#define CALL_JS(SIGNATURE, KEY, ...) \
  (asyncFlags ? \
    SIGNATURE##_async(KEY, __VA_ARGS__) : \
    SIGNATURE(KEY, __VA_ARGS__))

static int libhook_xCommitHook(void* pApp) {
  const int asyncFlags = pApp ? *(int *)pApp : 0;
  return CALL_JS(ipp, pApp, pApp);
}

static void libhook_xUpdateHook(
  void* pApp,
  int iUpdateType,
  const char* dbName,
  const char* tblName,
  sqlite3_int64 rowid) {
  int hi32 = ((rowid & 0xFFFFFFFF00000000LL) >> 32);
  int lo32 = (rowid & 0xFFFFFFFFLL);
  const int asyncFlags = pApp ? *(int *)pApp : 0;
  CALL_JS(vppippii, pApp, pApp, iUpdateType, dbName, tblName, lo32, hi32);
}

void EMSCRIPTEN_KEEPALIVE libhook_commit_hook(sqlite3* db, int xCommitHook, void* pApp) {
  sqlite3_commit_hook(db, xCommitHook ? &libhook_xCommitHook : NULL, pApp);
}

void EMSCRIPTEN_KEEPALIVE libhook_update_hook(sqlite3* db, int xUpdateHook, void* pApp) {
  sqlite3_update_hook(db, xUpdateHook ? &libhook_xUpdateHook : NULL, pApp);
}