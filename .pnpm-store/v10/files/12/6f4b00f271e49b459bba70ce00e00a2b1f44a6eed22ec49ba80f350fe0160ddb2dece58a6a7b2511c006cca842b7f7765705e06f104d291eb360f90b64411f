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

// A note on x86 SIMD instructions availability
// -----------------------------------------------------------------------------
// A number of conditions need to be met for an application to use SIMD
// instructions:
// 1. The CPU itself must support the instruction.
// - we use `CPUID` to check whether the feature is supported.
// 2. The OS must save and restore the associated SIMD register across context
//    switches, we check that:
// - the CPU reports supporting hardware context switching instructions via
//   CPUID.1:ECX.XSAVE[bit 26]
// - the OS reports supporting hardware context switching instructions via
//   CPUID.1:ECX.OSXSAVE[bit 27]
// - the CPU extended control register 0 (XCR0) is set to save and restore the
//   needed SIMD registers
//
// Note that if `XSAVE`/`OSXSAVE` are missing, we delegate the detection to the
// OS via the `DetectFeaturesFromOs` function or via microarchitecture
// heuristics.
//
// Encoding
// -----------------------------------------------------------------------------
// X86Info contains fields such as vendor and brand_string that are ASCII
// encoded strings. `vendor` length of characters is 13 and `brand_string` is 49
// (with null terminated string). We use CPUID.1:E[D,C,B]X to get `vendor` and
// CPUID.8000_000[4:2]:E[D,C,B,A]X to get `brand_string`
//
// Microarchitecture
// -----------------------------------------------------------------------------
// `GetX86Microarchitecture` function consists of check on vendor via
// `IsVendorByX86Info`. We use `CPUID(family, model)` to define the vendor's
//  microarchitecture. In cases where the `family` and `model` is the same for
//  several microarchitectures we do a stepping check or in the worst case we
//  rely on parsing brand_string (see HasSecondFMA for an example). Details of
//  identification by `brand_string` can be found by reference:
//  https://en.wikichip.org/wiki/intel/microarchitectures/cascade_lake
//  https://www.intel.com/content/www/us/en/processors/processor-numbers.html

// CacheInfo X86
// -----------------------------------------------------------------------------
// We use the CacheInfo struct to store information about cache levels. The
// maximum number of levels is hardcoded but can be increased if needed. We have
// full support of cache identification for the following processors:
// • Intel:
//    ◦ modern processors:
//        we use `ParseCacheInfo` function with `leaf_id` 0x00000004.
//    ◦ old processors:
//        we parse descriptors via `GetCacheLevelInfo`, see Application Note
//        485: Intel Processor Identification and CPUID Instruction.
// • AMD:
//    ◦ modern processors:
//        we use `ParseCacheInfo` function with `leaf_id` 0x8000001D.
//    ◦ old processors:
//        we parse cache info using Fn8000_0005_E[A,B,C,D]X and
//        Fn8000_0006_E[A,B,C,D]X. See AMD CPUID Specification:
//        https://www.amd.com/system/files/TechDocs/25481.pdf.
// • Hygon:
//    we reuse AMD cache detection implementation.
// • Zhaoxin:
//    we reuse Intel cache detection implementation.
//
// Internal structures
// -----------------------------------------------------------------------------
// We use internal structures such as `Leaves` and `OsPreserves` to cache the
// result of cpuid info and support of registers, since latency of CPUID
// instruction is around ~100 cycles, see
// https://www.agner.org/optimize/instruction_tables.pdf. Hence, we use
// `ReadLeaves` function for `GetX86Info`, `GetCacheInfo` and
// `FillX86BrandString` to read leaves and hold these values to avoid redundant
// call on the same leaf.

#include <stdbool.h>
#include <string.h>

#include "copy.inl"
#include "cpuinfo_x86.h"
#include "equals.inl"
#include "internal/bit_utils.h"
#include "internal/cpuid_x86.h"

#if !defined(CPU_FEATURES_ARCH_X86)
#error "Cannot compile cpuinfo_x86 on a non x86 platform."
#endif

////////////////////////////////////////////////////////////////////////////////
// Definitions for CpuId and GetXCR0Eax.
////////////////////////////////////////////////////////////////////////////////

#if defined(CPU_FEATURES_MOCK_CPUID_X86)
// Implementation will be provided by test/cpuinfo_x86_test.cc.
#elif defined(CPU_FEATURES_COMPILER_CLANG) || defined(CPU_FEATURES_COMPILER_GCC)

#include <cpuid.h>

Leaf GetCpuidLeaf(uint32_t leaf_id, int ecx) {
  Leaf leaf;
  __cpuid_count(leaf_id, ecx, leaf.eax, leaf.ebx, leaf.ecx, leaf.edx);
  return leaf;
}

uint32_t GetXCR0Eax(void) {
  uint32_t eax, edx;
  /* named form of xgetbv not supported on OSX, so must use byte form, see:
     https://github.com/asmjit/asmjit/issues/78
   */
  __asm(".byte 0x0F, 0x01, 0xd0" : "=a"(eax), "=d"(edx) : "c"(0));
  return eax;
}

#elif defined(CPU_FEATURES_COMPILER_MSC)

#include <immintrin.h>
#include <intrin.h>  // For __cpuidex()

Leaf GetCpuidLeaf(uint32_t leaf_id, int ecx) {
  Leaf leaf;
  int data[4];
  __cpuidex(data, leaf_id, ecx);
  leaf.eax = data[0];
  leaf.ebx = data[1];
  leaf.ecx = data[2];
  leaf.edx = data[3];
  return leaf;
}

uint32_t GetXCR0Eax(void) { return (uint32_t)_xgetbv(0); }

#else
#error "Unsupported compiler, x86 cpuid requires either GCC, Clang or MSVC."
#endif

static const Leaf kEmptyLeaf;

static Leaf SafeCpuIdEx(uint32_t max_cpuid_leaf, uint32_t leaf_id, int ecx) {
  if (leaf_id <= max_cpuid_leaf) {
    return GetCpuidLeaf(leaf_id, ecx);
  } else {
    return kEmptyLeaf;
  }
}

typedef struct {
  uint32_t max_cpuid_leaf;
  Leaf leaf_0;    // Root
  Leaf leaf_1;    // Family, Model, Stepping
  Leaf leaf_2;    // Intel cache info + features
  Leaf leaf_7;    // Features
  Leaf leaf_7_1;  // Features
  uint32_t max_cpuid_leaf_ext;
  Leaf leaf_80000000;  // Root for extended leaves
  Leaf leaf_80000001;  // AMD features features and cache
  Leaf leaf_80000002;  // brand string
  Leaf leaf_80000003;  // brand string
  Leaf leaf_80000004;  // brand string
} Leaves;

static Leaves ReadLeaves(void) {
  const Leaf leaf_0 = GetCpuidLeaf(0, 0);
  const uint32_t max_cpuid_leaf = leaf_0.eax;
  const Leaf leaf_80000000 = GetCpuidLeaf(0x80000000, 0);
  const uint32_t max_cpuid_leaf_ext = leaf_80000000.eax;
  return (Leaves){
      .max_cpuid_leaf = max_cpuid_leaf,
      .leaf_0 = leaf_0,
      .leaf_1 = SafeCpuIdEx(max_cpuid_leaf, 0x00000001, 0),
      .leaf_2 = SafeCpuIdEx(max_cpuid_leaf, 0x00000002, 0),
      .leaf_7 = SafeCpuIdEx(max_cpuid_leaf, 0x00000007, 0),
      .leaf_7_1 = SafeCpuIdEx(max_cpuid_leaf, 0x00000007, 1),
      .max_cpuid_leaf_ext = max_cpuid_leaf_ext,
      .leaf_80000000 = leaf_80000000,
      .leaf_80000001 = SafeCpuIdEx(max_cpuid_leaf_ext, 0x80000001, 0),
      .leaf_80000002 = SafeCpuIdEx(max_cpuid_leaf_ext, 0x80000002, 0),
      .leaf_80000003 = SafeCpuIdEx(max_cpuid_leaf_ext, 0x80000003, 0),
      .leaf_80000004 = SafeCpuIdEx(max_cpuid_leaf_ext, 0x80000004, 0),
  };
}

////////////////////////////////////////////////////////////////////////////////
// OS support
////////////////////////////////////////////////////////////////////////////////

#define MASK_XMM 0x2
#define MASK_YMM 0x4
#define MASK_MASKREG 0x20
#define MASK_ZMM0_15 0x40
#define MASK_ZMM16_31 0x80
#define MASK_XTILECFG 0x20000
#define MASK_XTILEDATA 0x40000

static bool HasMask(uint32_t value, uint32_t mask) {
  return (value & mask) == mask;
}

// Checks that operating system saves and restores xmm registers during context
// switches.
static bool HasXmmOsXSave(uint32_t xcr0_eax) {
  return HasMask(xcr0_eax, MASK_XMM);
}

// Checks that operating system saves and restores ymm registers during context
// switches.
static bool HasYmmOsXSave(uint32_t xcr0_eax) {
  return HasMask(xcr0_eax, MASK_XMM | MASK_YMM);
}

// Checks that operating system saves and restores zmm registers during context
// switches.
static bool HasZmmOsXSave(uint32_t xcr0_eax) {
  return HasMask(xcr0_eax, MASK_XMM | MASK_YMM | MASK_MASKREG | MASK_ZMM0_15 |
                               MASK_ZMM16_31);
}

// Checks that operating system saves and restores AMX/TMUL state during context
// switches.
static bool HasTmmOsXSave(uint32_t xcr0_eax) {
  return HasMask(xcr0_eax, MASK_XMM | MASK_YMM | MASK_MASKREG | MASK_ZMM0_15 |
                               MASK_ZMM16_31 | MASK_XTILECFG | MASK_XTILEDATA);
}

////////////////////////////////////////////////////////////////////////////////
// Vendor
////////////////////////////////////////////////////////////////////////////////

static void SetVendor(const Leaf leaf, char* const vendor) {
  *(uint32_t*)(vendor) = leaf.ebx;
  *(uint32_t*)(vendor + 4) = leaf.edx;
  *(uint32_t*)(vendor + 8) = leaf.ecx;
  vendor[12] = '\0';
}

static int IsVendor(const Leaf leaf, const char* const name) {
  const uint32_t ebx = *(const uint32_t*)(name);
  const uint32_t edx = *(const uint32_t*)(name + 4);
  const uint32_t ecx = *(const uint32_t*)(name + 8);
  return leaf.ebx == ebx && leaf.ecx == ecx && leaf.edx == edx;
}

static int IsVendorByX86Info(const X86Info* info, const char* const name) {
  return equals(info->vendor, name, sizeof(info->vendor));
}

// TODO: Remove when deprecation period is over,
void FillX86BrandString(char brand_string[49]) {
  const Leaves leaves = ReadLeaves();
  const Leaf packed[3] = {
      leaves.leaf_80000002,
      leaves.leaf_80000003,
      leaves.leaf_80000004,
  };
#if __STDC_VERSION__ >= 201112L
  _Static_assert(sizeof(packed) == 48, "Leaves must be packed");
#endif
  copy(brand_string, (const char*)(packed), 48);
  brand_string[48] = '\0';
}

////////////////////////////////////////////////////////////////////////////////
// CpuId
////////////////////////////////////////////////////////////////////////////////

static bool HasSecondFMA(const X86Info* info) {
  // Skylake server
  if (info->model == 0x55) {
    // detect Xeon
    if (info->brand_string[9] == 'X') {
      // detect Silver or Bronze
      if (info->brand_string[17] == 'S' || info->brand_string[17] == 'B')
        return false;
      // detect Gold 5_20 and below, except for Gold 53__
      if (info->brand_string[17] == 'G' && info->brand_string[22] == '5')
        return (
            (info->brand_string[23] == '3') ||
            (info->brand_string[24] == '2' && info->brand_string[25] == '2'));
      // detect Xeon W 210x
      if (info->brand_string[17] == 'W' && info->brand_string[21] == '0')
        return false;
      // detect Xeon D 2xxx
      if (info->brand_string[17] == 'D' && info->brand_string[19] == '2' &&
          info->brand_string[20] == '1')
        return false;
    }
    return true;
  }
  // Cannon Lake client
  if (info->model == 0x66) return false;
  // Ice Lake client
  if (info->model == 0x7d || info->model == 0x7e) return false;
  // This is the right default...
  return true;
}

// Internal structure to hold the OS support for vector operations.
// Avoid to recompute them since each call to cpuid is ~100 cycles.
typedef struct {
  bool sse_registers;
  bool avx_registers;
  bool avx512_registers;
  bool amx_registers;
} OsPreserves;

// These two functions have to be implemented by the OS, that is the file
// including this file.
static void OverrideOsPreserves(OsPreserves* os_preserves);
static void DetectFeaturesFromOs(X86Info* info, X86Features* features);

// Reference https://en.wikipedia.org/wiki/CPUID.
static void ParseCpuId(const Leaves* leaves, X86Info* info,
                       OsPreserves* os_preserves) {
  const Leaf leaf_1 = leaves->leaf_1;
  const Leaf leaf_7 = leaves->leaf_7;
  const Leaf leaf_7_1 = leaves->leaf_7_1;
  const Leaf leaf_80000001 = leaves->leaf_80000001;

  const bool have_xsave = IsBitSet(leaf_1.ecx, 26);
  const bool have_osxsave = IsBitSet(leaf_1.ecx, 27);
  const bool have_xcr0 = have_xsave && have_osxsave;

  const uint32_t family = ExtractBitRange(leaf_1.eax, 11, 8);
  const uint32_t extended_family = ExtractBitRange(leaf_1.eax, 27, 20);
  const uint32_t model = ExtractBitRange(leaf_1.eax, 7, 4);
  const uint32_t extended_model = ExtractBitRange(leaf_1.eax, 19, 16);

  X86Features* const features = &info->features;

  // Fill Family, Model and Stepping.
  info->family = extended_family + family;
  info->model = (extended_model << 4) + model;
  info->stepping = ExtractBitRange(leaf_1.eax, 3, 0);

  // Fill Brand String.
  const Leaf packed[3] = {
      leaves->leaf_80000002,
      leaves->leaf_80000003,
      leaves->leaf_80000004,
  };
#if __STDC_VERSION__ >= 201112L
  _Static_assert(sizeof(packed) == 48, "Leaves must be packed");
#endif
  copy(info->brand_string, (const char*)(packed), 48);
  info->brand_string[48] = '\0';

  // Fill cpu features.
  features->fpu = IsBitSet(leaf_1.edx, 0);
  features->tsc = IsBitSet(leaf_1.edx, 4);
  features->cx8 = IsBitSet(leaf_1.edx, 8);
  features->clfsh = IsBitSet(leaf_1.edx, 19);
  features->mmx = IsBitSet(leaf_1.edx, 23);
  features->ss = IsBitSet(leaf_1.edx, 27);
  features->pclmulqdq = IsBitSet(leaf_1.ecx, 1);
  features->smx = IsBitSet(leaf_1.ecx, 6);
  features->cx16 = IsBitSet(leaf_1.ecx, 13);
  features->dca = IsBitSet(leaf_1.ecx, 18);
  features->movbe = IsBitSet(leaf_1.ecx, 22);
  features->popcnt = IsBitSet(leaf_1.ecx, 23);
  features->aes = IsBitSet(leaf_1.ecx, 25);
  features->f16c = IsBitSet(leaf_1.ecx, 29);
  features->rdrnd = IsBitSet(leaf_1.ecx, 30);
  features->sgx = IsBitSet(leaf_7.ebx, 2);
  features->bmi1 = IsBitSet(leaf_7.ebx, 3);
  features->hle = IsBitSet(leaf_7.ebx, 4);
  features->bmi2 = IsBitSet(leaf_7.ebx, 8);
  features->erms = IsBitSet(leaf_7.ebx, 9);
  features->rtm = IsBitSet(leaf_7.ebx, 11);
  features->rdseed = IsBitSet(leaf_7.ebx, 18);
  features->clflushopt = IsBitSet(leaf_7.ebx, 23);
  features->clwb = IsBitSet(leaf_7.ebx, 24);
  features->sha = IsBitSet(leaf_7.ebx, 29);
  features->gfni = IsBitSet(leaf_7.ecx, 8);
  features->vaes = IsBitSet(leaf_7.ecx, 9);
  features->vpclmulqdq = IsBitSet(leaf_7.ecx, 10);
  features->movdiri = IsBitSet(leaf_7.ecx, 27);
  features->movdir64b = IsBitSet(leaf_7.ecx, 28);
  features->fs_rep_mov = IsBitSet(leaf_7.edx, 4);
  features->fz_rep_movsb = IsBitSet(leaf_7_1.eax, 10);
  features->fs_rep_stosb = IsBitSet(leaf_7_1.eax, 11);
  features->fs_rep_cmpsb_scasb = IsBitSet(leaf_7_1.eax, 12);
  features->adx = IsBitSet(leaf_7.ebx, 19);
  features->lzcnt = IsBitSet(leaf_80000001.ecx, 5);

  /////////////////////////////////////////////////////////////////////////////
  // The following section is devoted to Vector Extensions.
  /////////////////////////////////////////////////////////////////////////////

  // CPU with AVX expose XCR0 which enables checking vector extensions OS
  // support through cpuid.
  if (have_xcr0) {
    // Here we rely exclusively on cpuid for both CPU and OS support of vector
    // extensions.
    const uint32_t xcr0_eax = GetXCR0Eax();
    os_preserves->sse_registers = HasXmmOsXSave(xcr0_eax);
    os_preserves->avx_registers = HasYmmOsXSave(xcr0_eax);
    os_preserves->avx512_registers = HasZmmOsXSave(xcr0_eax);
    os_preserves->amx_registers = HasTmmOsXSave(xcr0_eax);
    OverrideOsPreserves(os_preserves);

    if (os_preserves->sse_registers) {
      features->sse = IsBitSet(leaf_1.edx, 25);
      features->sse2 = IsBitSet(leaf_1.edx, 26);
      features->sse3 = IsBitSet(leaf_1.ecx, 0);
      features->ssse3 = IsBitSet(leaf_1.ecx, 9);
      features->sse4_1 = IsBitSet(leaf_1.ecx, 19);
      features->sse4_2 = IsBitSet(leaf_1.ecx, 20);
    }
    if (os_preserves->avx_registers) {
      features->fma3 = IsBitSet(leaf_1.ecx, 12);
      features->avx = IsBitSet(leaf_1.ecx, 28);
      features->avx_vnni = IsBitSet(leaf_7_1.eax, 4);
      features->avx2 = IsBitSet(leaf_7.ebx, 5);
    }
    if (os_preserves->avx512_registers) {
      features->avx512f = IsBitSet(leaf_7.ebx, 16);
      features->avx512cd = IsBitSet(leaf_7.ebx, 28);
      features->avx512er = IsBitSet(leaf_7.ebx, 27);
      features->avx512pf = IsBitSet(leaf_7.ebx, 26);
      features->avx512bw = IsBitSet(leaf_7.ebx, 30);
      features->avx512dq = IsBitSet(leaf_7.ebx, 17);
      features->avx512vl = IsBitSet(leaf_7.ebx, 31);
      features->avx512ifma = IsBitSet(leaf_7.ebx, 21);
      features->avx512vbmi = IsBitSet(leaf_7.ecx, 1);
      features->avx512vbmi2 = IsBitSet(leaf_7.ecx, 6);
      features->avx512vnni = IsBitSet(leaf_7.ecx, 11);
      features->avx512bitalg = IsBitSet(leaf_7.ecx, 12);
      features->avx512vpopcntdq = IsBitSet(leaf_7.ecx, 14);
      features->avx512_4vnniw = IsBitSet(leaf_7.edx, 2);
      features->avx512_4vbmi2 = IsBitSet(leaf_7.edx, 3);
      features->avx512_second_fma = HasSecondFMA(info);
      features->avx512_4fmaps = IsBitSet(leaf_7.edx, 3);
      features->avx512_bf16 = IsBitSet(leaf_7_1.eax, 5);
      features->avx512_vp2intersect = IsBitSet(leaf_7.edx, 8);
      features->avx512_fp16 = IsBitSet(leaf_7.edx, 23);
    }
    if (os_preserves->amx_registers) {
      features->amx_bf16 = IsBitSet(leaf_7.edx, 22);
      features->amx_tile = IsBitSet(leaf_7.edx, 24);
      features->amx_int8 = IsBitSet(leaf_7.edx, 25);
    }
  } else {
    // When XCR0 is not available (Atom based or older cpus) we need to defer to
    // the OS via custom code.
    DetectFeaturesFromOs(info, features);
    // Now that we have queried the OS for SSE support, we report this back to
    // os_preserves. This is needed in case of AMD CPU's to enable testing of
    // sse4a (See ParseExtraAMDCpuId below).
    if (features->sse) os_preserves->sse_registers = true;
  }
}

static void ParseExtraAMDCpuId(const Leaves* leaves, X86Info* info,
                               OsPreserves os_preserves) {
  const Leaf leaf_80000001 = leaves->leaf_80000001;

  X86Features* const features = &info->features;

  if (os_preserves.sse_registers) {
    features->sse4a = IsBitSet(leaf_80000001.ecx, 6);
  }

  if (os_preserves.avx_registers) {
    features->fma4 = IsBitSet(leaf_80000001.ecx, 16);
  }
}

static const X86Info kEmptyX86Info;
static const OsPreserves kEmptyOsPreserves;

X86Info GetX86Info(void) {
  X86Info info = kEmptyX86Info;
  const Leaves leaves = ReadLeaves();
  const bool is_intel =
      IsVendor(leaves.leaf_0, CPU_FEATURES_VENDOR_GENUINE_INTEL);
  const bool is_amd =
      IsVendor(leaves.leaf_0, CPU_FEATURES_VENDOR_AUTHENTIC_AMD);
  const bool is_hygon =
      IsVendor(leaves.leaf_0, CPU_FEATURES_VENDOR_HYGON_GENUINE);
  const bool is_zhaoxin =
      (IsVendor(leaves.leaf_0, CPU_FEATURES_VENDOR_CENTAUR_HAULS) ||
       IsVendor(leaves.leaf_0, CPU_FEATURES_VENDOR_SHANGHAI));
  SetVendor(leaves.leaf_0, info.vendor);
  if (is_intel || is_amd || is_hygon || is_zhaoxin) {
    OsPreserves os_preserves = kEmptyOsPreserves;
    ParseCpuId(&leaves, &info, &os_preserves);
    if (is_amd || is_hygon) {
      ParseExtraAMDCpuId(&leaves, &info, os_preserves);
    }
  }
  return info;
}

////////////////////////////////////////////////////////////////////////////////
// Microarchitecture
////////////////////////////////////////////////////////////////////////////////

#define CPUID(FAMILY, MODEL) ((((FAMILY)&0xFF) << 8) | ((MODEL)&0xFF))

X86Microarchitecture GetX86Microarchitecture(const X86Info* info) {
  if (IsVendorByX86Info(info, CPU_FEATURES_VENDOR_GENUINE_INTEL)) {
    switch (CPUID(info->family, info->model)) {
      case CPUID(0x04, 0x01):
      case CPUID(0x04, 0x02):
      case CPUID(0x04, 0x03):
      case CPUID(0x04, 0x04):
      case CPUID(0x04, 0x05):
      case CPUID(0x04, 0x07):
      case CPUID(0x04, 0x08):
      case CPUID(0x04, 0x09):
        // https://en.wikichip.org/wiki/intel/microarchitectures/80486
        return INTEL_80486;
      case CPUID(0x05, 0x01):
      case CPUID(0x05, 0x02):
      case CPUID(0x05, 0x04):
      case CPUID(0x05, 0x07):
      case CPUID(0x05, 0x08):
        // https://en.wikichip.org/wiki/intel/microarchitectures/p5
        return INTEL_P5;
      case CPUID(0x05, 0x09):
      case CPUID(0x05, 0x0A):
        // https://en.wikichip.org/wiki/intel/quark
        return INTEL_LAKEMONT;
      case CPUID(0x06, 0x1C):  // Intel(R) Atom(TM) CPU 230 @ 1.60GHz
      case CPUID(0x06, 0x35):
      case CPUID(0x06, 0x36):
      case CPUID(0x06, 0x70):  // https://en.wikichip.org/wiki/intel/atom/230
        // https://en.wikipedia.org/wiki/Bonnell_(microarchitecture)
        return INTEL_ATOM_BNL;
      case CPUID(0x06, 0x37):
      case CPUID(0x06, 0x4C):
        // https://en.wikipedia.org/wiki/Silvermont
        return INTEL_ATOM_SMT;
      case CPUID(0x06, 0x5C):
        // https://en.wikipedia.org/wiki/Goldmont
        return INTEL_ATOM_GMT;
      case CPUID(0x06, 0x7A):
        // https://en.wikichip.org/wiki/intel/microarchitectures/goldmont_plus
        return INTEL_ATOM_GMT_PLUS;
      case CPUID(0x06, 0x8A):
      case CPUID(0x06, 0x96):
      case CPUID(0x06, 0x9C):
        // https://en.wikichip.org/wiki/intel/microarchitectures/tremont
        return INTEL_ATOM_TMT;
      case CPUID(0x06, 0x0E):
      case CPUID(0x06, 0x0F):
      case CPUID(0x06, 0x16):
        // https://en.wikipedia.org/wiki/Intel_Core_(microarchitecture)
        return INTEL_CORE;
      case CPUID(0x06, 0x17):
      case CPUID(0x06, 0x1D):
        // https://en.wikipedia.org/wiki/Penryn_(microarchitecture)
        return INTEL_PNR;
      case CPUID(0x06, 0x1A):
      case CPUID(0x06, 0x1E):
      case CPUID(0x06, 0x1F):
      case CPUID(0x06, 0x2E):
        // https://en.wikipedia.org/wiki/Nehalem_(microarchitecture)
        return INTEL_NHM;
      case CPUID(0x06, 0x25):
      case CPUID(0x06, 0x2C):
      case CPUID(0x06, 0x2F):
        // https://en.wikipedia.org/wiki/Westmere_(microarchitecture)
        return INTEL_WSM;
      case CPUID(0x06, 0x2A):
      case CPUID(0x06, 0x2D):
        // https://en.wikipedia.org/wiki/Sandy_Bridge#Models_and_steppings
        return INTEL_SNB;
      case CPUID(0x06, 0x3A):
      case CPUID(0x06, 0x3E):
        // https://en.wikipedia.org/wiki/Ivy_Bridge_(microarchitecture)#Models_and_steppings
        return INTEL_IVB;
      case CPUID(0x06, 0x3C):
      case CPUID(0x06, 0x3F):
      case CPUID(0x06, 0x45):
      case CPUID(0x06, 0x46):
        // https://en.wikipedia.org/wiki/Haswell_(microarchitecture)
        return INTEL_HSW;
      case CPUID(0x06, 0x3D):
      case CPUID(0x06, 0x47):
      case CPUID(0x06, 0x4F):
      case CPUID(0x06, 0x56):
        // https://en.wikipedia.org/wiki/Broadwell_(microarchitecture)
        return INTEL_BDW;
      case CPUID(0x06, 0x4E):
      case CPUID(0x06, 0x5E):
        // https://en.wikipedia.org/wiki/Skylake_(microarchitecture)
        return INTEL_SKL;
      case CPUID(0x06, 0x55):
        if (info->stepping >= 6 && info->stepping <= 7) {
          // https://en.wikipedia.org/wiki/Cascade_Lake_(microprocessor)
          return INTEL_CCL;
        }
        return INTEL_SKL;
      case CPUID(0x06, 0x66):
        // https://en.wikipedia.org/wiki/Cannon_Lake_(microarchitecture)
        return INTEL_CNL;
      case CPUID(0x06, 0x7D):  // client
      case CPUID(0x06, 0x7E):  // client
      case CPUID(0x06, 0x9D):  // NNP-I
      case CPUID(0x06, 0x6A):  // server
      case CPUID(0x06, 0x6C):  // server
        // https://en.wikipedia.org/wiki/Ice_Lake_(microprocessor)
        return INTEL_ICL;
      case CPUID(0x06, 0x8C):
      case CPUID(0x06, 0x8D):
        // https://en.wikipedia.org/wiki/Tiger_Lake_(microarchitecture)
        return INTEL_TGL;
      case CPUID(0x06, 0x8F):
        // https://en.wikipedia.org/wiki/Sapphire_Rapids
        return INTEL_SPR;
      case CPUID(0x06, 0x8E):
        switch (info->stepping) {
          case 9:
            return INTEL_KBL;  // https://en.wikipedia.org/wiki/Kaby_Lake
          case 10:
            return INTEL_CFL;  // https://en.wikipedia.org/wiki/Coffee_Lake
          case 11:
            return INTEL_WHL;  // https://en.wikipedia.org/wiki/Whiskey_Lake_(microarchitecture)
          case 12:
            return INTEL_CML;  // https://en.wikichip.org/wiki/intel/microarchitectures/comet_lake
          default:
            return X86_UNKNOWN;
        }
      case CPUID(0x06, 0x9E):
        if (info->stepping > 9) {
          // https://en.wikipedia.org/wiki/Coffee_Lake
          return INTEL_CFL;
        } else {
          // https://en.wikipedia.org/wiki/Kaby_Lake
          return INTEL_KBL;
        }
      case CPUID(0x06, 0x97):
      case CPUID(0x06, 0x9A):
        // https://en.wikichip.org/wiki/intel/microarchitectures/alder_lake
        return INTEL_ADL;
      case CPUID(0x06, 0xA5):
      case CPUID(0x06, 0xA6):
        // https://en.wikichip.org/wiki/intel/microarchitectures/comet_lake
        return INTEL_CML;
      case CPUID(0x06, 0xA7):
        // https://en.wikichip.org/wiki/intel/microarchitectures/rocket_lake
        return INTEL_RCL;
      case CPUID(0x06, 0xB7):
      case CPUID(0x06, 0xBA):
      case CPUID(0x06, 0xBF):
        // https://en.wikichip.org/wiki/intel/microarchitectures/raptor_lake
        return INTEL_RPL;
      case CPUID(0x06, 0x85):
        // https://en.wikichip.org/wiki/intel/microarchitectures/knights_mill
        return INTEL_KNIGHTS_M;
      case CPUID(0x06, 0x57):
        // https://en.wikichip.org/wiki/intel/microarchitectures/knights_landing
        return INTEL_KNIGHTS_L;
      case CPUID(0x0B, 0x00):
        // https://en.wikichip.org/wiki/intel/microarchitectures/knights_ferry
        return INTEL_KNIGHTS_F;
      case CPUID(0x0B, 0x01):
        // https://en.wikichip.org/wiki/intel/microarchitectures/knights_corner
        return INTEL_KNIGHTS_C;
      case CPUID(0x0F, 0x01):
      case CPUID(0x0F, 0x02):
      case CPUID(0x0F, 0x03):
      case CPUID(0x0F, 0x04):
      case CPUID(0x0F, 0x06):
        // https://en.wikichip.org/wiki/intel/microarchitectures/netburst
        return INTEL_NETBURST;
      default:
        return X86_UNKNOWN;
    }
  }
  if (IsVendorByX86Info(info, CPU_FEATURES_VENDOR_CENTAUR_HAULS)) {
    switch (CPUID(info->family, info->model)) {
      case CPUID(0x06, 0x0F):
      case CPUID(0x06, 0x19):
        // https://en.wikichip.org/wiki/zhaoxin/microarchitectures/zhangjiang
        return ZHAOXIN_ZHANGJIANG;
      case CPUID(0x07, 0x1B):
        // https://en.wikichip.org/wiki/zhaoxin/microarchitectures/wudaokou
        return ZHAOXIN_WUDAOKOU;
      case CPUID(0x07, 0x3B):
        // https://en.wikichip.org/wiki/zhaoxin/microarchitectures/lujiazui
        return ZHAOXIN_LUJIAZUI;
      case CPUID(0x07, 0x5B):
        return ZHAOXIN_YONGFENG;
      default:
        return X86_UNKNOWN;
    }
  }
  if (IsVendorByX86Info(info, CPU_FEATURES_VENDOR_SHANGHAI)) {
    switch (CPUID(info->family, info->model)) {
      case CPUID(0x06, 0x0F):
      case CPUID(0x06, 0x19):
        // https://en.wikichip.org/wiki/zhaoxin/microarchitectures/zhangjiang
        return ZHAOXIN_ZHANGJIANG;
      case CPUID(0x07, 0x1B):
        // https://en.wikichip.org/wiki/zhaoxin/microarchitectures/wudaokou
        return ZHAOXIN_WUDAOKOU;
      case CPUID(0x07, 0x3B):
        // https://en.wikichip.org/wiki/zhaoxin/microarchitectures/lujiazui
        return ZHAOXIN_LUJIAZUI;
      case CPUID(0x07, 0x5B):
        return ZHAOXIN_YONGFENG;
      default:
        return X86_UNKNOWN;
    }
  }
  if (IsVendorByX86Info(info, CPU_FEATURES_VENDOR_AUTHENTIC_AMD)) {
    switch (CPUID(info->family, info->model)) {
      // https://en.wikichip.org/wiki/amd/cpuid
      case CPUID(0xF, 0x04):
      case CPUID(0xF, 0x05):
      case CPUID(0xF, 0x07):
      case CPUID(0xF, 0x08):
      case CPUID(0xF, 0x0C):
      case CPUID(0xF, 0x0E):
      case CPUID(0xF, 0x0F):
      case CPUID(0xF, 0x14):
      case CPUID(0xF, 0x15):
      case CPUID(0xF, 0x17):
      case CPUID(0xF, 0x18):
      case CPUID(0xF, 0x1B):
      case CPUID(0xF, 0x1C):
      case CPUID(0xF, 0x1F):
      case CPUID(0xF, 0x21):
      case CPUID(0xF, 0x23):
      case CPUID(0xF, 0x24):
      case CPUID(0xF, 0x25):
      case CPUID(0xF, 0x27):
      case CPUID(0xF, 0x2B):
      case CPUID(0xF, 0x2C):
      case CPUID(0xF, 0x2F):
      case CPUID(0xF, 0x41):
      case CPUID(0xF, 0x43):
      case CPUID(0xF, 0x48):
      case CPUID(0xF, 0x4B):
      case CPUID(0xF, 0x4C):
      case CPUID(0xF, 0x4F):
      case CPUID(0xF, 0x5D):
      case CPUID(0xF, 0x5F):
      case CPUID(0xF, 0x68):
      case CPUID(0xF, 0x6B):
      case CPUID(0xF, 0x6F):
      case CPUID(0xF, 0x7F):
      case CPUID(0xF, 0xC1):
        return AMD_HAMMER;
      case CPUID(0x10, 0x02):
      case CPUID(0x10, 0x04):
      case CPUID(0x10, 0x05):
      case CPUID(0x10, 0x06):
      case CPUID(0x10, 0x08):
      case CPUID(0x10, 0x09):
      case CPUID(0x10, 0x0A):
        return AMD_K10;
      case CPUID(0x11, 0x03):
        // http://developer.amd.com/wordpress/media/2012/10/41788.pdf
        return AMD_K11;
      case CPUID(0x12, 0x00):
      case CPUID(0x12, 0x01):
        // https://www.amd.com/system/files/TechDocs/44739_12h_Rev_Gd.pdf
        return AMD_K12;
      case CPUID(0x14, 0x00):
      case CPUID(0x14, 0x01):
      case CPUID(0x14, 0x02):
        // https://www.amd.com/system/files/TechDocs/47534_14h_Mod_00h-0Fh_Rev_Guide.pdf
        return AMD_BOBCAT;
      case CPUID(0x15, 0x01):
        // https://en.wikichip.org/wiki/amd/microarchitectures/bulldozer
        return AMD_BULLDOZER;
      case CPUID(0x15, 0x02):
      case CPUID(0x15, 0x10):
      case CPUID(0x15, 0x11):
      case CPUID(0x15, 0x13):
        // https://en.wikichip.org/wiki/amd/microarchitectures/piledriver
        // https://www.amd.com/system/files/TechDocs/48931_15h_Mod_10h-1Fh_Rev_Guide.pdf
        return AMD_PILEDRIVER;
      case CPUID(0x15, 0x30):
      case CPUID(0x15, 0x38):
        // https://en.wikichip.org/wiki/amd/microarchitectures/steamroller
        return AMD_STREAMROLLER;
      case CPUID(0x15, 0x60):
      case CPUID(0x15, 0x65):
      case CPUID(0x15, 0x70):
        // https://en.wikichip.org/wiki/amd/microarchitectures/excavator
        return AMD_EXCAVATOR;
      case CPUID(0x16, 0x00):
      case CPUID(0x16, 0x26):
        return AMD_JAGUAR;
      case CPUID(0x16, 0x30):
        return AMD_PUMA;
      case CPUID(0x17, 0x01):
      case CPUID(0x17, 0x11):
      case CPUID(0x17, 0x18):
      case CPUID(0x17, 0x20):
        // https://en.wikichip.org/wiki/amd/microarchitectures/zen
        return AMD_ZEN;
      case CPUID(0x17, 0x08):
        // https://en.wikichip.org/wiki/amd/microarchitectures/zen%2B
        return AMD_ZEN_PLUS;
      case CPUID(0x17, 0x31):
      case CPUID(0x17, 0x47):
      case CPUID(0x17, 0x60):
      case CPUID(0x17, 0x68):
      case CPUID(0x17, 0x71):
      case CPUID(0x17, 0x90):
      case CPUID(0x17, 0x98):
      case CPUID(0x17, 0xA0):
        // https://en.wikichip.org/wiki/amd/microarchitectures/zen_2
        return AMD_ZEN2;
      case CPUID(0x19, 0x00):
      case CPUID(0x19, 0x01):
      case CPUID(0x19, 0x08):
      case CPUID(0x19, 0x21):
      case CPUID(0x19, 0x30):
      case CPUID(0x19, 0x40):
      case CPUID(0x19, 0x44):
      case CPUID(0x19, 0x50):
        // https://en.wikichip.org/wiki/amd/microarchitectures/zen_3
        return AMD_ZEN3;
      case CPUID(0x19, 0x10):
      case CPUID(0x19, 0x61):
        // https://en.wikichip.org/wiki/amd/microarchitectures/zen_4
        return AMD_ZEN4;
      default:
        return X86_UNKNOWN;
    }
  }
  if (IsVendorByX86Info(info, CPU_FEATURES_VENDOR_HYGON_GENUINE)) {
    switch (CPUID(info->family, info->model)) {
      case CPUID(0x18, 0x00):
      case CPUID(0x18, 0x01):
        return AMD_ZEN;
    }
  }
  return X86_UNKNOWN;
}

////////////////////////////////////////////////////////////////////////////////
// CacheInfo
////////////////////////////////////////////////////////////////////////////////

static const CacheLevelInfo kEmptyCacheLevelInfo;

static CacheLevelInfo GetCacheLevelInfo(const uint32_t reg) {
  const int UNDEF = -1;
  const int KiB = 1024;
  const int MiB = 1024 * KiB;
  switch (reg) {
    case 0x01:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_TLB,
                              .cache_size = 4 * KiB,
                              .ways = 4,
                              .line_size = UNDEF,
                              .tlb_entries = 32,
                              .partitioning = 0};
    case 0x02:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_TLB,
                              .cache_size = 4 * MiB,
                              .ways = 0xFF,
                              .line_size = UNDEF,
                              .tlb_entries = 2,
                              .partitioning = 0};
    case 0x03:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_TLB,
                              .cache_size = 4 * KiB,
                              .ways = 4,
                              .line_size = UNDEF,
                              .tlb_entries = 64,
                              .partitioning = 0};
    case 0x04:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_TLB,
                              .cache_size = 4 * MiB,
                              .ways = 4,
                              .line_size = UNDEF,
                              .tlb_entries = 8,
                              .partitioning = 0};
    case 0x05:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_TLB,
                              .cache_size = 4 * MiB,
                              .ways = 4,
                              .line_size = UNDEF,
                              .tlb_entries = 32,
                              .partitioning = 0};
    case 0x06:
      return (CacheLevelInfo){.level = 1,
                              .cache_type = CPU_FEATURE_CACHE_INSTRUCTION,
                              .cache_size = 8 * KiB,
                              .ways = 4,
                              .line_size = 32,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x08:
      return (CacheLevelInfo){.level = 1,
                              .cache_type = CPU_FEATURE_CACHE_INSTRUCTION,
                              .cache_size = 16 * KiB,
                              .ways = 4,
                              .line_size = 32,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x09:
      return (CacheLevelInfo){.level = 1,
                              .cache_type = CPU_FEATURE_CACHE_INSTRUCTION,
                              .cache_size = 32 * KiB,
                              .ways = 4,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x0A:
      return (CacheLevelInfo){.level = 1,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 8 * KiB,
                              .ways = 2,
                              .line_size = 32,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x0B:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_TLB,
                              .cache_size = 4 * MiB,
                              .ways = 4,
                              .line_size = UNDEF,
                              .tlb_entries = 4,
                              .partitioning = 0};
    case 0x0C:
      return (CacheLevelInfo){.level = 1,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 16 * KiB,
                              .ways = 4,
                              .line_size = 32,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x0D:
      return (CacheLevelInfo){.level = 1,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 16 * KiB,
                              .ways = 4,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x0E:
      return (CacheLevelInfo){.level = 1,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 24 * KiB,
                              .ways = 6,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x1D:
      return (CacheLevelInfo){.level = 2,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 128 * KiB,
                              .ways = 2,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x21:
      return (CacheLevelInfo){.level = 2,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 256 * KiB,
                              .ways = 8,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x22:
      return (CacheLevelInfo){.level = 3,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 512 * KiB,
                              .ways = 4,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 2};
    case 0x23:
      return (CacheLevelInfo){.level = 3,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 1 * MiB,
                              .ways = 8,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 2};
    case 0x24:
      return (CacheLevelInfo){.level = 2,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 1 * MiB,
                              .ways = 16,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x25:
      return (CacheLevelInfo){.level = 3,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 2 * MiB,
                              .ways = 8,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 2};
    case 0x29:
      return (CacheLevelInfo){.level = 3,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 4 * MiB,
                              .ways = 8,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 2};
    case 0x2C:
      return (CacheLevelInfo){.level = 1,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 32 * KiB,
                              .ways = 8,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x30:
      return (CacheLevelInfo){.level = 1,
                              .cache_type = CPU_FEATURE_CACHE_INSTRUCTION,
                              .cache_size = 32 * KiB,
                              .ways = 8,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x40:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = UNDEF,
                              .ways = UNDEF,
                              .line_size = UNDEF,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x41:
      return (CacheLevelInfo){.level = 2,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 128 * KiB,
                              .ways = 4,
                              .line_size = 32,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x42:
      return (CacheLevelInfo){.level = 2,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 256 * KiB,
                              .ways = 4,
                              .line_size = 32,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x43:
      return (CacheLevelInfo){.level = 2,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 512 * KiB,
                              .ways = 4,
                              .line_size = 32,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x44:
      return (CacheLevelInfo){.level = 2,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 1 * MiB,
                              .ways = 4,
                              .line_size = 32,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x45:
      return (CacheLevelInfo){.level = 2,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 2 * MiB,
                              .ways = 4,
                              .line_size = 32,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x46:
      return (CacheLevelInfo){.level = 3,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 4 * MiB,
                              .ways = 4,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x47:
      return (CacheLevelInfo){.level = 3,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 8 * MiB,
                              .ways = 8,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x48:
      return (CacheLevelInfo){.level = 2,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 3 * MiB,
                              .ways = 12,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x49:
      return (CacheLevelInfo){.level = 2,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 4 * MiB,
                              .ways = 16,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case (0x49 | (1 << 8)):
      return (CacheLevelInfo){.level = 3,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 4 * MiB,
                              .ways = 16,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x4A:
      return (CacheLevelInfo){.level = 3,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 6 * MiB,
                              .ways = 12,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x4B:
      return (CacheLevelInfo){.level = 3,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 8 * MiB,
                              .ways = 16,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x4C:
      return (CacheLevelInfo){.level = 3,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 12 * MiB,
                              .ways = 12,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x4D:
      return (CacheLevelInfo){.level = 3,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 16 * MiB,
                              .ways = 16,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x4E:
      return (CacheLevelInfo){.level = 2,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 6 * MiB,
                              .ways = 24,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x4F:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_TLB,
                              .cache_size = 4 * KiB,
                              .ways = UNDEF,
                              .line_size = UNDEF,
                              .tlb_entries = 32,
                              .partitioning = 0};
    case 0x50:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_TLB,
                              .cache_size = 4 * KiB,
                              .ways = UNDEF,
                              .line_size = UNDEF,
                              .tlb_entries = 64,
                              .partitioning = 0};
    case 0x51:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_TLB,
                              .cache_size = 4 * KiB,
                              .ways = UNDEF,
                              .line_size = UNDEF,
                              .tlb_entries = 128,
                              .partitioning = 0};
    case 0x52:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_TLB,
                              .cache_size = 4 * KiB,
                              .ways = UNDEF,
                              .line_size = UNDEF,
                              .tlb_entries = 256,
                              .partitioning = 0};
    case 0x55:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_TLB,
                              .cache_size = 2 * MiB,
                              .ways = 0xFF,
                              .line_size = UNDEF,
                              .tlb_entries = 7,
                              .partitioning = 0};
    case 0x56:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_TLB,
                              .cache_size = 4 * MiB,
                              .ways = 4,
                              .line_size = UNDEF,
                              .tlb_entries = 16,
                              .partitioning = 0};
    case 0x57:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_TLB,
                              .cache_size = 4 * KiB,
                              .ways = 4,
                              .line_size = UNDEF,
                              .tlb_entries = 16,
                              .partitioning = 0};
    case 0x59:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_TLB,
                              .cache_size = 4 * KiB,
                              .ways = 0xFF,
                              .line_size = UNDEF,
                              .tlb_entries = 16,
                              .partitioning = 0};
    case 0x5A:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_TLB,
                              .cache_size = 2 * MiB,
                              .ways = 4,
                              .line_size = UNDEF,
                              .tlb_entries = 32,
                              .partitioning = 0};
    case 0x5B:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_TLB,
                              .cache_size = 4 * KiB,
                              .ways = UNDEF,
                              .line_size = UNDEF,
                              .tlb_entries = 64,
                              .partitioning = 0};
    case 0x5C:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_TLB,
                              .cache_size = 4 * KiB,
                              .ways = UNDEF,
                              .line_size = UNDEF,
                              .tlb_entries = 128,
                              .partitioning = 0};
    case 0x5D:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_TLB,
                              .cache_size = 4,
                              .ways = UNDEF,
                              .line_size = UNDEF,
                              .tlb_entries = 256,
                              .partitioning = 0};
    case 0x60:
      return (CacheLevelInfo){.level = 1,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 16 * KiB,
                              .ways = 8,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x61:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_TLB,
                              .cache_size = 4 * KiB,
                              .ways = 0xFF,
                              .line_size = UNDEF,
                              .tlb_entries = 48,
                              .partitioning = 0};
    case 0x63:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_TLB,
                              .cache_size = 2 * MiB,
                              .ways = 4,
                              .line_size = UNDEF,
                              .tlb_entries = 4,
                              .partitioning = 0};
    case 0x66:
      return (CacheLevelInfo){.level = 1,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 8 * KiB,
                              .ways = 4,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x67:
      return (CacheLevelInfo){.level = 1,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 16 * KiB,
                              .ways = 4,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x68:
      return (CacheLevelInfo){.level = 1,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 32 * KiB,
                              .ways = 4,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x70:
      return (CacheLevelInfo){.level = 1,
                              .cache_type = CPU_FEATURE_CACHE_INSTRUCTION,
                              .cache_size = 12 * KiB,
                              .ways = 8,
                              .line_size = UNDEF,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x71:
      return (CacheLevelInfo){.level = 1,
                              .cache_type = CPU_FEATURE_CACHE_INSTRUCTION,
                              .cache_size = 16 * KiB,
                              .ways = 8,
                              .line_size = UNDEF,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x72:
      return (CacheLevelInfo){.level = 1,
                              .cache_type = CPU_FEATURE_CACHE_INSTRUCTION,
                              .cache_size = 32 * KiB,
                              .ways = 8,
                              .line_size = UNDEF,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x76:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_TLB,
                              .cache_size = 2 * MiB,
                              .ways = 0xFF,
                              .line_size = UNDEF,
                              .tlb_entries = 8,
                              .partitioning = 0};
    case 0x78:
      return (CacheLevelInfo){.level = 2,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 1 * MiB,
                              .ways = 4,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x79:
      return (CacheLevelInfo){.level = 2,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 128 * KiB,
                              .ways = 8,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 2};
    case 0x7A:
      return (CacheLevelInfo){.level = 2,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 256 * KiB,
                              .ways = 8,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 2};
    case 0x7B:
      return (CacheLevelInfo){.level = 2,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 512 * KiB,
                              .ways = 8,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 2};
    case 0x7C:
      return (CacheLevelInfo){.level = 2,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 1 * MiB,
                              .ways = 8,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 2};
    case 0x7D:
      return (CacheLevelInfo){.level = 2,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 2 * MiB,
                              .ways = 8,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x7F:
      return (CacheLevelInfo){.level = 2,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 512 * KiB,
                              .ways = 2,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x80:
      return (CacheLevelInfo){.level = 2,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 512 * KiB,
                              .ways = 8,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x82:
      return (CacheLevelInfo){.level = 2,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 256 * KiB,
                              .ways = 8,
                              .line_size = 32,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x83:
      return (CacheLevelInfo){.level = 2,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 512 * KiB,
                              .ways = 8,
                              .line_size = 32,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x84:
      return (CacheLevelInfo){.level = 2,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 1 * MiB,
                              .ways = 8,
                              .line_size = 32,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x85:
      return (CacheLevelInfo){.level = 2,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 2 * MiB,
                              .ways = 8,
                              .line_size = 32,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x86:
      return (CacheLevelInfo){.level = 2,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 512 * KiB,
                              .ways = 4,
                              .line_size = 32,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0x87:
      return (CacheLevelInfo){.level = 2,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 1 * MiB,
                              .ways = 8,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0xA0:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_DTLB,
                              .cache_size = 4 * KiB,
                              .ways = 0xFF,
                              .line_size = UNDEF,
                              .tlb_entries = 32,
                              .partitioning = 0};
    case 0xB0:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_TLB,
                              .cache_size = 4 * KiB,
                              .ways = 4,
                              .line_size = UNDEF,
                              .tlb_entries = 128,
                              .partitioning = 0};
    case 0xB1:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_TLB,
                              .cache_size = 2 * MiB,
                              .ways = 4,
                              .line_size = UNDEF,
                              .tlb_entries = 8,
                              .partitioning = 0};
    case 0xB2:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_TLB,
                              .cache_size = 4 * KiB,
                              .ways = 4,
                              .line_size = UNDEF,
                              .tlb_entries = 64,
                              .partitioning = 0};
    case 0xB3:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_TLB,
                              .cache_size = 4 * KiB,
                              .ways = 4,
                              .line_size = UNDEF,
                              .tlb_entries = 128,
                              .partitioning = 0};
    case 0xB4:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_TLB,
                              .cache_size = 4 * KiB,
                              .ways = 4,
                              .line_size = UNDEF,
                              .tlb_entries = 256,
                              .partitioning = 0};
    case 0xB5:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_TLB,
                              .cache_size = 4 * KiB,
                              .ways = 8,
                              .line_size = UNDEF,
                              .tlb_entries = 64,
                              .partitioning = 0};
    case 0xB6:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_TLB,
                              .cache_size = 4 * KiB,
                              .ways = 8,
                              .line_size = UNDEF,
                              .tlb_entries = 128,
                              .partitioning = 0};
    case 0xBA:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_TLB,
                              .cache_size = 4 * KiB,
                              .ways = 4,
                              .line_size = UNDEF,
                              .tlb_entries = 64,
                              .partitioning = 0};
    case 0xC0:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_TLB,
                              .cache_size = 4 * KiB,
                              .ways = 4,
                              .line_size = UNDEF,
                              .tlb_entries = 8,
                              .partitioning = 0};
    case 0xC1:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_STLB,
                              .cache_size = 4 * KiB,
                              .ways = 8,
                              .line_size = UNDEF,
                              .tlb_entries = 1024,
                              .partitioning = 0};
    case 0xC2:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_DTLB,
                              .cache_size = 4 * KiB,
                              .ways = 4,
                              .line_size = UNDEF,
                              .tlb_entries = 16,
                              .partitioning = 0};
    case 0xC3:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_STLB,
                              .cache_size = 4 * KiB,
                              .ways = 6,
                              .line_size = UNDEF,
                              .tlb_entries = 1536,
                              .partitioning = 0};
    case 0xCA:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_STLB,
                              .cache_size = 4 * KiB,
                              .ways = 4,
                              .line_size = UNDEF,
                              .tlb_entries = 512,
                              .partitioning = 0};
    case 0xD0:
      return (CacheLevelInfo){.level = 3,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 512 * KiB,
                              .ways = 4,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0xD1:
      return (CacheLevelInfo){.level = 3,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 1 * MiB,
                              .ways = 4,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0xD2:
      return (CacheLevelInfo){.level = 3,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 2 * MiB,
                              .ways = 4,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0xD6:
      return (CacheLevelInfo){.level = 3,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 1 * MiB,
                              .ways = 8,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0xD7:
      return (CacheLevelInfo){.level = 3,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 2 * MiB,
                              .ways = 8,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0xD8:
      return (CacheLevelInfo){.level = 3,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 4 * MiB,
                              .ways = 8,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0xDC:
      return (CacheLevelInfo){.level = 3,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 1 * 1536 * KiB,
                              .ways = 12,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0xDD:
      return (CacheLevelInfo){.level = 3,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 3 * MiB,
                              .ways = 12,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0xDE:
      return (CacheLevelInfo){.level = 3,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 6 * MiB,
                              .ways = 12,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0xE2:
      return (CacheLevelInfo){.level = 3,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 2 * MiB,
                              .ways = 16,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0xE3:
      return (CacheLevelInfo){.level = 3,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 4 * MiB,
                              .ways = 16,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0xE4:
      return (CacheLevelInfo){.level = 3,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 8 * MiB,
                              .ways = 16,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0xEA:
      return (CacheLevelInfo){.level = 3,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 12 * MiB,
                              .ways = 24,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0xEB:
      return (CacheLevelInfo){.level = 3,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 18 * MiB,
                              .ways = 24,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0xEC:
      return (CacheLevelInfo){.level = 3,
                              .cache_type = CPU_FEATURE_CACHE_DATA,
                              .cache_size = 24 * MiB,
                              .ways = 24,
                              .line_size = 64,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0xF0:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_PREFETCH,
                              .cache_size = 64 * KiB,
                              .ways = UNDEF,
                              .line_size = UNDEF,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0xF1:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_PREFETCH,
                              .cache_size = 128 * KiB,
                              .ways = UNDEF,
                              .line_size = UNDEF,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    case 0xFF:
      return (CacheLevelInfo){.level = UNDEF,
                              .cache_type = CPU_FEATURE_CACHE_NULL,
                              .cache_size = UNDEF,
                              .ways = UNDEF,
                              .line_size = UNDEF,
                              .tlb_entries = UNDEF,
                              .partitioning = 0};
    default:
      return kEmptyCacheLevelInfo;
  }
}

// From https://www.felixcloutier.com/x86/cpuid#tbl-3-12
static void ParseLeaf2(const Leaves* leaves, CacheInfo* info) {
  Leaf leaf = leaves->leaf_2;
  // The least-significant byte in register EAX (register AL) will always return
  // 01H. Software should ignore this value and not interpret it as an
  // informational descriptor.
  leaf.eax &= 0xFFFFFF00;  // Zeroing out AL. 0 is the empty descriptor.
  // The most significant bit (bit 31) of each register indicates whether the
  // register contains valid information (set to 0) or is reserved (set to 1).
  if (IsBitSet(leaf.eax, 31)) leaf.eax = 0;
  if (IsBitSet(leaf.ebx, 31)) leaf.ebx = 0;
  if (IsBitSet(leaf.ecx, 31)) leaf.ecx = 0;
  if (IsBitSet(leaf.edx, 31)) leaf.edx = 0;

  uint8_t data[16];
#if __STDC_VERSION__ >= 201112L
  _Static_assert(sizeof(Leaf) == sizeof(data), "Leaf must be 16 bytes");
#endif
  copy((char*)(data), (const char*)(&leaf), sizeof(data));
  for (size_t i = 0; i < sizeof(data); ++i) {
    const uint8_t descriptor = data[i];
    if (descriptor == 0) continue;
    info->levels[info->size] = GetCacheLevelInfo(descriptor);
    info->size++;
  }
}

static const CacheInfo kEmptyCacheInfo;

// For newer Intel CPUs uses "CPUID, eax=0x00000004".
// https://www.felixcloutier.com/x86/cpuid#input-eax-=-04h--returns-deterministic-cache-parameters-for-each-level
// For newer AMD CPUs uses "CPUID, eax=0x8000001D"
static void ParseCacheInfo(const int max_cpuid_leaf, uint32_t leaf_id,
                           CacheInfo* old_info) {
  CacheInfo info = kEmptyCacheInfo;
  for (int index = 0; info.size < CPU_FEATURES_MAX_CACHE_LEVEL; ++index) {
    const Leaf leaf = SafeCpuIdEx(max_cpuid_leaf, leaf_id, index);
    int cache_type_field = ExtractBitRange(leaf.eax, 4, 0);
    CacheType cache_type;
    if (cache_type_field == 1)
      cache_type = CPU_FEATURE_CACHE_DATA;
    else if (cache_type_field == 2)
      cache_type = CPU_FEATURE_CACHE_INSTRUCTION;
    else if (cache_type_field == 3)
      cache_type = CPU_FEATURE_CACHE_UNIFIED;
    else
      // Intel Processor Identification and the CPUID Instruction Application
      // Note 485 page 37 Table 5-10. Deterministic Cache Parameters.
      // We skip cache parsing in case null of cache type or cache type in the
      // range of 4-31 according to documentation.
      break;
    int level = ExtractBitRange(leaf.eax, 7, 5);
    int line_size = ExtractBitRange(leaf.ebx, 11, 0) + 1;
    int partitioning = ExtractBitRange(leaf.ebx, 21, 12) + 1;
    int ways = ExtractBitRange(leaf.ebx, 31, 22) + 1;
    int tlb_entries = leaf.ecx + 1;
    int cache_size = ways * partitioning * line_size * tlb_entries;
    info.levels[info.size] = (CacheLevelInfo){.level = level,
                                              .cache_type = cache_type,
                                              .cache_size = cache_size,
                                              .ways = ways,
                                              .line_size = line_size,
                                              .tlb_entries = tlb_entries,
                                              .partitioning = partitioning};
    ++info.size;
  }
  // Override CacheInfo if we successfully extracted Deterministic Cache
  // Parameters.
  if (info.size > 0) *old_info = info;
}

typedef struct {
  int level;
  int cache_id;
  CacheType cache_type;
} CacheLevelInfoLegacyAMD;

static int GetWaysLegacyAMD(int cache_level, const uint32_t cache_id) {
  // https://www.amd.com/system/files/TechDocs/25481.pdf page 23
  // CPUID.8000_0005_ECX[23:16] L1 data cache associativity.
  // CPUID.8000_0005_EDX[23:16] L1 instruction cache associativity.
  if (cache_level == 1) {
    return ExtractBitRange(cache_id, 23, 16);
  }
  // https://www.amd.com/system/files/TechDocs/25481.pdf page 24
  // See Table 4: L2/L3 Cache and TLB Associativity Field Definition.
  // CPUID.8000_0006_ECX[15:12] L2 cache associativity.
  // CPUID.8000_0006_EDX[15:12] L3 cache associativity.
  const int ways = ExtractBitRange(cache_id, 15, 12);
  switch (ways) {
    case 0x0:
    case 0x1:
    case 0x2:
    case 0x4:
      return ways;
    case 0x6:
      return 8;
    case 0x8:
      return 16;
    case 0xA:
      return 32;
    case 0xB:
      return 48;
    case 0xC:
      return 64;
    case 0xD:
      return 96;
    case 0xE:
      return 128;
    case 0xF:
      return 255;
    default:
      return -1;  // Reserved
  }
}

static int GetCacheSizeLegacyAMD(int cache_level, const uint32_t cache_id) {
  switch (cache_level) {
    case 1:
      // https://www.amd.com/system/files/TechDocs/25481.pdf page 23
      // CPUID.8000_0005_ECX[31:24] L1 data cache size in KB.
      // CPUID.8000_0005_EDX[31:24] L1 instruction cache size KB.
      return ExtractBitRange(cache_id, 31, 24);
    case 2:
      // https://www.amd.com/system/files/TechDocs/25481.pdf page 25
      // CPUID.8000_0006_ECX[31:16] L2 cache size in KB.
      return ExtractBitRange(cache_id, 31, 16);
    case 3:
      // https://www.amd.com/system/files/TechDocs/25481.pdf page 25
      // CPUID.8000_0006_EDX[31:18] L3 cache size.
      // Specifies the L3 cache size is within the following range:
      // (L3Size[31:18] * 512KB) <= L3 cache size < ((L3Size[31:18]+1) * 512KB).
      return ExtractBitRange(cache_id, 31, 18) * 512;
    default:
      return 0;
  }
}

#define LEGACY_AMD_MAX_CACHE_LEVEL 4

// https://www.amd.com/system/files/TechDocs/25481.pdf
// CPUID Fn8000_0005_E[A,B,C,D]X, Fn8000_0006_E[A,B,C,D]X - TLB and Cache info
static void ParseCacheInfoLegacyAMD(const uint32_t max_ext, CacheInfo* info) {
  const Leaf cache_tlb_leaf1 = SafeCpuIdEx(max_ext, 0x80000005, 0);
  const Leaf cache_tlb_leaf2 = SafeCpuIdEx(max_ext, 0x80000006, 0);

  const CacheLevelInfoLegacyAMD legacy_cache_info[LEGACY_AMD_MAX_CACHE_LEVEL] =
      {(CacheLevelInfoLegacyAMD){.cache_id = cache_tlb_leaf1.ecx,
                                 .cache_type = CPU_FEATURE_CACHE_DATA,
                                 .level = 1},
       (CacheLevelInfoLegacyAMD){.cache_id = cache_tlb_leaf1.edx,
                                 .cache_type = CPU_FEATURE_CACHE_INSTRUCTION,
                                 .level = 1},
       (CacheLevelInfoLegacyAMD){.cache_id = cache_tlb_leaf2.ecx,
                                 .cache_type = CPU_FEATURE_CACHE_UNIFIED,
                                 .level = 2},
       (CacheLevelInfoLegacyAMD){.cache_id = cache_tlb_leaf2.edx,
                                 .cache_type = CPU_FEATURE_CACHE_UNIFIED,
                                 .level = 3}};

  const int KiB = 1024;
  const int UNDEF = -1;
  for (int i = 0; i < LEGACY_AMD_MAX_CACHE_LEVEL; ++i) {
    const int level = legacy_cache_info[i].level;
    const int cache_id = legacy_cache_info[i].cache_id;
    const CacheType cache_type = legacy_cache_info[i].cache_type;
    const int cache_size = GetCacheSizeLegacyAMD(level, cache_id);
    if (cache_size == 0) break;
    info->levels[i] =
        (CacheLevelInfo){.level = level,
                         .cache_type = cache_type,
                         .cache_size = cache_size * KiB,
                         .ways = GetWaysLegacyAMD(level, cache_id),
                         .line_size = ExtractBitRange(cache_id, 7, 0),
                         .tlb_entries = UNDEF,
                         .partitioning = UNDEF};
    ++info->size;
  }
}

CacheInfo GetX86CacheInfo(void) {
  CacheInfo info = kEmptyCacheInfo;
  const Leaves leaves = ReadLeaves();
  if (IsVendor(leaves.leaf_0, CPU_FEATURES_VENDOR_GENUINE_INTEL) ||
      IsVendor(leaves.leaf_0, CPU_FEATURES_VENDOR_CENTAUR_HAULS) ||
      IsVendor(leaves.leaf_0, CPU_FEATURES_VENDOR_SHANGHAI)) {
    ParseLeaf2(&leaves, &info);
    ParseCacheInfo(leaves.max_cpuid_leaf, 4, &info);
  } else if (IsVendor(leaves.leaf_0, CPU_FEATURES_VENDOR_AUTHENTIC_AMD) ||
             IsVendor(leaves.leaf_0, CPU_FEATURES_VENDOR_HYGON_GENUINE)) {
    // If CPUID Fn8000_0001_ECX[TopologyExtensions]==0
    // then CPUID Fn8000_0001_E[D,C,B,A]X is reserved.
    // https://www.amd.com/system/files/TechDocs/25481.pdf
    if (IsBitSet(leaves.leaf_80000001.ecx, 22)) {
      ParseCacheInfo(leaves.max_cpuid_leaf_ext, 0x8000001D, &info);
    } else {
      ParseCacheInfoLegacyAMD(leaves.max_cpuid_leaf_ext, &info);
    }
  }
  return info;
}

////////////////////////////////////////////////////////////////////////////////
// Definitions for introspection.
////////////////////////////////////////////////////////////////////////////////
#define INTROSPECTION_TABLE                                \
  LINE(X86_FPU, fpu, , , )                                 \
  LINE(X86_TSC, tsc, , , )                                 \
  LINE(X86_CX8, cx8, , , )                                 \
  LINE(X86_CLFSH, clfsh, , , )                             \
  LINE(X86_MMX, mmx, , , )                                 \
  LINE(X86_AES, aes, , , )                                 \
  LINE(X86_ERMS, erms, , , )                               \
  LINE(X86_F16C, f16c, , , )                               \
  LINE(X86_FMA4, fma4, , , )                               \
  LINE(X86_FMA3, fma3, , , )                               \
  LINE(X86_VAES, vaes, , , )                               \
  LINE(X86_VPCLMULQDQ, vpclmulqdq, , , )                   \
  LINE(X86_BMI1, bmi1, , , )                               \
  LINE(X86_HLE, hle, , , )                                 \
  LINE(X86_BMI2, bmi2, , , )                               \
  LINE(X86_RTM, rtm, , , )                                 \
  LINE(X86_RDSEED, rdseed, , , )                           \
  LINE(X86_CLFLUSHOPT, clflushopt, , , )                   \
  LINE(X86_CLWB, clwb, , , )                               \
  LINE(X86_SSE, sse, , , )                                 \
  LINE(X86_SSE2, sse2, , , )                               \
  LINE(X86_SSE3, sse3, , , )                               \
  LINE(X86_SSSE3, ssse3, , , )                             \
  LINE(X86_SSE4_1, sse4_1, , , )                           \
  LINE(X86_SSE4_2, sse4_2, , , )                           \
  LINE(X86_SSE4A, sse4a, , , )                             \
  LINE(X86_AVX, avx, , , )                                 \
  LINE(X86_AVX_VNNI, avx_vnni, , , )                       \
  LINE(X86_AVX2, avx2, , , )                               \
  LINE(X86_AVX512F, avx512f, , , )                         \
  LINE(X86_AVX512CD, avx512cd, , , )                       \
  LINE(X86_AVX512ER, avx512er, , , )                       \
  LINE(X86_AVX512PF, avx512pf, , , )                       \
  LINE(X86_AVX512BW, avx512bw, , , )                       \
  LINE(X86_AVX512DQ, avx512dq, , , )                       \
  LINE(X86_AVX512VL, avx512vl, , , )                       \
  LINE(X86_AVX512IFMA, avx512ifma, , , )                   \
  LINE(X86_AVX512VBMI, avx512vbmi, , , )                   \
  LINE(X86_AVX512VBMI2, avx512vbmi2, , , )                 \
  LINE(X86_AVX512VNNI, avx512vnni, , , )                   \
  LINE(X86_AVX512BITALG, avx512bitalg, , , )               \
  LINE(X86_AVX512VPOPCNTDQ, avx512vpopcntdq, , , )         \
  LINE(X86_AVX512_4VNNIW, avx512_4vnniw, , , )             \
  LINE(X86_AVX512_4VBMI2, avx512_4vbmi2, , , )             \
  LINE(X86_AVX512_SECOND_FMA, avx512_second_fma, , , )     \
  LINE(X86_AVX512_4FMAPS, avx512_4fmaps, , , )             \
  LINE(X86_AVX512_BF16, avx512_bf16, , , )                 \
  LINE(X86_AVX512_VP2INTERSECT, avx512_vp2intersect, , , ) \
  LINE(X86_AVX512_FP16, avx512_fp16, , , )                 \
  LINE(X86_AMX_BF16, amx_bf16, , , )                       \
  LINE(X86_AMX_TILE, amx_tile, , , )                       \
  LINE(X86_AMX_INT8, amx_int8, , , )                       \
  LINE(X86_PCLMULQDQ, pclmulqdq, , , )                     \
  LINE(X86_SMX, smx, , , )                                 \
  LINE(X86_SGX, sgx, , , )                                 \
  LINE(X86_CX16, cx16, , , )                               \
  LINE(X86_SHA, sha, , , )                                 \
  LINE(X86_POPCNT, popcnt, , , )                           \
  LINE(X86_MOVBE, movbe, , , )                             \
  LINE(X86_RDRND, rdrnd, , , )                             \
  LINE(X86_DCA, dca, , , )                                 \
  LINE(X86_SS, ss, , , )                                   \
  LINE(X86_ADX, adx, , , )                                 \
  LINE(X86_LZCNT, lzcnt, , , )                             \
  LINE(X86_GFNI, gfni, , , )                               \
  LINE(X86_MOVDIRI, movdiri, , , )                         \
  LINE(X86_MOVDIR64B, movdir64b, , , )                     \
  LINE(X86_FS_REP_MOV, fs_rep_mov, , , )                   \
  LINE(X86_FZ_REP_MOVSB, fz_rep_movsb, , , )               \
  LINE(X86_FS_REP_STOSB, fs_rep_stosb, , , )               \
  LINE(X86_FS_REP_CMPSB_SCASB, fs_rep_cmpsb_scasb, , , )
#define INTROSPECTION_PREFIX X86
#define INTROSPECTION_ENUM_PREFIX X86
#include "define_introspection.inl"

#define X86_MICROARCHITECTURE_NAMES \
  LINE(X86_UNKNOWN)                 \
  LINE(ZHAOXIN_ZHANGJIANG)          \
  LINE(ZHAOXIN_WUDAOKOU)            \
  LINE(ZHAOXIN_LUJIAZUI)            \
  LINE(ZHAOXIN_YONGFENG)            \
  LINE(INTEL_80486)                 \
  LINE(INTEL_P5)                    \
  LINE(INTEL_LAKEMONT)              \
  LINE(INTEL_CORE)                  \
  LINE(INTEL_PNR)                   \
  LINE(INTEL_NHM)                   \
  LINE(INTEL_ATOM_BNL)              \
  LINE(INTEL_WSM)                   \
  LINE(INTEL_SNB)                   \
  LINE(INTEL_IVB)                   \
  LINE(INTEL_ATOM_SMT)              \
  LINE(INTEL_HSW)                   \
  LINE(INTEL_BDW)                   \
  LINE(INTEL_SKL)                   \
  LINE(INTEL_CCL)                   \
  LINE(INTEL_ATOM_GMT)              \
  LINE(INTEL_ATOM_GMT_PLUS)         \
  LINE(INTEL_ATOM_TMT)              \
  LINE(INTEL_KBL)                   \
  LINE(INTEL_CFL)                   \
  LINE(INTEL_WHL)                   \
  LINE(INTEL_CML)                   \
  LINE(INTEL_CNL)                   \
  LINE(INTEL_ICL)                   \
  LINE(INTEL_TGL)                   \
  LINE(INTEL_SPR)                   \
  LINE(INTEL_ADL)                   \
  LINE(INTEL_RCL)                   \
  LINE(INTEL_RPL)                   \
  LINE(INTEL_KNIGHTS_M)             \
  LINE(INTEL_KNIGHTS_L)             \
  LINE(INTEL_KNIGHTS_F)             \
  LINE(INTEL_KNIGHTS_C)             \
  LINE(INTEL_NETBURST)              \
  LINE(AMD_HAMMER)                  \
  LINE(AMD_K10)                     \
  LINE(AMD_K11)                     \
  LINE(AMD_K12)                     \
  LINE(AMD_BOBCAT)                  \
  LINE(AMD_PILEDRIVER)              \
  LINE(AMD_STREAMROLLER)            \
  LINE(AMD_EXCAVATOR)               \
  LINE(AMD_BULLDOZER)               \
  LINE(AMD_JAGUAR)                  \
  LINE(AMD_PUMA)                    \
  LINE(AMD_ZEN)                     \
  LINE(AMD_ZEN_PLUS)                \
  LINE(AMD_ZEN2)                    \
  LINE(AMD_ZEN3)                    \
  LINE(AMD_ZEN4)

const char* GetX86MicroarchitectureName(X86Microarchitecture value) {
#define LINE(ENUM) [ENUM] = STRINGIZE(ENUM),
  static const char* kMicroarchitectureNames[] = {X86_MICROARCHITECTURE_NAMES};
#undef LINE
  if (value >= X86_MICROARCHITECTURE_LAST_) return "unknown microarchitecture";
  return kMicroarchitectureNames[value];
}
