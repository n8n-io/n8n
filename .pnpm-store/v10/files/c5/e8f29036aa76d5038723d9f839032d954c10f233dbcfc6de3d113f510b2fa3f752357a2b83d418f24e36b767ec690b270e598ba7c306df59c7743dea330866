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

#ifndef CPU_FEATURES_TEST_HWCAPS_FOR_TESTING_H_
#define CPU_FEATURES_TEST_HWCAPS_FOR_TESTING_H_

#include "internal/hwcaps.h"

namespace cpu_features {

void SetHardwareCapabilities(uint32_t hwcaps, uint32_t hwcaps2);
void SetPlatformPointer(const char* string);
void SetBasePlatformPointer(const char* string);

// To be called before each test.
void ResetHwcaps();

}  // namespace cpu_features

#endif  // CPU_FEATURES_TEST_HWCAPS_FOR_TESTING_H_
