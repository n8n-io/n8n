#ifndef TREE_SITTER_UNICODE_H_
#define TREE_SITTER_UNICODE_H_

#ifdef __cplusplus
extern "C" {
#endif

#include <limits.h>
#include <stdint.h>

#define U_EXPORT
#define U_EXPORT2
#include "unicode/utf8.h"
#include "unicode/utf16.h"

static const int32_t TS_DECODE_ERROR = U_SENTINEL;

// These functions read one unicode code point from the given string,
// returning the number of bytes consumed.
typedef uint32_t (*UnicodeDecodeFunction)(
  const uint8_t *string,
  uint32_t length,
  int32_t *code_point
);

static inline uint32_t ts_decode_utf8(
  const uint8_t *string,
  uint32_t length,
  int32_t *code_point
) {
  uint32_t i = 0;
  U8_NEXT(string, i, length, *code_point);
  return i;
}

static inline uint32_t ts_decode_utf16(
  const uint8_t *string,
  uint32_t length,
  int32_t *code_point
) {
  uint32_t i = 0;
  U16_NEXT(((uint16_t *)string), i, length, *code_point);
  return i * 2;
}

#ifdef __cplusplus
}
#endif

#endif  // TREE_SITTER_UNICODE_H_
