// Copyright 2022 IBM.
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

#include "cpuinfo_s390x.h"
#include "filesystem_for_testing.h"
#include "gtest/gtest.h"
#include "hwcaps_for_testing.h"

namespace cpu_features {
namespace {

TEST(CpustringsS390XTest, S390XFeaturesEnum) {
   const char *last_name = GetS390XFeaturesEnumName(S390X_LAST_);
   EXPECT_STREQ(last_name, "unknown_feature");
   for (int i = static_cast<int>(S390_ZARCH); i != static_cast<int>(S390X_LAST_); ++i) {
      const auto feature = static_cast<S390XFeaturesEnum>(i);
      const char *name = GetS390XFeaturesEnumName(feature);
      ASSERT_FALSE(name == nullptr);
      EXPECT_STRNE(name, "");
      EXPECT_STRNE(name, last_name);
   }
}

TEST(CpustringsS390XTest, FromHardwareCap) {
  ResetHwcaps();
  SetHardwareCapabilities(HWCAP_S390_ESAN3 | HWCAP_S390_HPAGE |
          HWCAP_S390_NNPA | HWCAP_S390_SIE, 0);
  GetEmptyFilesystem();  // disabling /proc/cpuinfo
  const auto info = GetS390XInfo();
  EXPECT_TRUE(info.features.esan3);
  EXPECT_TRUE(info.features.edat);
  EXPECT_TRUE(info.features.nnpa);
  EXPECT_TRUE(info.features.sie);
  EXPECT_FALSE(info.features.msa);
  EXPECT_FALSE(info.features.stfle);
  EXPECT_FALSE(info.features.vxp2);
  EXPECT_FALSE(info.features.pcimio);
}

TEST(CpustringsS390XTest, z16) {
  ResetHwcaps();
  auto& fs = GetEmptyFilesystem();
  fs.CreateFile("/proc/cpuinfo",
                R"(vendor_id       : IBM/S390
# processors    : 24
bogomips per cpu: 26315.00
max thread id   : 1
features	: esan3 zarch stfle msa ldisp eimm dfp edat etf3eh highgprs te vx vxd vxe gs vxe2 vxp sort dflt vxp2 nnpa pcimio sie )");
  SetPlatformPointer("z16");
  const auto strings = GetS390XPlatformStrings();
  EXPECT_EQ(strings.num_processors, 24);
  ASSERT_STREQ(strings.type.platform, "z16");
}

TEST(CpustringsS390XTest, z15) {
  ResetHwcaps();
  auto& fs = GetEmptyFilesystem();
  fs.CreateFile("/proc/cpuinfo",
                R"(vendor_id       : IBM/S390
# processors    : 2
bogomips per cpu: 24038.00
max thread id   : 1
features    : esan3 zarch stfle msa ldisp eimm dfp edat etf3eh highgprs te vx vxd vxe gs vxe2 vxp sort dflt sie)");
  SetPlatformPointer("z15");
  const auto strings = GetS390XPlatformStrings();
  EXPECT_EQ(strings.num_processors, 2);
  ASSERT_STREQ(strings.type.platform, "z15");
}

}  // namespace
}  // namespace cpu_features
