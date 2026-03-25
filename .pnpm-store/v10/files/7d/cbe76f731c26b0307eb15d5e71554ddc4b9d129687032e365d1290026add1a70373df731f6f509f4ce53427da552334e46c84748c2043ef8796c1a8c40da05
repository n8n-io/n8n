#include "./language.h"
#include "tree_sitter/api.h"

#include <napi.h>
#include <string>

using namespace Napi;

namespace node_tree_sitter::language_methods {

/*
  tstag() {
    b2sum -l64 <(printf tree-sitter) <(printf "$1") | \
    awk '{printf "0x" toupper($1) (NR == 1 ? ", " : "\n")}'
  }
  tstag language # => 0x8AF2E5212AD58ABF, 0xD5006CAD83ABBA16
*/
const napi_type_tag LANGUAGE_TYPE_TAG = {
  0x8AF2E5212AD58ABF, 0xD5006CAD83ABBA16
};

const TSLanguage *UnwrapLanguage(Napi::Value value) {
  Napi::Env env = value.Env();

  if (value.IsObject()) {
    value = value.As<Object>()["language"];
  }

  auto arg = value.As<External<const TSLanguage>>();
  if (arg.IsExternal() && arg.CheckTypeTag(&LANGUAGE_TYPE_TAG)) {
    const TSLanguage *language = arg.Data();
    if (language != nullptr) {
      uint16_t version = ts_language_version(language);
      if (
        version < TREE_SITTER_MIN_COMPATIBLE_LANGUAGE_VERSION ||
        version > TREE_SITTER_LANGUAGE_VERSION
      ) {
        std::string message =
          "Incompatible language version. Compatible range: " +
          std::to_string(TREE_SITTER_MIN_COMPATIBLE_LANGUAGE_VERSION) + " - " +
          std::to_string(TREE_SITTER_LANGUAGE_VERSION) + ". Got: " +
          std::to_string(ts_language_version(language));
        RangeError::New(env, message.c_str());
        return nullptr;
      }
      return language;
    }
  }
  throw TypeError::New(env, "Invalid language object");
}

namespace {

Napi::Value GetNodeTypeNamesById(const Napi::CallbackInfo &info) {
  Env env = info.Env();

  const TSLanguage *language = UnwrapLanguage(info[0]);
  if (language == nullptr) {
    return env.Undefined();
  }

  auto result = Array::New(env);
  uint32_t length = ts_language_symbol_count(language);
  for (uint32_t i = 0; i < length; i++) {
    const char *name = ts_language_symbol_name(language, i);
    TSSymbolType type = ts_language_symbol_type(language, i);
    if (type == TSSymbolTypeRegular) {
      result[i] = String::New(env, name);
    } else {
      result[i] = env.Null();
    }
  }

  return result;
}

Napi::Value GetNodeFieldNamesById(const Napi::CallbackInfo &info) {
  Env env = info.Env();

  const TSLanguage *language = UnwrapLanguage(info[0]);
  if (language == nullptr) {
    return env.Undefined();
  }

  auto result = Array::New(env);
  uint32_t length = ts_language_field_count(language);
  for (uint32_t i = 0; i < length + 1; i++) {
    const char *name = ts_language_field_name_for_id(language, i);
    if (name != nullptr) {
      result[i] = String::New(env, name);
    } else {
      result[i] = env.Null();
    }
  }

  return result;
}

} // namespace

void Init(Napi::Env env, Napi::Object exports) {
  exports["getNodeTypeNamesById"] = Function::New(env, GetNodeTypeNamesById);
  exports["getNodeFieldNamesById"] = Function::New(env, GetNodeFieldNamesById);
}

} // namespace node_tree_sitter::language_methods
