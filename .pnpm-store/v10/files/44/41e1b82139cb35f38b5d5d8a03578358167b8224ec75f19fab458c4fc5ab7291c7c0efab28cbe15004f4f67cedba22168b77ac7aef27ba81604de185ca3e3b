// Copyright 2017 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

#include "internal/string_view.h"

#include <assert.h>
#include <ctype.h>

#include "copy.inl"
#include "equals.inl"

static const char* CpuFeatures_memchr(const char* const ptr, const size_t size,
                                      const char c) {
  for (size_t i = 0; ptr && ptr[i] != '\0' && i < size; ++i)
    if (ptr[i] == c) return ptr + i;
  return NULL;
}

int CpuFeatures_StringView_IndexOfChar(const StringView view, char c) {
  if (view.ptr && view.size) {
    const char* const found = CpuFeatures_memchr(view.ptr, view.size, c);
    if (found) {
      return (int)(found - view.ptr);
    }
  }
  return -1;
}

int CpuFeatures_StringView_IndexOf(const StringView view,
                                   const StringView sub_view) {
  if (sub_view.size) {
    StringView remainder = view;
    while (remainder.size >= sub_view.size) {
      const int found_index =
          CpuFeatures_StringView_IndexOfChar(remainder, sub_view.ptr[0]);
      if (found_index < 0) break;
      remainder = CpuFeatures_StringView_PopFront(remainder, found_index);
      if (CpuFeatures_StringView_StartsWith(remainder, sub_view)) {
        return (int)(remainder.ptr - view.ptr);
      }
      remainder = CpuFeatures_StringView_PopFront(remainder, 1);
    }
  }
  return -1;
}

bool CpuFeatures_StringView_IsEquals(const StringView a, const StringView b) {
  if (a.size == b.size) {
    return a.ptr == b.ptr || equals(a.ptr, b.ptr, b.size);
  }
  return false;
}

bool CpuFeatures_StringView_StartsWith(const StringView a, const StringView b) {
  return a.ptr && b.ptr && b.size && a.size >= b.size
             ? equals(a.ptr, b.ptr, b.size)
             : false;
}

StringView CpuFeatures_StringView_PopFront(const StringView str_view,
                                           size_t count) {
  if (count > str_view.size) {
    return kEmptyStringView;
  }
  return view(str_view.ptr + count, str_view.size - count);
}

StringView CpuFeatures_StringView_PopBack(const StringView str_view,
                                          size_t count) {
  if (count > str_view.size) {
    return kEmptyStringView;
  }
  return view(str_view.ptr, str_view.size - count);
}

StringView CpuFeatures_StringView_KeepFront(const StringView str_view,
                                            size_t count) {
  return count <= str_view.size ? view(str_view.ptr, count) : str_view;
}

char CpuFeatures_StringView_Front(const StringView view) {
  assert(view.size);
  assert(view.ptr);
  return view.ptr[0];
}

char CpuFeatures_StringView_Back(const StringView view) {
  assert(view.size);
  return view.ptr[view.size - 1];
}

StringView CpuFeatures_StringView_TrimWhitespace(StringView view) {
  while (view.size && isspace(CpuFeatures_StringView_Front(view)))
    view = CpuFeatures_StringView_PopFront(view, 1);
  while (view.size && isspace(CpuFeatures_StringView_Back(view)))
    view = CpuFeatures_StringView_PopBack(view, 1);
  return view;
}

static int HexValue(const char c) {
  if (c >= '0' && c <= '9') return c - '0';
  if (c >= 'a' && c <= 'f') return c - 'a' + 10;
  if (c >= 'A' && c <= 'F') return c - 'A' + 10;
  return -1;
}

// Returns -1 if view contains non digits.
static int ParsePositiveNumberWithBase(const StringView view, int base) {
  int result = 0;
  StringView remainder = view;
  for (; remainder.size;
       remainder = CpuFeatures_StringView_PopFront(remainder, 1)) {
    const int value = HexValue(CpuFeatures_StringView_Front(remainder));
    if (value < 0 || value >= base) return -1;
    result = (result * base) + value;
  }
  return result;
}

int CpuFeatures_StringView_ParsePositiveNumber(const StringView view) {
  if (view.size) {
    const StringView hex_prefix = str("0x");
    if (CpuFeatures_StringView_StartsWith(view, hex_prefix)) {
      const StringView span_no_prefix =
          CpuFeatures_StringView_PopFront(view, hex_prefix.size);
      return ParsePositiveNumberWithBase(span_no_prefix, 16);
    }
    return ParsePositiveNumberWithBase(view, 10);
  }
  return -1;
}

void CpuFeatures_StringView_CopyString(const StringView src, char* dst,
                                       size_t dst_size) {
  if (dst_size > 0) {
    const size_t max_copy_size = dst_size - 1;
    const size_t copy_size =
        src.size > max_copy_size ? max_copy_size : src.size;
    copy(dst, src.ptr, copy_size);
    dst[copy_size] = '\0';
  }
}

bool CpuFeatures_StringView_HasWord(const StringView line,
                                    const char* const word_str,
                                    const char separator) {
  const StringView word = str(word_str);
  StringView remainder = line;
  for (;;) {
    const int index_of_word = CpuFeatures_StringView_IndexOf(remainder, word);
    if (index_of_word < 0) {
      return false;
    } else {
      const StringView before =
          CpuFeatures_StringView_KeepFront(line, index_of_word);
      const StringView after =
          CpuFeatures_StringView_PopFront(line, index_of_word + word.size);
      const bool valid_before =
          before.size == 0 || CpuFeatures_StringView_Back(before) == separator;
      const bool valid_after =
          after.size == 0 || CpuFeatures_StringView_Front(after) == separator;
      if (valid_before && valid_after) return true;
      remainder =
          CpuFeatures_StringView_PopFront(remainder, index_of_word + word.size);
    }
  }
  return false;
}

bool CpuFeatures_StringView_GetAttributeKeyValue(const StringView line,
                                                 StringView* key,
                                                 StringView* value) {
  const StringView sep = str(": ");
  const int index_of_separator = CpuFeatures_StringView_IndexOf(line, sep);
  if (index_of_separator < 0) return false;
  *value = CpuFeatures_StringView_TrimWhitespace(
      CpuFeatures_StringView_PopFront(line, index_of_separator + sep.size));
  *key = CpuFeatures_StringView_TrimWhitespace(
      CpuFeatures_StringView_KeepFront(line, index_of_separator));
  return true;
}
