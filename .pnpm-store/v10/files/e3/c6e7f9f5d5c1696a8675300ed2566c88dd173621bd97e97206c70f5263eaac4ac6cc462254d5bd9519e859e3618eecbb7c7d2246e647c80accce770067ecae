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

#ifdef CPU_FEATURES_ARCH_MIPS
#if defined(CPU_FEATURES_OS_LINUX) || defined(CPU_FEATURES_OS_ANDROID)

#include "cpuinfo_mips.h"

////////////////////////////////////////////////////////////////////////////////
// Definitions for introspection.
////////////////////////////////////////////////////////////////////////////////
#define INTROSPECTION_TABLE                                     \
  LINE(MIPS_MSA, msa, "msa", MIPS_HWCAP_MSA, 0)                 \
  LINE(MIPS_EVA, eva, "eva", 0, 0)                              \
  LINE(MIPS_R6, r6, "r6", MIPS_HWCAP_R6, 0)                     \
  LINE(MIPS_MIPS16, mips16, "mips16", MIPS_HWCAP_MIPS16, 0)     \
  LINE(MIPS_MDMX, mdmx, "mdmx", MIPS_HWCAP_MDMX, 0)             \
  LINE(MIPS_MIPS3D, mips3d, "mips3d", MIPS_HWCAP_MIPS3D, 0)     \
  LINE(MIPS_SMART, smart, "smartmips", MIPS_HWCAP_SMARTMIPS, 0) \
  LINE(MIPS_DSP, dsp, "dsp", MIPS_HWCAP_DSP, 0)
#define INTROSPECTION_PREFIX Mips
#define INTROSPECTION_ENUM_PREFIX MIPS
#include "define_introspection_and_hwcaps.inl"

////////////////////////////////////////////////////////////////////////////////
// Implementation.
////////////////////////////////////////////////////////////////////////////////

#include "internal/filesystem.h"
#include "internal/hwcaps.h"
#include "internal/stack_line_reader.h"
#include "internal/string_view.h"

static bool HandleMipsLine(const LineResult result,
                           MipsFeatures* const features) {
  StringView key, value;
  // See tests for an example.
  if (CpuFeatures_StringView_GetAttributeKeyValue(result.line, &key, &value)) {
    if (CpuFeatures_StringView_IsEquals(key, str("ASEs implemented"))) {
      for (size_t i = 0; i < MIPS_LAST_; ++i) {
        kSetters[i](features, CpuFeatures_StringView_HasWord(
                                  value, kCpuInfoFlags[i], ' '));
      }
    }
  }
  return !result.eof;
}

static void FillProcCpuInfoData(MipsFeatures* const features) {
  const int fd = CpuFeatures_OpenFile("/proc/cpuinfo");
  if (fd >= 0) {
    StackLineReader reader;
    StackLineReader_Initialize(&reader, fd);
    for (;;) {
      if (!HandleMipsLine(StackLineReader_NextLine(&reader), features)) {
        break;
      }
    }
    CpuFeatures_CloseFile(fd);
  }
}

static const MipsInfo kEmptyMipsInfo;

MipsInfo GetMipsInfo(void) {
  // capabilities are fetched from both getauxval and /proc/cpuinfo so we can
  // have some information if the executable is sandboxed (aka no access to
  // /proc/cpuinfo).
  MipsInfo info = kEmptyMipsInfo;

  FillProcCpuInfoData(&info.features);
  const HardwareCapabilities hwcaps = CpuFeatures_GetHardwareCapabilities();
  for (size_t i = 0; i < MIPS_LAST_; ++i) {
    if (CpuFeatures_IsHwCapsSet(kHardwareCapabilities[i], hwcaps)) {
      kSetters[i](&info.features, true);
    }
  }
  return info;
}

#endif  //  defined(CPU_FEATURES_OS_LINUX) || defined(CPU_FEATURES_OS_ANDROID)
#endif  // CPU_FEATURES_ARCH_MIPS
