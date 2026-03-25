#ifndef TREE_SITTER_WASM_H_
#define TREE_SITTER_WASM_H_

#ifdef __cplusplus
extern "C" {
#endif

#include "tree_sitter/api.h"
#include "./parser.h"

bool ts_wasm_store_start(TSWasmStore *, TSLexer *, const TSLanguage *);
void ts_wasm_store_reset(TSWasmStore *);
bool ts_wasm_store_has_error(const TSWasmStore *);

bool ts_wasm_store_call_lex_main(TSWasmStore *, TSStateId);
bool ts_wasm_store_call_lex_keyword(TSWasmStore *, TSStateId);

uint32_t ts_wasm_store_call_scanner_create(TSWasmStore *);
void ts_wasm_store_call_scanner_destroy(TSWasmStore *, uint32_t);
bool ts_wasm_store_call_scanner_scan(TSWasmStore *, uint32_t, uint32_t);
uint32_t ts_wasm_store_call_scanner_serialize(TSWasmStore *, uint32_t, char *);
void ts_wasm_store_call_scanner_deserialize(TSWasmStore *, uint32_t, const char *, unsigned);

void ts_wasm_language_retain(const TSLanguage *);
void ts_wasm_language_release(const TSLanguage *);

#ifdef __cplusplus
}
#endif

#endif  // TREE_SITTER_WASM_H_
