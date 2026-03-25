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

// A view over a piece of string. The view is not 0 terminated.
#ifndef CPU_FEATURES_INCLUDE_INTERNAL_STRING_VIEW_H_
#define CPU_FEATURES_INCLUDE_INTERNAL_STRING_VIEW_H_

#include <stdbool.h>
#include <stddef.h>
#include <string.h>

#include "cpu_features_macros.h"

CPU_FEATURES_START_CPP_NAMESPACE

typedef struct {
  const char* ptr;
  size_t size;
} StringView;

#ifdef __cplusplus
static const StringView kEmptyStringView = {NULL, 0};
#else
static const StringView kEmptyStringView;
#endif

// Returns a StringView from the provided string.
// Passing NULL is valid only if size is 0.
static inline StringView view(const char* str, const size_t size) {
  StringView view;
  view.ptr = str;
  view.size = size;
  return view;
}

static inline StringView str(const char* str) { return view(str, strlen(str)); }

// Returns the index of the first occurrence of c in view or -1 if not found.
int CpuFeatures_StringView_IndexOfChar(const StringView view, char c);

// Returns the index of the first occurrence of sub_view in view or -1 if not
// found.
int CpuFeatures_StringView_IndexOf(const StringView view,
                                   const StringView sub_view);

// Returns whether a is equal to b (same content).
bool CpuFeatures_StringView_IsEquals(const StringView a, const StringView b);

// Returns whether a starts with b.
bool CpuFeatures_StringView_StartsWith(const StringView a, const StringView b);

// Removes count characters from the beginning of view or kEmptyStringView if
// count if greater than view.size.
StringView CpuFeatures_StringView_PopFront(const StringView str_view,
                                           size_t count);

// Removes count characters from the end of view or kEmptyStringView if count if
// greater than view.size.
StringView CpuFeatures_StringView_PopBack(const StringView str_view,
                                          size_t count);

// Keeps the count first characters of view or view if count if greater than
// view.size.
StringView CpuFeatures_StringView_KeepFront(const StringView str_view,
                                            size_t count);

// Retrieves the first character of view. If view is empty the behavior is
// undefined.
char CpuFeatures_StringView_Front(const StringView view);

// Retrieves the last character of view. If view is empty the behavior is
// undefined.
char CpuFeatures_StringView_Back(const StringView view);

// Removes leading and tailing space characters.
StringView CpuFeatures_StringView_TrimWhitespace(StringView view);

// Convert StringView to positive integer. e.g. "42", "0x2a".
// Returns -1 on error.
int CpuFeatures_StringView_ParsePositiveNumber(const StringView view);

// Copies src StringView to dst buffer.
void CpuFeatures_StringView_CopyString(const StringView src, char* dst,
                                       size_t dst_size);

// Checks if line contains the specified whitespace separated word.
bool CpuFeatures_StringView_HasWord(const StringView line,
                                    const char* const word,
                                    const char separator);

// Get key/value from line. key and value are separated by ": ".
// key and value are cleaned up from leading and trailing whitespaces.
bool CpuFeatures_StringView_GetAttributeKeyValue(const StringView line,
                                                 StringView* key,
                                                 StringView* value);

CPU_FEATURES_END_CPP_NAMESPACE

#endif  // CPU_FEATURES_INCLUDE_INTERNAL_STRING_VIEW_H_
