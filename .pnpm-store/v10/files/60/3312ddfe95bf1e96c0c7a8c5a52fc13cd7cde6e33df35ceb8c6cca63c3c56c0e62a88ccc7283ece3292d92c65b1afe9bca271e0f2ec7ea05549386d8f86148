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

#include "internal/bit_utils.h"

#include "gtest/gtest.h"

namespace cpu_features {
namespace {

TEST(UtilsTest, IsBitSet) {
  for (size_t bit_set = 0; bit_set < 32; ++bit_set) {
    const uint32_t value = 1UL << bit_set;
    for (uint32_t i = 0; i < 32; ++i) {
      EXPECT_EQ(IsBitSet(value, i), i == bit_set);
    }
  }

  // testing 0, all bits should be 0.
  for (uint32_t i = 0; i < 32; ++i) {
    EXPECT_FALSE(IsBitSet(0, i));
  }

  // testing ~0, all bits should be 1.
  for (uint32_t i = 0; i < 32; ++i) {
    EXPECT_TRUE(IsBitSet(-1, i));
  }
}

TEST(UtilsTest, ExtractBitRange) {
  // Extracting all bits gives the same number.
  EXPECT_EQ(ExtractBitRange(123, 31, 0), 123);
  // Extracting 1 bit gives parity.
  EXPECT_EQ(ExtractBitRange(123, 0, 0), 1);
  EXPECT_EQ(ExtractBitRange(122, 0, 0), 0);

  EXPECT_EQ(ExtractBitRange(0xF0, 7, 4), 0xF);
  EXPECT_EQ(ExtractBitRange(0x42 << 2, 10, 2), 0x42);
}

}  // namespace
}  // namespace cpu_features
