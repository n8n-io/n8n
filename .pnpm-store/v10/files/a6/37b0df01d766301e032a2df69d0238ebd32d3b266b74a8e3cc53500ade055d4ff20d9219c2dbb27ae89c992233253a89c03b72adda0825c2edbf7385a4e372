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

// Reads a file line by line and stores the data on the stack. This allows
// parsing files in one go without allocating.
#ifndef CPU_FEATURES_INCLUDE_INTERNAL_STACK_LINE_READER_H_
#define CPU_FEATURES_INCLUDE_INTERNAL_STACK_LINE_READER_H_

#include <stdbool.h>

#include "cpu_features_macros.h"
#include "internal/string_view.h"

CPU_FEATURES_START_CPP_NAMESPACE

typedef struct {
  char buffer[STACK_LINE_READER_BUFFER_SIZE];
  StringView view;
  int fd;
  bool skip_mode;
} StackLineReader;

// Initializes a StackLineReader.
void StackLineReader_Initialize(StackLineReader* reader, int fd);

typedef struct {
  StringView line;  // A view of the line.
  bool eof;         // Nothing more to read, we reached EOF.
  bool full_line;   // If false the line was truncated to
                    // STACK_LINE_READER_BUFFER_SIZE.
} LineResult;

// Reads the file pointed to by fd and tries to read a full line.
LineResult StackLineReader_NextLine(StackLineReader* reader);

CPU_FEATURES_END_CPP_NAMESPACE

#endif  // CPU_FEATURES_INCLUDE_INTERNAL_STACK_LINE_READER_H_
