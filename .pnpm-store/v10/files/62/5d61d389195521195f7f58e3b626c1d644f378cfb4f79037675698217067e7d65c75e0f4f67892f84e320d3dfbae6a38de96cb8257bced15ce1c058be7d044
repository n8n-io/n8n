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

#include "cpu_features_macros.h"

#ifdef CPU_FEATURES_ARCH_PPC
#ifdef CPU_FEATURES_OS_LINUX

#include "cpuinfo_ppc.h"

////////////////////////////////////////////////////////////////////////////////
// Definitions for introspection.
////////////////////////////////////////////////////////////////////////////////
#define INTROSPECTION_TABLE                                                    \
  LINE(PPC_32, ppc32, "ppc32", PPC_FEATURE_32, 0)                              \
  LINE(PPC_64, ppc64, "ppc64", PPC_FEATURE_64, 0)                              \
  LINE(PPC_601_INSTR, ppc601, "ppc601", PPC_FEATURE_601_INSTR, 0)              \
  LINE(PPC_HAS_ALTIVEC, altivec, "altivec", PPC_FEATURE_HAS_ALTIVEC, 0)        \
  LINE(PPC_HAS_FPU, fpu, "fpu", PPC_FEATURE_HAS_FPU, 0)                        \
  LINE(PPC_HAS_MMU, mmu, "mmu", PPC_FEATURE_HAS_MMU, 0)                        \
  LINE(PPC_HAS_4xxMAC, mac_4xx, "4xxmac", PPC_FEATURE_HAS_4xxMAC, 0)           \
  LINE(PPC_UNIFIED_CACHE, unifiedcache, "ucache", PPC_FEATURE_UNIFIED_CACHE,   \
       0)                                                                      \
  LINE(PPC_HAS_SPE, spe, "spe", PPC_FEATURE_HAS_SPE, 0)                        \
  LINE(PPC_HAS_EFP_SINGLE, efpsingle, "efpsingle", PPC_FEATURE_HAS_EFP_SINGLE, \
       0)                                                                      \
  LINE(PPC_HAS_EFP_DOUBLE, efpdouble, "efpdouble", PPC_FEATURE_HAS_EFP_DOUBLE, \
       0)                                                                      \
  LINE(PPC_NO_TB, no_tb, "notb", PPC_FEATURE_NO_TB, 0)                         \
  LINE(PPC_POWER4, power4, "power4", PPC_FEATURE_POWER4, 0)                    \
  LINE(PPC_POWER5, power5, "power5", PPC_FEATURE_POWER5, 0)                    \
  LINE(PPC_POWER5_PLUS, power5plus, "power5+", PPC_FEATURE_POWER5_PLUS, 0)     \
  LINE(PPC_CELL, cell, "cellbe", PPC_FEATURE_CELL, 0)                          \
  LINE(PPC_BOOKE, booke, "booke", PPC_FEATURE_BOOKE, 0)                        \
  LINE(PPC_SMT, smt, "smt", PPC_FEATURE_SMT, 0)                                \
  LINE(PPC_ICACHE_SNOOP, icachesnoop, "ic_snoop", PPC_FEATURE_ICACHE_SNOOP, 0) \
  LINE(PPC_ARCH_2_05, arch205, "arch_2_05", PPC_FEATURE_ARCH_2_05, 0)          \
  LINE(PPC_PA6T, pa6t, "pa6t", PPC_FEATURE_PA6T, 0)                            \
  LINE(PPC_HAS_DFP, dfp, "dfp", PPC_FEATURE_HAS_DFP, 0)                        \
  LINE(PPC_POWER6_EXT, power6ext, "power6x", PPC_FEATURE_POWER6_EXT, 0)        \
  LINE(PPC_ARCH_2_06, arch206, "arch_2_06", PPC_FEATURE_ARCH_2_06, 0)          \
  LINE(PPC_HAS_VSX, vsx, "vsx", PPC_FEATURE_HAS_VSX, 0)                        \
  LINE(PPC_PSERIES_PERFMON_COMPAT, pseries_perfmon_compat, "archpmu",          \
       PPC_FEATURE_PSERIES_PERFMON_COMPAT, 0)                                  \
  LINE(PPC_TRUE_LE, truele, "true_le", PPC_FEATURE_TRUE_LE, 0)                 \
  LINE(PPC_PPC_LE, ppcle, "ppcle", PPC_FEATURE_PPC_LE, 0)                      \
  LINE(PPC_ARCH_2_07, arch207, "arch_2_07", 0, PPC_FEATURE2_ARCH_2_07)         \
  LINE(PPC_HTM, htm, "htm", 0, PPC_FEATURE2_HTM)                               \
  LINE(PPC_DSCR, dscr, "dscr", 0, PPC_FEATURE2_DSCR)                           \
  LINE(PPC_EBB, ebb, "ebb", 0, PPC_FEATURE2_EBB)                               \
  LINE(PPC_ISEL, isel, "isel", 0, PPC_FEATURE2_ISEL)                           \
  LINE(PPC_TAR, tar, "tar", 0, PPC_FEATURE2_TAR)                               \
  LINE(PPC_VEC_CRYPTO, vcrypto, "vcrypto", 0, PPC_FEATURE2_VEC_CRYPTO)         \
  LINE(PPC_HTM_NOSC, htm_nosc, "htm-nosc", 0, PPC_FEATURE2_HTM_NOSC)           \
  LINE(PPC_ARCH_3_00, arch300, "arch_3_00", 0, PPC_FEATURE2_ARCH_3_00)         \
  LINE(PPC_HAS_IEEE128, ieee128, "ieee128", 0, PPC_FEATURE2_HAS_IEEE128)       \
  LINE(PPC_DARN, darn, "darn", 0, PPC_FEATURE2_DARN)                           \
  LINE(PPC_SCV, scv, "scv", 0, PPC_FEATURE2_SCV)                               \
  LINE(PPC_HTM_NO_SUSPEND, htm_no_suspend, "htm-no-suspend", 0,                \
       PPC_FEATURE2_HTM_NO_SUSPEND)
#undef PPC // Remove conflict with compiler generated preprocessor
#define INTROSPECTION_PREFIX PPC
#define INTROSPECTION_ENUM_PREFIX PPC
#include "define_introspection_and_hwcaps.inl"

////////////////////////////////////////////////////////////////////////////////
// Implementation.
////////////////////////////////////////////////////////////////////////////////

#include <stdbool.h>

#include "internal/bit_utils.h"
#include "internal/filesystem.h"
#include "internal/hwcaps.h"
#include "internal/stack_line_reader.h"
#include "internal/string_view.h"

static bool HandlePPCLine(const LineResult result,
                          PPCPlatformStrings* const strings) {
  StringView line = result.line;
  StringView key, value;
  if (CpuFeatures_StringView_GetAttributeKeyValue(line, &key, &value)) {
    if (CpuFeatures_StringView_HasWord(key, "platform", ' ')) {
      CpuFeatures_StringView_CopyString(value, strings->platform,
                                        sizeof(strings->platform));
    } else if (CpuFeatures_StringView_IsEquals(key, str("model"))) {
      CpuFeatures_StringView_CopyString(value, strings->model,
                                        sizeof(strings->platform));
    } else if (CpuFeatures_StringView_IsEquals(key, str("machine"))) {
      CpuFeatures_StringView_CopyString(value, strings->machine,
                                        sizeof(strings->platform));
    } else if (CpuFeatures_StringView_IsEquals(key, str("cpu"))) {
      CpuFeatures_StringView_CopyString(value, strings->cpu,
                                        sizeof(strings->platform));
    }
  }
  return !result.eof;
}

static void FillProcCpuInfoData(PPCPlatformStrings* const strings) {
  const int fd = CpuFeatures_OpenFile("/proc/cpuinfo");
  if (fd >= 0) {
    StackLineReader reader;
    StackLineReader_Initialize(&reader, fd);
    for (;;) {
      if (!HandlePPCLine(StackLineReader_NextLine(&reader), strings)) {
        break;
      }
    }
    CpuFeatures_CloseFile(fd);
  }
}

static const PPCInfo kEmptyPPCInfo;

PPCInfo GetPPCInfo(void) {
  /*
   * On Power feature flags aren't currently in cpuinfo so we only look at
   * the auxilary vector.
   */
  PPCInfo info = kEmptyPPCInfo;
  const HardwareCapabilities hwcaps = CpuFeatures_GetHardwareCapabilities();
  for (size_t i = 0; i < PPC_LAST_; ++i) {
    if (CpuFeatures_IsHwCapsSet(kHardwareCapabilities[i], hwcaps)) {
      kSetters[i](&info.features, true);
    }
  }
  return info;
}

static const PPCPlatformStrings kEmptyPPCPlatformStrings;

PPCPlatformStrings GetPPCPlatformStrings(void) {
  PPCPlatformStrings strings = kEmptyPPCPlatformStrings;
  const char* platform = CpuFeatures_GetPlatformPointer();
  const char* base_platform = CpuFeatures_GetBasePlatformPointer();

  FillProcCpuInfoData(&strings);

  if (platform != NULL)
    CpuFeatures_StringView_CopyString(str(platform), strings.type.platform,
                                      sizeof(strings.type.platform));
  if (base_platform != NULL)
    CpuFeatures_StringView_CopyString(str(base_platform),
                                      strings.type.base_platform,
                                      sizeof(strings.type.base_platform));

  return strings;
}

#endif  // CPU_FEATURES_OS_LINUX
#endif  // CPU_FEATURES_ARCH_PPC
