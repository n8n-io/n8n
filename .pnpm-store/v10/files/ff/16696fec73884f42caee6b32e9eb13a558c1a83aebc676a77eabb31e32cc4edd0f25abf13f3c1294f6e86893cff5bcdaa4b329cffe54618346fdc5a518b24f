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

#ifndef CPU_FEATURES_INCLUDE_INTERNAL_CPUID_X86_H_
#define CPU_FEATURES_INCLUDE_INTERNAL_CPUID_X86_H_

#include <stdint.h>

#include "cpu_features_macros.h"

CPU_FEATURES_START_CPP_NAMESPACE

// A struct to hold the result of a call to cpuid.
typedef struct {
  uint32_t eax, ebx, ecx, edx;
} Leaf;

// Returns the result of a call to the cpuid instruction.
Leaf GetCpuidLeaf(uint32_t leaf_id, int ecx);

// Returns the eax value of the XCR0 register.
uint32_t GetXCR0Eax(void);

CPU_FEATURES_END_CPP_NAMESPACE

#endif  // CPU_FEATURES_INCLUDE_INTERNAL_CPUID_X86_H_
