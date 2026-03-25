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

// Interface to retrieve hardware capabilities. It relies on Linux's getauxval
// or `/proc/self/auxval` under the hood.
#ifndef CPU_FEATURES_INCLUDE_INTERNAL_HWCAPS_H_
#define CPU_FEATURES_INCLUDE_INTERNAL_HWCAPS_H_

#include <stdbool.h>
#include <stdint.h>

#include "cpu_features_macros.h"

CPU_FEATURES_START_CPP_NAMESPACE

// To avoid depending on the linux kernel we reproduce the architecture specific
// constants here.

// http://elixir.free-electrons.com/linux/latest/source/arch/arm64/include/uapi/asm/hwcap.h
#define AARCH64_HWCAP_FP (1UL << 0)
#define AARCH64_HWCAP_ASIMD (1UL << 1)
#define AARCH64_HWCAP_EVTSTRM (1UL << 2)
#define AARCH64_HWCAP_AES (1UL << 3)
#define AARCH64_HWCAP_PMULL (1UL << 4)
#define AARCH64_HWCAP_SHA1 (1UL << 5)
#define AARCH64_HWCAP_SHA2 (1UL << 6)
#define AARCH64_HWCAP_CRC32 (1UL << 7)
#define AARCH64_HWCAP_ATOMICS (1UL << 8)
#define AARCH64_HWCAP_FPHP (1UL << 9)
#define AARCH64_HWCAP_ASIMDHP (1UL << 10)
#define AARCH64_HWCAP_CPUID (1UL << 11)
#define AARCH64_HWCAP_ASIMDRDM (1UL << 12)
#define AARCH64_HWCAP_JSCVT (1UL << 13)
#define AARCH64_HWCAP_FCMA (1UL << 14)
#define AARCH64_HWCAP_LRCPC (1UL << 15)
#define AARCH64_HWCAP_DCPOP (1UL << 16)
#define AARCH64_HWCAP_SHA3 (1UL << 17)
#define AARCH64_HWCAP_SM3 (1UL << 18)
#define AARCH64_HWCAP_SM4 (1UL << 19)
#define AARCH64_HWCAP_ASIMDDP (1UL << 20)
#define AARCH64_HWCAP_SHA512 (1UL << 21)
#define AARCH64_HWCAP_SVE (1UL << 22)
#define AARCH64_HWCAP_ASIMDFHM (1UL << 23)
#define AARCH64_HWCAP_DIT (1UL << 24)
#define AARCH64_HWCAP_USCAT (1UL << 25)
#define AARCH64_HWCAP_ILRCPC (1UL << 26)
#define AARCH64_HWCAP_FLAGM (1UL << 27)
#define AARCH64_HWCAP_SSBS (1UL << 28)
#define AARCH64_HWCAP_SB (1UL << 29)
#define AARCH64_HWCAP_PACA (1UL << 30)
#define AARCH64_HWCAP_PACG (1UL << 31)

#define AARCH64_HWCAP2_DCPODP (1UL << 0)
#define AARCH64_HWCAP2_SVE2 (1UL << 1)
#define AARCH64_HWCAP2_SVEAES (1UL << 2)
#define AARCH64_HWCAP2_SVEPMULL (1UL << 3)
#define AARCH64_HWCAP2_SVEBITPERM (1UL << 4)
#define AARCH64_HWCAP2_SVESHA3 (1UL << 5)
#define AARCH64_HWCAP2_SVESM4 (1UL << 6)
#define AARCH64_HWCAP2_FLAGM2 (1UL << 7)
#define AARCH64_HWCAP2_FRINT (1UL << 8)
#define AARCH64_HWCAP2_SVEI8MM (1UL << 9)
#define AARCH64_HWCAP2_SVEF32MM (1UL << 10)
#define AARCH64_HWCAP2_SVEF64MM (1UL << 11)
#define AARCH64_HWCAP2_SVEBF16 (1UL << 12)
#define AARCH64_HWCAP2_I8MM (1UL << 13)
#define AARCH64_HWCAP2_BF16 (1UL << 14)
#define AARCH64_HWCAP2_DGH (1UL << 15)
#define AARCH64_HWCAP2_RNG (1UL << 16)
#define AARCH64_HWCAP2_BTI (1UL << 17)
#define AARCH64_HWCAP2_MTE (1UL << 18)
#define AARCH64_HWCAP2_ECV (1UL << 19)
#define AARCH64_HWCAP2_AFP (1UL << 20)
#define AARCH64_HWCAP2_RPRES (1UL << 21)

// http://elixir.free-electrons.com/linux/latest/source/arch/arm/include/uapi/asm/hwcap.h
#define ARM_HWCAP_SWP (1UL << 0)
#define ARM_HWCAP_HALF (1UL << 1)
#define ARM_HWCAP_THUMB (1UL << 2)
#define ARM_HWCAP_26BIT (1UL << 3)
#define ARM_HWCAP_FAST_MULT (1UL << 4)
#define ARM_HWCAP_FPA (1UL << 5)
#define ARM_HWCAP_VFP (1UL << 6)
#define ARM_HWCAP_EDSP (1UL << 7)
#define ARM_HWCAP_JAVA (1UL << 8)
#define ARM_HWCAP_IWMMXT (1UL << 9)
#define ARM_HWCAP_CRUNCH (1UL << 10)
#define ARM_HWCAP_THUMBEE (1UL << 11)
#define ARM_HWCAP_NEON (1UL << 12)
#define ARM_HWCAP_VFPV3 (1UL << 13)
#define ARM_HWCAP_VFPV3D16 (1UL << 14)
#define ARM_HWCAP_TLS (1UL << 15)
#define ARM_HWCAP_VFPV4 (1UL << 16)
#define ARM_HWCAP_IDIVA (1UL << 17)
#define ARM_HWCAP_IDIVT (1UL << 18)
#define ARM_HWCAP_VFPD32 (1UL << 19)
#define ARM_HWCAP_LPAE (1UL << 20)
#define ARM_HWCAP_EVTSTRM (1UL << 21)
#define ARM_HWCAP2_AES (1UL << 0)
#define ARM_HWCAP2_PMULL (1UL << 1)
#define ARM_HWCAP2_SHA1 (1UL << 2)
#define ARM_HWCAP2_SHA2 (1UL << 3)
#define ARM_HWCAP2_CRC32 (1UL << 4)

// http://elixir.free-electrons.com/linux/latest/source/arch/mips/include/uapi/asm/hwcap.h
#define MIPS_HWCAP_R6 (1UL << 0)
#define MIPS_HWCAP_MSA (1UL << 1)
#define MIPS_HWCAP_CRC32 (1UL << 2)
#define MIPS_HWCAP_MIPS16 (1UL << 3)
#define MIPS_HWCAP_MDMX (1UL << 4)
#define MIPS_HWCAP_MIPS3D (1UL << 5)
#define MIPS_HWCAP_SMARTMIPS (1UL << 6)
#define MIPS_HWCAP_DSP (1UL << 7)
#define MIPS_HWCAP_DSP2 (1UL << 8)
#define MIPS_HWCAP_DSP3 (1UL << 9)

// http://elixir.free-electrons.com/linux/latest/source/arch/powerpc/include/uapi/asm/cputable.h
#ifndef _UAPI__ASM_POWERPC_CPUTABLE_H
/* in AT_HWCAP */
#define PPC_FEATURE_32 0x80000000
#define PPC_FEATURE_64 0x40000000
#define PPC_FEATURE_601_INSTR 0x20000000
#define PPC_FEATURE_HAS_ALTIVEC 0x10000000
#define PPC_FEATURE_HAS_FPU 0x08000000
#define PPC_FEATURE_HAS_MMU 0x04000000
#define PPC_FEATURE_HAS_4xxMAC 0x02000000
#define PPC_FEATURE_UNIFIED_CACHE 0x01000000
#define PPC_FEATURE_HAS_SPE 0x00800000
#define PPC_FEATURE_HAS_EFP_SINGLE 0x00400000
#define PPC_FEATURE_HAS_EFP_DOUBLE 0x00200000
#define PPC_FEATURE_NO_TB 0x00100000
#define PPC_FEATURE_POWER4 0x00080000
#define PPC_FEATURE_POWER5 0x00040000
#define PPC_FEATURE_POWER5_PLUS 0x00020000
#define PPC_FEATURE_CELL 0x00010000
#define PPC_FEATURE_BOOKE 0x00008000
#define PPC_FEATURE_SMT 0x00004000
#define PPC_FEATURE_ICACHE_SNOOP 0x00002000
#define PPC_FEATURE_ARCH_2_05 0x00001000
#define PPC_FEATURE_PA6T 0x00000800
#define PPC_FEATURE_HAS_DFP 0x00000400
#define PPC_FEATURE_POWER6_EXT 0x00000200
#define PPC_FEATURE_ARCH_2_06 0x00000100
#define PPC_FEATURE_HAS_VSX 0x00000080

#define PPC_FEATURE_PSERIES_PERFMON_COMPAT 0x00000040

/* Reserved - do not use                0x00000004 */
#define PPC_FEATURE_TRUE_LE 0x00000002
#define PPC_FEATURE_PPC_LE 0x00000001

/* in AT_HWCAP2 */
#define PPC_FEATURE2_ARCH_2_07 0x80000000
#define PPC_FEATURE2_HTM 0x40000000
#define PPC_FEATURE2_DSCR 0x20000000
#define PPC_FEATURE2_EBB 0x10000000
#define PPC_FEATURE2_ISEL 0x08000000
#define PPC_FEATURE2_TAR 0x04000000
#define PPC_FEATURE2_VEC_CRYPTO 0x02000000
#define PPC_FEATURE2_HTM_NOSC 0x01000000
#define PPC_FEATURE2_ARCH_3_00 0x00800000
#define PPC_FEATURE2_HAS_IEEE128 0x00400000
#define PPC_FEATURE2_DARN 0x00200000
#define PPC_FEATURE2_SCV 0x00100000
#define PPC_FEATURE2_HTM_NO_SUSPEND 0x00080000
#endif

// https://elixir.bootlin.com/linux/v6.0-rc6/source/arch/s390/include/asm/elf.h
#define HWCAP_S390_ESAN3        1
#define HWCAP_S390_ZARCH        2
#define HWCAP_S390_STFLE        4
#define HWCAP_S390_MSA          8
#define HWCAP_S390_LDISP        16
#define HWCAP_S390_EIMM         32
#define HWCAP_S390_DFP          64
#define HWCAP_S390_HPAGE        128
#define HWCAP_S390_ETF3EH       256
#define HWCAP_S390_HIGH_GPRS    512
#define HWCAP_S390_TE           1024
#define HWCAP_S390_VX           2048
#define HWCAP_S390_VXRS         HWCAP_S390_VX
#define HWCAP_S390_VXD          4096
#define HWCAP_S390_VXRS_BCD     HWCAP_S390_VXD
#define HWCAP_S390_VXE          8192
#define HWCAP_S390_VXRS_EXT     HWCAP_S390_VXE
#define HWCAP_S390_GS           16384
#define HWCAP_S390_VXRS_EXT2    32768
#define HWCAP_S390_VXRS_PDE     65536
#define HWCAP_S390_SORT         131072
#define HWCAP_S390_DFLT         262144
#define HWCAP_S390_VXRS_PDE2    524288
#define HWCAP_S390_NNPA         1048576
#define HWCAP_S390_PCI_MIO      2097152
#define HWCAP_S390_SIE          4194304

// https://elixir.bootlin.com/linux/latest/source/arch/riscv/include/uapi/asm/hwcap.h
#define RISCV_HWCAP_32 0x32
#define RISCV_HWCAP_64 0x64
#define RISCV_HWCAP_128 0x128
#define RISCV_HWCAP_M (1UL << ('M' - 'A'))
#define RISCV_HWCAP_A (1UL << ('A' - 'A'))
#define RISCV_HWCAP_F (1UL << ('F' - 'A'))
#define RISCV_HWCAP_D (1UL << ('D' - 'A'))
#define RISCV_HWCAP_Q (1UL << ('Q' - 'A'))
#define RISCV_HWCAP_C (1UL << ('C' - 'A'))
#define RISCV_HWCAP_V (1UL << ('V' - 'A'))

typedef struct {
  unsigned long hwcaps;
  unsigned long hwcaps2;
} HardwareCapabilities;

// Retrieves values from auxiliary vector for types AT_HWCAP and AT_HWCAP2.
// First tries to call getauxval(), if not available falls back to reading
// "/proc/self/auxv".
HardwareCapabilities CpuFeatures_GetHardwareCapabilities(void);

// Checks whether value for AT_HWCAP (or AT_HWCAP2) match hwcaps_mask.
bool CpuFeatures_IsHwCapsSet(const HardwareCapabilities hwcaps_mask,
                             const HardwareCapabilities hwcaps);

// Get pointer for the AT_PLATFORM type.
const char* CpuFeatures_GetPlatformPointer(void);
// Get pointer for the AT_BASE_PLATFORM type.
const char* CpuFeatures_GetBasePlatformPointer(void);

CPU_FEATURES_END_CPP_NAMESPACE

#endif  // CPU_FEATURES_INCLUDE_INTERNAL_HWCAPS_H_
