// Copyright 2017 Google LLC
// Copyright 2020 Intel Corporation
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

#ifndef CPU_FEATURES_INCLUDE_CPUINFO_X86_H_
#define CPU_FEATURES_INCLUDE_CPUINFO_X86_H_

#include "cpu_features_cache_info.h"
#include "cpu_features_macros.h"

CPU_FEATURES_START_CPP_NAMESPACE

// CPUID Vendors
#define CPU_FEATURES_VENDOR_GENUINE_INTEL "GenuineIntel"
#define CPU_FEATURES_VENDOR_AUTHENTIC_AMD "AuthenticAMD"
#define CPU_FEATURES_VENDOR_HYGON_GENUINE "HygonGenuine"
#define CPU_FEATURES_VENDOR_CENTAUR_HAULS "CentaurHauls"
#define CPU_FEATURES_VENDOR_SHANGHAI "  Shanghai  "

// See https://en.wikipedia.org/wiki/CPUID for a list of x86 cpu features.
// The field names are based on the short name provided in the wikipedia tables.
typedef struct {
  int fpu : 1;
  int tsc : 1;
  int cx8 : 1;
  int clfsh : 1;
  int mmx : 1;
  int aes : 1;
  int erms : 1;
  int f16c : 1;
  int fma4 : 1;
  int fma3 : 1;
  int vaes : 1;
  int vpclmulqdq : 1;
  int bmi1 : 1;
  int hle : 1;
  int bmi2 : 1;
  int rtm : 1;
  int rdseed : 1;
  int clflushopt : 1;
  int clwb : 1;

  int sse : 1;
  int sse2 : 1;
  int sse3 : 1;
  int ssse3 : 1;
  int sse4_1 : 1;
  int sse4_2 : 1;
  int sse4a : 1;

  int avx : 1;
  int avx_vnni : 1;
  int avx2 : 1;

  int avx512f : 1;
  int avx512cd : 1;
  int avx512er : 1;
  int avx512pf : 1;
  int avx512bw : 1;
  int avx512dq : 1;
  int avx512vl : 1;
  int avx512ifma : 1;
  int avx512vbmi : 1;
  int avx512vbmi2 : 1;
  int avx512vnni : 1;
  int avx512bitalg : 1;
  int avx512vpopcntdq : 1;
  int avx512_4vnniw : 1;
  int avx512_4vbmi2 : 1;  // Note: this is an alias to avx512_4fmaps.
  int avx512_second_fma : 1;
  int avx512_4fmaps : 1;
  int avx512_bf16 : 1;
  int avx512_vp2intersect : 1;
  int avx512_fp16 : 1;
  int amx_bf16 : 1;
  int amx_tile : 1;
  int amx_int8 : 1;

  int pclmulqdq : 1;
  int smx : 1;
  int sgx : 1;
  int cx16 : 1;  // aka. CMPXCHG16B
  int sha : 1;
  int popcnt : 1;
  int movbe : 1;
  int rdrnd : 1;

  int dca : 1;
  int ss : 1;
  int adx : 1;
  int lzcnt : 1;  // Note: this flag is called ABM for AMD, LZCNT for Intel.
  int gfni : 1;
  int movdiri : 1;
  int movdir64b : 1;
  int fs_rep_mov : 1;          // Fast short REP MOV
  int fz_rep_movsb : 1;        // Fast zero-length REP MOVSB
  int fs_rep_stosb : 1;        // Fast short REP STOSB
  int fs_rep_cmpsb_scasb : 1;  // Fast short REP CMPSB/SCASB
  // Make sure to update X86FeaturesEnum below if you add a field here.
} X86Features;

typedef struct {
  X86Features features;
  int family;
  int model;
  int stepping;
  char vendor[13];        // 0 terminated string
  char brand_string[49];  // 0 terminated string
} X86Info;

// Calls cpuid and returns an initialized X86info.
X86Info GetX86Info(void);

// Returns cache hierarchy informations.
// Can call cpuid multiple times.
CacheInfo GetX86CacheInfo(void);

typedef enum {
  X86_UNKNOWN,
  ZHAOXIN_ZHANGJIANG,   // ZhangJiang
  ZHAOXIN_WUDAOKOU,     // WuDaoKou
  ZHAOXIN_LUJIAZUI,     // LuJiaZui
  ZHAOXIN_YONGFENG,     // YongFeng
  INTEL_80486,          // 80486
  INTEL_P5,             // P5
  INTEL_LAKEMONT,       // LAKEMONT
  INTEL_CORE,           // CORE
  INTEL_PNR,            // PENRYN
  INTEL_NHM,            // NEHALEM
  INTEL_ATOM_BNL,       // BONNELL
  INTEL_WSM,            // WESTMERE
  INTEL_SNB,            // SANDYBRIDGE
  INTEL_IVB,            // IVYBRIDGE
  INTEL_ATOM_SMT,       // SILVERMONT
  INTEL_HSW,            // HASWELL
  INTEL_BDW,            // BROADWELL
  INTEL_SKL,            // SKYLAKE
  INTEL_CCL,            // CASCADELAKE
  INTEL_ATOM_GMT,       // GOLDMONT
  INTEL_ATOM_GMT_PLUS,  // GOLDMONT+
  INTEL_ATOM_TMT,       // TREMONT
  INTEL_KBL,            // KABY LAKE
  INTEL_CFL,            // COFFEE LAKE
  INTEL_WHL,            // WHISKEY LAKE
  INTEL_CML,            // COMET LAKE
  INTEL_CNL,            // CANNON LAKE
  INTEL_ICL,            // ICE LAKE
  INTEL_TGL,            // TIGER LAKE
  INTEL_SPR,            // SAPPHIRE RAPIDS
  INTEL_ADL,            // ALDER LAKE
  INTEL_RCL,            // ROCKET LAKE
  INTEL_RPL,            // RAPTOR LAKE
  INTEL_KNIGHTS_M,      // KNIGHTS MILL
  INTEL_KNIGHTS_L,      // KNIGHTS LANDING
  INTEL_KNIGHTS_F,      // KNIGHTS FERRY
  INTEL_KNIGHTS_C,      // KNIGHTS CORNER
  INTEL_NETBURST,       // NETBURST
  AMD_HAMMER,           // K8  HAMMER
  AMD_K10,              // K10
  AMD_K11,              // K11
  AMD_K12,              // K12 LLANO
  AMD_BOBCAT,           // K14 BOBCAT
  AMD_PILEDRIVER,       // K15 PILEDRIVER
  AMD_STREAMROLLER,     // K15 STREAMROLLER
  AMD_EXCAVATOR,        // K15 EXCAVATOR
  AMD_BULLDOZER,        // K15 BULLDOZER
  AMD_JAGUAR,           // K16 JAGUAR
  AMD_PUMA,             // K16 PUMA
  AMD_ZEN,              // K17 ZEN
  AMD_ZEN_PLUS,         // K17 ZEN+
  AMD_ZEN2,             // K17 ZEN 2
  AMD_ZEN3,             // K19 ZEN 3
  AMD_ZEN4,             // K19 ZEN 4
  X86_MICROARCHITECTURE_LAST_,
} X86Microarchitecture;

// Returns the underlying microarchitecture by looking at X86Info's vendor,
// family and model.
X86Microarchitecture GetX86Microarchitecture(const X86Info* info);

// Calls cpuid and fills the brand_string.
// - brand_string *must* be of size 49 (beware of array decaying).
// - brand_string will be zero terminated.
CPU_FEATURES_DEPRECATED("brand_string is now embedded in X86Info by default")
void FillX86BrandString(char brand_string[49]);

////////////////////////////////////////////////////////////////////////////////
// Introspection functions

typedef enum {
  X86_FPU,
  X86_TSC,
  X86_CX8,
  X86_CLFSH,
  X86_MMX,
  X86_AES,
  X86_ERMS,
  X86_F16C,
  X86_FMA4,
  X86_FMA3,
  X86_VAES,
  X86_VPCLMULQDQ,
  X86_BMI1,
  X86_HLE,
  X86_BMI2,
  X86_RTM,
  X86_RDSEED,
  X86_CLFLUSHOPT,
  X86_CLWB,
  X86_SSE,
  X86_SSE2,
  X86_SSE3,
  X86_SSSE3,
  X86_SSE4_1,
  X86_SSE4_2,
  X86_SSE4A,
  X86_AVX,
  X86_AVX_VNNI,
  X86_AVX2,
  X86_AVX512F,
  X86_AVX512CD,
  X86_AVX512ER,
  X86_AVX512PF,
  X86_AVX512BW,
  X86_AVX512DQ,
  X86_AVX512VL,
  X86_AVX512IFMA,
  X86_AVX512VBMI,
  X86_AVX512VBMI2,
  X86_AVX512VNNI,
  X86_AVX512BITALG,
  X86_AVX512VPOPCNTDQ,
  X86_AVX512_4VNNIW,
  X86_AVX512_4VBMI2,  // Note: this is an alias to X86_AVX512_4FMAPS.
  X86_AVX512_SECOND_FMA,
  X86_AVX512_4FMAPS,
  X86_AVX512_BF16,
  X86_AVX512_VP2INTERSECT,
  X86_AVX512_FP16,
  X86_AMX_BF16,
  X86_AMX_TILE,
  X86_AMX_INT8,
  X86_PCLMULQDQ,
  X86_SMX,
  X86_SGX,
  X86_CX16,
  X86_SHA,
  X86_POPCNT,
  X86_MOVBE,
  X86_RDRND,
  X86_DCA,
  X86_SS,
  X86_ADX,
  X86_LZCNT,
  X86_GFNI,
  X86_MOVDIRI,
  X86_MOVDIR64B,
  X86_FS_REP_MOV,
  X86_FZ_REP_MOVSB,
  X86_FS_REP_STOSB,
  X86_FS_REP_CMPSB_SCASB,
  X86_LAST_,
} X86FeaturesEnum;

int GetX86FeaturesEnumValue(const X86Features* features, X86FeaturesEnum value);

const char* GetX86FeaturesEnumName(X86FeaturesEnum);

const char* GetX86MicroarchitectureName(X86Microarchitecture);

CPU_FEATURES_END_CPP_NAMESPACE

#if !defined(CPU_FEATURES_ARCH_X86)
#error "Including cpuinfo_x86.h from a non-x86 target."
#endif

#endif  // CPU_FEATURES_INCLUDE_CPUINFO_X86_H_
