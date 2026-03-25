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

#ifndef CPU_FEATURES_INCLUDE_CPU_FEATURES_MACROS_H_
#define CPU_FEATURES_INCLUDE_CPU_FEATURES_MACROS_H_

////////////////////////////////////////////////////////////////////////////////
// Architectures
////////////////////////////////////////////////////////////////////////////////

#if defined(__pnacl__) || defined(__CLR_VER)
#define CPU_FEATURES_ARCH_VM
#endif

#if (defined(_M_IX86) || defined(__i386__)) && !defined(CPU_FEATURES_ARCH_VM)
#define CPU_FEATURES_ARCH_X86_32
#endif

#if (defined(_M_X64) || defined(__x86_64__)) && !defined(CPU_FEATURES_ARCH_VM)
#define CPU_FEATURES_ARCH_X86_64
#endif

#if defined(CPU_FEATURES_ARCH_X86_32) || defined(CPU_FEATURES_ARCH_X86_64)
#define CPU_FEATURES_ARCH_X86
#endif

#if (defined(__arm__) || defined(_M_ARM))
#define CPU_FEATURES_ARCH_ARM
#endif

#if (defined(__aarch64__)  || defined(__arm64__) || defined(_M_ARM64))
#define CPU_FEATURES_ARCH_AARCH64
#endif

#if (defined(CPU_FEATURES_ARCH_AARCH64) || defined(CPU_FEATURES_ARCH_ARM))
#define CPU_FEATURES_ARCH_ANY_ARM
#endif

#if defined(__mips64)
#define CPU_FEATURES_ARCH_MIPS64
#endif

#if defined(__mips__) && !defined(__mips64)  // mips64 also declares __mips__
#define CPU_FEATURES_ARCH_MIPS32
#endif

#if defined(CPU_FEATURES_ARCH_MIPS32) || defined(CPU_FEATURES_ARCH_MIPS64)
#define CPU_FEATURES_ARCH_MIPS
#endif

#if defined(__powerpc__)
#define CPU_FEATURES_ARCH_PPC
#endif

#if defined(__s390x__)
#define CPU_FEATURES_ARCH_S390X
#endif

#if defined(__riscv)
#define CPU_FEATURES_ARCH_RISCV
#endif

#if defined(__riscv) && defined(__riscv_xlen) && __riscv_xlen == 32
#define CPU_FEATURES_ARCH_RISCV32
#endif

#if defined(__riscv) && defined(__riscv_xlen) && __riscv_xlen == 64
#define CPU_FEATURES_ARCH_RISCV64
#endif

#if defined(__riscv) && defined(__riscv_xlen) && __riscv_xlen == 128
#define CPU_FEATURES_ARCH_RISCV128
#endif

////////////////////////////////////////////////////////////////////////////////
// Os
////////////////////////////////////////////////////////////////////////////////

#if (defined(__freebsd__) || defined(__FreeBSD__))
#define CPU_FEATURES_OS_FREEBSD
#endif

#if defined(__ANDROID__)
#define CPU_FEATURES_OS_ANDROID
#endif

#if defined(__linux__) && !defined(CPU_FEATURES_OS_FREEBSD) && \
    !defined(CPU_FEATURES_OS_ANDROID)
#define CPU_FEATURES_OS_LINUX
#endif

#if (defined(_WIN64) || defined(_WIN32))
#define CPU_FEATURES_OS_WINDOWS
#endif

#if (defined(__apple__) || defined(__APPLE__) || defined(__MACH__))
// From https://stackoverflow.com/a/49560690
#include "TargetConditionals.h"
#if defined(TARGET_OS_OSX)
#define CPU_FEATURES_OS_MACOS
#endif
#if defined(TARGET_OS_IPHONE)
// This is set for any non-Mac Apple products (IOS, TV, WATCH)
#define CPU_FEATURES_OS_IPHONE
#endif
#endif

////////////////////////////////////////////////////////////////////////////////
// Compilers
////////////////////////////////////////////////////////////////////////////////

#if defined(__clang__)
#define CPU_FEATURES_COMPILER_CLANG
#endif

#if defined(__GNUC__) && !defined(__clang__)
#define CPU_FEATURES_COMPILER_GCC
#endif

#if defined(_MSC_VER)
#define CPU_FEATURES_COMPILER_MSC
#endif

////////////////////////////////////////////////////////////////////////////////
// Cpp
////////////////////////////////////////////////////////////////////////////////

#if defined(__cplusplus)
#define CPU_FEATURES_START_CPP_NAMESPACE \
  namespace cpu_features {               \
  extern "C" {
#define CPU_FEATURES_END_CPP_NAMESPACE \
  }                                    \
  }
#else
#define CPU_FEATURES_START_CPP_NAMESPACE
#define CPU_FEATURES_END_CPP_NAMESPACE
#endif

////////////////////////////////////////////////////////////////////////////////
// Compiler flags
////////////////////////////////////////////////////////////////////////////////

// Use the following to check if a feature is known to be available at
// compile time. See README.md for an example.
#if defined(CPU_FEATURES_ARCH_X86)

#if defined(__AES__)
#define CPU_FEATURES_COMPILED_X86_AES 1
#else
#define CPU_FEATURES_COMPILED_X86_AES 0
#endif  //  defined(__AES__)

#if defined(__F16C__)
#define CPU_FEATURES_COMPILED_X86_F16C 1
#else
#define CPU_FEATURES_COMPILED_X86_F16C 0
#endif  //  defined(__F16C__)

#if defined(__BMI__)
#define CPU_FEATURES_COMPILED_X86_BMI 1
#else
#define CPU_FEATURES_COMPILED_X86_BMI 0
#endif  //  defined(__BMI__)

#if defined(__BMI2__)
#define CPU_FEATURES_COMPILED_X86_BMI2 1
#else
#define CPU_FEATURES_COMPILED_X86_BMI2 0
#endif  //  defined(__BMI2__)

#if (defined(__SSE__) || (_M_IX86_FP >= 1))
#define CPU_FEATURES_COMPILED_X86_SSE 1
#else
#define CPU_FEATURES_COMPILED_X86_SSE 0
#endif

#if (defined(__SSE2__) || (_M_IX86_FP >= 2))
#define CPU_FEATURES_COMPILED_X86_SSE2 1
#else
#define CPU_FEATURES_COMPILED_X86_SSE2 0
#endif

#if defined(__SSE3__)
#define CPU_FEATURES_COMPILED_X86_SSE3 1
#else
#define CPU_FEATURES_COMPILED_X86_SSE3 0
#endif  //  defined(__SSE3__)

#if defined(__SSSE3__)
#define CPU_FEATURES_COMPILED_X86_SSSE3 1
#else
#define CPU_FEATURES_COMPILED_X86_SSSE3 0
#endif  //  defined(__SSSE3__)

#if defined(__SSE4_1__)
#define CPU_FEATURES_COMPILED_X86_SSE4_1 1
#else
#define CPU_FEATURES_COMPILED_X86_SSE4_1 0
#endif  //  defined(__SSE4_1__)

#if defined(__SSE4_2__)
#define CPU_FEATURES_COMPILED_X86_SSE4_2 1
#else
#define CPU_FEATURES_COMPILED_X86_SSE4_2 0
#endif  //  defined(__SSE4_2__)

#if defined(__AVX__)
#define CPU_FEATURES_COMPILED_X86_AVX 1
#else
#define CPU_FEATURES_COMPILED_X86_AVX 0
#endif  //  defined(__AVX__)

#if defined(__AVX2__)
#define CPU_FEATURES_COMPILED_X86_AVX2 1
#else
#define CPU_FEATURES_COMPILED_X86_AVX2 0
#endif  //  defined(__AVX2__)

#endif  // defined(CPU_FEATURES_ARCH_X86)

#if defined(CPU_FEATURES_ARCH_ANY_ARM)
#if defined(__ARM_NEON__)
#define CPU_FEATURES_COMPILED_ANY_ARM_NEON 1
#else
#define CPU_FEATURES_COMPILED_ANY_ARM_NEON 0
#endif  //  defined(__ARM_NEON__)
#endif  //  defined(CPU_FEATURES_ARCH_ANY_ARM)

#if defined(CPU_FEATURES_ARCH_MIPS)
#if defined(__mips_msa)
#define CPU_FEATURES_COMPILED_MIPS_MSA 1
#else
#define CPU_FEATURES_COMPILED_MIPS_MSA 0
#endif  //  defined(__mips_msa)
#if defined(__mips3d)
#define CPU_FEATURES_COMPILED_MIPS_MIPS3D 1
#else
#define CPU_FEATURES_COMPILED_MIPS_MIPS3D 0
#endif
#endif  //  defined(CPU_FEATURES_ARCH_MIPS)

#if defined(CPU_FEATURES_ARCH_RISCV)
#if defined(__riscv_e)
#define CPU_FEATURES_COMPILED_RISCV_E 1
#else
#define CPU_FEATURES_COMPILED_RISCV_E 0
#endif
#if defined(__riscv_i)
#define CPU_FEATURES_COMPILED_RISCV_I 1
#else
#define CPU_FEATURES_COMPILED_RISCV_I 0
#endif
#if defined(__riscv_m)
#define CPU_FEATURES_COMPILED_RISCV_M 1
#else
#define CPU_FEATURES_COMPILED_RISCV_M 0
#endif
#if defined(__riscv_a)
#define CPU_FEATURES_COMPILED_RISCV_A 1
#else
#define CPU_FEATURES_COMPILED_RISCV_A 0
#endif
#if defined(__riscv_f)
#define CPU_FEATURES_COMPILED_RISCV_F 1
#else
#define CPU_FEATURES_COMPILED_RISCV_F 0
#endif
#if defined(__riscv_d)
#define CPU_FEATURES_COMPILED_RISCV_D 1
#else
#define CPU_FEATURES_COMPILED_RISCV_D 0
#endif
#if defined(__riscv_q)
#define CPU_FEATURES_COMPILED_RISCV_Q 1
#else
#define CPU_FEATURES_COMPILED_RISCV_Q 0
#endif
#if defined(__riscv_c)
#define CPU_FEATURES_COMPILED_RISCV_C 1
#else
#define CPU_FEATURES_COMPILED_RISCV_C 0
#endif
#if defined(__riscv_v)
#define CPU_FEATURES_COMPILED_RISCV_V 1
#else
#define CPU_FEATURES_COMPILED_RISCV_V 0
#endif
#if defined(__riscv_zba)
#define CPU_FEATURES_COMPILED_RISCV_ZBA 1
#else
#define CPU_FEATURES_COMPILED_RISCV_ZBA 0
#endif
#if defined(__riscv_zbb)
#define CPU_FEATURES_COMPILED_RISCV_ZBB 1
#else
#define CPU_FEATURES_COMPILED_RISCV_ZBB 0
#endif
#if defined(__riscv_zbc)
#define CPU_FEATURES_COMPILED_RISCV_ZBC 1
#else
#define CPU_FEATURES_COMPILED_RISCV_ZBC 0
#endif
#if defined(__riscv_zbs)
#define CPU_FEATURES_COMPILED_RISCV_ZBS 1
#else
#define CPU_FEATURES_COMPILED_RISCV_ZBS 0
#endif
#if defined(__riscv_zfh)
#define CPU_FEATURES_COMPILED_RISCV_ZFH 1
#else
#define CPU_FEATURES_COMPILED_RISCV_ZFH 0
#endif
#if defined(__riscv_zfhmin)
#define CPU_FEATURES_COMPILED_RISCV_ZFHMIN 1
#else
#define CPU_FEATURES_COMPILED_RISCV_ZFHMIN 0
#endif
#if defined(__riscv_zknd)
#define CPU_FEATURES_COMPILED_RISCV_ZKND 1
#else
#define CPU_FEATURES_COMPILED_RISCV_ZKND 0
#endif
#if defined(__riscv_zkne)
#define CPU_FEATURES_COMPILED_RISCV_ZKNE 1
#else
#define CPU_FEATURES_COMPILED_RISCV_ZKNE 0
#endif
#if defined(__riscv_zknh)
#define CPU_FEATURES_COMPILED_RISCV_ZKNH 1
#else
#define CPU_FEATURES_COMPILED_RISCV_ZKNH 0
#endif
#if defined(__riscv_zksed)
#define CPU_FEATURES_COMPILED_RISCV_ZKSED 1
#else
#define CPU_FEATURES_COMPILED_RISCV_ZKSED 0
#endif
#if defined(__riscv_zksh)
#define CPU_FEATURES_COMPILED_RISCV_ZKSH 1
#else
#define CPU_FEATURES_COMPILED_RISCV_ZKSH 0
#endif
#if defined(__riscv_zkr)
#define CPU_FEATURES_COMPILED_RISCV_ZKR 1
#else
#define CPU_FEATURES_COMPILED_RISCV_ZKR 0
#endif
#endif  //  defined(CPU_FEATURES_ARCH_RISCV)

////////////////////////////////////////////////////////////////////////////////
// Utils
////////////////////////////////////////////////////////////////////////////////

// Communicates to the compiler that the block is unreachable
#if defined(CPU_FEATURES_COMPILER_CLANG) || defined(CPU_FEATURES_COMPILER_GCC)
#define CPU_FEATURES_UNREACHABLE() __builtin_unreachable()
#elif defined(CPU_FEATURES_COMPILER_MSC)
#define CPU_FEATURES_UNREACHABLE() __assume(0)
#else
#define CPU_FEATURES_UNREACHABLE()
#endif

// Communicates to the compiler that the function is now deprecated
#if defined(CPU_FEATURES_COMPILER_CLANG) || defined(CPU_FEATURES_COMPILER_GCC)
#define CPU_FEATURES_DEPRECATED(message) __attribute__((deprecated(message)))
#elif defined(CPU_FEATURES_COMPILER_MSC)
#define CPU_FEATURES_DEPRECATED(message) __declspec(deprecated(message))
#else
#define CPU_FEATURES_DEPRECATED(message)
#endif

#endif  // CPU_FEATURES_INCLUDE_CPU_FEATURES_MACROS_H_
