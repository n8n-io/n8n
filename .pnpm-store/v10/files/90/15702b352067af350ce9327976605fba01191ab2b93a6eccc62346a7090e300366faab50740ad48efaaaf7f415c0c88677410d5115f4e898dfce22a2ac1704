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

#include "cpuinfo_x86.h"

#include <cassert>
#include <cstdio>
#include <map>
#include <set>
#if defined(CPU_FEATURES_OS_WINDOWS)
#include "internal/windows_utils.h"
#endif  // CPU_FEATURES_OS_WINDOWS

#include "filesystem_for_testing.h"
#include "gtest/gtest.h"
#include "internal/cpuid_x86.h"

namespace cpu_features {

class FakeCpu {
 public:
  Leaf GetCpuidLeaf(uint32_t leaf_id, int ecx) const {
    const auto itr = cpuid_leaves_.find(std::make_pair(leaf_id, ecx));
    if (itr != cpuid_leaves_.end()) {
      return itr->second;
    }
    return {0, 0, 0, 0};
  }

  uint32_t GetXCR0Eax() const { return xcr0_eax_; }

  void SetLeaves(std::map<std::pair<uint32_t, int>, Leaf> configuration) {
    cpuid_leaves_ = std::move(configuration);
  }

  void SetOsBackupsExtendedRegisters(bool os_backups_extended_registers) {
    xcr0_eax_ = os_backups_extended_registers ? -1 : 0;
  }

#if defined(CPU_FEATURES_OS_MACOS)
  bool GetDarwinSysCtlByName(std::string name) const {
    return darwin_sysctlbyname_.count(name);
  }

  void SetDarwinSysCtlByName(std::string name) {
    darwin_sysctlbyname_.insert(name);
  }
#endif  // CPU_FEATURES_OS_MACOS

#if defined(CPU_FEATURES_OS_WINDOWS)
  bool GetWindowsIsProcessorFeaturePresent(DWORD ProcessorFeature) {
    return windows_isprocessorfeaturepresent_.count(ProcessorFeature);
  }

  void SetWindowsIsProcessorFeaturePresent(DWORD ProcessorFeature) {
    windows_isprocessorfeaturepresent_.insert(ProcessorFeature);
  }
#endif  // CPU_FEATURES_OS_WINDOWS

 private:
  std::map<std::pair<uint32_t, int>, Leaf> cpuid_leaves_;
#if defined(CPU_FEATURES_OS_MACOS)
  std::set<std::string> darwin_sysctlbyname_;
#endif  // CPU_FEATURES_OS_MACOS
#if defined(CPU_FEATURES_OS_WINDOWS)
  std::set<DWORD> windows_isprocessorfeaturepresent_;
#endif  // CPU_FEATURES_OS_WINDOWS
  uint32_t xcr0_eax_;
};

static FakeCpu* g_fake_cpu_instance = nullptr;

static FakeCpu& cpu() {
  assert(g_fake_cpu_instance != nullptr);
  return *g_fake_cpu_instance;
}

extern "C" Leaf GetCpuidLeaf(uint32_t leaf_id, int ecx) {
  return cpu().GetCpuidLeaf(leaf_id, ecx);
}

extern "C" uint32_t GetXCR0Eax(void) { return cpu().GetXCR0Eax(); }

#if defined(CPU_FEATURES_OS_MACOS)
extern "C" bool GetDarwinSysCtlByName(const char* name) {
  return cpu().GetDarwinSysCtlByName(name);
}
#endif  // CPU_FEATURES_OS_MACOS

#if defined(CPU_FEATURES_OS_WINDOWS)
extern "C" bool GetWindowsIsProcessorFeaturePresent(DWORD ProcessorFeature) {
  return cpu().GetWindowsIsProcessorFeaturePresent(ProcessorFeature);
}
#endif  // CPU_FEATURES_OS_WINDOWS

namespace {

class CpuidX86Test : public ::testing::Test {
 protected:
  void SetUp() override {
    assert(g_fake_cpu_instance == nullptr);
    g_fake_cpu_instance = new FakeCpu();
  }
  void TearDown() override {
    delete g_fake_cpu_instance;
    g_fake_cpu_instance = nullptr;
  }
};

TEST_F(CpuidX86Test, X86MicroarchitectureEnum) {
   const char *last_name = GetX86MicroarchitectureName(X86_MICROARCHITECTURE_LAST_);
   EXPECT_STREQ(last_name, "unknown microarchitecture");
   for (int i = static_cast<int>(X86_UNKNOWN); i != static_cast<int>(X86_MICROARCHITECTURE_LAST_); ++i) {
      const auto micro = static_cast<X86Microarchitecture>(i);
      const char *name = GetX86MicroarchitectureName(micro);
      ASSERT_FALSE(name == nullptr);
      EXPECT_STRNE(name, "");
      EXPECT_STRNE(name, last_name);
   }
}

TEST_F(CpuidX86Test, X86FeaturesEnum) {
   const char *last_name = GetX86FeaturesEnumName(X86_LAST_);
   EXPECT_STREQ(last_name, "unknown_feature");
   for (int i = static_cast<int>(X86_FPU); i != static_cast<int>(X86_LAST_); ++i) {
      const auto feature = static_cast<X86FeaturesEnum>(i);
      const char *name = GetX86FeaturesEnumName(feature);
      ASSERT_FALSE(name == nullptr);
      EXPECT_STRNE(name, "");
      EXPECT_STRNE(name, last_name);
   }
}

TEST_F(CpuidX86Test, SandyBridge) {
  cpu().SetOsBackupsExtendedRegisters(true);
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x0000000D, 0x756E6547, 0x6C65746E, 0x49656E69}},
      {{0x00000001, 0}, Leaf{0x000206A6, 0x00100800, 0x1F9AE3BF, 0xBFEBFBFF}},
      {{0x00000007, 0}, Leaf{0x00000000, 0x00000000, 0x00000000, 0x00000000}},
  });
  const auto info = GetX86Info();
  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_GENUINE_INTEL);
  EXPECT_EQ(info.family, 0x06);
  EXPECT_EQ(info.model, 0x02A);
  EXPECT_EQ(info.stepping, 0x06);
  // Leaf 7 is zeroed out so none of the Leaf 7 flags are set.
  const auto features = info.features;
  EXPECT_FALSE(features.erms);
  EXPECT_FALSE(features.avx2);
  EXPECT_FALSE(features.avx512f);
  EXPECT_FALSE(features.avx512cd);
  EXPECT_FALSE(features.avx512er);
  EXPECT_FALSE(features.avx512pf);
  EXPECT_FALSE(features.avx512bw);
  EXPECT_FALSE(features.avx512dq);
  EXPECT_FALSE(features.avx512vl);
  EXPECT_FALSE(features.avx512ifma);
  EXPECT_FALSE(features.avx512vbmi);
  EXPECT_FALSE(features.avx512vbmi2);
  EXPECT_FALSE(features.avx512vnni);
  EXPECT_FALSE(features.avx512bitalg);
  EXPECT_FALSE(features.avx512vpopcntdq);
  EXPECT_FALSE(features.avx512_4vnniw);
  EXPECT_FALSE(features.avx512_4fmaps);
  // All old cpu features should be set.
  EXPECT_TRUE(features.aes);
  EXPECT_TRUE(features.ssse3);
  EXPECT_TRUE(features.sse4_1);
  EXPECT_TRUE(features.sse4_2);
  EXPECT_TRUE(features.avx);
  EXPECT_FALSE(features.sha);
  EXPECT_TRUE(features.popcnt);
  EXPECT_FALSE(features.movbe);
  EXPECT_FALSE(features.rdrnd);
  EXPECT_FALSE(features.adx);
}

const int UNDEF = -1;
const int KiB = 1024;
const int MiB = 1024 * KiB;

TEST_F(CpuidX86Test, SandyBridgeTestOsSupport) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x0000000D, 0x756E6547, 0x6C65746E, 0x49656E69}},
      {{0x00000001, 0}, Leaf{0x000206A6, 0x00100800, 0x1F9AE3BF, 0xBFEBFBFF}},
      {{0x00000007, 0}, Leaf{0x00000000, 0x00000000, 0x00000000, 0x00000000}},
  });
  // avx is disabled if os does not support backing up ymm registers.
  cpu().SetOsBackupsExtendedRegisters(false);
  EXPECT_FALSE(GetX86Info().features.avx);
  // avx is disabled if os does not support backing up ymm registers.
  cpu().SetOsBackupsExtendedRegisters(true);
  EXPECT_TRUE(GetX86Info().features.avx);
}

TEST_F(CpuidX86Test, SkyLake) {
  cpu().SetOsBackupsExtendedRegisters(true);
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x00000016, 0x756E6547, 0x6C65746E, 0x49656E69}},
      {{0x00000001, 0}, Leaf{0x000406E3, 0x00100800, 0x7FFAFBBF, 0xBFEBFBFF}},
      {{0x00000007, 0}, Leaf{0x00000000, 0x029C67AF, 0x00000000, 0x00000000}},
  });
  const auto info = GetX86Info();
  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_GENUINE_INTEL);
  EXPECT_EQ(info.family, 0x06);
  EXPECT_EQ(info.model, 0x04E);
  EXPECT_EQ(info.stepping, 0x03);
  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::INTEL_SKL);
}

// http://users.atw.hu/instlatx64/GenuineIntel/GenuineIntel0050654_SkylakeXeon_CPUID8.txt
TEST_F(CpuidX86Test, SkyLakeXeon) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x00000016, 0x756E6547, 0x6C65746E, 0x49656E69}},
      {{0x00000001, 0}, Leaf{0x00050654, 0x00100800, 0x7FFEFBFF, 0xBFEBFBFF}}
  });
  const auto info = GetX86Info();
  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_GENUINE_INTEL);
  EXPECT_EQ(info.family, 0x06);
  EXPECT_EQ(info.model, 0x055);
  EXPECT_EQ(info.stepping, 0x04);
  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::INTEL_SKL);
}

// http://users.atw.hu/instlatx64/GenuineIntel/GenuineIntel0050657_CascadeLakeXeon_CPUID.txt
TEST_F(CpuidX86Test, CascadeLake) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x00000016, 0x756E6547, 0x6C65746E, 0x49656E69}},
      {{0x00000001, 0}, Leaf{0x00050657, 0x00400800, 0x7FFEFBFF, 0xBFEBFBFF}}
  });
  const auto info = GetX86Info();
  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_GENUINE_INTEL);
  EXPECT_EQ(info.family, 0x06);
  EXPECT_EQ(info.model, 0x055);
  EXPECT_EQ(info.stepping, 0x07);
  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::INTEL_CCL);
}

TEST_F(CpuidX86Test, Branding) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x00000016, 0x756E6547, 0x6C65746E, 0x49656E69}},
      {{0x00000001, 0}, Leaf{0x000406E3, 0x00100800, 0x7FFAFBBF, 0xBFEBFBFF}},
      {{0x00000007, 0}, Leaf{0x00000000, 0x029C67AF, 0x00000000, 0x00000000}},
      {{0x80000000, 0}, Leaf{0x80000008, 0x00000000, 0x00000000, 0x00000000}},
      {{0x80000001, 0}, Leaf{0x00000000, 0x00000000, 0x00000121, 0x2C100000}},
      {{0x80000002, 0}, Leaf{0x65746E49, 0x2952286C, 0x726F4320, 0x4D542865}},
      {{0x80000003, 0}, Leaf{0x37692029, 0x3035362D, 0x43205530, 0x40205550}},
      {{0x80000004, 0}, Leaf{0x352E3220, 0x7A484730, 0x00000000, 0x00000000}},
  });
  const auto info = GetX86Info();
  EXPECT_STREQ(info.brand_string, "Intel(R) Core(TM) i7-6500U CPU @ 2.50GHz");
}

TEST_F(CpuidX86Test, KabyLakeCache) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x00000016, 0x756E6547, 0x6C65746E, 0x49656E69}},
      {{0x00000001, 0}, Leaf{0x000406E3, 0x00100800, 0x7FFAFBBF, 0xBFEBFBFF}},
      {{0x00000004, 0}, Leaf{0x1C004121, 0x01C0003F, 0x0000003F, 0x00000000}},
      {{0x00000004, 1}, Leaf{0x1C004122, 0x01C0003F, 0x0000003F, 0x00000000}},
      {{0x00000004, 2}, Leaf{0x1C004143, 0x00C0003F, 0x000003FF, 0x00000000}},
      {{0x00000004, 3}, Leaf{0x1C03C163, 0x02C0003F, 0x00001FFF, 0x00000002}},
      {{0x00000007, 0}, Leaf{0x00000000, 0x029C67AF, 0x00000000, 0x00000000}},
      {{0x80000000, 0}, Leaf{0x80000008, 0x00000000, 0x00000000, 0x00000000}},
      {{0x80000001, 0}, Leaf{0x00000000, 0x00000000, 0x00000121, 0x2C100000}},
      {{0x80000002, 0}, Leaf{0x65746E49, 0x2952286C, 0x726F4320, 0x4D542865}},
      {{0x80000003, 0}, Leaf{0x37692029, 0x3035362D, 0x43205530, 0x40205550}},
  });
  const auto info = GetX86CacheInfo();
  EXPECT_EQ(info.size, 4);
  EXPECT_EQ(info.levels[0].level, 1);
  EXPECT_EQ(info.levels[0].cache_type, CacheType::CPU_FEATURE_CACHE_DATA);
  EXPECT_EQ(info.levels[0].cache_size, 32 * KiB);
  EXPECT_EQ(info.levels[0].ways, 8);
  EXPECT_EQ(info.levels[0].line_size, 64);
  EXPECT_EQ(info.levels[0].tlb_entries, 64);
  EXPECT_EQ(info.levels[0].partitioning, 1);

  EXPECT_EQ(info.levels[1].level, 1);
  EXPECT_EQ(info.levels[1].cache_type,
            CacheType::CPU_FEATURE_CACHE_INSTRUCTION);
  EXPECT_EQ(info.levels[1].cache_size, 32 * KiB);
  EXPECT_EQ(info.levels[1].ways, 8);
  EXPECT_EQ(info.levels[1].line_size, 64);
  EXPECT_EQ(info.levels[1].tlb_entries, 64);
  EXPECT_EQ(info.levels[1].partitioning, 1);

  EXPECT_EQ(info.levels[2].level, 2);
  EXPECT_EQ(info.levels[2].cache_type, CacheType::CPU_FEATURE_CACHE_UNIFIED);
  EXPECT_EQ(info.levels[2].cache_size, 256 * KiB);
  EXPECT_EQ(info.levels[2].ways, 4);
  EXPECT_EQ(info.levels[2].line_size, 64);
  EXPECT_EQ(info.levels[2].tlb_entries, 1024);
  EXPECT_EQ(info.levels[2].partitioning, 1);

  EXPECT_EQ(info.levels[3].level, 3);
  EXPECT_EQ(info.levels[3].cache_type, CacheType::CPU_FEATURE_CACHE_UNIFIED);
  EXPECT_EQ(info.levels[3].cache_size, 6 * MiB);
  EXPECT_EQ(info.levels[3].ways, 12);
  EXPECT_EQ(info.levels[3].line_size, 64);
  EXPECT_EQ(info.levels[3].tlb_entries, 8192);
  EXPECT_EQ(info.levels[3].partitioning, 1);
}

TEST_F(CpuidX86Test, HSWCache) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x00000016, 0x756E6547, 0x6C65746E, 0x49656E69}},
      {{0x00000001, 0}, Leaf{0x000406E3, 0x00100800, 0x7FFAFBBF, 0xBFEBFBFF}},
      {{0x00000004, 0}, Leaf{0x1C004121, 0x01C0003F, 0x0000003F, 0x00000000}},
      {{0x00000004, 1}, Leaf{0x1C004122, 0x01C0003F, 0x0000003F, 0x00000000}},
      {{0x00000004, 2}, Leaf{0x1C004143, 0x01C0003F, 0x000001FF, 0x00000000}},
      {{0x00000004, 3}, Leaf{0x1C03C163, 0x02C0003F, 0x00001FFF, 0x00000006}},
      {{0x00000007, 0}, Leaf{0x00000000, 0x029C67AF, 0x00000000, 0x00000000}},
      {{0x80000000, 0}, Leaf{0x80000008, 0x00000000, 0x00000000, 0x00000000}},
      {{0x80000001, 0}, Leaf{0x00000000, 0x00000000, 0x00000121, 0x2C100000}},
      {{0x80000002, 0}, Leaf{0x65746E49, 0x2952286C, 0x726F4320, 0x4D542865}},
      {{0x80000003, 0}, Leaf{0x37692029, 0x3035362D, 0x43205530, 0x40205550}},
  });
  const auto info = GetX86CacheInfo();
  EXPECT_EQ(info.size, 4);
  EXPECT_EQ(info.levels[0].level, 1);
  EXPECT_EQ(info.levels[0].cache_type, CacheType::CPU_FEATURE_CACHE_DATA);
  EXPECT_EQ(info.levels[0].cache_size, 32 * KiB);
  EXPECT_EQ(info.levels[0].ways, 8);
  EXPECT_EQ(info.levels[0].line_size, 64);
  EXPECT_EQ(info.levels[0].tlb_entries, 64);
  EXPECT_EQ(info.levels[0].partitioning, 1);

  EXPECT_EQ(info.levels[1].level, 1);
  EXPECT_EQ(info.levels[1].cache_type,
            CacheType::CPU_FEATURE_CACHE_INSTRUCTION);
  EXPECT_EQ(info.levels[1].cache_size, 32 * KiB);
  EXPECT_EQ(info.levels[1].ways, 8);
  EXPECT_EQ(info.levels[1].line_size, 64);
  EXPECT_EQ(info.levels[1].tlb_entries, 64);
  EXPECT_EQ(info.levels[1].partitioning, 1);

  EXPECT_EQ(info.levels[2].level, 2);
  EXPECT_EQ(info.levels[2].cache_type, CacheType::CPU_FEATURE_CACHE_UNIFIED);
  EXPECT_EQ(info.levels[2].cache_size, 256 * KiB);
  EXPECT_EQ(info.levels[2].ways, 8);
  EXPECT_EQ(info.levels[2].line_size, 64);
  EXPECT_EQ(info.levels[2].tlb_entries, 512);
  EXPECT_EQ(info.levels[2].partitioning, 1);

  EXPECT_EQ(info.levels[3].level, 3);
  EXPECT_EQ(info.levels[3].cache_type, CacheType::CPU_FEATURE_CACHE_UNIFIED);
  EXPECT_EQ(info.levels[3].cache_size, 6 * MiB);
  EXPECT_EQ(info.levels[3].ways, 12);
  EXPECT_EQ(info.levels[3].line_size, 64);
  EXPECT_EQ(info.levels[3].tlb_entries, 8192);
  EXPECT_EQ(info.levels[3].partitioning, 1);
}

// http://users.atw.hu/instlatx64/AuthenticAMD/AuthenticAMD0200F30_K11_Griffin_CPUID.txt
TEST_F(CpuidX86Test, AMD_K11_GRIFFIN) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x00000001, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x00000001, 0}, Leaf{0x00200F30, 0x00020800, 0x00002001, 0x178BFBFF}},
      {{0x80000000, 0}, Leaf{0x8000001A, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x80000001, 0}, Leaf{0x00200F30, 0x20000000, 0x0000131F, 0xEBD3FBFF}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_AUTHENTIC_AMD);
  EXPECT_EQ(info.family, 0x11);
  EXPECT_EQ(info.model, 0x03);
  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::AMD_K11);
}

// http://users.atw.hu/instlatx64/AuthenticAMD/AuthenticAMD0300F10_K12_Llano_CPUID.txt
TEST_F(CpuidX86Test, AMD_K12_LLANO) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x00000006, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x00000001, 0}, Leaf{0x00300F10, 0x00040800, 0x00802009, 0x178BFBFF}},
      {{0x80000000, 0}, Leaf{0x8000001B, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x80000001, 0}, Leaf{0x00300F10, 0x20002B31, 0x000037FF, 0xEFD3FBFF}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_AUTHENTIC_AMD);
  EXPECT_EQ(info.family, 0x12);
  EXPECT_EQ(info.model, 0x01);
  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::AMD_K12);
}

// http://users.atw.hu/instlatx64/AuthenticAMD/AuthenticAMD0500F01_K14_Bobcat_CPUID.txt
TEST_F(CpuidX86Test, AMD_K14_BOBCAT_AMD0500F01) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x00000006, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x00000001, 0}, Leaf{0x00500F01, 0x00020800, 0x00802209, 0x178BFBFF}},
      {{0x80000000, 0}, Leaf{0x8000001B, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x80000001, 0}, Leaf{0x00500F01, 0x00000000, 0x000035FF, 0x2FD3FBFF}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_AUTHENTIC_AMD);
  EXPECT_EQ(info.family, 0x14);
  EXPECT_EQ(info.model, 0x00);
  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::AMD_BOBCAT);
}

// http://users.atw.hu/instlatx64/AuthenticAMD/AuthenticAMD0500F10_K14_Bobcat_CPUID.txt
TEST_F(CpuidX86Test, AMD_K14_BOBCAT_AMD0500F10) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x00000006, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x00000001, 0}, Leaf{0x00500F10, 0x00020800, 0x00802209, 0x178BFBFF}},
      {{0x00000002, 0}, Leaf{0x00000000, 0x00000000, 0x00000000, 0x00000000}},
      {{0x00000003, 0}, Leaf{0x00000000, 0x00000000, 0x00000000, 0x00000000}},
      {{0x00000005, 0}, Leaf{0x00000040, 0x00000040, 0x00000003, 0x00000000}},
      {{0x00000006, 0}, Leaf{0x00000000, 0x00000000, 0x00000001, 0x00000000}},
      {{0x80000000, 0}, Leaf{0x8000001B, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x80000001, 0}, Leaf{0x00500F10, 0x00001242, 0x000035FF, 0x2FD3FBFF}},
      {{0x80000002, 0}, Leaf{0x20444D41, 0x35332D45, 0x72502030, 0x7365636F}},
      {{0x80000003, 0}, Leaf{0x00726F73, 0x00000000, 0x00000000, 0x00000000}},
      {{0x80000004, 0}, Leaf{0x00000000, 0x00000000, 0x00000000, 0x00000000}},
      {{0x80000005, 0}, Leaf{0xFF08FF08, 0xFF280000, 0x20080140, 0x20020140}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_AUTHENTIC_AMD);
  EXPECT_EQ(info.family, 0x14);
  EXPECT_EQ(info.model, 0x01);
  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::AMD_BOBCAT);
}

// http://users.atw.hu/instlatx64/AuthenticAMD/AuthenticAMD0500F20_K14_Bobcat_CPUID.txt
TEST_F(CpuidX86Test, AMD_K14_BOBCAT_AMD0500F20) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x00000006, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x00000001, 0}, Leaf{0x00500F20, 0x00020800, 0x00802209, 0x178BFBFF}},
      {{0x80000000, 0}, Leaf{0x8000001B, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x80000001, 0}, Leaf{0x00500F20, 0x000012E9, 0x000035FF, 0x2FD3FBFF}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_AUTHENTIC_AMD);
  EXPECT_EQ(info.family, 0x14);
  EXPECT_EQ(info.model, 0x02);
  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::AMD_BOBCAT);
}

// http://users.atw.hu/instlatx64/AuthenticAMD/AuthenticAMD0670F00_K15_StoneyRidge_CPUID.txt
TEST_F(CpuidX86Test, AMD_K15_EXCAVATOR_STONEY_RIDGE) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x0000000D, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x00000001, 0}, Leaf{0x00670F00, 0x00020800, 0x7ED8320B, 0x178BFBFF}},
      {{0x00000007, 0}, Leaf{0x00000000, 0x000001A9, 0x00000000, 0x00000000}},
      {{0x80000000, 0}, Leaf{0x8000001E, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x80000001, 0}, Leaf{0x00670F00, 0x00000000, 0x2FABBFFF, 0x2FD3FBFF}},
      {{0x80000002, 0}, Leaf{0x20444D41, 0x392D3941, 0x20303134, 0x45444152}},
      {{0x80000003, 0}, Leaf{0x52204E4F, 0x35202C35, 0x4D4F4320, 0x45545550}},
      {{0x80000004, 0}, Leaf{0x524F4320, 0x32205345, 0x47332B43, 0x00202020}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_AUTHENTIC_AMD);
  EXPECT_EQ(info.family, 0x15);
  EXPECT_EQ(info.model, 0x70);
  EXPECT_STREQ(info.brand_string,
               "AMD A9-9410 RADEON R5, 5 COMPUTE CORES 2C+3G   ");
  EXPECT_EQ(GetX86Microarchitecture(&info),
            X86Microarchitecture::AMD_EXCAVATOR);
}

// http://users.atw.hu/instlatx64/AuthenticAMD/AuthenticAMD0600F20_K15_AbuDhabi_CPUID0.txt
TEST_F(CpuidX86Test, AMD_K15_PILEDRIVER_ABU_DHABI) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x0000000D, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x00000001, 0}, Leaf{0x00600F20, 0x00100800, 0x3E98320B, 0x178BFBFF}},
      {{0x00000007, 0}, Leaf{0x00000000, 0x00000008, 0x00000000, 0x00000000}},
      {{0x80000000, 0}, Leaf{0x8000001E, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x80000001, 0}, Leaf{0x00600F20, 0x30000000, 0x01EBBFFF, 0x2FD3FBFF}},
      {{0x80000002, 0}, Leaf{0x20444D41, 0x6574704F, 0x286E6F72, 0x20296D74}},
      {{0x80000003, 0}, Leaf{0x636F7250, 0x6F737365, 0x33362072, 0x20203637}},
      {{0x80000004, 0}, Leaf{0x20202020, 0x20202020, 0x20202020, 0x00202020}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_AUTHENTIC_AMD);
  EXPECT_EQ(info.family, 0x15);
  EXPECT_EQ(info.model, 0x02);
  EXPECT_STREQ(info.brand_string,
               "AMD Opteron(tm) Processor 6376                 ");
  EXPECT_EQ(GetX86Microarchitecture(&info),
            X86Microarchitecture::AMD_PILEDRIVER);

  EXPECT_STREQ(info.brand_string, "AMD Opteron(tm) Processor 6376                 ");
}

// http://users.atw.hu/instlatx64/AuthenticAMD/AuthenticAMD0600F20_K15_AbuDhabi_CPUID0.txt
TEST_F(CpuidX86Test, AMD_K15_PILEDRIVER_ABU_DHABI_CACHE_INFO) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x0000000D, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x00000001, 0}, Leaf{0x00600F20, 0x00100800, 0x3E98320B, 0x178BFBFF}},
      {{0x80000000, 0}, Leaf{0x8000001E, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x80000001, 0}, Leaf{0x00600F20, 0x30000000, 0x01EBBFFF, 0x2FD3FBFF}},
      {{0x8000001D, 0}, Leaf{0x00000121, 0x00C0003F, 0x0000003F, 0x00000000}},
      {{0x8000001D, 1}, Leaf{0x00004122, 0x0040003F, 0x000001FF, 0x00000000}},
      {{0x8000001D, 2}, Leaf{0x00004143, 0x03C0003F, 0x000007FF, 0x00000001}},
      {{0x8000001D, 3}, Leaf{0x0001C163, 0x0BC0003F, 0x000007FF, 0x00000001}},
  });
  const auto info = GetX86CacheInfo();

  EXPECT_EQ(info.size, 4);
  EXPECT_EQ(info.levels[0].level, 1);
  EXPECT_EQ(info.levels[0].cache_type, CacheType::CPU_FEATURE_CACHE_DATA);
  EXPECT_EQ(info.levels[0].cache_size, 16 * KiB);
  EXPECT_EQ(info.levels[0].ways, 4);
  EXPECT_EQ(info.levels[0].line_size, 64);
  EXPECT_EQ(info.levels[0].tlb_entries, 64);
  EXPECT_EQ(info.levels[0].partitioning, 1);

  EXPECT_EQ(info.levels[1].level, 1);
  EXPECT_EQ(info.levels[1].cache_type,
            CacheType::CPU_FEATURE_CACHE_INSTRUCTION);
  EXPECT_EQ(info.levels[1].cache_size, 64 * KiB);
  EXPECT_EQ(info.levels[1].ways, 2);
  EXPECT_EQ(info.levels[1].line_size, 64);
  EXPECT_EQ(info.levels[1].tlb_entries, 512);
  EXPECT_EQ(info.levels[1].partitioning, 1);

  EXPECT_EQ(info.levels[2].level, 2);
  EXPECT_EQ(info.levels[2].cache_type, CacheType::CPU_FEATURE_CACHE_UNIFIED);
  EXPECT_EQ(info.levels[2].cache_size, 2 * MiB);
  EXPECT_EQ(info.levels[2].ways, 16);
  EXPECT_EQ(info.levels[2].line_size, 64);
  EXPECT_EQ(info.levels[2].tlb_entries, 2048);
  EXPECT_EQ(info.levels[2].partitioning, 1);

  EXPECT_EQ(info.levels[3].level, 3);
  EXPECT_EQ(info.levels[3].cache_type, CacheType::CPU_FEATURE_CACHE_UNIFIED);
  EXPECT_EQ(info.levels[3].cache_size, 6 * MiB);
  EXPECT_EQ(info.levels[3].ways, 48);
  EXPECT_EQ(info.levels[3].line_size, 64);
  EXPECT_EQ(info.levels[3].tlb_entries, 2048);
  EXPECT_EQ(info.levels[3].partitioning, 1);
}

// https://github.com/InstLatx64/InstLatx64/blob/master/AuthenticAMD/AuthenticAMD0610F01_K15_Piledriver_CPUID.txt
TEST_F(CpuidX86Test, AMD_K15_PILEDRIVER_A10) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x0000000D, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x00000001, 0}, Leaf{0x00610F01, 0x00040800, 0x3E98320B, 0x178BFBFF}},
      {{0x00000007, 0}, Leaf{0x00000000, 0x00000008, 0x00000000, 0x00000000}},
      {{0x80000000, 0}, Leaf{0x8000001E, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x80000001, 0}, Leaf{0x00610F01, 0x20000000, 0x01EBBFFF, 0x2FD3FBFF}},
      {{0x80000002, 0}, Leaf{0x20444D41, 0x2D303141, 0x30303835, 0x5041204B}},
      {{0x80000003, 0}, Leaf{0x69772055, 0x52206874, 0x6F656461, 0x6D74286E}},
      {{0x80000004, 0}, Leaf{0x44482029, 0x61724720, 0x63696870, 0x00202073}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_AUTHENTIC_AMD);
  EXPECT_EQ(info.family, 0x15);
  EXPECT_EQ(info.model, 0x10);
  EXPECT_STREQ(info.brand_string,
               "AMD A10-5800K APU with Radeon(tm) HD Graphics  ");
  EXPECT_EQ(GetX86Microarchitecture(&info),
            X86Microarchitecture::AMD_PILEDRIVER);
}

// http://users.atw.hu/instlatx64/AuthenticAMD/AuthenticAMD0600F12_K15_Interlagos_CPUID3.txt
TEST_F(CpuidX86Test, AMD_K15_BULLDOZER_INTERLAGOS) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x0000000D, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x00000001, 0}, Leaf{0x00600F12, 0x000C0800, 0x1E98220B, 0x178BFBFF}},
      {{0x00000007, 0}, Leaf{0x00000000, 0x00000000, 0x00000000, 0x00000000}},
      {{0x80000000, 0}, Leaf{0x8000001E, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x80000001, 0}, Leaf{0x00600F12, 0x30000000, 0x01C9BFFF, 0x2FD3FBFF}},
      {{0x80000002, 0}, Leaf{0x20444D41, 0x6574704F, 0x286E6F72, 0x20294D54}},
      {{0x80000003, 0}, Leaf{0x636F7250, 0x6F737365, 0x32362072, 0x20203833}},
      {{0x80000004, 0}, Leaf{0x20202020, 0x20202020, 0x20202020, 0x00202020}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_AUTHENTIC_AMD);
  EXPECT_EQ(info.family, 0x15);
  EXPECT_EQ(info.model, 0x01);
  EXPECT_STREQ(info.brand_string,
               "AMD Opteron(TM) Processor 6238                 ");
  EXPECT_EQ(GetX86Microarchitecture(&info),
            X86Microarchitecture::AMD_BULLDOZER);
}

// http://users.atw.hu/instlatx64/AuthenticAMD0630F81_K15_Godavari_CPUID.txt
TEST_F(CpuidX86Test, AMD_K15_STREAMROLLER_GODAVARI) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x0000000D, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x00000001, 0}, Leaf{0x00630F81, 0x00040800, 0x3E98320B, 0x178BFBFF}},
      {{0x00000007, 0}, Leaf{0x00000000, 0x00000000, 0x00000000, 0x00000000}},
      {{0x80000000, 0}, Leaf{0x8000001E, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x80000001, 0}, Leaf{0x00630F81, 0x10000000, 0x0FEBBFFF, 0x2FD3FBFF}},
      {{0x80000002, 0}, Leaf{0x20444D41, 0x372D3841, 0x4B303736, 0x64615220}},
      {{0x80000003, 0}, Leaf{0x206E6F65, 0x202C3752, 0x43203031, 0x75706D6F}},
      {{0x80000004, 0}, Leaf{0x43206574, 0x7365726F, 0x2B433420, 0x00204736}},
      {{0x80000005, 0}, Leaf{0xFF40FF18, 0xFF40FF30, 0x10040140, 0x60030140}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_AUTHENTIC_AMD);
  EXPECT_EQ(info.family, 0x15);
  EXPECT_EQ(info.model, 0x38);
  EXPECT_EQ(info.stepping, 0x01);
  EXPECT_STREQ(info.brand_string,
               "AMD A8-7670K Radeon R7, 10 Compute Cores 4C+6G ");
  EXPECT_EQ(GetX86Microarchitecture(&info),
            X86Microarchitecture::AMD_STREAMROLLER);
}

// http://users.atw.hu/instlatx64/AuthenticAMD/AuthenticAMD0600F12_K15_Zambezi8C_CPUID.txt
TEST_F(CpuidX86Test, AMD_K15_BULLDOZER_ZAMBEZI_ABM) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x0000000D, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x00000001, 0}, Leaf{0x00600F12, 0x00080800, 0x1E98220B, 0x178BFBFF}},
      {{0x00000007, 0}, Leaf{0x00000000, 0x00000000, 0x00000000, 0x00000000}},
      {{0x80000000, 0}, Leaf{0x8000001E, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x80000001, 0}, Leaf{0x00600F12, 0x10000000, 0x01C9BFFF, 0x2FD3FBFF}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_AUTHENTIC_AMD);
  EXPECT_EQ(info.family, 0x15);
  EXPECT_EQ(info.model, 0x01);

  EXPECT_EQ(GetX86Microarchitecture(&info),
            X86Microarchitecture::AMD_BULLDOZER);

  EXPECT_TRUE(info.features.lzcnt);
}

// http://users.atw.hu/instlatx64/AuthenticAMD/AuthenticAMD0700F01_K16_Kabini_CPUID.txt
TEST_F(CpuidX86Test, AMD_K16_JAGUAR_KABINI) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x0000000D, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x00000001, 0}, Leaf{0x00700F01, 0x00040800, 0x3ED8220B, 0x178BFBFF}},
      {{0x00000007, 0}, Leaf{0x00000000, 0x00000008, 0x00000000, 0x00000000}},
      {{0x80000000, 0}, Leaf{0x8000001E, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x80000001, 0}, Leaf{0x00700F01, 0x00000000, 0x154037FF, 0x2FD3FBFF}},
      {{0x80000002, 0}, Leaf{0x20444D41, 0x352D3441, 0x20303030, 0x20555041}},
      {{0x80000003, 0}, Leaf{0x68746977, 0x64615220, 0x286E6F65, 0x20294D54}},
      {{0x80000004, 0}, Leaf{0x47204448, 0x68706172, 0x20736369, 0x00202020}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_AUTHENTIC_AMD);
  EXPECT_EQ(info.family, 0x16);
  EXPECT_EQ(info.model, 0x00);
  EXPECT_STREQ(info.brand_string,
               "AMD A4-5000 APU with Radeon(TM) HD Graphics    ");
  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::AMD_JAGUAR);
}

// http://users.atw.hu/instlatx64/AuthenticAMD/AuthenticAMD0730F01_K16_Beema_CPUID2.txt
TEST_F(CpuidX86Test, AMD_K16_PUMA_BEEMA) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x0000000D, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x00000001, 0}, Leaf{0x00730F01, 0x00040800, 0x7ED8220B, 0x178BFBFF}},
      {{0x00000007, 0}, Leaf{0x00000000, 0x00000008, 0x00000000, 0x00000000}},
      {{0x80000000, 0}, Leaf{0x8000001E, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x80000001, 0}, Leaf{0x00730F01, 0x00000000, 0x1D4037FF, 0x2FD3FBFF}},
      {{0x80000002, 0}, Leaf{0x20444D41, 0x362D3641, 0x20303133, 0x20555041}},
      {{0x80000003, 0}, Leaf{0x68746977, 0x444D4120, 0x64615220, 0x206E6F65}},
      {{0x80000004, 0}, Leaf{0x47203452, 0x68706172, 0x20736369, 0x00202020}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_AUTHENTIC_AMD);
  EXPECT_EQ(info.family, 0x16);
  EXPECT_EQ(info.model, 0x30);
  EXPECT_STREQ(info.brand_string,
               "AMD A6-6310 APU with AMD Radeon R4 Graphics    ");
  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::AMD_PUMA);
}

// https://github.com/InstLatx64/InstLatx64/blob/master/AuthenticAMD/AuthenticAMD0720F61_K16_Cato_CPUID.txt
TEST_F(CpuidX86Test, AMD_K16_CATO) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x0000000D, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x00000001, 0}, Leaf{0x00720F61, 0x00080800, 0x3ED8220B, 0x178BFBFF}},
      {{0x00000007, 0}, Leaf{0x00000000, 0x00000008, 0x00000000, 0x00000000}},
      {{0x80000000, 0}, Leaf{0x8000001E, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x80000001, 0}, Leaf{0x00720F61, 0x00000000, 0x154837FF, 0x2FD3FBFF}},
      {{0x80000002, 0}, Leaf{0x20444D41, 0x392D3941, 0x20303238, 0x636F7250}},
      {{0x80000003, 0}, Leaf{0x6F737365, 0x00000072, 0x00000000, 0x00000000}},
      {{0x80000004, 0}, Leaf{0x00000000, 0x00000000, 0x00000000, 0x00000000}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_AUTHENTIC_AMD);
  EXPECT_EQ(info.family, 0x16);
  EXPECT_EQ(info.model, 0x26);
  EXPECT_STREQ(info.brand_string,
               "AMD A9-9820 Processor");
  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::AMD_JAGUAR);
}

// http://users.atw.hu/instlatx64/AuthenticAMD/AuthenticAMD0820F01_K17_Dali_CPUID.txt
TEST_F(CpuidX86Test, AMD_K17_ZEN_DALI) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x0000000D, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x00000001, 0}, Leaf{0x00820F01, 0x00020800, 0x7ED8320B, 0x178BFBFF}},
      {{0x00000007, 0}, Leaf{0x00000000, 0x209C01A9, 0x00000000, 0x00000000}},
      {{0x80000000, 0}, Leaf{0x8000001F, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x80000001, 0}, Leaf{0x00820F01, 0x00000000, 0x35C233FF, 0x2FD3FBFF}},
      {{0x80000002, 0}, Leaf{0x20444D41, 0x30323033, 0x69772065, 0x52206874}},
      {{0x80000003, 0}, Leaf{0x6F656461, 0x7247206E, 0x69687061, 0x20207363}},
      {{0x80000004, 0}, Leaf{0x20202020, 0x20202020, 0x20202020, 0x00202020}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_AUTHENTIC_AMD);
  EXPECT_EQ(info.family, 0x17);
  EXPECT_EQ(info.model, 0x20);
  EXPECT_STREQ(info.brand_string,
               "AMD 3020e with Radeon Graphics                 ");
  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::AMD_ZEN);
}

// http://users.atw.hu/instlatx64/AuthenticAMD/AuthenticAMD0800F82_K17_ZenP_CPUID.txt
TEST_F(CpuidX86Test, AMD_K17_ZEN_PLUS_PINNACLE_RIDGE) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x0000000D, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x00000001, 0}, Leaf{0x00800F82, 0x00100800, 0x7ED8320B, 0x178BFBFF}},
      {{0x00000007, 0}, Leaf{0x00000000, 0x209C01A9, 0x00000000, 0x00000000}},
      {{0x80000000, 0}, Leaf{0x8000001F, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x80000001, 0}, Leaf{0x00800F82, 0x20000000, 0x35C233FF, 0x2FD3FBFF}},
      {{0x80000002, 0}, Leaf{0x20444D41, 0x657A7952, 0x2037206E, 0x30303732}},
      {{0x80000003, 0}, Leaf{0x69452058, 0x2D746867, 0x65726F43, 0x6F725020}},
      {{0x80000004, 0}, Leaf{0x73736563, 0x2020726F, 0x20202020, 0x00202020}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_AUTHENTIC_AMD);
  EXPECT_EQ(info.family, 0x17);
  EXPECT_EQ(info.model, 0x08);
  EXPECT_STREQ(info.brand_string,
               "AMD Ryzen 7 2700X Eight-Core Processor         ");
  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::AMD_ZEN_PLUS);
}

// http://users.atw.hu/instlatx64/AuthenticAMD/AuthenticAMD0840F70_K17_CPUID.txt
TEST_F(CpuidX86Test, AMD_K17_ZEN2_XBOX_SERIES_X) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x00000010, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x00000001, 0}, Leaf{0x00840F70, 0x00100800, 0x7ED8320B, 0x178BFBFF}},
      {{0x00000007, 0}, Leaf{0x00000000, 0x219C91A9, 0x00400004, 0x00000000}},
      {{0x80000000, 0}, Leaf{0x80000020, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x80000001, 0}, Leaf{0x00840F70, 0x00000000, 0xF5C2B7FF, 0x2FD3FBFF}},
      {{0x80000002, 0}, Leaf{0x20444D41, 0x30303734, 0x2D382053, 0x65726F43}},
      {{0x80000003, 0}, Leaf{0x6F725020, 0x73736563, 0x4420726F, 0x746B7365}},
      {{0x80000004, 0}, Leaf{0x4B20706F, 0x00007469, 0x00000000, 0x00000000}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_AUTHENTIC_AMD);
  EXPECT_EQ(info.family, 0x17);
  EXPECT_EQ(info.model, 0x47);
  EXPECT_STREQ(info.brand_string, "AMD 4700S 8-Core Processor Desktop Kit");
  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::AMD_ZEN2);
}

// http://users.atw.hu/instlatx64/HygonGenuine/HygonGenuine0900F02_Hygon_CPUID3.txt
TEST_F(CpuidX86Test, AMD_K18_ZEN_DHYANA) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x0000000D, 0x6F677948, 0x656E6975, 0x6E65476E}},
      {{0x00000001, 0}, Leaf{0x00900F02, 0x00100800, 0x74D83209, 0x178BFBFF}},
      {{0x00000007, 0}, Leaf{0x00000000, 0x009C01A9, 0x0040068C, 0x00000000}},
      {{0x80000000, 0}, Leaf{0x8000001F, 0x6F677948, 0x656E6975, 0x6E65476E}},
      {{0x80000001, 0}, Leaf{0x00900F02, 0x60000000, 0x35C233FF, 0x2FD3FBFF}},
      {{0x80000002, 0}, Leaf{0x6F677948, 0x3843206E, 0x31332036, 0x20203538}},
      {{0x80000003, 0}, Leaf{0x6F632D38, 0x50206572, 0x65636F72, 0x726F7373}},
      {{0x80000004, 0}, Leaf{0x20202020, 0x20202020, 0x20202020, 0x00202020}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_HYGON_GENUINE);
  EXPECT_EQ(info.family, 0x18);
  EXPECT_EQ(info.model, 0x00);
  EXPECT_STREQ(info.brand_string,
               "Hygon C86 3185  8-core Processor               ");
  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::AMD_ZEN);
}

// http://users.atw.hu/instlatx64/HygonGenuine/HygonGenuine0900F02_Hygon_CPUID.txt
TEST_F(CpuidX86Test, AMD_K18_ZEN_DHYANA_CACHE_INFO) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x0000000D, 0x6F677948, 0x656E6975, 0x6E65476E}},
      {{0x00000001, 0}, Leaf{0x00900F02, 0x00100800, 0x74D83209, 0x178BFBFF}},
      {{0x80000000, 0}, Leaf{0x8000001F, 0x6F677948, 0x656E6975, 0x6E65476E}},
      {{0x80000001, 0}, Leaf{0x00900F02, 0x60000000, 0x35C233FF, 0x2FD3FBFF}},
      {{0x8000001D, 0}, Leaf{0x00004121, 0x01C0003F, 0x0000003F, 0x00000000}},
      {{0x8000001D, 1}, Leaf{0x00004122, 0x00C0003F, 0x000000FF, 0x00000000}},
      {{0x8000001D, 2}, Leaf{0x00004143, 0x01C0003F, 0x000003FF, 0x00000002}},
      {{0x8000001D, 3}, Leaf{0x0001C163, 0x03C0003F, 0x00001FFF, 0x00000001}},
  });
  const auto info = GetX86CacheInfo();

  EXPECT_EQ(info.size, 4);
  EXPECT_EQ(info.levels[0].level, 1);
  EXPECT_EQ(info.levels[0].cache_type, CacheType::CPU_FEATURE_CACHE_DATA);
  EXPECT_EQ(info.levels[0].cache_size, 32 * KiB);
  EXPECT_EQ(info.levels[0].ways, 8);
  EXPECT_EQ(info.levels[0].line_size, 64);
  EXPECT_EQ(info.levels[0].tlb_entries, 64);
  EXPECT_EQ(info.levels[0].partitioning, 1);

  EXPECT_EQ(info.levels[1].level, 1);
  EXPECT_EQ(info.levels[1].cache_type,
            CacheType::CPU_FEATURE_CACHE_INSTRUCTION);
  EXPECT_EQ(info.levels[1].cache_size, 64 * KiB);
  EXPECT_EQ(info.levels[1].ways, 4);
  EXPECT_EQ(info.levels[1].line_size, 64);
  EXPECT_EQ(info.levels[1].tlb_entries, 256);
  EXPECT_EQ(info.levels[1].partitioning, 1);

  EXPECT_EQ(info.levels[2].level, 2);
  EXPECT_EQ(info.levels[2].cache_type, CacheType::CPU_FEATURE_CACHE_UNIFIED);
  EXPECT_EQ(info.levels[2].cache_size, 512 * KiB);
  EXPECT_EQ(info.levels[2].ways, 8);
  EXPECT_EQ(info.levels[2].line_size, 64);
  EXPECT_EQ(info.levels[2].tlb_entries, 1024);
  EXPECT_EQ(info.levels[2].partitioning, 1);

  EXPECT_EQ(info.levels[3].level, 3);
  EXPECT_EQ(info.levels[3].cache_type, CacheType::CPU_FEATURE_CACHE_UNIFIED);
  EXPECT_EQ(info.levels[3].cache_size, 8 * MiB);
  EXPECT_EQ(info.levels[3].ways, 16);
  EXPECT_EQ(info.levels[3].line_size, 64);
  EXPECT_EQ(info.levels[3].tlb_entries, 8192);
  EXPECT_EQ(info.levels[3].partitioning, 1);
}

// http://users.atw.hu/instlatx64/AuthenticAMD/AuthenticAMD0A20F10_K19_Vermeer2_CPUID.txt
TEST_F(CpuidX86Test, AMD_K19_ZEN3_VERMEER) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x00000010, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x00000001, 0}, Leaf{0x00A20F10, 0x01180800, 0x7ED8320B, 0x178BFBFF}},
      {{0x00000007, 0}, Leaf{0x00000000, 0x219C97A9, 0x0040068C, 0x00000000}},
      {{0x80000000, 0}, Leaf{0x80000023, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x80000001, 0}, Leaf{0x00A20F10, 0x20000000, 0x75C237FF, 0x2FD3FBFF}},
      {{0x80000002, 0}, Leaf{0x20444D41, 0x657A7952, 0x2039206E, 0x30303935}},
      {{0x80000003, 0}, Leaf{0x32312058, 0x726F432D, 0x72502065, 0x7365636F}},
      {{0x80000004, 0}, Leaf{0x20726F73, 0x20202020, 0x20202020, 0x00202020}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_AUTHENTIC_AMD);
  EXPECT_EQ(info.family, 0x19);
  EXPECT_EQ(info.model, 0x21);
  EXPECT_STREQ(info.brand_string,
               "AMD Ryzen 9 5900X 12-Core Processor            ");
  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::AMD_ZEN3);
}

// http://users.atw.hu/instlatx64/AuthenticAMD/AuthenticAMD0A40F41_K19_Rembrandt_03_CPUID.txt
TEST_F(CpuidX86Test, AMD_K19_ZEN3) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x00000010, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x00000001, 0}, Leaf{0x00A40F41, 0x00100800, 0x7EF8320B, 0x178BFBFF}},
      {{0x80000000, 0}, Leaf{0x80000023, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x80000001, 0}, Leaf{0x00A40F41, 0x50000000, 0x75C237FF, 0x2FD3FBFF}},
      {{0x80000002, 0}, Leaf{0x20444D41, 0x657A7952, 0x2039206E, 0x30303936}},
      {{0x80000003, 0}, Leaf{0x77205848, 0x20687469, 0x65646152, 0x47206E6F}},
      {{0x80000004, 0}, Leaf{0x68706172, 0x20736369, 0x20202020, 0x00202020}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_AUTHENTIC_AMD);
  EXPECT_EQ(info.family, 0x19);
  EXPECT_EQ(info.model, 0x44);
  EXPECT_STREQ(info.brand_string,
               "AMD Ryzen 9 6900HX with Radeon Graphics        ");
  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::AMD_ZEN3);
}

// http://users.atw.hu/instlatx64/AuthenticAMD/AuthenticAMD0A60F12_K19_Raphael_01_CPUID.txt
TEST_F(CpuidX86Test, AMD_K19_ZEN4_RAPHAEL) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x00000010, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x00000001, 0}, Leaf{0x00A60F12, 0x000C0800, 0x7EF8320B, 0x178BFBFF}},
      {{0x80000000, 0}, Leaf{0x80000028, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x80000001, 0}, Leaf{0x00A60F12, 0x00000000, 0x75C237FF, 0x2FD3FBFF}},
      {{0x80000002, 0}, Leaf{0x20444D41, 0x657A7952, 0x2035206E, 0x30303637}},
      {{0x80000003, 0}, Leaf{0x2D362058, 0x65726F43, 0x6F725020, 0x73736563}},
      {{0x80000004, 0}, Leaf{0x2020726F, 0x20202020, 0x20202020, 0x00202020}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_AUTHENTIC_AMD);
  EXPECT_EQ(info.family, 0x19);
  EXPECT_EQ(info.model, 0x61);
  EXPECT_STREQ(info.brand_string,
               "AMD Ryzen 5 7600X 6-Core Processor             ");
  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::AMD_ZEN4);
}

// http://users.atw.hu/instlatx64/HygonGenuine/HygonGenuine0900F11_Hygon_01_CPUID.txt
TEST_F(CpuidX86Test, AMD_K18_ZEN_DHYANA_OCTAL_CORE_C86_3250) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x0000000D, 0x6F677948, 0x656E6975, 0x6E65476E}},
      {{0x00000001, 0}, Leaf{0x00900F11, 0x00100800, 0x76D8320B, 0x178BFBFF}},
      {{0x80000000, 0}, Leaf{0x8000001F, 0x6F677948, 0x656E6975, 0x6E65476E}},
      {{0x80000001, 0}, Leaf{0x00900F11, 0x60000000, 0x35C233FF, 0x2FD3FBFF}},
      {{0x80000002, 0}, Leaf{0x6F677948, 0x3843206E, 0x32332036, 0x20203035}},
      {{0x80000003, 0}, Leaf{0x6F632D38, 0x50206572, 0x65636F72, 0x726F7373}},
      {{0x80000004, 0}, Leaf{0x20202020, 0x20202020, 0x20202020, 0x00202020}},
  });
  const auto info = GetX86Info();

  EXPECT_EQ(info.model, 0x01);
  EXPECT_EQ(info.family, 0x18);
  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_HYGON_GENUINE);
  EXPECT_STREQ(info.brand_string,
               "Hygon C86 3250  8-core Processor               ");
  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::AMD_ZEN);
}

// http://users.atw.hu/instlatx64/AuthenticAMD/AuthenticAMD08A0F00_K17_Mendocino_01_CPUID.txt
TEST_F(CpuidX86Test, AMD_ZEN2_MENDOCINO) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x00000010, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x00000001, 0}, Leaf{0x008A0F00, 0x00080800, 0x7EF8320B, 0x178BFBFF}},
  });
  const auto info = GetX86Info();

  EXPECT_EQ(info.model, 0xA0);
  EXPECT_EQ(info.family, 0x17);
  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_AUTHENTIC_AMD);
  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::AMD_ZEN2);
}

// http://users.atw.hu/instlatx64/GenuineIntel/GenuineIntel00906A4_AlderLakeP_00_CPUID.txt
TEST_F(CpuidX86Test, INTEL_ALDER_LAKE_AVX_VNNI) {
  cpu().SetOsBackupsExtendedRegisters(true);
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x00000020, 0x756E6547, 0x6C65746E, 0x49656E69}},
      {{0x00000001, 0}, Leaf{0x000906A4, 0x00400800, 0x7FFAFBBF, 0xBFEBFBFF}},
      {{0x00000007, 0}, Leaf{0x00000001, 0x239CA7EB, 0x984007AC, 0xFC18C410}},
      {{0x00000007, 1}, Leaf{0x00400810, 0x00000000, 0x00000000, 0x00000000}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_GENUINE_INTEL);
  EXPECT_EQ(info.family, 0x06);
  EXPECT_EQ(info.model, 0x9A);
  EXPECT_TRUE(info.features.avx_vnni);
  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::INTEL_ADL);
}

// https://github.com/InstLatx64/InstLatx64/blob/master/GenuineIntel/GenuineIntel0090672_AlderLake_BC_AVX512_CPUID01.txt
TEST_F(CpuidX86Test, INTEL_ALDER_LAKE_AVX512) {
  cpu().SetOsBackupsExtendedRegisters(true);
#if defined(CPU_FEATURES_OS_MACOS)
  cpu().SetDarwinSysCtlByName("hw.optional.avx512f");
#endif
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x00000020, 0x756E6547, 0x6C65746E, 0x49656E69}},
      {{0x00000001, 0}, Leaf{0x000906A4, 0x00400800, 0x7FFAFBBF, 0xBFEBFBFF}},
      {{0x00000007, 0}, Leaf{0x00000001, 0xF3BFA7EB, 0x98C07FEE, 0xFC9CC510}},
      {{0x00000007, 1}, Leaf{0x00401C30, 0x00000000, 0x00000000, 0x00000000}},
  });

  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_GENUINE_INTEL);
  EXPECT_EQ(info.family, 0x06);
  EXPECT_EQ(info.model, 0x9A);
  EXPECT_TRUE(info.features.avx512f);
  EXPECT_TRUE(info.features.avx512bw);
  EXPECT_TRUE(info.features.avx512dq);
  EXPECT_TRUE(info.features.avx512cd);
  EXPECT_TRUE(info.features.avx512vl);
  EXPECT_TRUE(info.features.avx512_vp2intersect);
  EXPECT_TRUE(info.features.avx512vbmi);
  EXPECT_TRUE(info.features.avx512vbmi2);
  EXPECT_TRUE(info.features.avx512bitalg);
  EXPECT_TRUE(info.features.avx512vpopcntdq);
  EXPECT_TRUE(info.features.avx512ifma);
  EXPECT_TRUE(info.features.avx512_bf16);
  EXPECT_TRUE(info.features.avx512_fp16);

  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::INTEL_ADL);
}

// https://github.com/InstLatx64/InstLatx64/blob/master/GenuineIntel/GenuineIntel00806C1_TigerLake_CPUID3.txt
TEST_F(CpuidX86Test, INTEL_TIGER_LAKE_AVX512) {
  cpu().SetOsBackupsExtendedRegisters(true);
#if defined(CPU_FEATURES_OS_MACOS)
  cpu().SetDarwinSysCtlByName("hw.optional.avx512f");
#endif
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x0000001B, 0x756E6547, 0x6C65746E, 0x49656E69}},
      {{0x00000001, 0}, Leaf{0x000806C1, 0x00100800, 0x7FFAFBBF, 0xBFEBFBFF}},
      {{0x00000007, 0}, Leaf{0x00000000, 0xF3BFA7EB, 0x18C05FCE, 0xFC100510}},
  });

  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_GENUINE_INTEL);
  EXPECT_EQ(info.family, 0x06);
  EXPECT_EQ(info.model, 0x8C);
  EXPECT_TRUE(info.features.avx512f);
  EXPECT_TRUE(info.features.avx512bw);
  EXPECT_TRUE(info.features.avx512dq);
  EXPECT_TRUE(info.features.avx512cd);
  EXPECT_TRUE(info.features.avx512vl);
  EXPECT_TRUE(info.features.avx512_vp2intersect);
  EXPECT_TRUE(info.features.avx512vbmi);
  EXPECT_TRUE(info.features.avx512vbmi2);
  EXPECT_TRUE(info.features.avx512bitalg);
  EXPECT_TRUE(info.features.avx512vpopcntdq);
  EXPECT_TRUE(info.features.avx512ifma);

  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::INTEL_TGL);
}

// http://users.atw.hu/instlatx64/GenuineIntel/GenuineIntel00706E5_IceLakeY_CPUID.txt
TEST_F(CpuidX86Test, INTEL_ICE_LAKE_GFNI) {
    cpu().SetLeaves({
        {{0x00000000, 0}, Leaf{0x0000001B, 0x756E6547, 0x6C65746E, 0x49656E69}},
        {{0x00000001, 0}, Leaf{0x000706E5, 0x00100800, 0x7FFAFBBF, 0xBFEBFBFF}},
        {{0x00000007, 0}, Leaf{0x00000000, 0xF2BF27EF, 0x40405F4E, 0xBC000410}},
    });

    const auto info = GetX86Info();

    EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_GENUINE_INTEL);
    EXPECT_EQ(info.family, 0x06);
    EXPECT_EQ(info.model, 0x7E);
    EXPECT_TRUE(info.features.gfni);

    EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::INTEL_ICL);
}

// http://users.atw.hu/instlatx64/GenuineIntel/GenuineIntel00906C0_JasperLake_CPUID01.txt
TEST_F(CpuidX86Test, INTEL_TREMONT_JASPER_LAKE_MOVDR) {
    cpu().SetLeaves({
        {{0x00000000, 0}, Leaf{0x0000001B, 0x756E6547, 0x6C65746E, 0x49656E69}},
        {{0x00000001, 0}, Leaf{0x00090661, 0x00800800, 0x4FF8EBBF, 0xBFEBFBFF}},
        {{0x00000007, 0}, Leaf{0x00000000, 0x2394A2C3, 0x18400124, 0xFC000400}},
    });

    const auto info = GetX86Info();

    EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_GENUINE_INTEL);
    EXPECT_EQ(info.family, 0x06);
    EXPECT_EQ(info.model, 0x96);
    EXPECT_TRUE(info.features.movdiri);
    EXPECT_TRUE(info.features.movdir64b);

    EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::INTEL_ATOM_TMT);
}

// http://users.atw.hu/instlatx64/GenuineIntel/GenuineIntel0090672_AlderLake_LC_BC_CPUID01.txt
TEST_F(CpuidX86Test, INTEL_ALDER_LAKE_REP) {
    cpu().SetLeaves({
        {{0x00000000, 0}, Leaf{0x00000020, 0x756E6547, 0x6C65746E, 0x49656E69}},
        {{0x00000001, 0}, Leaf{0x00090672, 0x00800800, 0x7FFAFBFF, 0xBFEBFBFF}},
        {{0x00000007, 0}, Leaf{0x00000001, 0x239CA7EB, 0x98C027AC, 0xFC1CC410}},
        {{0x00000007, 1}, Leaf{0x00400810, 0x00000000, 0x00000000, 0x00000000}},
    });

    const auto info = GetX86Info();

    EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_GENUINE_INTEL);
    EXPECT_EQ(info.family, 0x06);
    EXPECT_EQ(info.model, 0x97);
    EXPECT_TRUE(info.features.erms);
    EXPECT_TRUE(info.features.fs_rep_mov);
    EXPECT_FALSE(info.features.fz_rep_movsb);
    EXPECT_TRUE(info.features.fs_rep_stosb);
    EXPECT_FALSE(info.features.fs_rep_cmpsb_scasb);

    EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::INTEL_ADL);
}

// http://users.atw.hu/instlatx64/AuthenticAMD/AuthenticAMD0100FA0_K10_Thuban_CPUID.txt
TEST_F(CpuidX86Test, AMD_THUBAN_CACHE_INFO) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x00000006, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x80000000, 0}, Leaf{0x8000001B, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x80000001, 0}, Leaf{0x00100FA0, 0x10000050, 0x000037FF, 0xEFD3FBFF}},
      {{0x80000005, 0}, Leaf{0xFF30FF10, 0xFF30FF20, 0x40020140, 0x40020140}},
      {{0x80000006, 0}, Leaf{0x20800000, 0x42004200, 0x02008140, 0x0030B140}},
  });
  const auto info = GetX86CacheInfo();

  EXPECT_EQ(info.size, 4);
  EXPECT_EQ(info.levels[0].level, 1);
  EXPECT_EQ(info.levels[0].cache_type, CacheType::CPU_FEATURE_CACHE_DATA);
  EXPECT_EQ(info.levels[0].cache_size, 64 * KiB);
  EXPECT_EQ(info.levels[0].ways, 2);
  EXPECT_EQ(info.levels[0].line_size, 64);

  EXPECT_EQ(info.levels[1].level, 1);
  EXPECT_EQ(info.levels[1].cache_type,
            CacheType::CPU_FEATURE_CACHE_INSTRUCTION);
  EXPECT_EQ(info.levels[1].cache_size, 64 * KiB);
  EXPECT_EQ(info.levels[1].ways, 2);
  EXPECT_EQ(info.levels[1].line_size, 64);

  EXPECT_EQ(info.levels[2].level, 2);
  EXPECT_EQ(info.levels[2].cache_type, CacheType::CPU_FEATURE_CACHE_UNIFIED);
  EXPECT_EQ(info.levels[2].cache_size, 512 * KiB);
  EXPECT_EQ(info.levels[2].ways, 16);
  EXPECT_EQ(info.levels[2].line_size, 64);

  EXPECT_EQ(info.levels[3].level, 3);
  EXPECT_EQ(info.levels[3].cache_type, CacheType::CPU_FEATURE_CACHE_UNIFIED);
  EXPECT_EQ(info.levels[3].cache_size, 6 * MiB);
  EXPECT_EQ(info.levels[3].ways, 48);
  EXPECT_EQ(info.levels[3].line_size, 64);
}

// http://users.atw.hu/instlatx64/AuthenticAMD/AuthenticAMD0020FB1_K8_Manchester_CPUID.txt
TEST_F(CpuidX86Test, AMD_MANCHESTER_CACHE_INFO) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x00000001, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x80000000, 0}, Leaf{0x80000018, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x80000001, 0}, Leaf{0x00020FB1, 0x00000150, 0x00000003, 0xE3D3FBFF}},
      {{0x80000005, 0}, Leaf{0xFF08FF08, 0xFF20FF20, 0x40020140, 0x40020140}},
      {{0x80000006, 0}, Leaf{0x00000000, 0x42004200, 0x02008140, 0x00000000}},
  });
  const auto info = GetX86CacheInfo();

  EXPECT_EQ(info.size, 3);
  EXPECT_EQ(info.levels[0].level, 1);
  EXPECT_EQ(info.levels[0].cache_type, CacheType::CPU_FEATURE_CACHE_DATA);
  EXPECT_EQ(info.levels[0].cache_size, 64 * KiB);
  EXPECT_EQ(info.levels[0].ways, 2);
  EXPECT_EQ(info.levels[0].line_size, 64);

  EXPECT_EQ(info.levels[1].level, 1);
  EXPECT_EQ(info.levels[1].cache_type,
            CacheType::CPU_FEATURE_CACHE_INSTRUCTION);
  EXPECT_EQ(info.levels[1].cache_size, 64 * KiB);
  EXPECT_EQ(info.levels[1].ways, 2);
  EXPECT_EQ(info.levels[1].line_size, 64);

  EXPECT_EQ(info.levels[2].level, 2);
  EXPECT_EQ(info.levels[2].cache_type, CacheType::CPU_FEATURE_CACHE_UNIFIED);
  EXPECT_EQ(info.levels[2].cache_size, 512 * KiB);
  EXPECT_EQ(info.levels[2].ways, 16);
  EXPECT_EQ(info.levels[2].line_size, 64);
}

// http://users.atw.hu/instlatx64/AuthenticAMD/AuthenticAMD0100F22_K10_Agena_CPUID.txt
TEST_F(CpuidX86Test, AMD_AGENA_CACHE_INFO) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x00000005, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x80000000, 0}, Leaf{0x8000001A, 0x68747541, 0x444D4163, 0x69746E65}},
      {{0x80000001, 0}, Leaf{0x00100F22, 0x10000000, 0x000007FF, 0xEFD3FBFF}},
      {{0x80000005, 0}, Leaf{0xFF30FF10, 0xFF30FF20, 0x40020140, 0x40020140}},
      {{0x80000006, 0}, Leaf{0x20800000, 0x42004200, 0x02008140, 0x0010A140}},
  });
  const auto info = GetX86CacheInfo();

  EXPECT_EQ(info.size, 4);
  EXPECT_EQ(info.levels[0].level, 1);
  EXPECT_EQ(info.levels[0].cache_type, CacheType::CPU_FEATURE_CACHE_DATA);
  EXPECT_EQ(info.levels[0].cache_size, 64 * KiB);
  EXPECT_EQ(info.levels[0].ways, 2);
  EXPECT_EQ(info.levels[0].line_size, 64);

  EXPECT_EQ(info.levels[1].level, 1);
  EXPECT_EQ(info.levels[1].cache_type,
            CacheType::CPU_FEATURE_CACHE_INSTRUCTION);
  EXPECT_EQ(info.levels[1].cache_size, 64 * KiB);
  EXPECT_EQ(info.levels[1].ways, 2);
  EXPECT_EQ(info.levels[1].line_size, 64);

  EXPECT_EQ(info.levels[2].level, 2);
  EXPECT_EQ(info.levels[2].cache_type, CacheType::CPU_FEATURE_CACHE_UNIFIED);
  EXPECT_EQ(info.levels[2].cache_size, 512 * KiB);
  EXPECT_EQ(info.levels[2].ways, 16);
  EXPECT_EQ(info.levels[2].line_size, 64);

  EXPECT_EQ(info.levels[3].level, 3);
  EXPECT_EQ(info.levels[3].cache_type, CacheType::CPU_FEATURE_CACHE_UNIFIED);
  EXPECT_EQ(info.levels[3].cache_size, 2 * MiB);
  EXPECT_EQ(info.levels[3].ways, 32);
  EXPECT_EQ(info.levels[3].line_size, 64);
}

// https://github.com/InstLatx64/InstLatx64/blob/master/GenuineIntel/GenuineIntel00106A1_Nehalem_CPUID.txt
TEST_F(CpuidX86Test, Nehalem) {
  // Pre AVX cpus don't have xsave
  cpu().SetOsBackupsExtendedRegisters(false);
#if defined(CPU_FEATURES_OS_WINDOWS)
  cpu().SetWindowsIsProcessorFeaturePresent(PF_XMMI_INSTRUCTIONS_AVAILABLE);
  cpu().SetWindowsIsProcessorFeaturePresent(PF_XMMI64_INSTRUCTIONS_AVAILABLE);
  cpu().SetWindowsIsProcessorFeaturePresent(PF_SSE3_INSTRUCTIONS_AVAILABLE);
  cpu().SetWindowsIsProcessorFeaturePresent(PF_SSSE3_INSTRUCTIONS_AVAILABLE);
  cpu().SetWindowsIsProcessorFeaturePresent(PF_SSE4_1_INSTRUCTIONS_AVAILABLE);
  cpu().SetWindowsIsProcessorFeaturePresent(PF_SSE4_2_INSTRUCTIONS_AVAILABLE);
#elif defined(CPU_FEATURES_OS_MACOS)
  cpu().SetDarwinSysCtlByName("hw.optional.sse");
  cpu().SetDarwinSysCtlByName("hw.optional.sse2");
  cpu().SetDarwinSysCtlByName("hw.optional.sse3");
  cpu().SetDarwinSysCtlByName("hw.optional.supplementalsse3");
  cpu().SetDarwinSysCtlByName("hw.optional.sse4_1");
  cpu().SetDarwinSysCtlByName("hw.optional.sse4_2");
#elif defined(CPU_FEATURES_OS_FREEBSD)
  auto& fs = GetEmptyFilesystem();
  fs.CreateFile("/var/run/dmesg.boot", R"(
  ---<<BOOT>>---
Copyright (c) 1992-2020 The FreeBSD Project.
FreeBSD is a registered trademark of The FreeBSD Foundation.
  Features=0x1783fbff<FPU,VME,DE,PSE,TSC,MSR,PAE,MCE,CX8,APIC,SEP,MTRR,PGE,MCA,CMOV,PAT,PSE36,MMX,FXSR,SSE,SSE2,HTT>
  Features2=0x5eda2203<SSE3,PCLMULQDQ,SSSE3,CX16,PCID,SSE4.1,SSE4.2,MOVBE,POPCNT,AESNI,XSAVE,OSXSAVE,RDRAND>
real memory  = 2147418112 (2047 MB)
)");
#elif defined(CPU_FEATURES_OS_LINUX) || defined(CPU_FEATURES_OS_ANDROID)
  auto& fs = GetEmptyFilesystem();
  fs.CreateFile("/proc/cpuinfo", R"(processor       :
flags           : fpu mmx sse sse2 pni ssse3 sse4_1 sse4_2
)");
#endif
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x0000000B, 0x756E6547, 0x6C65746E, 0x49656E69}},
      {{0x00000001, 0}, Leaf{0x000106A2, 0x00100800, 0x00BCE3BD, 0xBFEBFBFF}},
      {{0x00000002, 0}, Leaf{0x55035A01, 0x00F0B0E3, 0x00000000, 0x09CA212C}},
      {{0x00000003, 0}, Leaf{0x00000000, 0x00000000, 0x00000000, 0x00000000}},
      {{0x00000004, 0}, Leaf{0x1C004121, 0x01C0003F, 0x0000003F, 0x00000000}},
      {{0x00000004, 0}, Leaf{0x1C004122, 0x00C0003F, 0x0000007F, 0x00000000}},
      {{0x00000004, 0}, Leaf{0x1C004143, 0x01C0003F, 0x000001FF, 0x00000000}},
      {{0x00000004, 0}, Leaf{0x1C03C163, 0x03C0003F, 0x00000FFF, 0x00000002}},
      {{0x00000005, 0}, Leaf{0x00000040, 0x00000040, 0x00000003, 0x00021120}},
      {{0x00000006, 0}, Leaf{0x00000001, 0x00000002, 0x00000001, 0x00000000}},
      {{0x00000007, 0}, Leaf{0x00000000, 0x00000000, 0x00000000, 0x00000000}},
      {{0x00000008, 0}, Leaf{0x00000000, 0x00000000, 0x00000000, 0x00000000}},
      {{0x00000009, 0}, Leaf{0x00000000, 0x00000000, 0x00000000, 0x00000000}},
      {{0x0000000A, 0}, Leaf{0x07300403, 0x00000000, 0x00000000, 0x00000603}},
      {{0x0000000B, 0}, Leaf{0x00000001, 0x00000001, 0x00000100, 0x00000000}},
      {{0x0000000B, 0}, Leaf{0x00000004, 0x00000002, 0x00000201, 0x00000000}},
      {{0x80000000, 0}, Leaf{0x80000008, 0x00000000, 0x00000000, 0x00000000}},
      {{0x80000001, 0}, Leaf{0x00000000, 0x00000000, 0x00000001, 0x28100000}},
      {{0x80000002, 0}, Leaf{0x756E6547, 0x20656E69, 0x65746E49, 0x2952286C}},
      {{0x80000003, 0}, Leaf{0x55504320, 0x20202020, 0x20202020, 0x40202020}},
      {{0x80000004, 0}, Leaf{0x30303020, 0x20402030, 0x37382E31, 0x007A4847}},
      {{0x80000005, 0}, Leaf{0x00000000, 0x00000000, 0x00000000, 0x00000000}},
      {{0x80000006, 0}, Leaf{0x00000000, 0x00000000, 0x01006040, 0x00000000}},
      {{0x80000007, 0}, Leaf{0x00000000, 0x00000000, 0x00000000, 0x00000100}},
      {{0x80000008, 0}, Leaf{0x00003028, 0x00000000, 0x00000000, 0x00000000}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_GENUINE_INTEL);
  EXPECT_EQ(info.family, 0x06);
  EXPECT_EQ(info.model, 0x1A);
  EXPECT_EQ(info.stepping, 0x02);
  EXPECT_STREQ(info.brand_string,
               "Genuine Intel(R) CPU           @ 0000 @ 1.87GHz");
  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::INTEL_NHM);

  EXPECT_TRUE(info.features.sse);
  EXPECT_TRUE(info.features.sse2);
  EXPECT_TRUE(info.features.sse3);
  EXPECT_TRUE(info.features.ssse3);
  EXPECT_TRUE(info.features.sse4_1);
  EXPECT_TRUE(info.features.sse4_2);
}

// https://github.com/InstLatx64/InstLatx64/blob/master/GenuineIntel/GenuineIntel0030673_Silvermont3_CPUID.txt
TEST_F(CpuidX86Test, Atom) {
  // Pre AVX cpus don't have xsave
  cpu().SetOsBackupsExtendedRegisters(false);
#if defined(CPU_FEATURES_OS_WINDOWS)
  cpu().SetWindowsIsProcessorFeaturePresent(PF_XMMI_INSTRUCTIONS_AVAILABLE);
  cpu().SetWindowsIsProcessorFeaturePresent(PF_XMMI64_INSTRUCTIONS_AVAILABLE);
  cpu().SetWindowsIsProcessorFeaturePresent(PF_SSE3_INSTRUCTIONS_AVAILABLE);
  cpu().SetWindowsIsProcessorFeaturePresent(PF_SSSE3_INSTRUCTIONS_AVAILABLE);
  cpu().SetWindowsIsProcessorFeaturePresent(PF_SSE4_1_INSTRUCTIONS_AVAILABLE);
  cpu().SetWindowsIsProcessorFeaturePresent(PF_SSE4_2_INSTRUCTIONS_AVAILABLE);
#elif defined(CPU_FEATURES_OS_MACOS)
  cpu().SetDarwinSysCtlByName("hw.optional.sse");
  cpu().SetDarwinSysCtlByName("hw.optional.sse2");
  cpu().SetDarwinSysCtlByName("hw.optional.sse3");
  cpu().SetDarwinSysCtlByName("hw.optional.supplementalsse3");
  cpu().SetDarwinSysCtlByName("hw.optional.sse4_1");
  cpu().SetDarwinSysCtlByName("hw.optional.sse4_2");
#elif defined(CPU_FEATURES_OS_FREEBSD)
  auto& fs = GetEmptyFilesystem();
  fs.CreateFile("/var/run/dmesg.boot", R"(
  ---<<BOOT>>---
Copyright (c) 1992-2020 The FreeBSD Project.
FreeBSD is a registered trademark of The FreeBSD Foundation.
  Features=0x1783fbff<FPU,VME,DE,PSE,TSC,MSR,PAE,MCE,CX8,APIC,SEP,MTRR,PGE,MCA,CMOV,PAT,PSE36,MMX,FXSR,SSE,SSE2,HTT>
  Features2=0x5eda2203<SSE3,PCLMULQDQ,SSSE3,CX16,PCID,SSE4.1,SSE4.2,MOVBE,POPCNT,AESNI,XSAVE,OSXSAVE,RDRAND>
real memory  = 2147418112 (2047 MB)
)");
#elif defined(CPU_FEATURES_OS_LINUX) || defined(CPU_FEATURES_OS_ANDROID)
  auto& fs = GetEmptyFilesystem();
  fs.CreateFile("/proc/cpuinfo", R"(
flags           : fpu mmx sse sse2 pni ssse3 sse4_1 sse4_2
)");
#endif
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x0000000B, 0x756E6547, 0x6C65746E, 0x49656E69}},
      {{0x00000001, 0}, Leaf{0x00030673, 0x00100800, 0x41D8E3BF, 0xBFEBFBFF}},
      {{0x00000002, 0}, Leaf{0x61B3A001, 0x0000FFC2, 0x00000000, 0x00000000}},
      {{0x00000003, 0}, Leaf{0x00000000, 0x00000000, 0x00000000, 0x00000000}},
      {{0x00000004, 0}, Leaf{0x1C000121, 0x0140003F, 0x0000003F, 0x00000001}},
      {{0x00000004, 1}, Leaf{0x1C000122, 0x01C0003F, 0x0000003F, 0x00000001}},
      {{0x00000004, 2}, Leaf{0x1C00C143, 0x03C0003F, 0x000003FF, 0x00000001}},
      {{0x00000005, 0}, Leaf{0x00000040, 0x00000040, 0x00000003, 0x33000020}},
      {{0x00000006, 0}, Leaf{0x00000005, 0x00000002, 0x00000009, 0x00000000}},
      {{0x00000007, 0}, Leaf{0x00000000, 0x00002282, 0x00000000, 0x00000000}},
      {{0x00000008, 0}, Leaf{0x00000000, 0x00000000, 0x00000000, 0x00000000}},
      {{0x00000009, 0}, Leaf{0x00000000, 0x00000000, 0x00000000, 0x00000000}},
      {{0x0000000A, 0}, Leaf{0x07280203, 0x00000000, 0x00000000, 0x00004503}},
      {{0x0000000B, 0}, Leaf{0x00000001, 0x00000001, 0x00000100, 0x00000000}},
      {{0x0000000B, 1}, Leaf{0x00000004, 0x00000004, 0x00000201, 0x00000000}},
      {{0x80000000, 0}, Leaf{0x80000008, 0x00000000, 0x00000000, 0x00000000}},
      {{0x80000001, 0}, Leaf{0x00000000, 0x00000000, 0x00000101, 0x28100000}},
      {{0x80000002, 0}, Leaf{0x20202020, 0x6E492020, 0x286C6574, 0x43202952}},
      {{0x80000003, 0}, Leaf{0x72656C65, 0x52286E6F, 0x50432029, 0x4A202055}},
      {{0x80000004, 0}, Leaf{0x30303931, 0x20402020, 0x39392E31, 0x007A4847}},
      {{0x80000005, 0}, Leaf{0x00000000, 0x00000000, 0x00000000, 0x00000000}},
      {{0x80000006, 0}, Leaf{0x00000000, 0x00000000, 0x04008040, 0x00000000}},
      {{0x80000007, 0}, Leaf{0x00000000, 0x00000000, 0x00000000, 0x00000100}},
      {{0x80000008, 0}, Leaf{0x00003024, 0x00000000, 0x00000000, 0x00000000}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_GENUINE_INTEL);
  EXPECT_EQ(info.family, 0x06);
  EXPECT_EQ(info.model, 0x37);
  EXPECT_EQ(info.stepping, 0x03);
  EXPECT_STREQ(info.brand_string,
               "      Intel(R) Celeron(R) CPU  J1900  @ 1.99GHz");
  EXPECT_EQ(GetX86Microarchitecture(&info),
            X86Microarchitecture::INTEL_ATOM_SMT);

  EXPECT_TRUE(info.features.sse);
  EXPECT_TRUE(info.features.sse2);
  EXPECT_TRUE(info.features.sse3);
  EXPECT_TRUE(info.features.ssse3);
  EXPECT_TRUE(info.features.sse4_1);
  EXPECT_TRUE(info.features.sse4_2);
}

// https://www.felixcloutier.com/x86/cpuid#example-3-1--example-of-cache-and-tlb-interpretation
TEST_F(CpuidX86Test, P4_CacheInfo) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x00000002, 0x756E6547, 0x6C65746E, 0x49656E69}},
      {{0x00000001, 0}, Leaf{0x00000F0A, 0x00010808, 0x00000000, 0x3FEBFBFF}},
      {{0x00000002, 0}, Leaf{0x665B5001, 0x00000000, 0x00000000, 0x007A7000}},
  });

  const auto info = GetX86CacheInfo();
  EXPECT_EQ(info.size, 5);

  EXPECT_EQ(info.levels[0].level, UNDEF);
  EXPECT_EQ(info.levels[0].cache_type, CacheType::CPU_FEATURE_CACHE_TLB);
  EXPECT_EQ(info.levels[0].cache_size, 4 * KiB);
  EXPECT_EQ(info.levels[0].ways, UNDEF);
  EXPECT_EQ(info.levels[0].line_size, UNDEF);
  EXPECT_EQ(info.levels[0].tlb_entries, 64);
  EXPECT_EQ(info.levels[0].partitioning, 0);

  EXPECT_EQ(info.levels[1].level, UNDEF);
  EXPECT_EQ(info.levels[1].cache_type, CacheType::CPU_FEATURE_CACHE_TLB);
  EXPECT_EQ(info.levels[1].cache_size, 4 * KiB);
  EXPECT_EQ(info.levels[1].ways, UNDEF);
  EXPECT_EQ(info.levels[1].line_size, UNDEF);
  EXPECT_EQ(info.levels[1].tlb_entries, 64);
  EXPECT_EQ(info.levels[1].partitioning, 0);

  EXPECT_EQ(info.levels[2].level, 1);
  EXPECT_EQ(info.levels[2].cache_type, CacheType::CPU_FEATURE_CACHE_DATA);
  EXPECT_EQ(info.levels[2].cache_size, 8 * KiB);
  EXPECT_EQ(info.levels[2].ways, 4);
  EXPECT_EQ(info.levels[2].line_size, 64);
  EXPECT_EQ(info.levels[2].tlb_entries, UNDEF);
  EXPECT_EQ(info.levels[2].partitioning, 0);

  EXPECT_EQ(info.levels[3].level, 1);
  EXPECT_EQ(info.levels[3].cache_type,
            CacheType::CPU_FEATURE_CACHE_INSTRUCTION);
  EXPECT_EQ(info.levels[3].cache_size, 12 * KiB);
  EXPECT_EQ(info.levels[3].ways, 8);
  EXPECT_EQ(info.levels[3].line_size, UNDEF);
  EXPECT_EQ(info.levels[3].tlb_entries, UNDEF);
  EXPECT_EQ(info.levels[3].partitioning, 0);

  EXPECT_EQ(info.levels[4].level, 2);
  EXPECT_EQ(info.levels[4].cache_type, CacheType::CPU_FEATURE_CACHE_DATA);
  EXPECT_EQ(info.levels[4].cache_size, 256 * KiB);
  EXPECT_EQ(info.levels[4].ways, 8);
  EXPECT_EQ(info.levels[4].line_size, 64);
  EXPECT_EQ(info.levels[4].tlb_entries, UNDEF);
  EXPECT_EQ(info.levels[4].partitioning, 2);
}

// https://github.com/InstLatx64/InstLatx64/blob/master/GenuineIntel/GenuineIntel0000673_P3_KatmaiDP_CPUID.txt
TEST_F(CpuidX86Test, P3) {
  // Pre AVX cpus don't have xsave
  cpu().SetOsBackupsExtendedRegisters(false);
#if defined(CPU_FEATURES_OS_WINDOWS)
  cpu().SetWindowsIsProcessorFeaturePresent(PF_XMMI_INSTRUCTIONS_AVAILABLE);
#elif defined(CPU_FEATURES_OS_MACOS)
  cpu().SetDarwinSysCtlByName("hw.optional.sse");
#elif defined(CPU_FEATURES_OS_FREEBSD)
  auto& fs = GetEmptyFilesystem();
  fs.CreateFile("/var/run/dmesg.boot", R"(
  ---<<BOOT>>---
Copyright (c) 1992-2020 The FreeBSD Project.
FreeBSD is a registered trademark of The FreeBSD Foundation.
  Features=0x1783fbff<FPU,VME,DE,PSE,TSC,MSR,PAE,MCE,CX8,APIC,SEP,MTRR,PGE,MCA,CMOV,PAT,PSE36,MMX,FXSR,SSE>
real memory  = 2147418112 (2047 MB)
)");
#elif defined(CPU_FEATURES_OS_LINUX) || defined(CPU_FEATURES_OS_ANDROID)
  auto& fs = GetEmptyFilesystem();
  fs.CreateFile("/proc/cpuinfo", R"(
flags           : fpu mmx sse
)");
#endif
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x00000003, 0x756E6547, 0x6C65746E, 0x49656E69}},
      {{0x00000001, 0}, Leaf{0x00000673, 0x00000000, 0x00000000, 0x0387FBFF}},
      {{0x00000002, 0}, Leaf{0x03020101, 0x00000000, 0x00000000, 0x0C040843}},
      {{0x00000003, 0}, Leaf{0x00000000, 0x00000000, 0x4CECC782, 0x00006778}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_GENUINE_INTEL);
  EXPECT_EQ(info.family, 0x06);
  EXPECT_EQ(info.model, 0x07);
  EXPECT_EQ(info.stepping, 0x03);
  EXPECT_STREQ(info.brand_string, "");
  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::X86_UNKNOWN);

  EXPECT_TRUE(info.features.mmx);
  EXPECT_TRUE(info.features.sse);
  EXPECT_FALSE(info.features.sse2);
  EXPECT_FALSE(info.features.sse3);
  EXPECT_FALSE(info.features.ssse3);
  EXPECT_FALSE(info.features.sse4_1);
  EXPECT_FALSE(info.features.sse4_2);
}

// https://github.com/InstLatx64/InstLatx64/blob/master/GenuineIntel/GenuineIntel0000480_486_CPUID.txt
TEST_F(CpuidX86Test, INTEL_80486) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x00000001, 0x756E6547, 0x6C65746E, 0x49656E69}},
      {{0x00000001, 0}, Leaf{0x00000480, 0x00000000, 0x00000000, 0x00000003}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_GENUINE_INTEL);
  EXPECT_EQ(info.family, 0x04);
  EXPECT_EQ(info.model, 0x08);
  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::INTEL_80486);
}

// https://github.com/InstLatx64/InstLatx64/blob/master/GenuineIntel/GenuineIntel0000526_P54C_CPUID.txt
TEST_F(CpuidX86Test, INTEL_P54C) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x00000001, 0x756E6547, 0x6C65746E, 0x49656E69}},
      {{0x00000001, 0}, Leaf{0x00000525, 0x00000000, 0x00000000, 0x000001BF}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_GENUINE_INTEL);
  EXPECT_EQ(info.family, 0x05);
  EXPECT_EQ(info.model, 0x02);
  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::INTEL_P5);
}

// https://github.com/InstLatx64/InstLatx64/blob/master/GenuineIntel/GenuineIntel0000590_Lakemont_CPUID2.txt
TEST_F(CpuidX86Test, INTEL_LAKEMONT) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x00000002, 0x756E6547, 0x6c65746E, 0x49656E69}},
      {{0x00000001, 0}, Leaf{0x00000590, 0x00000000, 0x00010200, 0x8000237B}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_GENUINE_INTEL);
  EXPECT_EQ(info.family, 0x05);
  EXPECT_EQ(info.model, 0x09);
  EXPECT_EQ(GetX86Microarchitecture(&info),
            X86Microarchitecture::INTEL_LAKEMONT);
}

// https://github.com/InstLatx64/InstLatx64/blob/master/GenuineIntel/GenuineIntel00006E8_PM_Yonah_CPUID.txt
TEST_F(CpuidX86Test, INTEL_CORE_YONAH) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x0000000A, 0x756E6547, 0x6C65746E, 0x49656E69}},
      {{0x00000001, 0}, Leaf{0x000006E8, 0x00010800, 0x0000C109, 0xAFE9FBFF}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_GENUINE_INTEL);
  EXPECT_EQ(info.family, 0x06);
  EXPECT_EQ(info.model, 0x0E);
  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::INTEL_CORE);
}

// https://github.com/InstLatx64/InstLatx64/blob/master/GenuineIntel/GenuineIntel00706A8_GoldmontPlus_CPUID.txt
TEST_F(CpuidX86Test, INTEL_GOLDMONT_PLUS) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x00000018, 0x756E6547, 0x6c65746E, 0x49656E69}},
      {{0x00000001, 0}, Leaf{0x000706A8, 0x00400800, 0x4FF8EBBF, 0xBFEBFBFF}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_GENUINE_INTEL);
  EXPECT_EQ(info.family, 0x06);
  EXPECT_EQ(info.model, 0x7A);
  EXPECT_EQ(GetX86Microarchitecture(&info),
            X86Microarchitecture::INTEL_ATOM_GMT_PLUS);
}

// https://github.com/InstLatx64/InstLatx64/blob/master/GenuineIntel/GenuineIntel0050670_KnightsLanding_CPUID.txt
TEST_F(CpuidX86Test, INTEL_KNIGHTS_LANDING) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x0000000D, 0x756E6547, 0x6C65746E, 0x49656E69}},
      {{0x00000001, 0}, Leaf{0x00050670, 0x02FF0800, 0x7FF8F3BF, 0xBFEBFBFF}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_GENUINE_INTEL);
  EXPECT_EQ(info.family, 0x06);
  EXPECT_EQ(info.model, 0x57);
  EXPECT_EQ(GetX86Microarchitecture(&info),
            X86Microarchitecture::INTEL_KNIGHTS_L);
}

// http://users.atw.hu/instlatx64/GenuineIntel/GenuineIntel00806EC_CometLake_CPUID2.txt
TEST_F(CpuidX86Test, INTEL_CML_U) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x00000016, 0x756E6547, 0x6C65746E, 0x49656E69}},
      {{0x00000001, 0}, Leaf{0x000806EC, 0x00100800, 0x7FFAFBBF, 0xBFEBFBFF}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_GENUINE_INTEL);
  EXPECT_EQ(info.family, 0x06);
  EXPECT_EQ(info.model, 0x8E);
  EXPECT_EQ(info.stepping, 0x0C);
  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::INTEL_CML);
}

// http://users.atw.hu/instlatx64/GenuineIntel/GenuineIntel00A0652_CometLake_CPUID1.txt
TEST_F(CpuidX86Test, INTEL_CML_H) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x00000016, 0x756E6547, 0x6C65746E, 0x49656E69}},
      {{0x00000001, 0}, Leaf{0x000A0652, 0x00100800, 0x7FFAFBBF, 0xBFEBFBFF}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_GENUINE_INTEL);
  EXPECT_EQ(info.family, 0x06);
  EXPECT_EQ(info.model, 0xA5);
  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::INTEL_CML);
}

// https://github.com/InstLatx64/InstLatx64/blob/master/GenuineIntel/GenuineIntel00A0660_CometLake_CPUID1.txt
TEST_F(CpuidX86Test, INTEL_CML_U2) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x00000016, 0x756E6547, 0x6C65746E, 0x49656E69}},
      {{0x00000001, 0}, Leaf{0x000A0660, 0x00100800, 0x7FFAFBBF, 0xBFEBFBFF}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_GENUINE_INTEL);
  EXPECT_EQ(info.family, 0x06);
  EXPECT_EQ(info.model, 0xA6);
  EXPECT_EQ(info.stepping, 0x00);
  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::INTEL_CML);
}

// http://users.atw.hu/instlatx64/GenuineIntel/GenuineIntel00806A1_Lakefield_CPUID.txt
TEST_F(CpuidX86Test, INTEL_ATOM_TMT_LAKEFIELD) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x0000001B, 0x756E6547, 0x6C65746E, 0x49656E69}},
      {{0x00000001, 0}, Leaf{0x000806A1, 0x00100800, 0x4FD8EBBF, 0xBFEBFBFF}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_GENUINE_INTEL);
  EXPECT_EQ(info.family, 0x06);
  EXPECT_EQ(info.model, 0x8A);
  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::INTEL_ATOM_TMT);
}

// https://github.com/InstLatx64/InstLatx64/blob/master/GenuineIntel/GenuineIntel0090661_ElkhartLake_CPUID01.txt
TEST_F(CpuidX86Test, INTEL_ATOM_TMT_ELKHART_LAKE) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x0000001B, 0x756E6547, 0x6C65746E, 0x49656E69}},
      {{0x00000001, 0}, Leaf{0x00090661, 0x00800800, 0x4FF8EBBF, 0xBFEBFBFF}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_GENUINE_INTEL);
  EXPECT_EQ(info.family, 0x06);
  EXPECT_EQ(info.model, 0x96);
  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::INTEL_ATOM_TMT);
}

// https://github.com/InstLatx64/InstLatx64/blob/master/GenuineIntel/GenuineIntel00906C0_JasperLake_01_CPUID.txt
TEST_F(CpuidX86Test, INTEL_ATOM_TMT_JASPER_LAKE) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x0000001B, 0x756E6547, 0x6C65746E, 0x49656E69}},
      {{0x00000001, 0}, Leaf{0x000906C0, 0x00800800, 0x4FF8EBBF, 0xBFEBFBFF}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_GENUINE_INTEL);
  EXPECT_EQ(info.family, 0x06);
  EXPECT_EQ(info.model, 0x9C);
  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::INTEL_ATOM_TMT);
}

// http://users.atw.hu/instlatx64/GenuineIntel/GenuineIntel00B0671_RaptorLake_02_CPUID.txt
TEST_F(CpuidX86Test, INTEL_RAPTOR_LAKE) {
    cpu().SetLeaves({
        {{0x00000000, 0}, Leaf{0x00000020, 0x756E6547, 0x6C65746E, 0x49656E69}},
        {{0x00000001, 0}, Leaf{0x000B0671, 0x00800800, 0x7FFAFBBF, 0xBFEBFBFF}},
    });
    const auto info = GetX86Info();

    EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_GENUINE_INTEL);
    EXPECT_EQ(info.family, 0x06);
    EXPECT_EQ(info.model, 0xB7);
    EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::INTEL_RPL);
}

// http://users.atw.hu/instlatx64/GenuineIntel/GenuineIntel00306F2_HaswellEP2_CPUID.txt
TEST_F(CpuidX86Test, INTEL_HASWELL_LZCNT) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x0000000F, 0x756E6547, 0x6C65746E, 0x49656E69}},
      {{0x00000001, 0}, Leaf{0x000306F2, 0x00200800, 0x7FFEFBFF, 0xBFEBFBFF}},
      {{0x00000007, 0}, Leaf{0x00000000, 0x000037AB, 0x00000000, 0x00000000}},
      {{0x80000000, 0}, Leaf{0x80000008, 0x00000000, 0x00000000, 0x00000000}},
      {{0x80000001, 0}, Leaf{0x00000000, 0x00000000, 0x00000021, 0x2C100000}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_GENUINE_INTEL);
  EXPECT_EQ(info.family, 0x06);
  EXPECT_EQ(info.model, 0x3F);
  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::INTEL_HSW);

  EXPECT_TRUE(info.features.lzcnt);
}

// http://users.atw.hu/instlatx64/GenuineIntel/GenuineIntel00B06A2_RaptorLakeP_03_CPUID.txt
TEST_F(CpuidX86Test, INTEL_RAPTOR_LAKE_P) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x00000020, 0x756E6547, 0x6C65746E, 0x49656E69}},
      {{0x00000001, 0}, Leaf{0x000B06A3, 0x00400800, 0x7FFAFBFF, 0xBFEBFBFF}},
      {{0x80000000, 0}, Leaf{0x80000008, 0x00000000, 0x00000000, 0x00000000}},
      {{0x80000001, 0}, Leaf{0x00000000, 0x00000000, 0x00000121, 0x2C100000}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_GENUINE_INTEL);
  EXPECT_EQ(info.family, 0x06);
  EXPECT_EQ(info.model, 0xBA);
  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::INTEL_RPL);
}

// http://users.atw.hu/instlatx64/GenuineIntel/GenuineIntel00B06F2_RaptorLakeS_02_CPUID.txt
TEST_F(CpuidX86Test, INTEL_RAPTOR_LAKE_S) {
  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x00000020, 0x756E6547, 0x6C65746E, 0x49656E69}},
      {{0x00000001, 0}, Leaf{0x000B06F2, 0x00800800, 0x7FFAFBFF, 0xBFEBFBFF}},
      {{0x80000000, 0}, Leaf{0x80000008, 0x00000000, 0x00000000, 0x00000000}},
      {{0x80000001, 0}, Leaf{0x00000000, 0x00000000, 0x00000121, 0x2C100000}},
  });
  const auto info = GetX86Info();

  EXPECT_STREQ(info.vendor, CPU_FEATURES_VENDOR_GENUINE_INTEL);
  EXPECT_EQ(info.family, 0x06);
  EXPECT_EQ(info.model, 0xBF);
  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::INTEL_RPL);
}

// https://github.com/google/cpu_features/issues/200
// http://users.atw.hu/instlatx64/GenuineIntel/GenuineIntel00206F2_Eagleton_CPUID.txt
#if defined(CPU_FEATURES_OS_WINDOWS)
TEST_F(CpuidX86Test, WIN_INTEL_WESTMERE_EX) {
  // Pre AVX cpus don't have xsave
  cpu().SetOsBackupsExtendedRegisters(false);
  cpu().SetWindowsIsProcessorFeaturePresent(PF_XMMI_INSTRUCTIONS_AVAILABLE);
  cpu().SetWindowsIsProcessorFeaturePresent(PF_XMMI64_INSTRUCTIONS_AVAILABLE);
  cpu().SetWindowsIsProcessorFeaturePresent(PF_SSE3_INSTRUCTIONS_AVAILABLE);
  cpu().SetWindowsIsProcessorFeaturePresent(PF_SSSE3_INSTRUCTIONS_AVAILABLE);
  cpu().SetWindowsIsProcessorFeaturePresent(PF_SSE4_1_INSTRUCTIONS_AVAILABLE);
  cpu().SetWindowsIsProcessorFeaturePresent(PF_SSE4_2_INSTRUCTIONS_AVAILABLE);

  cpu().SetLeaves({
      {{0x00000000, 0}, Leaf{0x0000000B, 0x756E6547, 0x6C65746E, 0x49656E69}},
      {{0x00000001, 0}, Leaf{0x000206F2, 0x00400800, 0x02BEE3FF, 0xBFEBFBFF}},
  });
  const auto info = GetX86Info();

  EXPECT_EQ(info.family, 0x06);
  EXPECT_EQ(info.model, 0x2F);
  EXPECT_EQ(GetX86Microarchitecture(&info), X86Microarchitecture::INTEL_WSM);

  EXPECT_TRUE(info.features.sse);
  EXPECT_TRUE(info.features.sse2);
  EXPECT_TRUE(info.features.sse3);
  EXPECT_TRUE(info.features.ssse3);
  EXPECT_TRUE(info.features.sse4_1);
  EXPECT_TRUE(info.features.sse4_2);
}
#endif  // CPU_FEATURES_OS_WINDOWS

// TODO(user): test what happens when xsave/osxsave are not present.
// TODO(user): test what happens when xmm/ymm/zmm os support are not
// present.

}  // namespace
}  // namespace cpu_features
