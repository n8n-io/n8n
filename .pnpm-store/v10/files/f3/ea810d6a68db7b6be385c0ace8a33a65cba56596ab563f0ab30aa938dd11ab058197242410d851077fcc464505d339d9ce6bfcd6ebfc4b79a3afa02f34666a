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

#ifndef INTROSPECTION_PREFIX
#error "missing INTROSPECTION_PREFIX"
#endif
#ifndef INTROSPECTION_ENUM_PREFIX
#error "missing INTROSPECTION_ENUM_PREFIX"
#endif
#ifndef INTROSPECTION_TABLE
#error "missing INTROSPECTION_TABLE"
#endif

#include <stdbool.h>

#define STRINGIZE_(s) #s
#define STRINGIZE(s) STRINGIZE_(s)

#define FEAT_TYPE_NAME__(X) X##Features
#define FEAT_TYPE_NAME_(X) FEAT_TYPE_NAME__(X)
#define FEAT_TYPE_NAME FEAT_TYPE_NAME_(INTROSPECTION_PREFIX)

#define FEAT_ENUM_NAME__(X) X##FeaturesEnum
#define FEAT_ENUM_NAME_(X) FEAT_ENUM_NAME__(X)
#define FEAT_ENUM_NAME FEAT_ENUM_NAME_(INTROSPECTION_PREFIX)

#define GET_FEAT_ENUM_VALUE__(X) Get##X##FeaturesEnumValue
#define GET_FEAT_ENUM_VALUE_(X) GET_FEAT_ENUM_VALUE__(X)
#define GET_FEAT_ENUM_VALUE GET_FEAT_ENUM_VALUE_(INTROSPECTION_PREFIX)

#define GET_FEAT_ENUM_NAME__(X) Get##X##FeaturesEnumName
#define GET_FEAT_ENUM_NAME_(X) GET_FEAT_ENUM_NAME__(X)
#define GET_FEAT_ENUM_NAME GET_FEAT_ENUM_NAME_(INTROSPECTION_PREFIX)

#define FEAT_ENUM_LAST__(X) X##_LAST_
#define FEAT_ENUM_LAST_(X) FEAT_ENUM_LAST__(X)
#define FEAT_ENUM_LAST FEAT_ENUM_LAST_(INTROSPECTION_ENUM_PREFIX)

// Generate individual getters and setters.
#define LINE(ENUM, NAME, A, B, C)                                \
  static void set_##ENUM(FEAT_TYPE_NAME* features, bool value) { \
    features->NAME = value;                                      \
  }                                                              \
  static int get_##ENUM(const FEAT_TYPE_NAME* features) {        \
    return features->NAME;                                       \
  }
INTROSPECTION_TABLE
#undef LINE

// Generate getters table
#define LINE(ENUM, NAME, A, B, C) [ENUM] = get_##ENUM,
static int (*const kGetters[])(const FEAT_TYPE_NAME*) = {INTROSPECTION_TABLE};
#undef LINE

// Generate setters table
#define LINE(ENUM, NAME, A, B, C) [ENUM] = set_##ENUM,
static void (*const kSetters[])(FEAT_TYPE_NAME*, bool) = {INTROSPECTION_TABLE};
#undef LINE

// Implements the `GetXXXFeaturesEnumValue` API.
int GET_FEAT_ENUM_VALUE(const FEAT_TYPE_NAME* features, FEAT_ENUM_NAME value) {
  if (value >= FEAT_ENUM_LAST) return false;
  return kGetters[value](features);
}

// Generate feature name table.
#define LINE(ENUM, NAME, A, B, C) [ENUM] = STRINGIZE(NAME),
static const char* kFeatureNames[] = {INTROSPECTION_TABLE};
#undef LINE

// Implements the `GetXXXFeaturesEnumName` API.
const char* GET_FEAT_ENUM_NAME(FEAT_ENUM_NAME value) {
  if (value >= FEAT_ENUM_LAST) return "unknown_feature";
  return kFeatureNames[value];
}
