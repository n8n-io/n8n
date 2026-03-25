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

#ifndef CPU_FEATURES_INCLUDE_CPUINFO_ARM_H_
#define CPU_FEATURES_INCLUDE_CPUINFO_ARM_H_

#include <stdint.h>  // uint32_t

#include "cpu_features_cache_info.h"
#include "cpu_features_macros.h"

CPU_FEATURES_START_CPP_NAMESPACE

typedef struct {
  int swp : 1;       // SWP instruction (atomic read-modify-write)
  int half : 1;      // Half-word loads and stores
  int thumb : 1;     // Thumb (16-bit instruction set)
  int _26bit : 1;    // "26 Bit" Model (Processor status register folded into
                     // program counter)
  int fastmult : 1;  // 32x32->64-bit multiplication
  int fpa : 1;       // Floating point accelerator
  int vfp : 1;       // Vector Floating Point.
  int edsp : 1;     // DSP extensions (the 'e' variant of the ARM9 CPUs, and all
                    // others above)
  int java : 1;     // Jazelle (Java bytecode accelerator)
  int iwmmxt : 1;   // Intel Wireless MMX Technology.
  int crunch : 1;   // MaverickCrunch coprocessor
  int thumbee : 1;  // ThumbEE
  int neon : 1;     // Advanced SIMD.
  int vfpv3 : 1;    // VFP version 3
  int vfpv3d16 : 1;  // VFP version 3 with 16 D-registers
  int tls : 1;       // TLS register
  int vfpv4 : 1;     // VFP version 4 with fast context switching
  int idiva : 1;     // SDIV and UDIV hardware division in ARM mode.
  int idivt : 1;     // SDIV and UDIV hardware division in Thumb mode.
  int vfpd32 : 1;    // VFP with 32 D-registers
  int lpae : 1;     // Large Physical Address Extension (>4GB physical memory on
                    // 32-bit architecture)
  int evtstrm : 1;  // kernel event stream using generic architected timer
  int aes : 1;      // Hardware-accelerated Advanced Encryption Standard.
  int pmull : 1;    // Polynomial multiply long.
  int sha1 : 1;     // Hardware-accelerated SHA1.
  int sha2 : 1;     // Hardware-accelerated SHA2-256.
  int crc32 : 1;    // Hardware-accelerated CRC-32.

  // Make sure to update ArmFeaturesEnum below if you add a field here.
} ArmFeatures;

typedef struct {
  ArmFeatures features;
  int implementer;
  int architecture;
  int variant;
  int part;
  int revision;
} ArmInfo;

// TODO(user): Add macros to know which features are present at compile
// time.

ArmInfo GetArmInfo(void);

// Compute CpuId from ArmInfo.
uint32_t GetArmCpuId(const ArmInfo* const info);

////////////////////////////////////////////////////////////////////////////////
// Introspection functions

typedef enum {
  ARM_SWP,
  ARM_HALF,
  ARM_THUMB,
  ARM_26BIT,
  ARM_FASTMULT,
  ARM_FPA,
  ARM_VFP,
  ARM_EDSP,
  ARM_JAVA,
  ARM_IWMMXT,
  ARM_CRUNCH,
  ARM_THUMBEE,
  ARM_NEON,
  ARM_VFPV3,
  ARM_VFPV3D16,
  ARM_TLS,
  ARM_VFPV4,
  ARM_IDIVA,
  ARM_IDIVT,
  ARM_VFPD32,
  ARM_LPAE,
  ARM_EVTSTRM,
  ARM_AES,
  ARM_PMULL,
  ARM_SHA1,
  ARM_SHA2,
  ARM_CRC32,
  ARM_LAST_,
} ArmFeaturesEnum;

int GetArmFeaturesEnumValue(const ArmFeatures* features, ArmFeaturesEnum value);

const char* GetArmFeaturesEnumName(ArmFeaturesEnum);

CPU_FEATURES_END_CPP_NAMESPACE

#if !defined(CPU_FEATURES_ARCH_ARM)
#error "Including cpuinfo_arm.h from a non-arm target."
#endif

#endif  // CPU_FEATURES_INCLUDE_CPUINFO_ARM_H_
