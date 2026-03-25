#include "cpu-features.h"

#include <pthread.h>

#include "cpu_features_macros.h"
#include "internal/filesystem.h"
#include "internal/stack_line_reader.h"
#include "internal/string_view.h"

#if defined(CPU_FEATURES_ARCH_ARM)
#include "cpuinfo_arm.h"
#elif defined(CPU_FEATURES_ARCH_X86)
#include "cpuinfo_x86.h"
#elif defined(CPU_FEATURES_ARCH_MIPS)
#include "cpuinfo_mips.h"
#elif defined(CPU_FEATURES_ARCH_AARCH64)
#include "cpuinfo_aarch64.h"
#endif

static pthread_once_t g_once;
static int g_inited;
static uint64_t g_cpuFeatures;
static int g_cpuCount;

#ifdef CPU_FEATURES_ARCH_ARM
static uint32_t g_cpuIdArm;
#endif

static void set_cpu_mask_bit(uint32_t index, uint32_t* cpu_mask) {
  *cpu_mask |= 1UL << index;
}

// Examples of valid inputs: "31", "4-31"
static void parse_cpu_mask(const StringView text, uint32_t* cpu_mask) {
  int separator_index = CpuFeatures_StringView_IndexOfChar(text, '-');
  if (separator_index < 0) {  // A single cpu index
    int cpu_index = CpuFeatures_StringView_ParsePositiveNumber(text);
    if (cpu_index < 0) return;
    set_cpu_mask_bit(cpu_index, cpu_mask);
  } else {
    int cpu_index_a = CpuFeatures_StringView_ParsePositiveNumber(
        CpuFeatures_StringView_KeepFront(text, separator_index));
    int cpu_index_b = CpuFeatures_StringView_ParsePositiveNumber(
        CpuFeatures_StringView_PopFront(text, separator_index + 1));
    int i;
    if (cpu_index_a < 0 || cpu_index_b < 0) return;
    for (i = cpu_index_a; i <= cpu_index_b; ++i) {
      if (i < 32) {
        set_cpu_mask_bit(i, cpu_mask);
      }
    }
  }
}

// Format specification from
// https://www.kernel.org/doc/Documentation/cputopology.txt
// Examples of valid inputs: "31", "2,4-31,32-63", "0-1,3"
static void parse_cpu_mask_line(const LineResult result, uint32_t* cpu_mask) {
  if (!result.full_line || result.eof) return;
  StringView line = result.line;
  for (; line.size > 0;) {
    int next_entry_index = CpuFeatures_StringView_IndexOfChar(line, ',');
    if (next_entry_index < 0) {
      parse_cpu_mask(line, cpu_mask);
      break;
    }
    StringView entry = CpuFeatures_StringView_KeepFront(line, next_entry_index);
    parse_cpu_mask(entry, cpu_mask);
    line = CpuFeatures_StringView_PopFront(line, next_entry_index + 1);
  }
}

static void update_cpu_mask_from_file(const char* filename,
                                      uint32_t* cpu_mask) {
  const int fd = CpuFeatures_OpenFile(filename);
  if (fd >= 0) {
    StackLineReader reader;
    StackLineReader_Initialize(&reader, fd);
    parse_cpu_mask_line(StackLineReader_NextLine(&reader), cpu_mask);
    CpuFeatures_CloseFile(fd);
  }
}

static int get_cpu_count(void) {
  uint32_t cpu_mask = 0;
  update_cpu_mask_from_file("/sys/devices/system/cpu/present", &cpu_mask);
  update_cpu_mask_from_file("/sys/devices/system/cpu/possible", &cpu_mask);
  return __builtin_popcount(cpu_mask);
}

static void android_cpuInit(void) {
  g_cpuFeatures = 0;
  g_cpuCount = 1;
  g_inited = 1;

  g_cpuCount = get_cpu_count();
  if (g_cpuCount == 0) {
    g_cpuCount = 1;
  }
#if defined(CPU_FEATURES_ARCH_ARM)
  ArmInfo info = GetArmInfo();
  if (info.architecture == 7) g_cpuFeatures |= ANDROID_CPU_ARM_FEATURE_ARMv7;
  if (info.features.vfpv3) g_cpuFeatures |= ANDROID_CPU_ARM_FEATURE_VFPv3;
  if (info.features.neon) {
    g_cpuFeatures |= ANDROID_CPU_ARM_FEATURE_NEON;
    g_cpuFeatures |= ANDROID_CPU_ARM_FEATURE_VFP_D32;
  }
  if (info.features.vfpv3d16) g_cpuFeatures |= ANDROID_CPU_ARM_FEATURE_VFP_FP16;
  if (info.features.idiva) g_cpuFeatures |= ANDROID_CPU_ARM_FEATURE_IDIV_ARM;
  if (info.features.idivt) g_cpuFeatures |= ANDROID_CPU_ARM_FEATURE_IDIV_THUMB2;
  if (info.features.iwmmxt) g_cpuFeatures |= ANDROID_CPU_ARM_FEATURE_iWMMXt;
  if (info.features.aes) g_cpuFeatures |= ANDROID_CPU_ARM_FEATURE_AES;
  if (info.features.pmull) g_cpuFeatures |= ANDROID_CPU_ARM_FEATURE_PMULL;
  if (info.features.sha1) g_cpuFeatures |= ANDROID_CPU_ARM_FEATURE_SHA1;
  if (info.features.sha2) g_cpuFeatures |= ANDROID_CPU_ARM_FEATURE_SHA2;
  if (info.features.crc32) g_cpuFeatures |= ANDROID_CPU_ARM_FEATURE_CRC32;
  if (info.architecture >= 6)
    g_cpuFeatures |= ANDROID_CPU_ARM_FEATURE_LDREX_STREX;
  if (info.features.vfp) g_cpuFeatures |= ANDROID_CPU_ARM_FEATURE_VFPv2;
  if (info.features.vfpv4) {
    g_cpuFeatures |= ANDROID_CPU_ARM_FEATURE_VFP_FMA;
    g_cpuFeatures |= ANDROID_CPU_ARM_FEATURE_NEON_FMA;
  }
  g_cpuIdArm = GetArmCpuId(&info);
#elif defined(CPU_FEATURES_ARCH_X86)
  X86Info info = GetX86Info();
  if (info.features.ssse3) g_cpuFeatures |= ANDROID_CPU_X86_FEATURE_SSSE3;
  if (info.features.popcnt) g_cpuFeatures |= ANDROID_CPU_X86_FEATURE_POPCNT;
  if (info.features.movbe) g_cpuFeatures |= ANDROID_CPU_X86_FEATURE_MOVBE;
  if (info.features.sse4_1) g_cpuFeatures |= ANDROID_CPU_X86_FEATURE_SSE4_1;
  if (info.features.sse4_2) g_cpuFeatures |= ANDROID_CPU_X86_FEATURE_SSE4_2;
  if (info.features.aes) g_cpuFeatures |= ANDROID_CPU_X86_FEATURE_AES_NI;
  if (info.features.avx) g_cpuFeatures |= ANDROID_CPU_X86_FEATURE_AVX;
  if (info.features.rdrnd) g_cpuFeatures |= ANDROID_CPU_X86_FEATURE_RDRAND;
  if (info.features.avx2) g_cpuFeatures |= ANDROID_CPU_X86_FEATURE_AVX2;
  if (info.features.sha) g_cpuFeatures |= ANDROID_CPU_X86_FEATURE_SHA_NI;
#elif defined(CPU_FEATURES_ARCH_MIPS)
  MipsInfo info = GetMipsInfo();
  if (info.features.r6) g_cpuFeatures |= ANDROID_CPU_MIPS_FEATURE_R6;
  if (info.features.msa) g_cpuFeatures |= ANDROID_CPU_MIPS_FEATURE_MSA;
#elif defined(CPU_FEATURES_ARCH_AARCH64)
  Aarch64Info info = GetAarch64Info();
  if (info.features.fp) g_cpuFeatures |= ANDROID_CPU_ARM64_FEATURE_FP;
  if (info.features.asimd) g_cpuFeatures |= ANDROID_CPU_ARM64_FEATURE_ASIMD;
  if (info.features.aes) g_cpuFeatures |= ANDROID_CPU_ARM64_FEATURE_AES;
  if (info.features.pmull) g_cpuFeatures |= ANDROID_CPU_ARM64_FEATURE_PMULL;
  if (info.features.sha1) g_cpuFeatures |= ANDROID_CPU_ARM64_FEATURE_SHA1;
  if (info.features.sha2) g_cpuFeatures |= ANDROID_CPU_ARM64_FEATURE_SHA2;
  if (info.features.crc32) g_cpuFeatures |= ANDROID_CPU_ARM64_FEATURE_CRC32;
#endif
}

AndroidCpuFamily android_getCpuFamily(void) {
#if defined(CPU_FEATURES_ARCH_ARM)
  return ANDROID_CPU_FAMILY_ARM;
#elif defined(CPU_FEATURES_ARCH_X86_32)
  return ANDROID_CPU_FAMILY_X86;
#elif defined(CPU_FEATURES_ARCH_MIPS64)
  return ANDROID_CPU_FAMILY_MIPS64;
#elif defined(CPU_FEATURES_ARCH_MIPS32)
  return ANDROID_CPU_FAMILY_MIPS;
#elif defined(CPU_FEATURES_ARCH_AARCH64)
  return ANDROID_CPU_FAMILY_ARM64;
#elif defined(CPU_FEATURES_ARCH_X86_64)
  return ANDROID_CPU_FAMILY_X86_64;
#else
  return ANDROID_CPU_FAMILY_UNKNOWN;
#endif
}

uint64_t android_getCpuFeatures(void) {
  pthread_once(&g_once, android_cpuInit);
  return g_cpuFeatures;
}

int android_getCpuCount(void) {
  pthread_once(&g_once, android_cpuInit);
  return g_cpuCount;
}

static void android_cpuInitDummy(void) { g_inited = 1; }

int android_setCpu(int cpu_count, uint64_t cpu_features) {
  /* Fail if the library was already initialized. */
  if (g_inited) return 0;
  g_cpuCount = (cpu_count <= 0 ? 1 : cpu_count);
  g_cpuFeatures = cpu_features;
  pthread_once(&g_once, android_cpuInitDummy);
  return 1;
}

#ifdef CPU_FEATURES_ARCH_ARM

uint32_t android_getCpuIdArm(void) {
  pthread_once(&g_once, android_cpuInit);
  return g_cpuIdArm;
}

int android_setCpuArm(int cpu_count, uint64_t cpu_features, uint32_t cpu_id) {
  if (!android_setCpu(cpu_count, cpu_features)) return 0;
  g_cpuIdArm = cpu_id;
  return 1;
}

#endif  // CPU_FEATURES_ARCH_ARM
