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

// This program dumps current host data to the standard output.
// Output can be text or json if the `--json` flag is passed.

#include <assert.h>
#include <stdarg.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "cpu_features_macros.h"

#if defined(CPU_FEATURES_ARCH_X86)
#include "cpuinfo_x86.h"
#elif defined(CPU_FEATURES_ARCH_ARM)
#include "cpuinfo_arm.h"
#elif defined(CPU_FEATURES_ARCH_AARCH64)
#include "cpuinfo_aarch64.h"
#elif defined(CPU_FEATURES_ARCH_MIPS)
#include "cpuinfo_mips.h"
#elif defined(CPU_FEATURES_ARCH_PPC)
#include "cpuinfo_ppc.h"
#elif defined(CPU_FEATURES_ARCH_S390X)
#include "cpuinfo_s390x.h"
#elif defined(CPU_FEATURES_ARCH_RISCV)
#include "cpuinfo_riscv.h"
#endif

// Design principles
// -----------------
// We build a tree structure containing all the data to be displayed.
// Then depending on the output type (text or json) we walk the tree and display
// the data accordingly.

// We use a bump allocator to allocate strings and nodes of the tree,
// Memory is not intended to be reclaimed.
typedef struct {
  char* ptr;
  size_t size;
} BumpAllocator;

char gGlobalBuffer[64 * 1024];
BumpAllocator gBumpAllocator = {.ptr = gGlobalBuffer,
                                .size = sizeof(gGlobalBuffer)};

static void internal_error(void) {
  fputs("internal error\n", stderr);
  exit(EXIT_FAILURE);
}

#define ALIGN 8

static void assertAligned(void) {
  if ((uintptr_t)(gBumpAllocator.ptr) % ALIGN) internal_error();
}

static void BA_Align(void) {
  while (gBumpAllocator.size && (uintptr_t)(gBumpAllocator.ptr) % ALIGN) {
    --gBumpAllocator.size;
    ++gBumpAllocator.ptr;
  }
  assertAligned();
}

// Update the available memory left in the BumpAllocator.
static void* BA_Bump(size_t size) {
  assertAligned();
  // Align size to next 8B boundary.
  size = (size + ALIGN - 1) / ALIGN * ALIGN;
  if (gBumpAllocator.size < size) internal_error();
  void* ptr = gBumpAllocator.ptr;
  gBumpAllocator.size -= size;
  gBumpAllocator.ptr += size;
  return ptr;
}

// The type of the nodes in the tree.
typedef enum {
  NT_INVALID,
  NT_INT,
  NT_MAP,
  NT_MAP_ENTRY,
  NT_ARRAY,
  NT_ARRAY_ELEMENT,
  NT_STRING,
} NodeType;

// The node in the tree.
typedef struct Node {
  NodeType type;
  unsigned integer;
  const char* string;
  struct Node* value;
  struct Node* next;
} Node;

// Creates an initialized Node.
static Node* BA_CreateNode(NodeType type) {
  Node* tv = (Node*)BA_Bump(sizeof(Node));
  assert(tv);
  *tv = (Node){.type = type};
  return tv;
}

// Adds an integer node.
static Node* CreateInt(int value) {
  Node* tv = BA_CreateNode(NT_INT);
  tv->integer = value;
  return tv;
}

// Adds a string node.
// `value` must outlive the tree.
static Node* CreateConstantString(const char* value) {
  Node* tv = BA_CreateNode(NT_STRING);
  tv->string = value;
  return tv;
}

// Adds a map node.
static Node* CreateMap(void) { return BA_CreateNode(NT_MAP); }

// Adds an array node.
static Node* CreateArray(void) { return BA_CreateNode(NT_ARRAY); }

// Adds a formatted string node.
static Node* CreatePrintfString(const char* format, ...) {
  va_list arglist;
  va_start(arglist, format);
  char* const ptr = gBumpAllocator.ptr;
  const int written = vsnprintf(ptr, gBumpAllocator.size, format, arglist);
  va_end(arglist);
  if (written < 0 || written >= (int)gBumpAllocator.size) internal_error();
  return CreateConstantString((char*)BA_Bump(written));
}

// Adds a string node.
static Node* CreateString(const char* value) {
  return CreatePrintfString("%s", value);
}

// Adds a map entry node.
static void AddMapEntry(Node* map, const char* key, Node* value) {
  assert(map && map->type == NT_MAP);
  Node* current = map;
  while (current->next) current = current->next;
  current->next = (Node*)BA_Bump(sizeof(Node));
  *current->next = (Node){.type = NT_MAP_ENTRY, .string = key, .value = value};
}

// Adds an array element node.
static void AddArrayElement(Node* array, Node* value) {
  assert(array && array->type == NT_ARRAY);
  Node* current = array;
  while (current->next) current = current->next;
  current->next = (Node*)BA_Bump(sizeof(Node));
  *current->next = (Node){.type = NT_ARRAY_ELEMENT, .value = value};
}

static int cmp(const void* p1, const void* p2) {
  return strcmp(*(const char* const*)p1, *(const char* const*)p2);
}

#define DEFINE_ADD_FLAGS(HasFeature, FeatureName, FeatureType, LastEnum) \
  static void AddFlags(Node* map, const FeatureType* features) {         \
    size_t i;                                                            \
    const char* ptrs[LastEnum] = {0};                                    \
    size_t count = 0;                                                    \
    for (i = 0; i < LastEnum; ++i) {                                     \
      if (HasFeature(features, i)) {                                     \
        ptrs[count] = FeatureName(i);                                    \
        ++count;                                                         \
      }                                                                  \
    }                                                                    \
    qsort((void*)ptrs, count, sizeof(char*), cmp);                       \
    Node* const array = CreateArray();                                   \
    for (i = 0; i < count; ++i)                                          \
      AddArrayElement(array, CreateConstantString(ptrs[i]));             \
    AddMapEntry(map, "flags", array);                                    \
  }

#if defined(CPU_FEATURES_ARCH_X86)
DEFINE_ADD_FLAGS(GetX86FeaturesEnumValue, GetX86FeaturesEnumName, X86Features,
                 X86_LAST_)
#elif defined(CPU_FEATURES_ARCH_ARM)
DEFINE_ADD_FLAGS(GetArmFeaturesEnumValue, GetArmFeaturesEnumName, ArmFeatures,
                 ARM_LAST_)
#elif defined(CPU_FEATURES_ARCH_AARCH64)
DEFINE_ADD_FLAGS(GetAarch64FeaturesEnumValue, GetAarch64FeaturesEnumName,
                 Aarch64Features, AARCH64_LAST_)
#elif defined(CPU_FEATURES_ARCH_MIPS)
DEFINE_ADD_FLAGS(GetMipsFeaturesEnumValue, GetMipsFeaturesEnumName,
                 MipsFeatures, MIPS_LAST_)
#elif defined(CPU_FEATURES_ARCH_PPC)
DEFINE_ADD_FLAGS(GetPPCFeaturesEnumValue, GetPPCFeaturesEnumName, PPCFeatures,
                 PPC_LAST_)
#elif defined(CPU_FEATURES_ARCH_S390X)
DEFINE_ADD_FLAGS(GetS390XFeaturesEnumValue, GetS390XFeaturesEnumName, S390XFeatures,
                 S390X_LAST_)
#elif defined(CPU_FEATURES_ARCH_RISCV)
DEFINE_ADD_FLAGS(GetRiscvFeaturesEnumValue, GetRiscvFeaturesEnumName, RiscvFeatures,
                 RISCV_LAST_)
#endif

// Prints a json string with characters escaping.
static void printJsonString(const char* str) {
  putchar('"');
  for (; str && *str; ++str) {
    switch (*str) {
      case '\"':
      case '\\':
      case '/':
      case '\b':
      case '\f':
      case '\n':
      case '\r':
      case '\t':
        putchar('\\');
    }
    putchar(*str);
  }
  putchar('"');
}

// Walks a Node and print it as json.
static void printJson(const Node* current) {
  assert(current);
  switch (current->type) {
    case NT_INVALID:
      break;
    case NT_INT:
      printf("%d", current->integer);
      break;
    case NT_STRING:
      printJsonString(current->string);
      break;
    case NT_ARRAY:
      putchar('[');
      if (current->next) printJson(current->next);
      putchar(']');
      break;
    case NT_MAP:
      putchar('{');
      if (current->next) printJson(current->next);
      putchar('}');
      break;
    case NT_MAP_ENTRY:
      printf("\"%s\":", current->string);
      printJson(current->value);
      if (current->next) {
        putchar(',');
        printJson(current->next);
      }
      break;
    case NT_ARRAY_ELEMENT:
      printJson(current->value);
      if (current->next) {
        putchar(',');
        printJson(current->next);
      }
      break;
  }
}

// Walks a Node and print it as text.
static void printTextField(const Node* current) {
  switch (current->type) {
    case NT_INVALID:
      break;
    case NT_INT:
      printf("%3d (0x%02X)", current->integer, current->integer);
      break;
    case NT_STRING:
      fputs(current->string, stdout);
      break;
    case NT_ARRAY:
      if (current->next) printTextField(current->next);
      break;
    case NT_MAP:
      if (current->next) {
        printf("{");
        printJson(current->next);
        printf("}");
      }
      break;
    case NT_MAP_ENTRY:
      printf("%-15s : ", current->string);
      printTextField(current->value);
      if (current->next) {
        putchar('\n');
        printTextField(current->next);
      }
      break;
    case NT_ARRAY_ELEMENT:
      printTextField(current->value);
      if (current->next) {
        putchar(',');
        printTextField(current->next);
      }
      break;
  }
}

static void printTextRoot(const Node* current) {
  if (current->type == NT_MAP && current->next) printTextField(current->next);
}

static void showUsage(const char* name) {
  printf(
      "\n"
      "Usage: %s [options]\n"
      "      Options:\n"
      "      -h | --help     Show help message.\n"
      "      -j | --json     Format output as json instead of plain text.\n"
      "\n",
      name);
}

static Node* GetCacheTypeString(CacheType cache_type) {
  switch (cache_type) {
    case CPU_FEATURE_CACHE_NULL:
      return CreateConstantString("null");
    case CPU_FEATURE_CACHE_DATA:
      return CreateConstantString("data");
    case CPU_FEATURE_CACHE_INSTRUCTION:
      return CreateConstantString("instruction");
    case CPU_FEATURE_CACHE_UNIFIED:
      return CreateConstantString("unified");
    case CPU_FEATURE_CACHE_TLB:
      return CreateConstantString("tlb");
    case CPU_FEATURE_CACHE_DTLB:
      return CreateConstantString("dtlb");
    case CPU_FEATURE_CACHE_STLB:
      return CreateConstantString("stlb");
    case CPU_FEATURE_CACHE_PREFETCH:
      return CreateConstantString("prefetch");
  }
  CPU_FEATURES_UNREACHABLE();
}

static void AddCacheInfo(Node* root, const CacheInfo* cache_info) {
  Node* array = CreateArray();
  for (int i = 0; i < cache_info->size; ++i) {
    CacheLevelInfo info = cache_info->levels[i];
    Node* map = CreateMap();
    AddMapEntry(map, "level", CreateInt(info.level));
    AddMapEntry(map, "cache_type", GetCacheTypeString(info.cache_type));
    AddMapEntry(map, "cache_size", CreateInt(info.cache_size));
    AddMapEntry(map, "ways", CreateInt(info.ways));
    AddMapEntry(map, "line_size", CreateInt(info.line_size));
    AddMapEntry(map, "tlb_entries", CreateInt(info.tlb_entries));
    AddMapEntry(map, "partitioning", CreateInt(info.partitioning));
    AddArrayElement(array, map);
  }
  AddMapEntry(root, "cache_info", array);
}

static Node* CreateTree(void) {
  Node* root = CreateMap();
#if defined(CPU_FEATURES_ARCH_X86)
  const X86Info info = GetX86Info();
  const CacheInfo cache_info = GetX86CacheInfo();
  AddMapEntry(root, "arch", CreateString("x86"));
  AddMapEntry(root, "brand", CreateString(info.brand_string));
  AddMapEntry(root, "family", CreateInt(info.family));
  AddMapEntry(root, "model", CreateInt(info.model));
  AddMapEntry(root, "stepping", CreateInt(info.stepping));
  AddMapEntry(root, "uarch",
              CreateString(
                  GetX86MicroarchitectureName(GetX86Microarchitecture(&info))));
  AddFlags(root, &info.features);
  AddCacheInfo(root, &cache_info);
#elif defined(CPU_FEATURES_ARCH_ARM)
  const ArmInfo info = GetArmInfo();
  AddMapEntry(root, "arch", CreateString("ARM"));
  AddMapEntry(root, "implementer", CreateInt(info.implementer));
  AddMapEntry(root, "architecture", CreateInt(info.architecture));
  AddMapEntry(root, "variant", CreateInt(info.variant));
  AddMapEntry(root, "part", CreateInt(info.part));
  AddMapEntry(root, "revision", CreateInt(info.revision));
  AddFlags(root, &info.features);
#elif defined(CPU_FEATURES_ARCH_AARCH64)
  const Aarch64Info info = GetAarch64Info();
  AddMapEntry(root, "arch", CreateString("aarch64"));
  AddMapEntry(root, "implementer", CreateInt(info.implementer));
  AddMapEntry(root, "variant", CreateInt(info.variant));
  AddMapEntry(root, "part", CreateInt(info.part));
  AddMapEntry(root, "revision", CreateInt(info.revision));
  AddFlags(root, &info.features);
#elif defined(CPU_FEATURES_ARCH_MIPS)
  const MipsInfo info = GetMipsInfo();
  AddMapEntry(root, "arch", CreateString("mips"));
  AddFlags(root, &info.features);
#elif defined(CPU_FEATURES_ARCH_PPC)
  const PPCInfo info = GetPPCInfo();
  const PPCPlatformStrings strings = GetPPCPlatformStrings();
  AddMapEntry(root, "arch", CreateString("ppc"));
  AddMapEntry(root, "platform", CreateString(strings.platform));
  AddMapEntry(root, "model", CreateString(strings.model));
  AddMapEntry(root, "machine", CreateString(strings.machine));
  AddMapEntry(root, "cpu", CreateString(strings.cpu));
  AddMapEntry(root, "instruction", CreateString(strings.type.platform));
  AddMapEntry(root, "microarchitecture",
              CreateString(strings.type.base_platform));
  AddFlags(root, &info.features);
#elif defined(CPU_FEATURES_ARCH_S390X)
  const S390XInfo info = GetS390XInfo();
  const S390XPlatformStrings strings = GetS390XPlatformStrings();
  AddMapEntry(root, "arch", CreateString("s390x"));
  AddMapEntry(root, "platform", CreateString("zSeries"));
  AddMapEntry(root, "model", CreateString(strings.type.platform));
  AddMapEntry(root, "# processors", CreateInt(strings.num_processors));
  AddFlags(root, &info.features);
#elif defined(CPU_FEATURES_ARCH_RISCV)
  const RiscvInfo info = GetRiscvInfo();
  AddMapEntry(root, "arch", CreateString("risc-v"));
  AddMapEntry(root, "vendor", CreateString(info.vendor));
  AddMapEntry(root, "microarchitecture", CreateString(info.uarch));
  AddFlags(root, &info.features); 
#endif
  return root;
}

int main(int argc, char** argv) {
  BA_Align();
  const Node* const root = CreateTree();
  bool outputJson = false;
  int i = 1;
  for (; i < argc; ++i) {
    const char* arg = argv[i];
    if (strcmp(arg, "-j") == 0 || strcmp(arg, "--json") == 0) {
      outputJson = true;
    } else {
      showUsage(argv[0]);
      if (strcmp(arg, "-h") == 0 || strcmp(arg, "--help") == 0)
        return EXIT_SUCCESS;
      return EXIT_FAILURE;
    }
  }
  if (outputJson)
    printJson(root);
  else
    printTextRoot(root);
  putchar('\n');
  return EXIT_SUCCESS;
}
