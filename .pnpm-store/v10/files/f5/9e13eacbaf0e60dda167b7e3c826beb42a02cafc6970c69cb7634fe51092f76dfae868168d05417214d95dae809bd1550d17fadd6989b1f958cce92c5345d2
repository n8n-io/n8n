// Copyright 2022 Google LLC
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

#include "cpuinfo_riscv.h"

#include "filesystem_for_testing.h"
#include "gtest/gtest.h"
#include "hwcaps_for_testing.h"

namespace cpu_features {
namespace {

TEST(CpuinfoRiscvTest, Sipeed_Lichee_RV_FromCpuInfo) {
  ResetHwcaps();
  auto& fs = GetEmptyFilesystem();
  fs.CreateFile("/proc/cpuinfo", R"(processor	: 0 
hart  : 0
isa   : rv64imafdc
mmu   : sv39
uarch : thead,c906)");
  const auto info = GetRiscvInfo();
  EXPECT_STREQ(info.uarch, "c906");
  EXPECT_STREQ(info.vendor, "thead");

  EXPECT_FALSE(info.features.RV32I);
  EXPECT_TRUE(info.features.RV64I);
  EXPECT_TRUE(info.features.M);
  EXPECT_TRUE(info.features.A);
  EXPECT_TRUE(info.features.F);
  EXPECT_TRUE(info.features.D);
  EXPECT_FALSE(info.features.Q);
  EXPECT_TRUE(info.features.C);
  EXPECT_FALSE(info.features.V);
}

// https://github.com/ThomasKaiser/sbc-bench/blob/284e82b016ec1beeac42a5fcbe556b670f68441a/results/Kendryte-K510-4.17.0.cpuinfo
TEST(CpuinfoRiscvTest, Kendryte_K510_FromCpuInfo) {
  ResetHwcaps();
  auto& fs = GetEmptyFilesystem();
  fs.CreateFile("/proc/cpuinfo", R"(
hart	: 0
isa	: rv64i2p0m2p0a2p0f2p0d2p0c2p0xv5-0p0
mmu	: sv39

hart	: 1
isa	: rv64i2p0m2p0a2p0f2p0d2p0c2p0xv5-0p0
mmu	: sv39");
  const auto info = GetRiscvInfo();
  EXPECT_STREQ(info.uarch, "");
  EXPECT_STREQ(info.vendor, "");

  EXPECT_FALSE(info.features.RV32I);
  EXPECT_TRUE(info.features.RV64I);
  EXPECT_TRUE(info.features.M);
  EXPECT_TRUE(info.features.A);
  EXPECT_TRUE(info.features.F);
  EXPECT_TRUE(info.features.D);
  EXPECT_FALSE(info.features.Q);
  EXPECT_TRUE(info.features.C);
  EXPECT_FALSE(info.features.V);
}

// https://github.com/ThomasKaiser/sbc-bench/blob/284e82b016ec1beeac42a5fcbe556b670f68441a/results/T-Head-C910-5.10.4.cpuinfo
TEST(CpuinfoRiscvTest, T_Head_C910_FromCpuInfo) {
  ResetHwcaps();
  auto& fs = GetEmptyFilesystem();
  fs.CreateFile("/proc/cpuinfo", R"(
processor	: 0
hart		: 0
isa		: rv64imafdcsu
mmu		: sv39
cpu-freq	: 1.2Ghz
cpu-icache	: 64KB
cpu-dcache	: 64KB
cpu-l2cache	: 2MB
cpu-tlb		: 1024 4-ways
cpu-cacheline	: 64Bytes
cpu-vector	: 0.7.1

processor	: 1
hart		: 1
isa		: rv64imafdcsu
mmu		: sv39
cpu-freq	: 1.2Ghz
cpu-icache	: 64KB
cpu-dcache	: 64KB
cpu-l2cache	: 2MB
cpu-tlb		: 1024 4-ways
cpu-cacheline	: 64Bytes
cpu-vector	: 0.7.1");
  const auto info = GetRiscvInfo();
  EXPECT_STREQ(info.uarch, "");
  EXPECT_STREQ(info.vendor, "");

  EXPECT_FALSE(info.features.RV32I);
  EXPECT_TRUE(info.features.RV64I);
  EXPECT_TRUE(info.features.M);
  EXPECT_TRUE(info.features.A);
  EXPECT_TRUE(info.features.F);
  EXPECT_TRUE(info.features.D);
  EXPECT_FALSE(info.features.Q);
  EXPECT_TRUE(info.features.C);
  EXPECT_FALSE(info.features.V);
}

TEST(CpuinfoRiscvTest, UnknownFromCpuInfo) {
  ResetHwcaps();
  auto& fs = GetEmptyFilesystem();
  fs.CreateFile("/proc/cpuinfo", R"(
processor : 0
hart      : 2
isa       : rv64imafdc
mmu       : sv39
uarch     : sifive,bullet0

processor : 1
hart      : 1
isa       : rv64imafdc
mmu       : sv39
uarch     : sifive,bullet0

processor : 2
hart      : 3
isa       : rv64imafdc
mmu       : sv39
uarch     : sifive,bullet0

processor : 3
hart      : 4
isa       : rv64imafdc
mmu       : sv39
uarch     : sifive,bullet0)");
  const auto info = GetRiscvInfo();
  EXPECT_STREQ(info.uarch, "bullet0");
  EXPECT_STREQ(info.vendor, "sifive");

  EXPECT_FALSE(info.features.RV32I);
  EXPECT_TRUE(info.features.RV64I);
  EXPECT_TRUE(info.features.M);
  EXPECT_TRUE(info.features.A);
  EXPECT_TRUE(info.features.F);
  EXPECT_TRUE(info.features.D);
  EXPECT_FALSE(info.features.Q);
  EXPECT_TRUE(info.features.C);
  EXPECT_FALSE(info.features.V);
}

TEST(CpuinfoRiscvTest, QemuCpuInfo) {
  ResetHwcaps();
  auto& fs = GetEmptyFilesystem();
  fs.CreateFile("/proc/cpuinfo", R"(
processor	: 0
hart		: 0
isa		: rv64imafdcvh_zba_zbb_zbc_zbs
mmu		: sv48)");
  const auto info = GetRiscvInfo();
  EXPECT_FALSE(info.features.RV32I);
  EXPECT_TRUE(info.features.RV64I);
  EXPECT_TRUE(info.features.M);
  EXPECT_TRUE(info.features.A);
  EXPECT_TRUE(info.features.F);
  EXPECT_TRUE(info.features.D);
  EXPECT_FALSE(info.features.Q);
  EXPECT_TRUE(info.features.C);
  EXPECT_TRUE(info.features.V);
}

}  // namespace
}  // namespace cpu_features
