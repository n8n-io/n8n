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

#include "hwcaps_for_testing.h"

#include <string.h>

#include "internal/string_view.h"

namespace cpu_features {

namespace {
static auto* const g_hardware_capabilities = new HardwareCapabilities();
static const char* g_platform_pointer = nullptr;
static const char* g_base_platform_pointer = nullptr;
}  // namespace

void SetHardwareCapabilities(uint32_t hwcaps, uint32_t hwcaps2) {
  g_hardware_capabilities->hwcaps = hwcaps;
  g_hardware_capabilities->hwcaps2 = hwcaps2;
}
void SetPlatformPointer(const char* string) { g_platform_pointer = string; }
void SetBasePlatformPointer(const char* string) {
  g_base_platform_pointer = string;
}

void ResetHwcaps() {
  SetHardwareCapabilities(0, 0);
  SetPlatformPointer(nullptr);
  SetBasePlatformPointer(nullptr);
}

HardwareCapabilities CpuFeatures_GetHardwareCapabilities(void) {
  return *g_hardware_capabilities;
}
const char* CpuFeatures_GetPlatformPointer(void) { return g_platform_pointer; }
const char* CpuFeatures_GetBasePlatformPointer(void) {
  return g_base_platform_pointer;
}

}  // namespace cpu_features
