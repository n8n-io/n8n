/*
 * Copyright (C) 2010 The Android Open Source Project
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *  * Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in
 *    the documentation and/or other materials provided with the
 *    distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
 * FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
 * COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
 * INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
 * BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS
 * OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED
 * AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT
 * OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
 * SUCH DAMAGE.
 */
#ifndef GOOGLE_CPU_FEATURES_H
#define GOOGLE_CPU_FEATURES_H
#include <stdint.h>
#include <sys/cdefs.h>

__BEGIN_DECLS

/* A list of valid values returned by android_getCpuFamily().
 * They describe the CPU Architecture of the current process.
 */
typedef enum {
  ANDROID_CPU_FAMILY_UNKNOWN = 0,
  ANDROID_CPU_FAMILY_ARM,
  ANDROID_CPU_FAMILY_X86,
  ANDROID_CPU_FAMILY_MIPS,
  ANDROID_CPU_FAMILY_ARM64,
  ANDROID_CPU_FAMILY_X86_64,
  ANDROID_CPU_FAMILY_MIPS64,
  ANDROID_CPU_FAMILY_MAX /* do not remove */
} AndroidCpuFamily;

/* Return the CPU family of the current process.
 *
 * Note that this matches the bitness of the current process. I.e. when
 * running a 32-bit binary on a 64-bit capable CPU, this will return the
 * 32-bit CPU family value.
 */
extern AndroidCpuFamily android_getCpuFamily(void);

/* Return a bitmap describing a set of optional CPU features that are
 * supported by the current device's CPU. The exact bit-flags returned
 * depend on the value returned by android_getCpuFamily(). See the
 * documentation for the ANDROID_CPU_*_FEATURE_* flags below for details.
 */
extern uint64_t android_getCpuFeatures(void);

/* The list of feature flags for ANDROID_CPU_FAMILY_ARM that can be
 * recognized by the library (see note below for 64-bit ARM). Value details
 * are:
 *
 *   VFPv2:
 *     CPU supports the VFPv2 instruction set. Many, but not all, ARMv6 CPUs
 *     support these instructions. VFPv2 is a subset of VFPv3 so this will
 *     be set whenever VFPv3 is set too.
 *
 *   ARMv7:
 *     CPU supports the ARMv7-A basic instruction set.
 *     This feature is mandated by the 'armeabi-v7a' ABI.
 *
 *   VFPv3:
 *     CPU supports the VFPv3-D16 instruction set, providing hardware FPU
 *     support for single and double precision floating point registers.
 *     Note that only 16 FPU registers are available by default, unless
 *     the D32 bit is set too. This feature is also mandated by the
 *     'armeabi-v7a' ABI.
 *
 *   VFP_D32:
 *     CPU VFP optional extension that provides 32 FPU registers,
 *     instead of 16. Note that ARM mandates this feature is the 'NEON'
 *     feature is implemented by the CPU.
 *
 *   NEON:
 *     CPU FPU supports "ARM Advanced SIMD" instructions, also known as
 *     NEON. Note that this mandates the VFP_D32 feature as well, per the
 *     ARM Architecture specification.
 *
 *   VFP_FP16:
 *     Half-width floating precision VFP extension. If set, the CPU
 *     supports instructions to perform floating-point operations on
 *     16-bit registers. This is part of the VFPv4 specification, but
 *     not mandated by any Android ABI.
 *
 *   VFP_FMA:
 *     Fused multiply-accumulate VFP instructions extension. Also part of
 *     the VFPv4 specification, but not mandated by any Android ABI.
 *
 *   NEON_FMA:
 *     Fused multiply-accumulate NEON instructions extension. Optional
 *     extension from the VFPv4 specification, but not mandated by any
 *     Android ABI.
 *
 *   IDIV_ARM:
 *     Integer division available in ARM mode. Only available
 *     on recent CPUs (e.g. Cortex-A15).
 *
 *   IDIV_THUMB2:
 *     Integer division available in Thumb-2 mode. Only available
 *     on recent CPUs (e.g. Cortex-A15).
 *
 *   iWMMXt:
 *     Optional extension that adds MMX registers and operations to an
 *     ARM CPU. This is only available on a few XScale-based CPU designs
 *     sold by Marvell. Pretty rare in practice.
 *
 *   AES:
 *     CPU supports AES instructions. These instructions are only
 *     available for 32-bit applications running on ARMv8 CPU.
 *
 *   CRC32:
 *     CPU supports CRC32 instructions. These instructions are only
 *     available for 32-bit applications running on ARMv8 CPU.
 *
 *   SHA2:
 *     CPU supports SHA2 instructions. These instructions are only
 *     available for 32-bit applications running on ARMv8 CPU.
 *
 *   SHA1:
 *     CPU supports SHA1 instructions. These instructions are only
 *     available for 32-bit applications running on ARMv8 CPU.
 *
 *   PMULL:
 *     CPU supports 64-bit PMULL and PMULL2 instructions. These
 *     instructions are only available for 32-bit applications
 *     running on ARMv8 CPU.
 *
 * If you want to tell the compiler to generate code that targets one of
 * the feature set above, you should probably use one of the following
 * flags (for more details, see technical note at the end of this file):
 *
 *   -mfpu=vfp
 *   -mfpu=vfpv2
 *     These are equivalent and tell GCC to use VFPv2 instructions for
 *     floating-point operations. Use this if you want your code to
 *     run on *some* ARMv6 devices, and any ARMv7-A device supported
 *     by Android.
 *
 *     Generated code requires VFPv2 feature.
 *
 *   -mfpu=vfpv3-d16
 *     Tell GCC to use VFPv3 instructions (using only 16 FPU registers).
 *     This should be generic code that runs on any CPU that supports the
 *     'armeabi-v7a' Android ABI. Note that no ARMv6 CPU supports this.
 *
 *     Generated code requires VFPv3 feature.
 *
 *   -mfpu=vfpv3
 *     Tell GCC to use VFPv3 instructions with 32 FPU registers.
 *     Generated code requires VFPv3|VFP_D32 features.
 *
 *   -mfpu=neon
 *     Tell GCC to use VFPv3 instructions with 32 FPU registers, and
 *     also support NEON intrinsics (see <arm_neon.h>).
 *     Generated code requires VFPv3|VFP_D32|NEON features.
 *
 *   -mfpu=vfpv4-d16
 *     Generated code requires VFPv3|VFP_FP16|VFP_FMA features.
 *
 *   -mfpu=vfpv4
 *     Generated code requires VFPv3|VFP_FP16|VFP_FMA|VFP_D32 features.
 *
 *   -mfpu=neon-vfpv4
 *     Generated code requires VFPv3|VFP_FP16|VFP_FMA|VFP_D32|NEON|NEON_FMA
 *     features.
 *
 *   -mcpu=cortex-a7
 *   -mcpu=cortex-a15
 *     Generated code requires VFPv3|VFP_FP16|VFP_FMA|VFP_D32|
 *                             NEON|NEON_FMA|IDIV_ARM|IDIV_THUMB2
 *     This flag implies -mfpu=neon-vfpv4.
 *
 *   -mcpu=iwmmxt
 *     Allows the use of iWMMXt instrinsics with GCC.
 *
 * IMPORTANT NOTE: These flags should only be tested when
 * android_getCpuFamily() returns ANDROID_CPU_FAMILY_ARM, i.e. this is a
 * 32-bit process.
 *
 * When running a 64-bit ARM process on an ARMv8 CPU,
 * android_getCpuFeatures() will return a different set of bitflags
 */
enum {
  ANDROID_CPU_ARM_FEATURE_ARMv7 = (1 << 0),
  ANDROID_CPU_ARM_FEATURE_VFPv3 = (1 << 1),
  ANDROID_CPU_ARM_FEATURE_NEON = (1 << 2),
  ANDROID_CPU_ARM_FEATURE_LDREX_STREX = (1 << 3),
  ANDROID_CPU_ARM_FEATURE_VFPv2 = (1 << 4),
  ANDROID_CPU_ARM_FEATURE_VFP_D32 = (1 << 5),
  ANDROID_CPU_ARM_FEATURE_VFP_FP16 = (1 << 6),
  ANDROID_CPU_ARM_FEATURE_VFP_FMA = (1 << 7),
  ANDROID_CPU_ARM_FEATURE_NEON_FMA = (1 << 8),
  ANDROID_CPU_ARM_FEATURE_IDIV_ARM = (1 << 9),
  ANDROID_CPU_ARM_FEATURE_IDIV_THUMB2 = (1 << 10),
  ANDROID_CPU_ARM_FEATURE_iWMMXt = (1 << 11),
  ANDROID_CPU_ARM_FEATURE_AES = (1 << 12),
  ANDROID_CPU_ARM_FEATURE_PMULL = (1 << 13),
  ANDROID_CPU_ARM_FEATURE_SHA1 = (1 << 14),
  ANDROID_CPU_ARM_FEATURE_SHA2 = (1 << 15),
  ANDROID_CPU_ARM_FEATURE_CRC32 = (1 << 16),
};

/* The bit flags corresponding to the output of android_getCpuFeatures()
 * when android_getCpuFamily() returns ANDROID_CPU_FAMILY_ARM64. Value details
 * are:
 *
 *   FP:
 *     CPU has Floating-point unit.
 *
 *   ASIMD:
 *     CPU has Advanced SIMD unit.
 *
 *   AES:
 *     CPU supports AES instructions.
 *
 *   CRC32:
 *     CPU supports CRC32 instructions.
 *
 *   SHA2:
 *     CPU supports SHA2 instructions.
 *
 *   SHA1:
 *     CPU supports SHA1 instructions.
 *
 *   PMULL:
 *     CPU supports 64-bit PMULL and PMULL2 instructions.
 */
enum {
  ANDROID_CPU_ARM64_FEATURE_FP = (1 << 0),
  ANDROID_CPU_ARM64_FEATURE_ASIMD = (1 << 1),
  ANDROID_CPU_ARM64_FEATURE_AES = (1 << 2),
  ANDROID_CPU_ARM64_FEATURE_PMULL = (1 << 3),
  ANDROID_CPU_ARM64_FEATURE_SHA1 = (1 << 4),
  ANDROID_CPU_ARM64_FEATURE_SHA2 = (1 << 5),
  ANDROID_CPU_ARM64_FEATURE_CRC32 = (1 << 6),
};

/* The bit flags corresponding to the output of android_getCpuFeatures()
 * when android_getCpuFamily() returns ANDROID_CPU_FAMILY_X86 or
 * ANDROID_CPU_FAMILY_X86_64.
 */
enum {
  ANDROID_CPU_X86_FEATURE_SSSE3 = (1 << 0),
  ANDROID_CPU_X86_FEATURE_POPCNT = (1 << 1),
  ANDROID_CPU_X86_FEATURE_MOVBE = (1 << 2),
  ANDROID_CPU_X86_FEATURE_SSE4_1 = (1 << 3),
  ANDROID_CPU_X86_FEATURE_SSE4_2 = (1 << 4),
  ANDROID_CPU_X86_FEATURE_AES_NI = (1 << 5),
  ANDROID_CPU_X86_FEATURE_AVX = (1 << 6),
  ANDROID_CPU_X86_FEATURE_RDRAND = (1 << 7),
  ANDROID_CPU_X86_FEATURE_AVX2 = (1 << 8),
  ANDROID_CPU_X86_FEATURE_SHA_NI = (1 << 9),
};

/* The bit flags corresponding to the output of android_getCpuFeatures()
 * when android_getCpuFamily() returns ANDROID_CPU_FAMILY_MIPS
 * or ANDROID_CPU_FAMILY_MIPS64.  Values are:
 *
 *   R6:
 *     CPU executes MIPS Release 6 instructions natively, and
 *     supports obsoleted R1..R5 instructions only via kernel traps.
 *
 *   MSA:
 *     CPU supports Mips SIMD Architecture instructions.
 */
enum {
  ANDROID_CPU_MIPS_FEATURE_R6 = (1 << 0),
  ANDROID_CPU_MIPS_FEATURE_MSA = (1 << 1),
};

/* Return the number of CPU cores detected on this device.
 * Please note the current implementation supports up to 32 cpus.
 */
extern int android_getCpuCount(void);

/* The following is used to force the CPU count and features
 * mask in sandboxed processes. Under 4.1 and higher, these processes
 * cannot access /proc, which is the only way to get information from
 * the kernel about the current hardware (at least on ARM).
 *
 * It _must_ be called only once, and before any android_getCpuXXX
 * function, any other case will fail.
 *
 * This function return 1 on success, and 0 on failure.
 */
extern int android_setCpu(int cpu_count, uint64_t cpu_features);

#ifdef __arm__

/* Retrieve the ARM 32-bit CPUID value from the kernel.
 * Note that this cannot work on sandboxed processes under 4.1 and
 * higher, unless you called android_setCpuArm() before.
 */
extern uint32_t android_getCpuIdArm(void);

/* An ARM-specific variant of android_setCpu() that also allows you
 * to set the ARM CPUID field.
 */
extern int android_setCpuArm(int cpu_count, uint64_t cpu_features,
                             uint32_t cpu_id);

#endif

__END_DECLS
#endif /* GOOGLE_CPU_FEATURES_H */
