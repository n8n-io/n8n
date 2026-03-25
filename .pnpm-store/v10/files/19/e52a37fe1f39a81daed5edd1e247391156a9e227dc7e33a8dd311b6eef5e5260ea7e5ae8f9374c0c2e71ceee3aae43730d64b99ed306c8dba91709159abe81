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
#ifdef CPU_FEATURES_OS_MACOS

#include "impl_x86__base_implementation.inl"

#if !defined(HAVE_SYSCTLBYNAME)
#error "Darwin needs support for sysctlbyname"
#endif
#include <sys/sysctl.h>

#if defined(CPU_FEATURES_MOCK_CPUID_X86)
extern bool GetDarwinSysCtlByName(const char*);
#else  // CPU_FEATURES_MOCK_CPUID_X86
static bool GetDarwinSysCtlByName(const char* name) {
  int enabled;
  size_t enabled_len = sizeof(enabled);
  const int failure = sysctlbyname(name, &enabled, &enabled_len, NULL, 0);
  return failure ? false : enabled;
}
#endif

static void OverrideOsPreserves(OsPreserves* os_preserves) {
  // On Darwin AVX512 support is On-demand.
  // We have to query the OS instead of querying the Zmm save/restore state.
  // https://github.com/apple/darwin-xnu/blob/8f02f2a044b9bb1ad951987ef5bab20ec9486310/osfmk/i386/fpu.c#L173-L199
  os_preserves->avx512_registers = GetDarwinSysCtlByName("hw.optional.avx512f");
}

static void DetectFeaturesFromOs(X86Info* info, X86Features* features) {
  (void)info;
  // Handling Darwin platform through sysctlbyname.
  features->sse = GetDarwinSysCtlByName("hw.optional.sse");
  features->sse2 = GetDarwinSysCtlByName("hw.optional.sse2");
  features->sse3 = GetDarwinSysCtlByName("hw.optional.sse3");
  features->ssse3 = GetDarwinSysCtlByName("hw.optional.supplementalsse3");
  features->sse4_1 = GetDarwinSysCtlByName("hw.optional.sse4_1");
  features->sse4_2 = GetDarwinSysCtlByName("hw.optional.sse4_2");
}

#endif  // CPU_FEATURES_OS_MACOS
#endif  // CPU_FEATURES_ARCH_X86
