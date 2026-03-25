// Copyright 2024 Roy T. Hashimoto. All Rights Reserved.
#include <emscripten.h>
#include <sqlite3.h>

// Some SQLite API functions take a pointer to a function that frees
// memory. Although we could add a C binding to a JavaScript function
// that calls sqlite3_free(), it is more efficient to pass the sqlite3_free
// function pointer directly. This function provides the C pointer to
// JavaScript.
void* EMSCRIPTEN_KEEPALIVE getSqliteFree() {
  return sqlite3_free;
}

int main() {
  sqlite3_initialize();
  return 0;
}