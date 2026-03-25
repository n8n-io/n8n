// Copyright 2018 IBM.
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

#include "cpuinfo_ppc.h"

#include "filesystem_for_testing.h"
#include "gtest/gtest.h"
#include "hwcaps_for_testing.h"
#include "internal/string_view.h"

namespace cpu_features {
namespace {

TEST(CpustringsPPCTest, PPCFeaturesEnum) {
   const char *last_name = GetPPCFeaturesEnumName(PPC_LAST_);
   EXPECT_STREQ(last_name, "unknown_feature");
   for (int i = static_cast<int>(PPC_32); i != static_cast<int>(PPC_LAST_); ++i) {
      const auto feature = static_cast<PPCFeaturesEnum>(i);
      const char *name = GetPPCFeaturesEnumName(feature);
      ASSERT_FALSE(name == nullptr);
      EXPECT_STRNE(name, "");
      EXPECT_STRNE(name, last_name);
   }
}

TEST(CpustringsPPCTest, FromHardwareCap) {
  ResetHwcaps();
  SetHardwareCapabilities(PPC_FEATURE_HAS_FPU | PPC_FEATURE_HAS_VSX,
                          PPC_FEATURE2_ARCH_3_00);
  GetEmptyFilesystem();  // disabling /proc/cpuinfo
  const auto info = GetPPCInfo();
  EXPECT_TRUE(info.features.fpu);
  EXPECT_FALSE(info.features.mmu);
  EXPECT_TRUE(info.features.vsx);
  EXPECT_TRUE(info.features.arch300);
  EXPECT_FALSE(info.features.power4);
  EXPECT_FALSE(info.features.altivec);
  EXPECT_FALSE(info.features.vcrypto);
  EXPECT_FALSE(info.features.htm);
}

TEST(CpustringsPPCTest, Blade) {
  ResetHwcaps();
  auto& fs = GetEmptyFilesystem();
  fs.CreateFile("/proc/cpuinfo",
                R"(processor       : 14
cpu             : POWER7 (architected), altivec supported
clock           : 3000.000000MHz
revision        : 2.1 (pvr 003f 0201)

processor       : 15
cpu             : POWER7 (architected), altivec supported
clock           : 3000.000000MHz
revision        : 2.1 (pvr 003f 0201)

timebase        : 512000000
platform        : pSeries
model           : IBM,8406-70Y
machine         : CHRP IBM,8406-70Y)");
  SetPlatformPointer("power7");
  SetBasePlatformPointer("power8");
  const auto strings = GetPPCPlatformStrings();
  ASSERT_STREQ(strings.platform, "pSeries");
  ASSERT_STREQ(strings.model, "IBM,8406-70Y");
  ASSERT_STREQ(strings.machine, "CHRP IBM,8406-70Y");
  ASSERT_STREQ(strings.cpu, "POWER7 (architected), altivec supported");
  ASSERT_STREQ(strings.type.platform, "power7");
  ASSERT_STREQ(strings.type.base_platform, "power8");
}

TEST(CpustringsPPCTest, Firestone) {
  ResetHwcaps();
  auto& fs = GetEmptyFilesystem();
  fs.CreateFile("/proc/cpuinfo",
                R"(processor       : 126
cpu             : POWER8 (raw), altivec supported
clock           : 2061.000000MHz
revision        : 2.0 (pvr 004d 0200)

processor       : 127
cpu             : POWER8 (raw), altivec supported
clock           : 2061.000000MHz
revision        : 2.0 (pvr 004d 0200)

timebase        : 512000000
platform        : PowerNV
model           : 8335-GTA
machine         : PowerNV 8335-GTA
firmware        : OPAL v3)");
  const auto strings = GetPPCPlatformStrings();
  ASSERT_STREQ(strings.platform, "PowerNV");
  ASSERT_STREQ(strings.model, "8335-GTA");
  ASSERT_STREQ(strings.machine, "PowerNV 8335-GTA");
  ASSERT_STREQ(strings.cpu, "POWER8 (raw), altivec supported");
}

TEST(CpustringsPPCTest, w8) {
  ResetHwcaps();
  auto& fs = GetEmptyFilesystem();
  fs.CreateFile("/proc/cpuinfo",
                R"(processor       : 143
cpu             : POWER9, altivec supported
clock           : 2300.000000MHz
revision        : 2.2 (pvr 004e 1202)

timebase        : 512000000
platform        : PowerNV
model           : 0000000000000000
machine         : PowerNV 0000000000000000
firmware        : OPAL
MMU             : Radix)");
  const auto strings = GetPPCPlatformStrings();
  ASSERT_STREQ(strings.platform, "PowerNV");
  ASSERT_STREQ(strings.model, "0000000000000000");
  ASSERT_STREQ(strings.machine, "PowerNV 0000000000000000");
  ASSERT_STREQ(strings.cpu, "POWER9, altivec supported");
}

}  // namespace
}  // namespace cpu_features
