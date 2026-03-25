// Copyright 2023 Google LLC
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

#ifdef CPU_FEATURES_ARCH_AARCH64
#ifdef CPU_FEATURES_OS_WINDOWS

#include "cpuinfo_aarch64.h"

////////////////////////////////////////////////////////////////////////////////
// Definitions for introspection.
////////////////////////////////////////////////////////////////////////////////
#define INTROSPECTION_TABLE                  \
  LINE(AARCH64_FP, fp, , , )                 \
  LINE(AARCH64_ASIMD, asimd, , , )           \
  LINE(AARCH64_EVTSTRM, evtstrm, , , )       \
  LINE(AARCH64_AES, aes, , , )               \
  LINE(AARCH64_PMULL, pmull, , , )           \
  LINE(AARCH64_SHA1, sha1, , , )             \
  LINE(AARCH64_SHA2, sha2, , , )             \
  LINE(AARCH64_CRC32, crc32, , , )           \
  LINE(AARCH64_ATOMICS, atomics, , , )       \
  LINE(AARCH64_FPHP, fphp, , , )             \
  LINE(AARCH64_ASIMDHP, asimdhp, , , )       \
  LINE(AARCH64_CPUID, cpuid, , , )           \
  LINE(AARCH64_ASIMDRDM, asimdrdm, , , )     \
  LINE(AARCH64_JSCVT, jscvt, , , )           \
  LINE(AARCH64_FCMA, fcma, , , )             \
  LINE(AARCH64_LRCPC, lrcpc, , , )           \
  LINE(AARCH64_DCPOP, dcpop, , , )           \
  LINE(AARCH64_SHA3, sha3, , , )             \
  LINE(AARCH64_SM3, sm3, , , )               \
  LINE(AARCH64_SM4, sm4, , , )               \
  LINE(AARCH64_ASIMDDP, asimddp, , , )       \
  LINE(AARCH64_SHA512, sha512, , , )         \
  LINE(AARCH64_SVE, sve, , , )               \
  LINE(AARCH64_ASIMDFHM, asimdfhm, , , )     \
  LINE(AARCH64_DIT, dit, , , )               \
  LINE(AARCH64_USCAT, uscat, , , )           \
  LINE(AARCH64_ILRCPC, ilrcpc, , , )         \
  LINE(AARCH64_FLAGM, flagm, , , )           \
  LINE(AARCH64_SSBS, ssbs, , , )             \
  LINE(AARCH64_SB, sb, , , )                 \
  LINE(AARCH64_PACA, paca, , , )             \
  LINE(AARCH64_PACG, pacg, , , )             \
  LINE(AARCH64_DCPODP, dcpodp, , , )         \
  LINE(AARCH64_SVE2, sve2, , , )             \
  LINE(AARCH64_SVEAES, sveaes, , , )         \
  LINE(AARCH64_SVEPMULL, svepmull, , , )     \
  LINE(AARCH64_SVEBITPERM, svebitperm, , , ) \
  LINE(AARCH64_SVESHA3, svesha3, , , )       \
  LINE(AARCH64_SVESM4, svesm4, , , )         \
  LINE(AARCH64_FLAGM2, flagm2, , , )         \
  LINE(AARCH64_FRINT, frint, , , )           \
  LINE(AARCH64_SVEI8MM, svei8mm, , , )       \
  LINE(AARCH64_SVEF32MM, svef32mm, , , )     \
  LINE(AARCH64_SVEF64MM, svef64mm, , , )     \
  LINE(AARCH64_SVEBF16, svebf16, , , )       \
  LINE(AARCH64_I8MM, i8mm, , , )             \
  LINE(AARCH64_BF16, bf16, , , )             \
  LINE(AARCH64_DGH, dgh, , , )               \
  LINE(AARCH64_RNG, rng, , , )               \
  LINE(AARCH64_BTI, bti, , , )               \
  LINE(AARCH64_MTE, mte, , , )               \
  LINE(AARCH64_ECV, ecv, , , )               \
  LINE(AARCH64_AFP, afp, , , )               \
  LINE(AARCH64_RPRES, rpres, , , )
#define INTROSPECTION_PREFIX Aarch64
#define INTROSPECTION_ENUM_PREFIX AARCH64
#include "define_introspection.inl"

////////////////////////////////////////////////////////////////////////////////
// Implementation.
////////////////////////////////////////////////////////////////////////////////

#include <stdbool.h>

#include "internal/windows_utils.h"

#ifdef CPU_FEATURES_MOCK_CPUID_AARCH64
extern bool GetWindowsIsProcessorFeaturePresent(DWORD);
extern WORD GetWindowsNativeSystemInfoProcessorRevision();
#else  // CPU_FEATURES_MOCK_CPUID_AARCH64
static bool GetWindowsIsProcessorFeaturePresent(DWORD dwProcessorFeature) {
  return IsProcessorFeaturePresent(dwProcessorFeature);
}

static WORD GetWindowsNativeSystemInfoProcessorRevision() {
  SYSTEM_INFO system_info;
  GetNativeSystemInfo(&system_info);
  return system_info.wProcessorRevision;
}
#endif

static const Aarch64Info kEmptyAarch64Info;

Aarch64Info GetAarch64Info(void) {
  Aarch64Info info = kEmptyAarch64Info;
  info.revision = GetWindowsNativeSystemInfoProcessorRevision();
  info.features.fp =
      GetWindowsIsProcessorFeaturePresent(PF_ARM_VFP_32_REGISTERS_AVAILABLE);
  info.features.asimd =
      GetWindowsIsProcessorFeaturePresent(PF_ARM_NEON_INSTRUCTIONS_AVAILABLE);
  info.features.crc32 = GetWindowsIsProcessorFeaturePresent(
      PF_ARM_V8_CRC32_INSTRUCTIONS_AVAILABLE);
  info.features.asimddp =
      GetWindowsIsProcessorFeaturePresent(PF_ARM_V82_DP_INSTRUCTIONS_AVAILABLE);
  info.features.jscvt = GetWindowsIsProcessorFeaturePresent(
      PF_ARM_V83_JSCVT_INSTRUCTIONS_AVAILABLE);
  info.features.lrcpc = GetWindowsIsProcessorFeaturePresent(
      PF_ARM_V83_LRCPC_INSTRUCTIONS_AVAILABLE);
  info.features.atomics = GetWindowsIsProcessorFeaturePresent(
      PF_ARM_V81_ATOMIC_INSTRUCTIONS_AVAILABLE);


  bool is_crypto_available = GetWindowsIsProcessorFeaturePresent(
      PF_ARM_V8_CRYPTO_INSTRUCTIONS_AVAILABLE);
  info.features.aes = is_crypto_available;
  info.features.sha1 = is_crypto_available;
  info.features.sha2 = is_crypto_available;
  info.features.pmull = is_crypto_available;
  return info;
}

#endif  // CPU_FEATURES_OS_WINDOWS
#endif  // CPU_FEATURES_ARCH_AARCH64
