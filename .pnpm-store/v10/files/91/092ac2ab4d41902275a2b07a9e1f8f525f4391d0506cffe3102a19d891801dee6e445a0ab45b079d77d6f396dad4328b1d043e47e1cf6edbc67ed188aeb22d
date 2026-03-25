// Copyright 2024 Roy T. Hashimoto. All Rights Reserved.
#include <stdio.h>
#include <string.h>
#include <strings.h>
#include <emscripten.h>
#include <sqlite3.h>

#include "libadapters.h"

enum {
  xFunc,
  xStep,
  xFinal
};

#define FUNC_JS(SIGNATURE, KEY, METHOD, ...) \
  (asyncFlags & (1 << METHOD) ? \
    SIGNATURE##_async(KEY, #METHOD, __VA_ARGS__) : \
    SIGNATURE(KEY, #METHOD, __VA_ARGS__))

static void libfunction_xFunc(sqlite3_context* ctx, int argc, sqlite3_value** argv) {
  const void* pApp = sqlite3_user_data(ctx);
  const int asyncFlags = pApp ? *(int *)pApp : 0;
  FUNC_JS(vpppip, pApp, xFunc, ctx, argc, argv);
}

static void libfunction_xStep(sqlite3_context* ctx, int argc, sqlite3_value** argv) {
  const void* pApp = sqlite3_user_data(ctx);
  const int asyncFlags = pApp ? *(int *)pApp : 0;
  FUNC_JS(vpppip, pApp, xStep, ctx, argc, argv);
}

static void libfunction_xFinal(sqlite3_context* ctx) {
  const void* pApp = sqlite3_user_data(ctx);
  const int asyncFlags = pApp ? *(int *)pApp : 0;
  FUNC_JS(vppp, pApp, xFinal, ctx);
}

int EMSCRIPTEN_KEEPALIVE libfunction_create_function(
  sqlite3* db,
  const char* zFunctionName,
  int nArg,
  int eTextRep,
  void* pApp,
  void* xFunc,
  void* xStep,
  void* xFinal) {
  return sqlite3_create_function_v2(
    db,
    zFunctionName,
    nArg,
    eTextRep,
    pApp,
    xFunc ? &libfunction_xFunc : NULL,
    xStep ? &libfunction_xStep : NULL,
    xFinal ? &libfunction_xFinal : NULL,
    &sqlite3_free);
}
