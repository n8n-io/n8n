#include <node.h>
#include <node_buffer.h>
#include <nan.h>
#include <ctype.h> // isspace

#include "cpu_features_macros.h"

#if defined(CPU_FEATURES_ARCH_X86)
# include "cpuinfo_x86.h"
# define GetFeatureName GetX86FeaturesEnumName
# define GetFeatureValue GetX86FeaturesEnumValue
# define FeatureType X86Features
# define FeatureEnumType X86FeaturesEnum
# define LastFeature X86_LAST_
#elif defined(CPU_FEATURES_ARCH_ARM)
# include "cpuinfo_arm.h"
# define GetFeatureName GetArmFeaturesEnumName
# define GetFeatureValue GetArmFeaturesEnumValue
# define FeatureType ArmFeatures
# define FeatureEnumType ArmFeaturesEnum
# define LastFeature ARM_LAST_
#elif defined(CPU_FEATURES_ARCH_AARCH64)
# include "cpuinfo_aarch64.h"
# define GetFeatureName GetAarch64FeaturesEnumName
# define GetFeatureValue GetAarch64FeaturesEnumValue
# define FeatureType Aarch64Features
# define FeatureEnumType Aarch64FeaturesEnum
# define LastFeature AARCH64_LAST_
#elif defined(CPU_FEATURES_ARCH_MIPS)
# include "cpuinfo_mips.h"
# define GetFeatureName GetMipsFeaturesEnumName
# define GetFeatureValue GetMipsFeaturesEnumValue
# define FeatureType MipsFeatures
# define FeatureEnumType MipsFeaturesEnum
# define LastFeature MIPS_LAST_
#elif defined(CPU_FEATURES_ARCH_PPC)
# include "cpuinfo_ppc.h"
# define GetFeatureName GetPPCFeaturesEnumName
# define GetFeatureValue GetPPCFeaturesEnumValue
# define FeatureType PPCFeatures
# define FeatureEnumType PPCFeaturesEnum
# define LastFeature PPC_LAST_
#endif

#define SET_FLAG(key)                                                          \
Nan::Set(ret, Nan::New<String>(key).ToLocalChecked(), Nan::New<Boolean>(true))

#define SET_STR(key, val)                                                      \
Nan::Set(ret,                                                                  \
         Nan::New<String>(key).ToLocalChecked(),                               \
         Nan::New<String>(trim(val)).ToLocalChecked())

#define SET_NUM(key, val)                                                      \
Nan::Set(ret, Nan::New<String>(key).ToLocalChecked(), Nan::New<Number>(val))

#define SET_VAL(key, val)                                                      \
Nan::Set(ret, Nan::New<String>(key).ToLocalChecked(), val)

using namespace node;
using namespace v8;
using namespace cpu_features;
using namespace std;

static inline void ltrim(string& s) {
  s.erase(s.begin(), find_if(s.begin(), s.end(), [](int ch) {
    return !isspace(ch);
  }));
}

static inline void rtrim(string& s) {
  s.erase(find_if(s.rbegin(), s.rend(), [](int ch) {
    return !isspace(ch);
  }).base(), s.end());
}

static inline string trim(const char* str) {
  string ret = str;
  ltrim(ret);
  rtrim(ret);
  return ret;
}

#if defined(LastFeature)
Local<Object> GenerateFlags(const FeatureType* features) {
  const auto ret = Nan::New<Object>();
  for (size_t i = 0; i < LastFeature; ++i) {
    const auto enum_val = static_cast<FeatureEnumType>(i);
    if (GetFeatureValue(features, enum_val))
      SET_FLAG(GetFeatureName(enum_val));
  }
  return ret;
}
#endif

NAN_METHOD(GetCPUInfo) {
  const auto ret = Nan::New<Object>();
#if defined(CPU_FEATURES_ARCH_X86)
  const X86Info details = GetX86Info();
  SET_STR("arch", "x86");
  SET_STR("brand", details.brand_string);
  SET_NUM("family", details.family);
  SET_NUM("model", details.model);
  SET_NUM("stepping", details.stepping);
  SET_STR("uarch",
          GetX86MicroarchitectureName(GetX86Microarchitecture(&details)));
  SET_VAL("flags", GenerateFlags(&details.features));
#elif defined(CPU_FEATURES_ARCH_ARM)
  const ArmInfo details = GetArmInfo();
  SET_STR("arch", "arm");
  SET_NUM("implementer", details.implementer);
  SET_NUM("architecture", details.architecture);
  SET_NUM("variant", details.variant);
  SET_NUM("part", details.part);
  SET_NUM("revision", details.revision);
  SET_VAL("flags", GenerateFlags(&details.features));
#elif defined(CPU_FEATURES_ARCH_AARCH64)
  const Aarch64Info details = GetAarch64Info();
  SET_STR("arch", "aarch64");
  SET_NUM("implementer", details.implementer);
  SET_NUM("variant", details.variant);
  SET_NUM("part", details.part);
  SET_NUM("revision", details.revision);
  SET_VAL("flags", GenerateFlags(&details.features));
#elif defined(CPU_FEATURES_ARCH_MIPS)
  const MipsInfo details = GetMipsInfo();
  SET_STR("arch", "mips");
  SET_VAL("flags", GenerateFlags(&details.features));
#elif defined(CPU_FEATURES_ARCH_PPC)
  const PPCInfo details = GetPPCInfo();
  const PPCPlatformStrings strings = GetPPCPlatformStrings();
  SET_STR("arch", "ppc");
  SET_STR("platform", strings.platform);
  SET_STR("model", strings.model);
  SET_STR("machine", strings.machine);
  SET_STR("cpu", strings.cpu);
  SET_STR("instruction set", strings.type.platform);
  SET_STR("microarchitecture", strings.type.base_platform);
  SET_VAL("flags", GenerateFlags(&details.features));
#else
  SET_STR("arch", "unknown");
  SET_VAL("flags", Nan::New<Object>());
#endif
  info.GetReturnValue().Set(ret);
}

NAN_MODULE_INIT(init) {
  Nan::Set(target, Nan::New<String>("getCPUInfo").ToLocalChecked(),
    Nan::GetFunction(Nan::New<FunctionTemplate>(GetCPUInfo)).ToLocalChecked());
}

NODE_MODULE(cpufeatures, init)
