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

#include "cpuinfo_arm.h"

#include "filesystem_for_testing.h"
#include "gtest/gtest.h"
#include "hwcaps_for_testing.h"

namespace cpu_features {
namespace {

TEST(CpuinfoArmTest, ArmFeaturesEnum) {
   const char *last_name = GetArmFeaturesEnumName(ARM_LAST_);
   EXPECT_STREQ(last_name, "unknown_feature");
   for (int i = static_cast<int>(ARM_SWP); i != static_cast<int>(ARM_LAST_); ++i) {
      const auto feature = static_cast<ArmFeaturesEnum>(i);
      const char *name = GetArmFeaturesEnumName(feature);
      ASSERT_FALSE(name == nullptr);
      EXPECT_STRNE(name, "");
      EXPECT_STRNE(name, last_name);
   }
}

TEST(CpuinfoArmTest, FromHardwareCap) {
  ResetHwcaps();
  SetHardwareCapabilities(ARM_HWCAP_NEON, ARM_HWCAP2_AES | ARM_HWCAP2_CRC32);
  GetEmptyFilesystem();  // disabling /proc/cpuinfo
  const auto info = GetArmInfo();
  EXPECT_TRUE(info.features.vfp);    // triggered by vfpv3
  EXPECT_TRUE(info.features.vfpv3);  // triggered by neon
  EXPECT_TRUE(info.features.neon);
  EXPECT_TRUE(info.features.aes);
  EXPECT_TRUE(info.features.crc32);

  EXPECT_FALSE(info.features.vfpv4);
  EXPECT_FALSE(info.features.iwmmxt);
  EXPECT_FALSE(info.features.crunch);
  EXPECT_FALSE(info.features.thumbee);
  EXPECT_FALSE(info.features.vfpv3d16);
  EXPECT_FALSE(info.features.idiva);
  EXPECT_FALSE(info.features.idivt);
  EXPECT_FALSE(info.features.pmull);
  EXPECT_FALSE(info.features.sha1);
  EXPECT_FALSE(info.features.sha2);

  // check some random features with EnumValue():
  EXPECT_TRUE(GetArmFeaturesEnumValue(&info.features, ARM_VFP));
  EXPECT_FALSE(GetArmFeaturesEnumValue(&info.features, ARM_VFPV4));
  // out of bound EnumValue() check
  EXPECT_FALSE(GetArmFeaturesEnumValue(&info.features, (ArmFeaturesEnum)~0x0));
}

TEST(CpuinfoArmTest, ODroidFromCpuInfo) {
  ResetHwcaps();
  auto& fs = GetEmptyFilesystem();
  fs.CreateFile("/proc/cpuinfo", R"(processor       : 0
model name      : ARMv7 Processor rev 3 (v71)
BogoMIPS        : 120.00
Features        : half thumb fastmult vfp edsp neon vfpv3 tls vfpv4 idiva idivt vfpd32 lpae
CPU implementer : 0x41
CPU architecture: 7
CPU variant     : 0x2
CPU part        : 0xc0f
CPU revision    : 3)");
  const auto info = GetArmInfo();
  EXPECT_EQ(info.implementer, 0x41);
  EXPECT_EQ(info.variant, 0x2);
  EXPECT_EQ(info.part, 0xc0f);
  EXPECT_EQ(info.revision, 3);
  EXPECT_EQ(info.architecture, 7);

  EXPECT_FALSE(info.features.swp);
  EXPECT_TRUE(info.features.half);
  EXPECT_TRUE(info.features.thumb);
  EXPECT_FALSE(info.features._26bit);
  EXPECT_TRUE(info.features.fastmult);
  EXPECT_FALSE(info.features.fpa);
  EXPECT_TRUE(info.features.vfp);
  EXPECT_TRUE(info.features.edsp);
  EXPECT_FALSE(info.features.java);
  EXPECT_FALSE(info.features.iwmmxt);
  EXPECT_FALSE(info.features.crunch);
  EXPECT_FALSE(info.features.thumbee);
  EXPECT_TRUE(info.features.neon);
  EXPECT_TRUE(info.features.vfpv3);
  EXPECT_FALSE(info.features.vfpv3d16);
  EXPECT_TRUE(info.features.tls);
  EXPECT_TRUE(info.features.vfpv4);
  EXPECT_TRUE(info.features.idiva);
  EXPECT_TRUE(info.features.idivt);
  EXPECT_TRUE(info.features.vfpd32);
  EXPECT_TRUE(info.features.lpae);
  EXPECT_FALSE(info.features.evtstrm);
  EXPECT_FALSE(info.features.aes);
  EXPECT_FALSE(info.features.pmull);
  EXPECT_FALSE(info.features.sha1);
  EXPECT_FALSE(info.features.sha2);
  EXPECT_FALSE(info.features.crc32);
}

// Linux test-case
TEST(CpuinfoArmTest, RaspberryPiZeroFromCpuInfo) {
  ResetHwcaps();
  auto& fs = GetEmptyFilesystem();
  fs.CreateFile("/proc/cpuinfo", R"(processor       : 0
model name      : ARMv6-compatible processor rev 7 (v6l)
BogoMIPS        : 697.95
Features        : half thumb fastmult vfp edsp java tls
CPU implementer : 0x41
CPU architecture: 7
CPU variant     : 0x0
CPU part        : 0xb76
CPU revision    : 7

Hardware        : BCM2835
Revision        : 9000c1
Serial          : 000000006cd946f3)");
  const auto info = GetArmInfo();
  EXPECT_EQ(info.implementer, 0x41);
  EXPECT_EQ(info.variant, 0x0);
  EXPECT_EQ(info.part, 0xb76);
  EXPECT_EQ(info.revision, 7);
  EXPECT_EQ(info.architecture, 6);

  EXPECT_FALSE(info.features.swp);
  EXPECT_TRUE(info.features.half);
  EXPECT_TRUE(info.features.thumb);
  EXPECT_FALSE(info.features._26bit);
  EXPECT_TRUE(info.features.fastmult);
  EXPECT_FALSE(info.features.fpa);
  EXPECT_TRUE(info.features.vfp);
  EXPECT_TRUE(info.features.edsp);
  EXPECT_TRUE(info.features.java);
  EXPECT_FALSE(info.features.iwmmxt);
  EXPECT_FALSE(info.features.crunch);
  EXPECT_FALSE(info.features.thumbee);
  EXPECT_FALSE(info.features.neon);
  EXPECT_FALSE(info.features.vfpv3);
  EXPECT_FALSE(info.features.vfpv3d16);
  EXPECT_TRUE(info.features.tls);
  EXPECT_FALSE(info.features.vfpv4);
  EXPECT_FALSE(info.features.idiva);
  EXPECT_FALSE(info.features.idivt);
  EXPECT_FALSE(info.features.vfpd32);
  EXPECT_FALSE(info.features.lpae);
  EXPECT_FALSE(info.features.evtstrm);
  EXPECT_FALSE(info.features.aes);
  EXPECT_FALSE(info.features.pmull);
  EXPECT_FALSE(info.features.sha1);
  EXPECT_FALSE(info.features.sha2);
  EXPECT_FALSE(info.features.crc32);
}

TEST(CpuinfoArmTest, MarvellArmadaFromCpuInfo) {
  ResetHwcaps();
  auto& fs = GetEmptyFilesystem();
  fs.CreateFile("/proc/cpuinfo", R"(processor       : 0
model name      : ARMv7 Processor rev 1 (v7l)
BogoMIPS        : 50.00
Features        : half thumb fastmult vfp edsp neon vfpv3 tls vfpd32
CPU implementer : 0x41
CPU architecture: 7
CPU variant     : 0x4
CPU part        : 0xc09
CPU revision    : 1

processor       : 1
model name      : ARMv7 Processor rev 1 (v7l)
BogoMIPS        : 50.00
Features        : half thumb fastmult vfp edsp neon vfpv3 tls vfpd32
CPU implementer : 0x41
CPU architecture: 7
CPU variant     : 0x4
CPU part        : 0xc09
CPU revision    : 1

Hardware        : Marvell Armada 380/385 (Device Tree)
Revision        : 0000
Serial          : 0000000000000000)");
  const auto info = GetArmInfo();
  EXPECT_EQ(info.implementer, 0x41);
  EXPECT_EQ(info.variant, 0x4);
  EXPECT_EQ(info.part, 0xc09);
  EXPECT_EQ(info.revision, 1);
  EXPECT_EQ(info.architecture, 7);

  EXPECT_FALSE(info.features.swp);
  EXPECT_TRUE(info.features.half);
  EXPECT_TRUE(info.features.thumb);
  EXPECT_FALSE(info.features._26bit);
  EXPECT_TRUE(info.features.fastmult);
  EXPECT_FALSE(info.features.fpa);
  EXPECT_TRUE(info.features.vfp);
  EXPECT_TRUE(info.features.edsp);
  EXPECT_FALSE(info.features.java);
  EXPECT_FALSE(info.features.iwmmxt);
  EXPECT_FALSE(info.features.crunch);
  EXPECT_FALSE(info.features.thumbee);
  EXPECT_TRUE(info.features.neon);
  EXPECT_TRUE(info.features.vfpv3);
  EXPECT_FALSE(info.features.vfpv3d16);
  EXPECT_TRUE(info.features.tls);
  EXPECT_FALSE(info.features.vfpv4);
  EXPECT_FALSE(info.features.idiva);
  EXPECT_FALSE(info.features.idivt);
  EXPECT_TRUE(info.features.vfpd32);
  EXPECT_FALSE(info.features.lpae);
  EXPECT_FALSE(info.features.evtstrm);
  EXPECT_FALSE(info.features.aes);
  EXPECT_FALSE(info.features.pmull);
  EXPECT_FALSE(info.features.sha1);
  EXPECT_FALSE(info.features.sha2);
  EXPECT_FALSE(info.features.crc32);
}

// Android test-case
// http://code.google.com/p/android/issues/detail?id=10812
TEST(CpuinfoArmTest, InvalidArmv7) {
  ResetHwcaps();
  auto& fs = GetEmptyFilesystem();
  fs.CreateFile("/proc/cpuinfo",
                R"(Processor       : ARMv6-compatible processor rev 6 (v6l)
BogoMIPS        : 199.47
Features        : swp half thumb fastmult vfp edsp java
CPU implementer : 0x41
CPU architecture: 7
CPU variant     : 0x0
CPU part        : 0xb76
CPU revision    : 6

Hardware        : SPICA
Revision        : 0020
Serial          : 33323613546d00ec )");
  const auto info = GetArmInfo();
  EXPECT_EQ(info.architecture, 6);

  EXPECT_TRUE(info.features.swp);
  EXPECT_TRUE(info.features.half);
  EXPECT_TRUE(info.features.thumb);
  EXPECT_FALSE(info.features._26bit);
  EXPECT_TRUE(info.features.fastmult);
  EXPECT_FALSE(info.features.fpa);
  EXPECT_TRUE(info.features.vfp);
  EXPECT_TRUE(info.features.edsp);
  EXPECT_TRUE(info.features.java);
  EXPECT_FALSE(info.features.iwmmxt);
  EXPECT_FALSE(info.features.crunch);
  EXPECT_FALSE(info.features.thumbee);
  EXPECT_FALSE(info.features.neon);
  EXPECT_FALSE(info.features.vfpv3);
  EXPECT_FALSE(info.features.vfpv3d16);
  EXPECT_FALSE(info.features.tls);
  EXPECT_FALSE(info.features.vfpv4);
  EXPECT_FALSE(info.features.idiva);
  EXPECT_FALSE(info.features.idivt);
  EXPECT_FALSE(info.features.vfpd32);
  EXPECT_FALSE(info.features.lpae);
  EXPECT_FALSE(info.features.evtstrm);
  EXPECT_FALSE(info.features.aes);
  EXPECT_FALSE(info.features.pmull);
  EXPECT_FALSE(info.features.sha1);
  EXPECT_FALSE(info.features.sha2);
  EXPECT_FALSE(info.features.crc32);
}

// Android test-case
// https://crbug.com/341598.
TEST(CpuinfoArmTest, InvalidNeon) {
  ResetHwcaps();
  auto& fs = GetEmptyFilesystem();
  fs.CreateFile("/proc/cpuinfo",
                R"(Processor: ARMv7 Processory rev 0 (v71)
processor: 0
BogoMIPS: 13.50

Processor: 1
BogoMIPS: 13.50

Features: swp half thumb fastmult vfp edsp neon vfpv3 tls vfpv4 idiva idivt
CPU implementer : 0x51
CPU architecture: 7
CPU variant: 0x1
CPU part: 0x04d
CPU revision: 0

Hardware: SAMSUNG M2
Revision: 0010
Serial: 00001e030000354e)");
  const auto info = GetArmInfo();
  EXPECT_TRUE(info.features.swp);
  EXPECT_FALSE(info.features.neon);
}

// The Nexus 4 (Qualcomm Krait) kernel configuration forgets to report IDIV
// support.
TEST(CpuinfoArmTest, Nexus4_0x510006f2) {
  ResetHwcaps();
  auto& fs = GetEmptyFilesystem();
  fs.CreateFile("/proc/cpuinfo",
                R"(CPU implementer	: 0x51
CPU architecture: 7
CPU variant	: 0x0
CPU part	: 0x6f
CPU revision	: 2)");
  const auto info = GetArmInfo();
  EXPECT_TRUE(info.features.idiva);
  EXPECT_TRUE(info.features.idivt);

  EXPECT_EQ(GetArmCpuId(&info), 0x510006f2);
}

// The Nexus 4 (Qualcomm Krait) kernel configuration forgets to report IDIV
// support.
TEST(CpuinfoArmTest, Nexus4_0x510006f3) {
  ResetHwcaps();
  auto& fs = GetEmptyFilesystem();
  fs.CreateFile("/proc/cpuinfo",
                R"(CPU implementer	: 0x51
CPU architecture: 7
CPU variant	: 0x0
CPU part	: 0x6f
CPU revision	: 3)");
  const auto info = GetArmInfo();
  EXPECT_TRUE(info.features.idiva);
  EXPECT_TRUE(info.features.idivt);

  EXPECT_EQ(GetArmCpuId(&info), 0x510006f3);
}

// The 2013 Nexus 7 (Qualcomm Krait) kernel configuration forgets to report IDIV
// support.
TEST(CpuinfoArmTest, Nexus7_2013_0x511006f0) {
  ResetHwcaps();
  auto& fs = GetEmptyFilesystem();
  fs.CreateFile("/proc/cpuinfo",
                R"(CPU implementer  : 0x51
CPU architecture: 7
CPU variant : 0x1
CPU part  : 0x06f
CPU revision  : 0)");
  const auto info = GetArmInfo();
  EXPECT_TRUE(info.features.idiva);
  EXPECT_TRUE(info.features.idivt);

  EXPECT_EQ(GetArmCpuId(&info), 0x511006f0);
}

// The emulator-specific Android 4.2 kernel fails to report support for the
// 32-bit ARM IDIV instruction. Technically, this is a feature of the virtual
// CPU implemented by the emulator.
TEST(CpuinfoArmTest, EmulatorSpecificIdiv) {
  ResetHwcaps();
  auto& fs = GetEmptyFilesystem();
  fs.CreateFile("/proc/cpuinfo",
                R"(Processor	: ARMv7 Processor rev 0 (v7l)
BogoMIPS	: 629.14
Features	: swp half thumb fastmult vfp edsp neon vfpv3
CPU implementer	: 0x41
CPU architecture: 7
CPU variant	: 0x0
CPU part	: 0xc08
CPU revision	: 0

Hardware	: Goldfish
Revision	: 0000
Serial		: 0000000000000000)");
  const auto info = GetArmInfo();
  EXPECT_TRUE(info.features.idiva);
}

}  // namespace
}  // namespace cpu_features
