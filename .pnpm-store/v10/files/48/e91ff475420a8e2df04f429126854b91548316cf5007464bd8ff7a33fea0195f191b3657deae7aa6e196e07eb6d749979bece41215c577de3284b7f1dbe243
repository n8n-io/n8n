// Copyright 2024 Roy T. Hashimoto. All Rights Reserved.
#include <stdio.h>
#include <emscripten.h>
#include <sqlite3.h>

#include "libadapters.h"

#define PROGRESS_JS(SIGNATURE, KEY, ...) \
  (asyncFlags ? \
    SIGNATURE##_async(KEY, __VA_ARGS__) : \
    SIGNATURE(KEY, __VA_ARGS__))

static int libprogress_xProgress(void* pApp) {
  const int asyncFlags = pApp ? *(int *)pApp : 0;
  return PROGRESS_JS(ipp, pApp, pApp);
}

void EMSCRIPTEN_KEEPALIVE libprogress_progress_handler(
  sqlite3* db,
  int nOps,
  int xProgress,
  void* pApp) {
  sqlite3_progress_handler(
    db,
    nOps,
    xProgress ? &libprogress_xProgress : NULL,
    pApp);
}