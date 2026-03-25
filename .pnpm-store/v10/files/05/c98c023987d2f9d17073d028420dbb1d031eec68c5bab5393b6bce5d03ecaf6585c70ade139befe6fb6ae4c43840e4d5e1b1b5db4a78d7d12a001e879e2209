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

#include "gtest/gtest.h"

namespace cpu_features {

bool operator==(const StringView& a, const StringView& b) {
  return CpuFeatures_StringView_IsEquals(a, b);
}

namespace {

TEST(StringViewTest, Empty) {
  EXPECT_EQ(kEmptyStringView.ptr, nullptr);
  EXPECT_EQ(kEmptyStringView.size, 0);
}

TEST(StringViewTest, Build) {
  const auto view = str("test");
  EXPECT_EQ(view.ptr[0], 't');
  EXPECT_EQ(view.size, 4);
}

TEST(StringViewTest, CpuFeatures_StringView_IndexOfChar) {
  // Found.
  EXPECT_EQ(CpuFeatures_StringView_IndexOfChar(str("test"), 'e'), 1);
  EXPECT_EQ(CpuFeatures_StringView_IndexOfChar(str("test"), 't'), 0);
  EXPECT_EQ(CpuFeatures_StringView_IndexOfChar(str("beef"), 'e'), 1);
  // Not found.
  EXPECT_EQ(CpuFeatures_StringView_IndexOfChar(str("test"), 'z'), -1);
  // Empty.
  EXPECT_EQ(CpuFeatures_StringView_IndexOfChar(kEmptyStringView, 'z'), -1);
}

TEST(StringViewTest, CpuFeatures_StringView_IndexOf) {
  // Found.
  EXPECT_EQ(CpuFeatures_StringView_IndexOf(str("test"), str("es")), 1);
  EXPECT_EQ(CpuFeatures_StringView_IndexOf(str("test"), str("test")), 0);
  EXPECT_EQ(CpuFeatures_StringView_IndexOf(str("tesstest"), str("test")), 4);
  // Not found.
  EXPECT_EQ(CpuFeatures_StringView_IndexOf(str("test"), str("aa")), -1);
  // Empty.
  EXPECT_EQ(CpuFeatures_StringView_IndexOf(kEmptyStringView, str("aa")), -1);
  EXPECT_EQ(CpuFeatures_StringView_IndexOf(str("aa"), kEmptyStringView), -1);
}

TEST(StringViewTest, CpuFeatures_StringView_StartsWith) {
  EXPECT_TRUE(CpuFeatures_StringView_StartsWith(str("test"), str("te")));
  EXPECT_TRUE(CpuFeatures_StringView_StartsWith(str("test"), str("test")));
  EXPECT_FALSE(CpuFeatures_StringView_StartsWith(str("test"), str("st")));
  EXPECT_FALSE(CpuFeatures_StringView_StartsWith(str("test"), str("est")));
  EXPECT_FALSE(CpuFeatures_StringView_StartsWith(str("test"), str("")));
  EXPECT_FALSE(
      CpuFeatures_StringView_StartsWith(str("test"), kEmptyStringView));
  EXPECT_FALSE(
      CpuFeatures_StringView_StartsWith(kEmptyStringView, str("test")));
}

TEST(StringViewTest, CpuFeatures_StringView_IsEquals) {
  EXPECT_TRUE(
      CpuFeatures_StringView_IsEquals(kEmptyStringView, kEmptyStringView));
  EXPECT_TRUE(CpuFeatures_StringView_IsEquals(kEmptyStringView, str("")));
  EXPECT_TRUE(CpuFeatures_StringView_IsEquals(str(""), kEmptyStringView));
  EXPECT_TRUE(CpuFeatures_StringView_IsEquals(str("test"), str("test")));
  EXPECT_TRUE(CpuFeatures_StringView_IsEquals(str("a"), str("a")));
  EXPECT_FALSE(CpuFeatures_StringView_IsEquals(str("a"), str("b")));
  EXPECT_FALSE(CpuFeatures_StringView_IsEquals(str("aa"), str("a")));
  EXPECT_FALSE(CpuFeatures_StringView_IsEquals(str("a"), str("aa")));
  EXPECT_FALSE(CpuFeatures_StringView_IsEquals(str("a"), kEmptyStringView));
  EXPECT_FALSE(CpuFeatures_StringView_IsEquals(kEmptyStringView, str("a")));
}

TEST(StringViewTest, CpuFeatures_StringView_PopFront) {
  EXPECT_EQ(CpuFeatures_StringView_PopFront(str("test"), 2), str("st"));
  EXPECT_EQ(CpuFeatures_StringView_PopFront(str("test"), 0), str("test"));
  EXPECT_EQ(CpuFeatures_StringView_PopFront(str("test"), 4), str(""));
  EXPECT_EQ(CpuFeatures_StringView_PopFront(str("test"), 100), str(""));
}

TEST(StringViewTest, CpuFeatures_StringView_PopBack) {
  EXPECT_EQ(CpuFeatures_StringView_PopBack(str("test"), 2), str("te"));
  EXPECT_EQ(CpuFeatures_StringView_PopBack(str("test"), 0), str("test"));
  EXPECT_EQ(CpuFeatures_StringView_PopBack(str("test"), 4), str(""));
  EXPECT_EQ(CpuFeatures_StringView_PopBack(str("test"), 100), str(""));
}

TEST(StringViewTest, CpuFeatures_StringView_KeepFront) {
  EXPECT_EQ(CpuFeatures_StringView_KeepFront(str("test"), 2), str("te"));
  EXPECT_EQ(CpuFeatures_StringView_KeepFront(str("test"), 0), str(""));
  EXPECT_EQ(CpuFeatures_StringView_KeepFront(str("test"), 4), str("test"));
  EXPECT_EQ(CpuFeatures_StringView_KeepFront(str("test"), 6), str("test"));
}

TEST(StringViewTest, CpuFeatures_StringView_Front) {
  EXPECT_EQ(CpuFeatures_StringView_Front(str("apple")), 'a');
  EXPECT_EQ(CpuFeatures_StringView_Front(str("a")), 'a');
}

TEST(StringViewTest, CpuFeatures_StringView_Back) {
  EXPECT_EQ(CpuFeatures_StringView_Back(str("apple")), 'e');
  EXPECT_EQ(CpuFeatures_StringView_Back(str("a")), 'a');
}

TEST(StringViewTest, CpuFeatures_StringView_TrimWhitespace) {
  EXPECT_EQ(CpuFeatures_StringView_TrimWhitespace(str("  first middle last  ")),
            str("first middle last"));
  EXPECT_EQ(CpuFeatures_StringView_TrimWhitespace(str("first middle last  ")),
            str("first middle last"));
  EXPECT_EQ(CpuFeatures_StringView_TrimWhitespace(str("  first middle last")),
            str("first middle last"));
  EXPECT_EQ(CpuFeatures_StringView_TrimWhitespace(str("first middle last")),
            str("first middle last"));
}

TEST(StringViewTest, CpuFeatures_StringView_ParsePositiveNumber) {
  EXPECT_EQ(CpuFeatures_StringView_ParsePositiveNumber(str("42")), 42);
  EXPECT_EQ(CpuFeatures_StringView_ParsePositiveNumber(str("0x2a")), 42);
  EXPECT_EQ(CpuFeatures_StringView_ParsePositiveNumber(str("0x2A")), 42);
  EXPECT_EQ(CpuFeatures_StringView_ParsePositiveNumber(str("0x2A2a")), 10794);
  EXPECT_EQ(CpuFeatures_StringView_ParsePositiveNumber(str("0x2a2A")), 10794);

  EXPECT_EQ(CpuFeatures_StringView_ParsePositiveNumber(str("-10")), -1);
  EXPECT_EQ(CpuFeatures_StringView_ParsePositiveNumber(str("-0x2A")), -1);
  EXPECT_EQ(CpuFeatures_StringView_ParsePositiveNumber(str("abc")), -1);
  EXPECT_EQ(CpuFeatures_StringView_ParsePositiveNumber(str("")), -1);
}

TEST(StringViewTest, CpuFeatures_StringView_CopyString) {
  char buf[4];
  buf[0] = 'X';

  // Empty
  CpuFeatures_StringView_CopyString(str(""), buf, sizeof(buf));
  EXPECT_STREQ(buf, "");

  // Less
  CpuFeatures_StringView_CopyString(str("a"), buf, sizeof(buf));
  EXPECT_STREQ(buf, "a");

  // exact
  CpuFeatures_StringView_CopyString(str("abc"), buf, sizeof(buf));
  EXPECT_STREQ(buf, "abc");

  // More
  CpuFeatures_StringView_CopyString(str("abcd"), buf, sizeof(buf));
  EXPECT_STREQ(buf, "abc");
}

TEST(StringViewTest, CpuFeatures_StringView_HasWord) {
  // Find flags at beginning, middle and end.
  EXPECT_TRUE(
      CpuFeatures_StringView_HasWord(str("first middle last"), "first", ' '));
  EXPECT_TRUE(
      CpuFeatures_StringView_HasWord(str("first middle last"), "middle", ' '));
  EXPECT_TRUE(
      CpuFeatures_StringView_HasWord(str("first middle last"), "last", ' '));
  // Find flags at beginning, middle and end with a different separator
  EXPECT_TRUE(
      CpuFeatures_StringView_HasWord(str("first-middle-last"), "first", '-'));
  EXPECT_TRUE(
      CpuFeatures_StringView_HasWord(str("first-middle-last"), "middle", '-'));
  EXPECT_TRUE(
      CpuFeatures_StringView_HasWord(str("first-middle-last"), "last", '-'));
  // Do not match partial flags
  EXPECT_FALSE(
      CpuFeatures_StringView_HasWord(str("first middle last"), "irst", ' '));
  EXPECT_FALSE(
      CpuFeatures_StringView_HasWord(str("first middle last"), "mid", ' '));
  EXPECT_FALSE(
      CpuFeatures_StringView_HasWord(str("first middle last"), "las", ' '));
}

TEST(StringViewTest, CpuFeatures_StringView_GetAttributeKeyValue) {
  const StringView line = str(" key :   first middle last   ");
  StringView key, value;
  EXPECT_TRUE(CpuFeatures_StringView_GetAttributeKeyValue(line, &key, &value));
  EXPECT_EQ(key, str("key"));
  EXPECT_EQ(value, str("first middle last"));
}

TEST(StringViewTest, FailingGetAttributeKeyValue) {
  const StringView line = str("key  first middle last");
  StringView key, value;
  EXPECT_FALSE(CpuFeatures_StringView_GetAttributeKeyValue(line, &key, &value));
}

}  // namespace
}  // namespace cpu_features
