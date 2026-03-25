// Copyright 2022 Google LLC
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

#ifdef CPU_FEATURES_ARCH_RISCV
#if defined(CPU_FEATURES_OS_LINUX)

#include "cpuinfo_riscv.h"

// According to
// https://elixir.bootlin.com/linux/latest/source/Documentation/devicetree/bindings/riscv/cpus.yaml
// isa string should match the following regex
// ^rv(?:64|32)imaf?d?q?c?b?v?k?h?(?:_[hsxz](?:[a-z])+)*$
//
// This means we can test for features in this exact order except for Z
// extensions.

////////////////////////////////////////////////////////////////////////////////
// Definitions for introspection.
////////////////////////////////////////////////////////////////////////////////
#define INTROSPECTION_TABLE                            \
  LINE(RISCV_RV32I, RV32I, "rv32i", RISCV_HWCAP_32, 0) \
  LINE(RISCV_RV64I, RV64I, "rv64i", RISCV_HWCAP_64, 0) \
  LINE(RISCV_M, M, "m", RISCV_HWCAP_M, 0)              \
  LINE(RISCV_A, A, "a", RISCV_HWCAP_A, 0)              \
  LINE(RISCV_F, F, "f", RISCV_HWCAP_F, 0)              \
  LINE(RISCV_D, D, "d", RISCV_HWCAP_D, 0)              \
  LINE(RISCV_Q, Q, "q", RISCV_HWCAP_Q, 0)              \
  LINE(RISCV_C, C, "c", RISCV_HWCAP_C, 0)              \
  LINE(RISCV_V, V, "v", RISCV_HWCAP_V, 0)              \
  LINE(RISCV_Zicsr, Zicsr, "_zicsr", 0, 0)             \
  LINE(RISCV_Zifencei, Zifencei, "_zifencei", 0, 0)
#define INTROSPECTION_PREFIX Riscv
#define INTROSPECTION_ENUM_PREFIX RISCV
#include "define_introspection_and_hwcaps.inl"

////////////////////////////////////////////////////////////////////////////////
// Implementation.
////////////////////////////////////////////////////////////////////////////////

#include <stdbool.h>
#include <stdio.h>

#include "internal/filesystem.h"
#include "internal/stack_line_reader.h"

static const RiscvInfo kEmptyRiscvInfo;

static void HandleRiscVIsaLine(StringView line, RiscvFeatures* const features) {
  for (size_t i = 0; i < RISCV_LAST_; ++i) {
    StringView flag = str(kCpuInfoFlags[i]);
    int index_of_flag = CpuFeatures_StringView_IndexOf(line, flag);
    bool is_set = index_of_flag != -1;
    kSetters[i](features, is_set);
    if (is_set)
      line = CpuFeatures_StringView_PopFront(line, index_of_flag + flag.size);
  }
}

static bool HandleRiscVLine(const LineResult result, RiscvInfo* const info) {
  StringView line = result.line;
  StringView key, value;
  if (CpuFeatures_StringView_GetAttributeKeyValue(line, &key, &value)) {
    if (CpuFeatures_StringView_IsEquals(key, str("isa"))) {
      HandleRiscVIsaLine(value, &info->features);
    } else if (CpuFeatures_StringView_IsEquals(key, str("uarch"))) {
      int index = CpuFeatures_StringView_IndexOfChar(value, ',');
      if (index == -1) return true;
      StringView vendor = CpuFeatures_StringView_KeepFront(value, index);
      StringView uarch = CpuFeatures_StringView_PopFront(value, index + 1);
      CpuFeatures_StringView_CopyString(vendor, info->vendor,
                                        sizeof(info->vendor));
      CpuFeatures_StringView_CopyString(uarch, info->uarch,
                                        sizeof(info->uarch));
    }
  }
  return !result.eof;
}

static void FillProcCpuInfoData(RiscvInfo* const info) {
  const int fd = CpuFeatures_OpenFile("/proc/cpuinfo");
  if (fd >= 0) {
    StackLineReader reader;
    StackLineReader_Initialize(&reader, fd);
    for (;;) {
      if (!HandleRiscVLine(StackLineReader_NextLine(&reader), info)) break;
    }
    CpuFeatures_CloseFile(fd);
  }
}

RiscvInfo GetRiscvInfo(void) {
  RiscvInfo info = kEmptyRiscvInfo;
  FillProcCpuInfoData(&info);
  return info;
}

#endif  //  defined(CPU_FEATURES_OS_LINUX) || defined(CPU_FEATURES_OS_ANDROID)
#endif  // CPU_FEATURES_ARCH_RISCV
