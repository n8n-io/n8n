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

#include "internal/hwcaps.h"

#include <stdlib.h>
#include <string.h>

#include "cpu_features_macros.h"
#include "internal/filesystem.h"
#include "internal/string_view.h"

static bool IsSet(const uint32_t mask, const uint32_t value) {
  if (mask == 0) return false;
  return (value & mask) == mask;
}

bool CpuFeatures_IsHwCapsSet(const HardwareCapabilities hwcaps_mask,
                             const HardwareCapabilities hwcaps) {
  return IsSet(hwcaps_mask.hwcaps, hwcaps.hwcaps) ||
         IsSet(hwcaps_mask.hwcaps2, hwcaps.hwcaps2);
}

#ifdef CPU_FEATURES_TEST
// In test mode, hwcaps_for_testing will define the following functions.
HardwareCapabilities CpuFeatures_GetHardwareCapabilities(void);
const char* CpuFeatures_GetPlatformPointer(void);
const char* CpuFeatures_GetBasePlatformPointer(void);
#else

// Debug facilities
#if defined(NDEBUG)
#define D(...)
#else
#include <stdio.h>
#define D(...)           \
  do {                   \
    printf(__VA_ARGS__); \
    fflush(stdout);      \
  } while (0)
#endif

////////////////////////////////////////////////////////////////////////////////
// Implementation of GetElfHwcapFromGetauxval
////////////////////////////////////////////////////////////////////////////////

#define AT_HWCAP 16
#define AT_HWCAP2 26
#define AT_PLATFORM 15
#define AT_BASE_PLATFORM 24

#if defined(HAVE_STRONG_GETAUXVAL)
#include <sys/auxv.h>
static unsigned long GetElfHwcapFromGetauxval(uint32_t hwcap_type) {
  return getauxval(hwcap_type);
}
#elif defined(HAVE_DLFCN_H)
// On Android we probe the system's C library for a 'getauxval' function and
// call it if it exits, or return 0 for failure. This function is available
// since API level 18.
//
// Note that getauxval() can't really be re-implemented here, because its
// implementation does not parse /proc/self/auxv. Instead it depends on values
// that are passed by the kernel at process-init time to the C runtime
// initialization layer.

#include <dlfcn.h>

typedef unsigned long getauxval_func_t(unsigned long);

static uint32_t GetElfHwcapFromGetauxval(uint32_t hwcap_type) {
  uint32_t ret = 0;
  void *libc_handle = NULL;
  getauxval_func_t *func = NULL;

  dlerror();  // Cleaning error state before calling dlopen.
  libc_handle = dlopen("libc.so", RTLD_NOW);
  if (!libc_handle) {
    D("Could not dlopen() C library: %s\n", dlerror());
    return 0;
  }
  func = (getauxval_func_t *)dlsym(libc_handle, "getauxval");
  if (!func) {
    D("Could not find getauxval() in C library\n");
  } else {
    // Note: getauxval() returns 0 on failure. Doesn't touch errno.
    ret = (uint32_t)(*func)(hwcap_type);
  }
  dlclose(libc_handle);
  return ret;
}
#else
#error "This platform does not provide hardware capabilities."
#endif

// Implementation of GetHardwareCapabilities for OS that provide
// GetElfHwcapFromGetauxval().

// Fallback when getauxval is not available, retrieves hwcaps from
// "/proc/self/auxv".
static uint32_t GetElfHwcapFromProcSelfAuxv(uint32_t hwcap_type) {
  struct {
    uint32_t tag;
    uint32_t value;
  } entry;
  uint32_t result = 0;
  const char filepath[] = "/proc/self/auxv";
  const int fd = CpuFeatures_OpenFile(filepath);
  if (fd < 0) {
    D("Could not open %s\n", filepath);
    return 0;
  }
  for (;;) {
    const int ret = CpuFeatures_ReadFile(fd, (char *)&entry, sizeof entry);
    if (ret < 0) {
      D("Error while reading %s\n", filepath);
      break;
    }
    // Detect end of list.
    if (ret == 0 || (entry.tag == 0 && entry.value == 0)) {
      break;
    }
    if (entry.tag == hwcap_type) {
      result = entry.value;
      break;
    }
  }
  CpuFeatures_CloseFile(fd);
  return result;
}

// Retrieves hardware capabilities by first trying to call getauxval, if not
// available falls back to reading "/proc/self/auxv".
static unsigned long GetHardwareCapabilitiesFor(uint32_t type) {
  unsigned long hwcaps = GetElfHwcapFromGetauxval(type);
  if (!hwcaps) {
    D("Parsing /proc/self/auxv to extract ELF hwcaps!\n");
    hwcaps = GetElfHwcapFromProcSelfAuxv(type);
  }
  return hwcaps;
}

HardwareCapabilities CpuFeatures_GetHardwareCapabilities(void) {
  HardwareCapabilities capabilities;
  capabilities.hwcaps = GetHardwareCapabilitiesFor(AT_HWCAP);
  capabilities.hwcaps2 = GetHardwareCapabilitiesFor(AT_HWCAP2);
  return capabilities;
}

const char *CpuFeatures_GetPlatformPointer(void) {
  return (const char *)GetHardwareCapabilitiesFor(AT_PLATFORM);
}

const char *CpuFeatures_GetBasePlatformPointer(void) {
  return (const char *)GetHardwareCapabilitiesFor(AT_BASE_PLATFORM);
}

#endif  // CPU_FEATURES_TEST
