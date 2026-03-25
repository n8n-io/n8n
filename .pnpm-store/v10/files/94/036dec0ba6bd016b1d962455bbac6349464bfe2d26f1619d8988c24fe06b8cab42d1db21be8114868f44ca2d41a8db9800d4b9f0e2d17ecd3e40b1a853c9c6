// Copyright 2024 Roy T. Hashimoto. All Rights Reserved.
#include <stdio.h>
#include <emscripten.h>
#include <sqlite3.h>

#include "libadapters.h"

#define CALL_JS(SIGNATURE, KEY, ...) \
  (asyncFlags ? \
    SIGNATURE##_async(KEY, __VA_ARGS__) : \
    SIGNATURE(KEY, __VA_ARGS__))

static int libauthorizer_xAuthorize(
  void* pApp,
  int iAction,
  const char* param3,
  const char* param4,
  const char* param5,
  const char* param6) {
  const int asyncFlags = pApp ? *(int *)pApp : 0;
  return CALL_JS(ippipppp, pApp, pApp, iAction, param3, param4, param5, param6);
}

int EMSCRIPTEN_KEEPALIVE libauthorizer_set_authorizer(
  sqlite3* db,
  int xAuthorizer,
  void* pApp) {
  return sqlite3_set_authorizer(
    db,
    xAuthorizer ? &libauthorizer_xAuthorize : NULL,
    pApp);
}