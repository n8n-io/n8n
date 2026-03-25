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
#ifdef CPU_FEATURES_OS_FREEBSD

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
  // Handling FreeBSD platform through parsing /var/run/dmesg.boot.
  const int fd = CpuFeatures_OpenFile("/var/run/dmesg.boot");
  if (fd >= 0) {
    StackLineReader reader;
    StackLineReader_Initialize(&reader, fd);
    for (bool stop = false; !stop;) {
      const LineResult result = StackLineReader_NextLine(&reader);
      if (result.eof) stop = true;
      const StringView line = result.line;
      if (!CpuFeatures_StringView_StartsWith(line, str("  Features"))) continue;
      // Lines of interests are of the following form:
      // "  Features=0x1783fbff<PSE36,MMX,FXSR,SSE,SSE2,HTT>"
      // We first extract the comma separated values between angle brackets.
      StringView csv = result.line;
      int index = CpuFeatures_StringView_IndexOfChar(csv, '<');
      if (index >= 0) csv = CpuFeatures_StringView_PopFront(csv, index + 1);
      if (csv.size > 0 && CpuFeatures_StringView_Back(csv) == '>')
        csv = CpuFeatures_StringView_PopBack(csv, 1);
      if (CpuFeatures_StringView_HasWord(csv, "SSE", ',')) features->sse = true;
      if (CpuFeatures_StringView_HasWord(csv, "SSE2", ','))
        features->sse2 = true;
      if (CpuFeatures_StringView_HasWord(csv, "SSE3", ','))
        features->sse3 = true;
      if (CpuFeatures_StringView_HasWord(csv, "SSSE3", ','))
        features->ssse3 = true;
      if (CpuFeatures_StringView_HasWord(csv, "SSE4.1", ','))
        features->sse4_1 = true;
      if (CpuFeatures_StringView_HasWord(csv, "SSE4.2", ','))
        features->sse4_2 = true;
    }
    CpuFeatures_CloseFile(fd);
  }
}

#endif  // CPU_FEATURES_OS_FREEBSD
#endif  // CPU_FEATURES_ARCH_X86
