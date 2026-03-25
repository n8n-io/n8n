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

#include "cpu_features_macros.h"

#ifdef CPU_FEATURES_ARCH_S390X
#ifdef CPU_FEATURES_OS_LINUX

#include "cpuinfo_s390x.h"

////////////////////////////////////////////////////////////////////////////////
// Definitions for introspection.
////////////////////////////////////////////////////////////////////////////////
#define INTROSPECTION_TABLE                                                    \
  LINE(S390_ESAN3, esan3, "esan3", HWCAP_S390_ESAN3, 0)                              \
  LINE(S390_ZARCH, zarch, "zarch", HWCAP_S390_ZARCH, 0)                              \
  LINE(S390_STFLE, stfle, "stfle", HWCAP_S390_STFLE, 0)                              \
  LINE(S390_MSA, msa, "msa", HWCAP_S390_MSA, 0)                                      \
  LINE(S390_LDISP, ldisp, "ldisp", HWCAP_S390_LDISP, 0)                              \
  LINE(S390_EIMM, eimm, "eimm", HWCAP_S390_EIMM, 0)                                  \
  LINE(S390_DFP, dfp, "dfp", HWCAP_S390_DFP, 0)                                      \
  LINE(S390_EDAT, edat, "edat", HWCAP_S390_HPAGE, 0)                                 \
  LINE(S390_ETF3EH, etf3eh, "etf3eh", HWCAP_S390_ETF3EH, 0)                          \
  LINE(S390_HIGHGPRS, highgprs, "highgprs", HWCAP_S390_HIGH_GPRS, 0)                 \
  LINE(S390_TE, te, "te", HWCAP_S390_TE, 0)                                          \
  LINE(S390_VX, vx, "vx", HWCAP_S390_VXRS, 0)                                        \
  LINE(S390_VXD, vxd, "vxd", HWCAP_S390_VXRS_BCD, 0)                                 \
  LINE(S390_VXE, vxe, "vxe", HWCAP_S390_VXRS_EXT, 0)                                 \
  LINE(S390_GS, gs, "gs", HWCAP_S390_GS, 0)                                          \
  LINE(S390_VXE2, vxe2, "vxe2", HWCAP_S390_VXRS_EXT2, 0)                             \
  LINE(S390_VXP, vxp, "vxp", HWCAP_S390_VXRS_PDE, 0)                                 \
  LINE(S390_SORT, sort, "sort", HWCAP_S390_SORT, 0)                                  \
  LINE(S390_DFLT, dflt, "dflt", HWCAP_S390_DFLT, 0)                                  \
  LINE(S390_VXP2, vxp2, "vxp2", HWCAP_S390_VXRS_PDE2, 0)                             \
  LINE(S390_NNPA, nnpa, "nnpa", HWCAP_S390_NNPA, 0)                                  \
  LINE(S390_PCIMIO, pcimio, "pcimio", HWCAP_S390_PCI_MIO, 0)                         \
  LINE(S390_SIE, sie, "sie", HWCAP_S390_SIE, 0)
#define INTROSPECTION_PREFIX S390X
#define INTROSPECTION_ENUM_PREFIX S390X
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

static bool HandleS390XLine(const LineResult result,
                          S390XPlatformStrings* const strings) {
  StringView line = result.line;
  StringView key, value;
  if (CpuFeatures_StringView_GetAttributeKeyValue(line, &key, &value)) {
    if (CpuFeatures_StringView_IsEquals(key, str("# processors"))) {
        strings->num_processors = CpuFeatures_StringView_ParsePositiveNumber(value);
    }
  }
  return !result.eof;
}

static void FillProcCpuInfoData(S390XPlatformStrings* const strings) {
  const int fd = CpuFeatures_OpenFile("/proc/cpuinfo");
  if (fd >= 0) {
    StackLineReader reader;
    StackLineReader_Initialize(&reader, fd);
    for (;;) {
      if (!HandleS390XLine(StackLineReader_NextLine(&reader), strings)) {
        break;
      }
    }
    CpuFeatures_CloseFile(fd);
  }
}

static const S390XInfo kEmptyS390XInfo;

S390XInfo GetS390XInfo(void) {
  S390XInfo info = kEmptyS390XInfo;
  const HardwareCapabilities hwcaps = CpuFeatures_GetHardwareCapabilities();
  for (size_t i = 0; i < S390X_LAST_; ++i) {
    if (CpuFeatures_IsHwCapsSet(kHardwareCapabilities[i], hwcaps)) {
      kSetters[i](&info.features, true);
    }
  }
  return info;
}

static const S390XPlatformStrings kEmptyS390XPlatformStrings;

S390XPlatformStrings GetS390XPlatformStrings(void) {
  S390XPlatformStrings strings = kEmptyS390XPlatformStrings;
  const char* platform = CpuFeatures_GetPlatformPointer();

  FillProcCpuInfoData(&strings);

  if (platform != NULL)
    CpuFeatures_StringView_CopyString(str(platform), strings.type.platform,
                                      sizeof(strings.type.platform));

  return strings;
}

#endif  // CPU_FEATURES_OS_LINUX
#endif  // CPU_FEATURES_ARCH_S390X
