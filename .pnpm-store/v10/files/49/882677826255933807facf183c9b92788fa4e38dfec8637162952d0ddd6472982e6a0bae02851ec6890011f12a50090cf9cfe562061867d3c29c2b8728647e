/*********************************************************************
 * NAN - Native Abstractions for Node.js
 *
 * Copyright (c) 2021 NAN contributors
 *
 * MIT License <https://github.com/nodejs/nan/blob/master/LICENSE.md>
 ********************************************************************/

#ifndef NAN_SCRIPTORIGIN_H_
#define NAN_SCRIPTORIGIN_H_

class ScriptOrigin : public v8::ScriptOrigin {
 public:
#if defined(V8_MAJOR_VERSION) &&                                               \
    (V8_MAJOR_VERSION > 12 ||                                                  \
     (V8_MAJOR_VERSION == 12 &&                                                \
      (defined(V8_MINOR_VERSION) &&                                            \
       (V8_MINOR_VERSION > 6 ||                                                \
        (V8_MINOR_VERSION == 6 && defined(V8_BUILD_NUMBER) &&                  \
         V8_BUILD_NUMBER >= 175)))))
  explicit ScriptOrigin(v8::Local<v8::Value> name) :
      v8::ScriptOrigin(name) {}

  ScriptOrigin(v8::Local<v8::Value> name
             , v8::Local<v8::Integer> line) :
      v8::ScriptOrigin(name
                     , To<int32_t>(line).FromMaybe(0)) {}

  ScriptOrigin(v8::Local<v8::Value> name
             , v8::Local<v8::Integer> line
             , v8::Local<v8::Integer> column) :
      v8::ScriptOrigin(name
                     , To<int32_t>(line).FromMaybe(0)
                     , To<int32_t>(column).FromMaybe(0)) {}
#elif defined(V8_MAJOR_VERSION) && (V8_MAJOR_VERSION > 9 ||                    \
  (V8_MAJOR_VERSION == 9 && (defined(V8_MINOR_VERSION) && (V8_MINOR_VERSION > 0\
      || (V8_MINOR_VERSION == 0 && defined(V8_BUILD_NUMBER)                    \
          && V8_BUILD_NUMBER >= 1)))))
  explicit ScriptOrigin(v8::Local<v8::Value> name) :
      v8::ScriptOrigin(v8::Isolate::GetCurrent(), name) {}

  ScriptOrigin(v8::Local<v8::Value> name
             , v8::Local<v8::Integer> line) :
      v8::ScriptOrigin(v8::Isolate::GetCurrent()
                   , name
                   , To<int32_t>(line).FromMaybe(0)) {}

  ScriptOrigin(v8::Local<v8::Value> name
             , v8::Local<v8::Integer> line
             , v8::Local<v8::Integer> column) :
      v8::ScriptOrigin(v8::Isolate::GetCurrent()
                   , name
                   , To<int32_t>(line).FromMaybe(0)
                   , To<int32_t>(column).FromMaybe(0)) {}
#elif defined(V8_MAJOR_VERSION) && (V8_MAJOR_VERSION > 8 ||                    \
  (V8_MAJOR_VERSION == 8 && (defined(V8_MINOR_VERSION) && (V8_MINOR_VERSION > 9\
      || (V8_MINOR_VERSION == 9 && defined(V8_BUILD_NUMBER)                    \
          && V8_BUILD_NUMBER >= 45)))))
  explicit ScriptOrigin(v8::Local<v8::Value> name) : v8::ScriptOrigin(name) {}

  ScriptOrigin(v8::Local<v8::Value> name
             , v8::Local<v8::Integer> line) :
      v8::ScriptOrigin(name, To<int32_t>(line).FromMaybe(0)) {}

  ScriptOrigin(v8::Local<v8::Value> name
             , v8::Local<v8::Integer> line
             , v8::Local<v8::Integer> column) :
      v8::ScriptOrigin(name
                   , To<int32_t>(line).FromMaybe(0)
                   , To<int32_t>(column).FromMaybe(0)) {}
#else
  explicit ScriptOrigin(v8::Local<v8::Value> name) : v8::ScriptOrigin(name) {}

  ScriptOrigin(v8::Local<v8::Value> name
             , v8::Local<v8::Integer> line) : v8::ScriptOrigin(name, line) {}

  ScriptOrigin(v8::Local<v8::Value> name
             , v8::Local<v8::Integer> line
             , v8::Local<v8::Integer> column) :
      v8::ScriptOrigin(name, line, column) {}
#endif

#if defined(V8_MAJOR_VERSION) && (V8_MAJOR_VERSION > 8 ||                      \
  (V8_MAJOR_VERSION == 8 && (defined(V8_MINOR_VERSION) && (V8_MINOR_VERSION > 9\
      || (V8_MINOR_VERSION == 9 && defined(V8_BUILD_NUMBER)                    \
          && V8_BUILD_NUMBER >= 45)))))
    v8::Local<v8::Integer> ResourceLineOffset() const {
      return New(LineOffset());
    }

    v8::Local<v8::Integer> ResourceColumnOffset() const {
      return New(ColumnOffset());
    }
#endif
};

#endif  // NAN_SCRIPTORIGIN_H_
