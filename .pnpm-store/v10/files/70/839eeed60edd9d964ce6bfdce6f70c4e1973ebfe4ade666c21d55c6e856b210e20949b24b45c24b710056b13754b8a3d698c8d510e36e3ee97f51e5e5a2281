// Copyright 2018 IBM
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

#ifndef CPU_FEATURES_INCLUDE_CPUINFO_PPC_H_
#define CPU_FEATURES_INCLUDE_CPUINFO_PPC_H_

#include "cpu_features_cache_info.h"
#include "cpu_features_macros.h"

CPU_FEATURES_START_CPP_NAMESPACE

typedef struct {
  int ppc32 : 1;
  int ppc64 : 1;
  int ppc601 : 1;
  int altivec : 1;
  int fpu : 1;
  int mmu : 1;
  int mac_4xx : 1;
  int unifiedcache : 1;
  int spe : 1;
  int efpsingle : 1;
  int efpdouble : 1;
  int no_tb : 1;
  int power4 : 1;
  int power5 : 1;
  int power5plus : 1;
  int cell : 1;
  int booke : 1;
  int smt : 1;
  int icachesnoop : 1;
  int arch205 : 1;
  int pa6t : 1;
  int dfp : 1;
  int power6ext : 1;
  int arch206 : 1;
  int vsx : 1;
  int pseries_perfmon_compat : 1;
  int truele : 1;
  int ppcle : 1;
  int arch207 : 1;
  int htm : 1;
  int dscr : 1;
  int ebb : 1;
  int isel : 1;
  int tar : 1;
  int vcrypto : 1;
  int htm_nosc : 1;
  int arch300 : 1;
  int ieee128 : 1;
  int darn : 1;
  int scv : 1;
  int htm_no_suspend : 1;

  // Make sure to update PPCFeaturesEnum below if you add a field here.
} PPCFeatures;

typedef struct {
  PPCFeatures features;
} PPCInfo;

PPCInfo GetPPCInfo(void);

typedef struct {
  char platform[64];       // 0 terminated string
  char base_platform[64];  // 0 terminated string
} PPCPlatformTypeStrings;

typedef struct {
  char platform[64];  // 0 terminated string
  char model[64];     // 0 terminated string
  char machine[64];   // 0 terminated string
  char cpu[64];       // 0 terminated string
  PPCPlatformTypeStrings type;
} PPCPlatformStrings;

PPCPlatformStrings GetPPCPlatformStrings(void);

////////////////////////////////////////////////////////////////////////////////
// Introspection functions

typedef enum {
  PPC_32,          /* 32 bit mode execution */
  PPC_64,          /* 64 bit mode execution */
  PPC_601_INSTR,   /* Old POWER ISA */
  PPC_HAS_ALTIVEC, /* SIMD Unit*/
  PPC_HAS_FPU,     /* Floating Point Unit */
  PPC_HAS_MMU,     /* Memory management unit */
  PPC_HAS_4xxMAC,
  PPC_UNIFIED_CACHE,  /* Unified instruction and data cache */
  PPC_HAS_SPE,        /* Signal processing extention unit */
  PPC_HAS_EFP_SINGLE, /* SPE single precision fpu */
  PPC_HAS_EFP_DOUBLE, /* SPE double precision fpu */
  PPC_NO_TB,          /* No timebase */
  PPC_POWER4,
  PPC_POWER5,
  PPC_POWER5_PLUS,
  PPC_CELL,  /* Cell broadband engine */
  PPC_BOOKE, /* Embedded ISA */
  PPC_SMT,   /* Simultaneous multi-threading */
  PPC_ICACHE_SNOOP,
  PPC_ARCH_2_05, /* ISA 2.05 - POWER6 */
  PPC_PA6T,      /* PA Semi 6T core ISA */
  PPC_HAS_DFP,   /* Decimal floating point unit */
  PPC_POWER6_EXT,
  PPC_ARCH_2_06,              /* ISA 2.06 - POWER7 */
  PPC_HAS_VSX,                /* Vector-scalar extension */
  PPC_PSERIES_PERFMON_COMPAT, /* Set of backwards compatibile performance
                                 monitoring events */
  PPC_TRUE_LE,
  PPC_PPC_LE,
  PPC_ARCH_2_07,      /* ISA 2.07 - POWER8 */
  PPC_HTM,            /* Hardware Transactional Memory */
  PPC_DSCR,           /* Data stream control register */
  PPC_EBB,            /* Event base branching */
  PPC_ISEL,           /* Integer select instructions */
  PPC_TAR,            /* Target address register */
  PPC_VEC_CRYPTO,     /* Vector cryptography instructions */
  PPC_HTM_NOSC,       /* Transactions aborted when syscall made*/
  PPC_ARCH_3_00,      /* ISA 3.00 - POWER9 */
  PPC_HAS_IEEE128,    /* VSX IEEE Binary Float 128-bit */
  PPC_DARN,           /* Deliver a random number instruction */
  PPC_SCV,            /* scv syscall */
  PPC_HTM_NO_SUSPEND, /* TM w/out suspended state */
  PPC_LAST_,
} PPCFeaturesEnum;

int GetPPCFeaturesEnumValue(const PPCFeatures* features, PPCFeaturesEnum value);

const char* GetPPCFeaturesEnumName(PPCFeaturesEnum);

CPU_FEATURES_END_CPP_NAMESPACE

#if !defined(CPU_FEATURES_ARCH_PPC)
#error "Including cpuinfo_ppc.h from a non-ppc target."
#endif

#endif  // CPU_FEATURES_INCLUDE_CPUINFO_PPC_H_
