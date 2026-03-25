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

#include "internal/stack_line_reader.h"

#include <assert.h>
#include <errno.h>
#include <stdio.h>

#include "internal/filesystem.h"

void StackLineReader_Initialize(StackLineReader* reader, int fd) {
  reader->view.ptr = reader->buffer;
  reader->view.size = 0;
  reader->skip_mode = false;
  reader->fd = fd;
}

// Replaces the content of buffer with bytes from the file.
static int LoadFullBuffer(StackLineReader* reader) {
  const int read = CpuFeatures_ReadFile(reader->fd, reader->buffer,
                                        STACK_LINE_READER_BUFFER_SIZE);
  assert(read >= 0);
  reader->view.ptr = reader->buffer;
  reader->view.size = read;
  return read;
}

// Appends with bytes from the file to buffer, filling the remaining space.
static int LoadMore(StackLineReader* reader) {
  char* const ptr = reader->buffer + reader->view.size;
  const size_t size_to_read = STACK_LINE_READER_BUFFER_SIZE - reader->view.size;
  const int read = CpuFeatures_ReadFile(reader->fd, ptr, size_to_read);
  assert(read >= 0);
  assert(read <= (int)size_to_read);
  reader->view.size += read;
  return read;
}

static int IndexOfEol(StackLineReader* reader) {
  return CpuFeatures_StringView_IndexOfChar(reader->view, '\n');
}

// Relocate buffer's pending bytes at the beginning of the array and fills the
// remaining space with bytes from the file.
static int BringToFrontAndLoadMore(StackLineReader* reader) {
  if (reader->view.size && reader->view.ptr != reader->buffer) {
    memmove(reader->buffer, reader->view.ptr, reader->view.size);
  }
  reader->view.ptr = reader->buffer;
  return LoadMore(reader);
}

// Loads chunks of buffer size from disks until it contains a newline character
// or end of file.
static void SkipToNextLine(StackLineReader* reader) {
  for (;;) {
    const int read = LoadFullBuffer(reader);
    if (read == 0) {
      break;
    } else {
      const int eol_index = IndexOfEol(reader);
      if (eol_index >= 0) {
        reader->view =
            CpuFeatures_StringView_PopFront(reader->view, eol_index + 1);
        break;
      }
    }
  }
}

static LineResult CreateLineResult(bool eof, bool full_line, StringView view) {
  LineResult result;
  result.eof = eof;
  result.full_line = full_line;
  result.line = view;
  return result;
}

// Helper methods to provide clearer semantic in StackLineReader_NextLine.
static LineResult CreateEOFLineResult(StringView view) {
  return CreateLineResult(true, true, view);
}

static LineResult CreateTruncatedLineResult(StringView view) {
  return CreateLineResult(false, false, view);
}

static LineResult CreateValidLineResult(StringView view) {
  return CreateLineResult(false, true, view);
}

LineResult StackLineReader_NextLine(StackLineReader* reader) {
  if (reader->skip_mode) {
    SkipToNextLine(reader);
    reader->skip_mode = false;
  }
  {
    const bool can_load_more =
        reader->view.size < STACK_LINE_READER_BUFFER_SIZE;
    int eol_index = IndexOfEol(reader);
    if (eol_index < 0 && can_load_more) {
      const int read = BringToFrontAndLoadMore(reader);
      if (read == 0) {
        return CreateEOFLineResult(reader->view);
      }
      eol_index = IndexOfEol(reader);
    }
    if (eol_index < 0) {
      reader->skip_mode = true;
      return CreateTruncatedLineResult(reader->view);
    }
    {
      StringView line =
          CpuFeatures_StringView_KeepFront(reader->view, eol_index);
      reader->view =
          CpuFeatures_StringView_PopFront(reader->view, eol_index + 1);
      return CreateValidLineResult(line);
    }
  }
}
