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

#include "cpuinfo_aarch64.h"

#include <set>

#include "filesystem_for_testing.h"
#include "gtest/gtest.h"
#include "hwcaps_for_testing.h"
#if defined(CPU_FEATURES_OS_WINDOWS)
#include "internal/windows_utils.h"
#endif  // CPU_FEATURES_OS_WINDOWS

namespace cpu_features {
class FakeCpuAarch64 {
 public:
#if defined(CPU_FEATURES_OS_WINDOWS)
  bool GetWindowsIsProcessorFeaturePresent(DWORD dwProcessorFeature) {
    return windows_isprocessorfeaturepresent_.count(dwProcessorFeature);
  }

  void SetWindowsIsProcessorFeaturePresent(DWORD dwProcessorFeature) {
    windows_isprocessorfeaturepresent_.insert(dwProcessorFeature);
  }

  WORD GetWindowsNativeSystemInfoProcessorRevision() const {
    return processor_revision_;
  }

  void SetWindowsNativeSystemInfoProcessorRevision(WORD wProcessorRevision) {
    processor_revision_ = wProcessorRevision;
  }

 private:
  std::set<DWORD> windows_isprocessorfeaturepresent_;
  WORD processor_revision_{};
#endif  // CPU_FEATURES_OS_WINDOWS
};

static FakeCpuAarch64* g_fake_cpu_instance = nullptr;

static FakeCpuAarch64& cpu() {
  assert(g_fake_cpu_instance != nullptr);
  return *g_fake_cpu_instance;
}

#if defined(CPU_FEATURES_OS_WINDOWS)
extern "C" bool GetWindowsIsProcessorFeaturePresent(DWORD dwProcessorFeature) {
  return cpu().GetWindowsIsProcessorFeaturePresent(dwProcessorFeature);
}

extern "C" WORD GetWindowsNativeSystemInfoProcessorRevision() {
  return cpu().GetWindowsNativeSystemInfoProcessorRevision();
}
#endif  // CPU_FEATURES_OS_WINDOWS

namespace {

class CpuidAarch64Test : public ::testing::Test {
 protected:
  void SetUp() override {
    assert(g_fake_cpu_instance == nullptr);
    g_fake_cpu_instance = new FakeCpuAarch64();
  }
  void TearDown() override {
    delete g_fake_cpu_instance;
    g_fake_cpu_instance = nullptr;
  }
};

TEST(CpuinfoAarch64Test, Aarch64FeaturesEnum) {
  const char* last_name = GetAarch64FeaturesEnumName(AARCH64_LAST_);
  EXPECT_STREQ(last_name, "unknown_feature");
  for (int i = static_cast<int>(AARCH64_FP);
       i != static_cast<int>(AARCH64_LAST_); ++i) {
    const auto feature = static_cast<Aarch64FeaturesEnum>(i);
    const char* name = GetAarch64FeaturesEnumName(feature);
    ASSERT_FALSE(name == nullptr);
    EXPECT_STRNE(name, "");
    EXPECT_STRNE(name, last_name);
  }
}

#if defined(CPU_FEATURES_OS_LINUX)
void DisableHardwareCapabilities() { SetHardwareCapabilities(0, 0); }

#if defined(CPU_FEATURES_OS_MACOS)

class FakeCpu {
 public:
  bool GetDarwinSysCtlByName(std::string name) const {
    return darwin_sysctlbyname_.count(name);
  }

  int GetDarwinSysCtlByNameValue(std::string name) const {
    std::map<std::string, int>::const_iterator iter = darwin_sysctlbynamevalue_.find(name);
    if (iter != std::end(darwin_sysctlbynamevalue_)) {
      return iter->second;
    }

    return 0;
  }

  void SetDarwinSysCtlByName(std::string name) {
    darwin_sysctlbyname_.insert(name);
  }

  void SetDarwinSysCtlByNameValue(std::string name, int value) {
    darwin_sysctlbynamevalue_[name] = value;
  }
 private:
  std::set<std::string> darwin_sysctlbyname_;
  std::map<std::string, int> darwin_sysctlbynamevalue_;
};

static FakeCpu* g_fake_cpu_instance = nullptr;

static FakeCpu& cpu() {
  assert(g_fake_cpu_instance != nullptr);
  return *g_fake_cpu_instance;
}

extern "C" bool GetDarwinSysCtlByName(const char* name) {
  return cpu().GetDarwinSysCtlByName(name);
}

extern "C" int GetDarwinSysCtlByNameValue(const char *name) {
  return cpu().GetDarwinSysCtlByNameValue(name);
}

class CpuinfoAarch64Test : public ::testing::Test {
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

TEST_F(CpuinfoAarch64Test, FromDarwinSysctlFromName) {
  cpu().SetDarwinSysCtlByName("hw.optional.floatingpoint");
  cpu().SetDarwinSysCtlByName("hw.optional.neon");
  cpu().SetDarwinSysCtlByName("hw.optional.neon_hpfp");
  cpu().SetDarwinSysCtlByName("hw.optional.neon_fp16");
  cpu().SetDarwinSysCtlByName("hw.optional.armv8_1_atomics");
  cpu().SetDarwinSysCtlByName("hw.optional.armv8_crc32");
  cpu().SetDarwinSysCtlByName("hw.optional.armv8_2_fhm");
  cpu().SetDarwinSysCtlByName("hw.optional.armv8_2_sha512");
  cpu().SetDarwinSysCtlByName("hw.optional.armv8_2_sha3");
  cpu().SetDarwinSysCtlByName("hw.optional.amx_version");
  cpu().SetDarwinSysCtlByName("hw.optional.ucnormal_mem");
  cpu().SetDarwinSysCtlByName("hw.optional.arm64");

  cpu().SetDarwinSysCtlByNameValue("hw.cputype", 16777228);
  cpu().SetDarwinSysCtlByNameValue("hw.cpusubtype", 2);
  cpu().SetDarwinSysCtlByNameValue("hw.cpu64bit", 1);
  cpu().SetDarwinSysCtlByNameValue("hw.cpufamily", 458787763);
  cpu().SetDarwinSysCtlByNameValue("hw.cpusubfamily", 2);

  const auto info = GetAarch64Info();

  EXPECT_EQ(info.implementer, 0x100000C);
  EXPECT_EQ(info.variant, 2);
  EXPECT_EQ(info.part, 0x1B588BB3);
  EXPECT_EQ(info.revision, 2);

  EXPECT_TRUE(info.features.fp);
  EXPECT_FALSE(info.features.asimd);
  EXPECT_FALSE(info.features.evtstrm);
  EXPECT_FALSE(info.features.aes);
  EXPECT_FALSE(info.features.pmull);
  EXPECT_FALSE(info.features.sha1);
  EXPECT_FALSE(info.features.sha2);
  EXPECT_TRUE(info.features.crc32);
  EXPECT_TRUE(info.features.atomics);
  EXPECT_TRUE(info.features.fphp);
  EXPECT_FALSE(info.features.asimdhp);
  EXPECT_FALSE(info.features.cpuid);
  EXPECT_FALSE(info.features.asimdrdm);
  EXPECT_FALSE(info.features.jscvt);
  EXPECT_FALSE(info.features.fcma);
  EXPECT_FALSE(info.features.lrcpc);
  EXPECT_FALSE(info.features.dcpop);
  EXPECT_TRUE(info.features.sha3);
  EXPECT_FALSE(info.features.sm3);
  EXPECT_FALSE(info.features.sm4);
  EXPECT_FALSE(info.features.asimddp);
  EXPECT_TRUE(info.features.sha512);
  EXPECT_FALSE(info.features.sve);
  EXPECT_TRUE(info.features.asimdfhm);
  EXPECT_FALSE(info.features.dit);
  EXPECT_FALSE(info.features.uscat);
  EXPECT_FALSE(info.features.ilrcpc);
  EXPECT_FALSE(info.features.flagm);
  EXPECT_FALSE(info.features.ssbs);
  EXPECT_FALSE(info.features.sb);
  EXPECT_FALSE(info.features.paca);
  EXPECT_FALSE(info.features.pacg);
}

#else

TEST(CpuinfoAarch64Test, FromHardwareCap) {
  ResetHwcaps();
  SetHardwareCapabilities(AARCH64_HWCAP_FP | AARCH64_HWCAP_AES, 0);
  GetEmptyFilesystem();  // disabling /proc/cpuinfo
  const auto info = GetAarch64Info();
  EXPECT_TRUE(info.features.fp);
  EXPECT_FALSE(info.features.asimd);
  EXPECT_FALSE(info.features.evtstrm);
  EXPECT_TRUE(info.features.aes);
  EXPECT_FALSE(info.features.pmull);
  EXPECT_FALSE(info.features.sha1);
  EXPECT_FALSE(info.features.sha2);
  EXPECT_FALSE(info.features.crc32);
  EXPECT_FALSE(info.features.atomics);
  EXPECT_FALSE(info.features.fphp);
  EXPECT_FALSE(info.features.asimdhp);
  EXPECT_FALSE(info.features.cpuid);
  EXPECT_FALSE(info.features.asimdrdm);
  EXPECT_FALSE(info.features.jscvt);
  EXPECT_FALSE(info.features.fcma);
  EXPECT_FALSE(info.features.lrcpc);
  EXPECT_FALSE(info.features.dcpop);
  EXPECT_FALSE(info.features.sha3);
  EXPECT_FALSE(info.features.sm3);
  EXPECT_FALSE(info.features.sm4);
  EXPECT_FALSE(info.features.asimddp);
  EXPECT_FALSE(info.features.sha512);
  EXPECT_FALSE(info.features.sve);
  EXPECT_FALSE(info.features.asimdfhm);
  EXPECT_FALSE(info.features.dit);
  EXPECT_FALSE(info.features.uscat);
  EXPECT_FALSE(info.features.ilrcpc);
  EXPECT_FALSE(info.features.flagm);
  EXPECT_FALSE(info.features.ssbs);
  EXPECT_FALSE(info.features.sb);
  EXPECT_FALSE(info.features.paca);
  EXPECT_FALSE(info.features.pacg);
}

TEST(CpuinfoAarch64Test, FromHardwareCap2) {
  ResetHwcaps();
  SetHardwareCapabilities(AARCH64_HWCAP_FP,
                          AARCH64_HWCAP2_SVE2 | AARCH64_HWCAP2_BTI);
  GetEmptyFilesystem();  // disabling /proc/cpuinfo
  const auto info = GetAarch64Info();
  EXPECT_TRUE(info.features.fp);

  EXPECT_TRUE(info.features.sve2);
  EXPECT_TRUE(info.features.bti);

  EXPECT_FALSE(info.features.dcpodp);
  EXPECT_FALSE(info.features.sveaes);
  EXPECT_FALSE(info.features.svepmull);
  EXPECT_FALSE(info.features.svebitperm);
  EXPECT_FALSE(info.features.svesha3);
  EXPECT_FALSE(info.features.svesm4);
  EXPECT_FALSE(info.features.flagm2);
  EXPECT_FALSE(info.features.frint);
  EXPECT_FALSE(info.features.svei8mm);
  EXPECT_FALSE(info.features.svef32mm);
  EXPECT_FALSE(info.features.svef64mm);
  EXPECT_FALSE(info.features.svebf16);
  EXPECT_FALSE(info.features.i8mm);
  EXPECT_FALSE(info.features.bf16);
  EXPECT_FALSE(info.features.dgh);
  EXPECT_FALSE(info.features.rng);
}
#endif  // CPU_FEATURES_OS_MACOS

TEST(CpuinfoAarch64Test, ARMCortexA53) {
  ResetHwcaps();
  auto& fs = GetEmptyFilesystem();
  fs.CreateFile("/proc/cpuinfo",
                R"(Processor   : AArch64 Processor rev 3 (aarch64)
processor   : 0
processor   : 1
processor   : 2
processor   : 3
processor   : 4
processor   : 5
processor   : 6
processor   : 7
Features    : fp asimd evtstrm aes pmull sha1 sha2 crc32
CPU implementer : 0x41
CPU architecture: AArch64
CPU variant : 0x0
CPU part    : 0xd03
CPU revision    : 3)");
  const auto info = GetAarch64Info();
  EXPECT_EQ(info.implementer, 0x41);
  EXPECT_EQ(info.variant, 0x0);
  EXPECT_EQ(info.part, 0xd03);
  EXPECT_EQ(info.revision, 3);

  EXPECT_TRUE(info.features.fp);
  EXPECT_TRUE(info.features.asimd);
  EXPECT_TRUE(info.features.evtstrm);
  EXPECT_TRUE(info.features.aes);
  EXPECT_TRUE(info.features.pmull);
  EXPECT_TRUE(info.features.sha1);
  EXPECT_TRUE(info.features.sha2);
  EXPECT_TRUE(info.features.crc32);

  EXPECT_FALSE(info.features.atomics);
  EXPECT_FALSE(info.features.fphp);
  EXPECT_FALSE(info.features.asimdhp);
  EXPECT_FALSE(info.features.cpuid);
  EXPECT_FALSE(info.features.asimdrdm);
  EXPECT_FALSE(info.features.jscvt);
  EXPECT_FALSE(info.features.fcma);
  EXPECT_FALSE(info.features.lrcpc);
  EXPECT_FALSE(info.features.dcpop);
  EXPECT_FALSE(info.features.sha3);
  EXPECT_FALSE(info.features.sm3);
  EXPECT_FALSE(info.features.sm4);
  EXPECT_FALSE(info.features.asimddp);
  EXPECT_FALSE(info.features.sha512);
  EXPECT_FALSE(info.features.sve);
  EXPECT_FALSE(info.features.asimdfhm);
  EXPECT_FALSE(info.features.dit);
  EXPECT_FALSE(info.features.uscat);
  EXPECT_FALSE(info.features.ilrcpc);
  EXPECT_FALSE(info.features.flagm);
  EXPECT_FALSE(info.features.ssbs);
  EXPECT_FALSE(info.features.sb);
  EXPECT_FALSE(info.features.paca);
  EXPECT_FALSE(info.features.pacg);
  EXPECT_FALSE(info.features.dcpodp);
  EXPECT_FALSE(info.features.sve2);
  EXPECT_FALSE(info.features.sveaes);
  EXPECT_FALSE(info.features.svepmull);
  EXPECT_FALSE(info.features.svebitperm);
  EXPECT_FALSE(info.features.svesha3);
  EXPECT_FALSE(info.features.svesm4);
  EXPECT_FALSE(info.features.flagm2);
  EXPECT_FALSE(info.features.frint);
  EXPECT_FALSE(info.features.svei8mm);
  EXPECT_FALSE(info.features.svef32mm);
  EXPECT_FALSE(info.features.svef64mm);
  EXPECT_FALSE(info.features.svebf16);
  EXPECT_FALSE(info.features.i8mm);
  EXPECT_FALSE(info.features.bf16);
  EXPECT_FALSE(info.features.dgh);
  EXPECT_FALSE(info.features.rng);
  EXPECT_FALSE(info.features.bti);
  EXPECT_FALSE(info.features.mte);
  EXPECT_FALSE(info.features.ecv);
  EXPECT_FALSE(info.features.afp);
  EXPECT_FALSE(info.features.rpres);
}
#endif  // CPU_FEATURES_OS_LINUX

#if defined(CPU_FEATURES_OS_WINDOWS)
TEST_F(CpuidAarch64Test, WINDOWS_AARCH64_RPI4) {
  cpu().SetWindowsNativeSystemInfoProcessorRevision(0x03);
  cpu().SetWindowsIsProcessorFeaturePresent(PF_ARM_VFP_32_REGISTERS_AVAILABLE);
  cpu().SetWindowsIsProcessorFeaturePresent(PF_ARM_NEON_INSTRUCTIONS_AVAILABLE);
  cpu().SetWindowsIsProcessorFeaturePresent(
      PF_ARM_V8_CRC32_INSTRUCTIONS_AVAILABLE);

  const auto info = GetAarch64Info();

  EXPECT_EQ(info.revision, 0x03);
  EXPECT_TRUE(info.features.fp);
  EXPECT_TRUE(info.features.asimd);
  EXPECT_TRUE(info.features.crc32);
  EXPECT_FALSE(info.features.aes);
  EXPECT_FALSE(info.features.sha1);
  EXPECT_FALSE(info.features.sha2);
  EXPECT_FALSE(info.features.pmull);
  EXPECT_FALSE(info.features.atomics);
  EXPECT_FALSE(info.features.asimddp);
  EXPECT_FALSE(info.features.jscvt);
  EXPECT_FALSE(info.features.lrcpc);
}
#endif  // CPU_FEATURES_OS_WINDOWS

}  // namespace
}  // namespace cpu_features
