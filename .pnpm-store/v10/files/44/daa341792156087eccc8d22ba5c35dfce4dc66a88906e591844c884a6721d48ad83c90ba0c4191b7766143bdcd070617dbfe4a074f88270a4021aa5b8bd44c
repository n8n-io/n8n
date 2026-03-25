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

#include "cpuinfo_mips.h"

#include "filesystem_for_testing.h"
#include "gtest/gtest.h"
#include "hwcaps_for_testing.h"
#include "internal/stack_line_reader.h"
#include "internal/string_view.h"

namespace cpu_features {

namespace {

TEST(CpuinfoMipsTest, MipsFeaturesEnum) {
   const char *last_name = GetMipsFeaturesEnumName(MIPS_LAST_);
   EXPECT_STREQ(last_name, "unknown_feature");
   for (int i = static_cast<int>(MIPS_MSA); i != static_cast<int>(MIPS_LAST_); ++i) {
      const auto feature = static_cast<MipsFeaturesEnum>(i);
      const char *name = GetMipsFeaturesEnumName(feature);
      ASSERT_FALSE(name == nullptr);
      EXPECT_STRNE(name, "");
      EXPECT_STRNE(name, last_name);
   }
}

TEST(CpuinfoMipsTest, FromHardwareCapBoth) {
  ResetHwcaps();
  SetHardwareCapabilities(MIPS_HWCAP_MSA | MIPS_HWCAP_R6, 0);
  GetEmptyFilesystem();  // disabling /proc/cpuinfo
  const auto info = GetMipsInfo();
  EXPECT_TRUE(info.features.msa);
  EXPECT_FALSE(info.features.eva);
  EXPECT_TRUE(info.features.r6);
}

TEST(CpuinfoMipsTest, FromHardwareCapOnlyOne) {
  ResetHwcaps();
  SetHardwareCapabilities(MIPS_HWCAP_MSA, 0);
  GetEmptyFilesystem();  // disabling /proc/cpuinfo
  const auto info = GetMipsInfo();
  EXPECT_TRUE(info.features.msa);
  EXPECT_FALSE(info.features.eva);
}

TEST(CpuinfoMipsTest, Ci40) {
  ResetHwcaps();
  auto& fs = GetEmptyFilesystem();
  fs.CreateFile("/proc/cpuinfo", R"(system type : IMG Pistachio SoC (B0)
machine : IMG Marduk – Ci40 with cc2520
processor : 0
cpu model : MIPS interAptiv (multi) V2.0 FPU V0.0
BogoMIPS : 363.72
wait instruction : yes
microsecond timers : yes
tlb_entries : 64
extra interrupt vector : yes
hardware watchpoint : yes, count: 4, address/irw mask: [0x0ffc, 0x0ffc, 0x0ffb, 0x0ffb]
isa : mips1 mips2 mips32r1 mips32r2
ASEs implemented : mips16 dsp mt eva
shadow register sets : 1
kscratch registers : 0
package : 0
core : 0
VCED exceptions : not available
VCEI exceptions : not available
VPE : 0
)");
  const auto info = GetMipsInfo();
  EXPECT_FALSE(info.features.msa);
  EXPECT_TRUE(info.features.eva);
  EXPECT_FALSE(info.features.r6);
  EXPECT_TRUE(info.features.mips16);
  EXPECT_FALSE(info.features.mdmx);
  EXPECT_FALSE(info.features.mips3d);
  EXPECT_FALSE(info.features.smart);
  EXPECT_TRUE(info.features.dsp);
}

TEST(CpuinfoMipsTest, AR7161) {
  ResetHwcaps();
  auto& fs = GetEmptyFilesystem();
  fs.CreateFile("/proc/cpuinfo",
                R"(system type             : Atheros AR7161 rev 2
machine                 : NETGEAR WNDR3700/WNDR3800/WNDRMAC
processor               : 0
cpu model               : MIPS 24Kc V7.4
BogoMIPS                : 452.19
wait instruction        : yes
microsecond timers      : yes
tlb_entries             : 16
extra interrupt vector  : yes
hardware watchpoint     : yes, count: 4, address/irw mask: [0x0000, 0x0f98, 0x0f78, 0x0df8]
ASEs implemented        : mips16
shadow register sets    : 1
kscratch registers      : 0
core                    : 0
VCED exceptions         : not available
VCEI exceptions         : not available
)");
  const auto info = GetMipsInfo();
  EXPECT_FALSE(info.features.msa);
  EXPECT_FALSE(info.features.eva);
  EXPECT_TRUE(info.features.mips16);
}

TEST(CpuinfoMipsTest, Goldfish) {
  ResetHwcaps();
  auto& fs = GetEmptyFilesystem();
  fs.CreateFile("/proc/cpuinfo", R"(system type		: MIPS-Goldfish
Hardware		: goldfish
Revison		: 1
processor		: 0
cpu model		: MIPS 24Kc V0.0  FPU V0.0
BogoMIPS		: 1042.02
wait instruction	: yes
microsecond timers	: yes
tlb_entries		: 16
extra interrupt vector	: yes
hardware watchpoint	: yes, count: 1, address/irw mask: [0x0ff8]
ASEs implemented	:
shadow register sets	: 1
core			: 0
VCED exceptions		: not available
VCEI exceptions		: not available
)");
  const auto info = GetMipsInfo();
  EXPECT_FALSE(info.features.msa);
  EXPECT_FALSE(info.features.eva);
}

TEST(CpuinfoMipsTest, BCM1250) {
  ResetHwcaps();
  auto& fs = GetEmptyFilesystem();
  fs.CreateFile("/proc/cpuinfo", R"(system type		: SiByte BCM91250A (SWARM)
processor		: 0
cpu model               : SiByte SB1 V0.2  FPU V0.2
BogoMIPS                : 532.48
wait instruction        : no
microsecond timers      : yes
tlb_entries             : 64
extra interrupt vector  : yes
hardware watchpoint     : yes, count: 1, address/irw mask: [0x0ff8]
isa                     : mips1 mips2 mips3 mips4 mips5 mips32r1 mips32r2 mips64r1 mips64r2
ASEs implemented        : mdmx mips3d
shadow register sets    : 1
kscratch registers      : 0
package                 : 0
core                    : 0
VCED exceptions         : not available
VCEI exceptions         : not available
)");
  const auto info = GetMipsInfo();
  EXPECT_FALSE(info.features.msa);
  EXPECT_FALSE(info.features.eva);
  EXPECT_FALSE(info.features.mips16);
  EXPECT_TRUE(info.features.mdmx);
  EXPECT_TRUE(info.features.mips3d);
  EXPECT_FALSE(info.features.smart);
  EXPECT_FALSE(info.features.dsp);
}

}  // namespace
}  // namespace cpu_features
