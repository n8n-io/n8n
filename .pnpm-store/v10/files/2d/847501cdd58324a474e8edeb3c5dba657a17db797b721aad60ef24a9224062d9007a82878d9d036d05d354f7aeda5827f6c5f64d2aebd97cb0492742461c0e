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

#include "define_introspection.inl"
#include "internal/hwcaps.h"

#define LINE(ENUM, NAME, CPUINFO_FLAG, HWCAP, HWCAP2) \
  [ENUM] = (HardwareCapabilities){HWCAP, HWCAP2},
static const HardwareCapabilities kHardwareCapabilities[] = {
    INTROSPECTION_TABLE};
#undef LINE

#define LINE(ENUM, NAME, CPUINFO_FLAG, HWCAP, HWCAP2) [ENUM] = CPUINFO_FLAG,
static const char* kCpuInfoFlags[] = {INTROSPECTION_TABLE};
#undef LINE
