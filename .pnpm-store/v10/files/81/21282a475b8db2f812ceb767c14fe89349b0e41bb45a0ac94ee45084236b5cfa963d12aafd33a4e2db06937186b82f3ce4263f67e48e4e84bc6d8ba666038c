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

// An interface for the filesystem that allows mocking the filesystem in
// unittests.
#ifndef CPU_FEATURES_INCLUDE_INTERNAL_FILESYSTEM_H_
#define CPU_FEATURES_INCLUDE_INTERNAL_FILESYSTEM_H_

#include <stddef.h>
#include <stdint.h>

#include "cpu_features_macros.h"

CPU_FEATURES_START_CPP_NAMESPACE

// Same as linux "open(filename, O_RDONLY)", retries automatically on EINTR.
int CpuFeatures_OpenFile(const char* filename);

// Same as linux "read(file_descriptor, buffer, buffer_size)", retries
// automatically on EINTR.
int CpuFeatures_ReadFile(int file_descriptor, void* buffer, size_t buffer_size);

// Same as linux "close(file_descriptor)".
void CpuFeatures_CloseFile(int file_descriptor);

CPU_FEATURES_END_CPP_NAMESPACE

#endif  // CPU_FEATURES_INCLUDE_INTERNAL_FILESYSTEM_H_
