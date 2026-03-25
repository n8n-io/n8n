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

#include "filesystem_for_testing.h"
#include "gtest/gtest.h"

namespace cpu_features {

bool operator==(const StringView& a, const StringView& b) {
  return CpuFeatures_StringView_IsEquals(a, b);
}

namespace {

std::string ToString(StringView view) { return {view.ptr, view.size}; }

TEST(StackLineReaderTest, Empty) {
  auto& fs = GetEmptyFilesystem();
  auto* file = fs.CreateFile("/proc/cpuinfo", "");
  StackLineReader reader;
  StackLineReader_Initialize(&reader, file->GetFileDescriptor());
  {
    const auto result = StackLineReader_NextLine(&reader);
    EXPECT_TRUE(result.eof);
    EXPECT_TRUE(result.full_line);
    EXPECT_EQ(result.line, str(""));
  }
}

TEST(StackLineReaderTest, ManySmallLines) {
  auto& fs = GetEmptyFilesystem();
  auto* file = fs.CreateFile("/proc/cpuinfo", "a\nb\nc");

  StackLineReader reader;
  StackLineReader_Initialize(&reader, file->GetFileDescriptor());
  {
    const auto result = StackLineReader_NextLine(&reader);
    EXPECT_FALSE(result.eof);
    EXPECT_TRUE(result.full_line);
    EXPECT_EQ(result.line, str("a"));
  }
  {
    const auto result = StackLineReader_NextLine(&reader);
    EXPECT_FALSE(result.eof);
    EXPECT_TRUE(result.full_line);
    EXPECT_EQ(result.line, str("b"));
  }
  {
    const auto result = StackLineReader_NextLine(&reader);
    EXPECT_TRUE(result.eof);
    EXPECT_TRUE(result.full_line);
    EXPECT_EQ(result.line, str("c"));
  }
}

TEST(StackLineReaderTest, TruncatedLine) {
  auto& fs = GetEmptyFilesystem();
  auto* file = fs.CreateFile("/proc/cpuinfo", R"(First
Second
More than 16 characters, this will be truncated.
last)");

  StackLineReader reader;
  StackLineReader_Initialize(&reader, file->GetFileDescriptor());
  {
    const auto result = StackLineReader_NextLine(&reader);
    EXPECT_FALSE(result.eof);
    EXPECT_TRUE(result.full_line);
    EXPECT_EQ(result.line, str("First"));
  }
  {
    const auto result = StackLineReader_NextLine(&reader);
    EXPECT_FALSE(result.eof);
    EXPECT_TRUE(result.full_line);
    EXPECT_EQ(result.line, str("Second"));
  }
  {
    const auto result = StackLineReader_NextLine(&reader);
    EXPECT_FALSE(result.eof);
    EXPECT_FALSE(result.full_line);
    EXPECT_EQ(result.line, str("More than 16 cha"));
  }
  {
    const auto result = StackLineReader_NextLine(&reader);
    EXPECT_TRUE(result.eof);
    EXPECT_TRUE(result.full_line);
    EXPECT_EQ(result.line, str("last"));
  }
}

TEST(StackLineReaderTest, TruncatedLines) {
  auto& fs = GetEmptyFilesystem();
  auto* file = fs.CreateFile("/proc/cpuinfo", R"(More than 16 characters
Another line that is too long)");

  StackLineReader reader;
  StackLineReader_Initialize(&reader, file->GetFileDescriptor());
  {
    const auto result = StackLineReader_NextLine(&reader);
    EXPECT_FALSE(result.eof);
    EXPECT_FALSE(result.full_line);
    EXPECT_EQ(result.line, str("More than 16 cha"));
  }
  {
    const auto result = StackLineReader_NextLine(&reader);
    EXPECT_FALSE(result.eof);
    EXPECT_FALSE(result.full_line);
    EXPECT_EQ(result.line, str("Another line tha"));
  }
  {
    const auto result = StackLineReader_NextLine(&reader);
    EXPECT_TRUE(result.eof);
    EXPECT_TRUE(result.full_line);
    EXPECT_EQ(result.line, str(""));
  }
}

}  // namespace
}  // namespace cpu_features
