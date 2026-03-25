// Copyright 2022 IBM
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

#ifndef CPU_FEATURES_INCLUDE_CPUINFO_S390X_H_
#define CPU_FEATURES_INCLUDE_CPUINFO_S390X_H_

#include "cpu_features_cache_info.h"
#include "cpu_features_macros.h"

CPU_FEATURES_START_CPP_NAMESPACE

typedef struct {
  int esan3: 1;     // instructions named N3, "backported" to esa-mode
  int zarch: 1;     // z/Architecture mode active
  int stfle: 1;     // store-facility-list-extended
  int msa: 1;       // message-security assist
  int ldisp: 1;     // long-displacement
  int eimm: 1;      // extended-immediate
  int dfp: 1;       // decimal floating point & perform floating point operation
  int edat: 1;      // huge page support
  int etf3eh: 1;    // extended-translation facility 3 enhancement
  int highgprs: 1;  // 64-bit register support for 31-bit processes
  int te: 1;        // transactional execution
  int vx: 1;        // vector extension facility
  int vxd: 1;       // vector-packed-decimal facility
  int vxe: 1;       // vector-enhancement facility 1
  int gs: 1;        // guarded-storage facility
  int vxe2: 1;      // vector-enhancements facility 2
  int vxp: 1;       // vector-packed-decimal-enhancement facility
  int sort: 1;      // enhanced-sort facility
  int dflt: 1;      // deflate-conversion facility
  int vxp2: 1;      // vector-packed-decimal-enhancement facility 2
  int nnpa: 1;      // neural network processing assist facility
  int pcimio: 1;    // PCI mio facility
  int sie: 1;       // virtualization support

  // Make sure to update S390XFeaturesEnum below if you add a field here.
} S390XFeatures;

typedef struct {
  S390XFeatures features;
} S390XInfo;

S390XInfo GetS390XInfo(void);

typedef struct {
  char platform[64];       // 0 terminated string
} S390XPlatformTypeStrings;

typedef struct {
  int num_processors;      // -1 if N/A
  S390XPlatformTypeStrings type;
} S390XPlatformStrings;

S390XPlatformStrings GetS390XPlatformStrings(void);

////////////////////////////////////////////////////////////////////////////////
// Introspection functions

typedef enum {
  S390_ESAN3,
  S390_ZARCH,
  S390_STFLE,
  S390_MSA,
  S390_LDISP,
  S390_EIMM,
  S390_DFP,
  S390_EDAT,
  S390_ETF3EH,
  S390_HIGHGPRS,
  S390_TE,
  S390_VX,
  S390_VXD,
  S390_VXE,
  S390_GS,
  S390_VXE2,
  S390_VXP,
  S390_SORT,
  S390_DFLT,
  S390_VXP2,
  S390_NNPA,
  S390_PCIMIO,
  S390_SIE,
  S390X_LAST_,
} S390XFeaturesEnum;

int GetS390XFeaturesEnumValue(const S390XFeatures* features, S390XFeaturesEnum value);

const char* GetS390XFeaturesEnumName(S390XFeaturesEnum);

CPU_FEATURES_END_CPP_NAMESPACE

#if !defined(CPU_FEATURES_ARCH_S390X)
#error "Including cpuinfo_s390x.h from a non-s390x target."
#endif

#endif  // CPU_FEATURES_INCLUDE_CPUINFO_S390X_H_
