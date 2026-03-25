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

#ifdef CPU_FEATURES_ARCH_X86
#if defined(CPU_FEATURES_OS_LINUX) || defined(CPU_FEATURES_OS_ANDROID)

#include "impl_x86__base_implementation.inl"

static void OverrideOsPreserves(OsPreserves* os_preserves) {
  (void)os_preserves;
  // No override
}

#include "internal/filesystem.h"
#include "internal/stack_line_reader.h"
#include "internal/string_view.h"
static void DetectFeaturesFromOs(X86Info* info, X86Features* features) {
  (void)info;
  // Handling Linux platform through /proc/cpuinfo.
  const int fd = CpuFeatures_OpenFile("/proc/cpuinfo");
  if (fd >= 0) {
    StackLineReader reader;
    StackLineReader_Initialize(&reader, fd);
    for (bool stop = false; !stop;) {
      const LineResult result = StackLineReader_NextLine(&reader);
      if (result.eof) stop = true;
      const StringView line = result.line;
      StringView key, value;
      if (!CpuFeatures_StringView_GetAttributeKeyValue(line, &key, &value))
        continue;
      if (!CpuFeatures_StringView_IsEquals(key, str("flags"))) continue;
      features->sse = CpuFeatures_StringView_HasWord(value, "sse", ' ');
      features->sse2 = CpuFeatures_StringView_HasWord(value, "sse2", ' ');
      features->sse3 = CpuFeatures_StringView_HasWord(value, "pni", ' ');
      features->ssse3 = CpuFeatures_StringView_HasWord(value, "ssse3", ' ');
      features->sse4_1 = CpuFeatures_StringView_HasWord(value, "sse4_1", ' ');
      features->sse4_2 = CpuFeatures_StringView_HasWord(value, "sse4_2", ' ');
      break;
    }
    CpuFeatures_CloseFile(fd);
  }
}

#endif  // defined(CPU_FEATURES_OS_LINUX) || defined(CPU_FEATURES_OS_ANDROID)
#endif  // CPU_FEATURES_ARCH_X86
