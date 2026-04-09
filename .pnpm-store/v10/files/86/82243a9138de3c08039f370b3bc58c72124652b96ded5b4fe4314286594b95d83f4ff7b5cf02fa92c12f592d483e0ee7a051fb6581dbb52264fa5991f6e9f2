/*********************************************************************
 * NAN - Native Abstractions for Node.js
 *
 * Copyright (c) 2018 NAN contributors
 *
 * MIT License <https://github.com/nodejs/nan/blob/master/LICENSE.md>
 ********************************************************************/

#ifndef NAN_CALLBACKS_H_
#define NAN_CALLBACKS_H_

template<typename T> class FunctionCallbackInfo;
template<typename T> class PropertyCallbackInfo;
template<typename T> class Global;

#if defined(V8_MAJOR_VERSION) && (V8_MAJOR_VERSION > 12 ||                     \
  (V8_MAJOR_VERSION == 12 && defined(V8_MINOR_VERSION) && V8_MINOR_VERSION > 4))
namespace Intercepted {
  constexpr v8::Intercepted No() { return v8::Intercepted::kNo; }
  constexpr v8::Intercepted Yes() { return v8::Intercepted::kYes; }
};
#else
namespace Intercepted {
  inline void No() {}
  inline void Yes() {}
};
#endif

typedef void(*FunctionCallback)(const FunctionCallbackInfo<v8::Value>&);
typedef void(*GetterCallback)
    (v8::Local<v8::String>, const PropertyCallbackInfo<v8::Value>&);
typedef void(*SetterCallback)(
    v8::Local<v8::String>,
    v8::Local<v8::Value>,
    const PropertyCallbackInfo<void>&);

#if defined(V8_MAJOR_VERSION) && (V8_MAJOR_VERSION > 12 ||                     \
  (V8_MAJOR_VERSION == 12 && defined(V8_MINOR_VERSION) && V8_MINOR_VERSION > 4))
typedef v8::Intercepted(*PropertyGetterCallback)(
    v8::Local<v8::String>,
    const PropertyCallbackInfo<v8::Value>&);
typedef v8::Intercepted(*PropertySetterCallback)(
    v8::Local<v8::String>,
    v8::Local<v8::Value>,
    const PropertyCallbackInfo<void>&);
#else
typedef void(*PropertyGetterCallback)(
    v8::Local<v8::String>,
    const PropertyCallbackInfo<v8::Value>&);
typedef void(*PropertySetterCallback)(
    v8::Local<v8::String>,
    v8::Local<v8::Value>,
    const PropertyCallbackInfo<v8::Value>&);
#endif
typedef void(*PropertyEnumeratorCallback)
    (const PropertyCallbackInfo<v8::Array>&);
#if defined(V8_MAJOR_VERSION) && (V8_MAJOR_VERSION > 12 ||                     \
  (V8_MAJOR_VERSION == 12 && defined(V8_MINOR_VERSION) && V8_MINOR_VERSION > 4))
typedef v8::Intercepted(*PropertyDeleterCallback)(
    v8::Local<v8::String>,
    const PropertyCallbackInfo<v8::Boolean>&);
typedef v8::Intercepted(*PropertyQueryCallback)(
    v8::Local<v8::String>,
    const PropertyCallbackInfo<v8::Integer>&);
typedef v8::Intercepted(*IndexGetterCallback)(
    uint32_t,
    const PropertyCallbackInfo<v8::Value>&);
typedef v8::Intercepted(*IndexSetterCallback)(
    uint32_t,
    v8::Local<v8::Value>,
    const PropertyCallbackInfo<void>&);
typedef v8::Intercepted(*IndexEnumeratorCallback)
    (const PropertyCallbackInfo<v8::Array>&);
typedef v8::Intercepted(*IndexDeleterCallback)(
    uint32_t,
    const PropertyCallbackInfo<v8::Boolean>&);
typedef v8::Intercepted(*IndexQueryCallback)(
    uint32_t,
    const PropertyCallbackInfo<v8::Integer>&);
#else
typedef void(*PropertyDeleterCallback)(
    v8::Local<v8::String>,
    const PropertyCallbackInfo<v8::Boolean>&);
typedef void(*PropertyQueryCallback)(
    v8::Local<v8::String>,
    const PropertyCallbackInfo<v8::Integer>&);
typedef void(*IndexGetterCallback)(
    uint32_t,
    const PropertyCallbackInfo<v8::Value>&);
typedef void(*IndexSetterCallback)(
    uint32_t,
    v8::Local<v8::Value>,
    const PropertyCallbackInfo<v8::Value>&);
typedef void(*IndexEnumeratorCallback)
    (const PropertyCallbackInfo<v8::Array>&);
typedef void(*IndexDeleterCallback)(
    uint32_t,
    const PropertyCallbackInfo<v8::Boolean>&);
typedef void(*IndexQueryCallback)(
    uint32_t,
    const PropertyCallbackInfo<v8::Integer>&);
#endif
namespace imp {
#if (NODE_MODULE_VERSION < NODE_16_0_MODULE_VERSION)
typedef v8::Local<v8::AccessorSignature> Sig;
#else
typedef v8::Local<v8::Data> Sig;
#endif

static const int kDataIndex =                    0;

static const int kFunctionIndex =                1;
static const int kFunctionFieldCount =           2;

static const int kGetterIndex =                  1;
static const int kSetterIndex =                  2;
static const int kAccessorFieldCount =           3;

static const int kPropertyGetterIndex =          1;
static const int kPropertySetterIndex =          2;
static const int kPropertyEnumeratorIndex =      3;
static const int kPropertyDeleterIndex =         4;
static const int kPropertyQueryIndex =           5;
static const int kPropertyFieldCount =           6;

static const int kIndexPropertyGetterIndex =     1;
static const int kIndexPropertySetterIndex =     2;
static const int kIndexPropertyEnumeratorIndex = 3;
static const int kIndexPropertyDeleterIndex =    4;
static const int kIndexPropertyQueryIndex =      5;
static const int kIndexPropertyFieldCount =      6;

}  // end of namespace imp

#if NODE_MODULE_VERSION > NODE_0_10_MODULE_VERSION
# include "nan_callbacks_12_inl.h"  // NOLINT(build/include)
#else
# include "nan_callbacks_pre_12_inl.h"  // NOLINT(build/include)
#endif

#endif  // NAN_CALLBACKS_H_
