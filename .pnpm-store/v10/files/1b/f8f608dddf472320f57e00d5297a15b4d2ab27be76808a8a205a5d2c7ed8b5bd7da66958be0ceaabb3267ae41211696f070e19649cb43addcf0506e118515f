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

#include "cpu_features_macros.h"

#ifdef CPU_FEATURES_ARCH_AARCH64
#if defined(CPU_FEATURES_OS_LINUX) || defined(CPU_FEATURES_OS_ANDROID)

#include "impl_aarch64__base_implementation.inl"

static bool HandleAarch64Line(const LineResult result,
                              Aarch64Info* const info) {
  StringView line = result.line;
  StringView key, value;
  if (CpuFeatures_StringView_GetAttributeKeyValue(line, &key, &value)) {
    if (CpuFeatures_StringView_IsEquals(key, str("Features"))) {
      for (size_t i = 0; i < AARCH64_LAST_; ++i) {
        kSetters[i](&info->features, CpuFeatures_StringView_HasWord(
                                         value, kCpuInfoFlags[i], ' '));
      }
    } else if (CpuFeatures_StringView_IsEquals(key, str("CPU implementer"))) {
      info->implementer = CpuFeatures_StringView_ParsePositiveNumber(value);
    } else if (CpuFeatures_StringView_IsEquals(key, str("CPU variant"))) {
      info->variant = CpuFeatures_StringView_ParsePositiveNumber(value);
    } else if (CpuFeatures_StringView_IsEquals(key, str("CPU part"))) {
      info->part = CpuFeatures_StringView_ParsePositiveNumber(value);
    } else if (CpuFeatures_StringView_IsEquals(key, str("CPU revision"))) {
      info->revision = CpuFeatures_StringView_ParsePositiveNumber(value);
    }
  }
  return !result.eof;
}

static void FillProcCpuInfoData(Aarch64Info* const info) {
  const int fd = CpuFeatures_OpenFile("/proc/cpuinfo");
  if (fd >= 0) {
    StackLineReader reader;
    StackLineReader_Initialize(&reader, fd);
    for (;;) {
      if (!HandleAarch64Line(StackLineReader_NextLine(&reader), info)) {
        break;
      }
    }
    CpuFeatures_CloseFile(fd);
  }
}

static const Aarch64Info kEmptyAarch64Info;

Aarch64Info GetAarch64Info(void) {
  // capabilities are fetched from both getauxval and /proc/cpuinfo so we can
  // have some information if the executable is sandboxed (aka no access to
  // /proc/cpuinfo).
  Aarch64Info info = kEmptyAarch64Info;

  FillProcCpuInfoData(&info);
  const HardwareCapabilities hwcaps = CpuFeatures_GetHardwareCapabilities();
  for (size_t i = 0; i < AARCH64_LAST_; ++i) {
    if (CpuFeatures_IsHwCapsSet(kHardwareCapabilities[i], hwcaps)) {
      kSetters[i](&info.features, true);
    }
  }

  return info;
}

#endif  // defined(CPU_FEATURES_OS_LINUX) || defined(CPU_FEATURES_OS_ANDROID)
#endif  // CPU_FEATURES_ARCH_AARCH64
