#include "./parser.h"
#include "./conversions.h"
#include "./language.h"
#include "./logger.h"
#include "./tree.h"

#include <cstddef>
#include <napi.h>
#include <vector>

using namespace Napi;
using std::vector;

namespace node_tree_sitter {

class CallbackInput final {
  public:
  CallbackInput(Function callback, Napi::Value js_buffer_size) {
    this->callback.Reset(callback, 1);
    if (js_buffer_size.IsNumber()) {
      buffer.resize(js_buffer_size.As<Number>().Uint32Value());
    } else {
      buffer.resize(static_cast<uint64_t>(32 * 1024));
    }
  }

  TSInput Input() {
    TSInput result;
    result.payload = static_cast<void *>(this);
    result.encoding = TSInputEncodingUTF16;
    result.read = Read;
    return result;
  }

  private:
  static String slice(String s, uint32_t offset) {
    Env env = s.Env();
    auto *data = env.GetInstanceData<AddonData>();
    return data->string_slice.Call(s, {Number::New(s.Env(), offset)}).As<String>();
  }

  static const char * Read(void *payload, uint32_t byte, TSPoint position, uint32_t *bytes_read) {
    auto *reader = static_cast<CallbackInput *>(payload);
    Napi::Env env = reader->callback.Env();

    if (byte != reader->byte_offset) {
      reader->byte_offset = byte;
      reader->partial_string.Reset();
    }

    *bytes_read = 0;
    String result;
    if (!reader->partial_string.IsEmpty()) {
      result = reader->partial_string.Value().As<String>();
    } else {
      Function callback = reader->callback.Value();
      Napi::Value result_value = callback({
        ByteCountToJS(env, byte),
        PointToJS(env, position),
      });
      if (env.IsExceptionPending()) {
        return nullptr;
      }
      if (!result_value.IsString()) {
        return nullptr;
      }
      result = result_value.As<String>();
    }

    size_t length = 0;
    size_t utf16_units_read = 0;
    napi_status status;
    status = napi_get_value_string_utf16(
      env, result, nullptr, 0, &length
    );
    if (status != napi_ok) {
      return nullptr;
    }
    status = napi_get_value_string_utf16(
      env, result, reinterpret_cast<char16_t *>(reader->buffer.data()), reader->buffer.size(), &utf16_units_read
    );
    if (status != napi_ok) {
      return nullptr;
    }

    *bytes_read = 2 * utf16_units_read;
    reader->byte_offset += *bytes_read;

    if (utf16_units_read < length) {
      reader->partial_string.Reset(slice(result, utf16_units_read));
    } else {
      reader->partial_string.Reset();
    }

    return reinterpret_cast<const char *>(reader->buffer.data());
  }

  FunctionReference callback;
  std::vector<uint16_t> buffer;
  size_t byte_offset {};
  Reference<String> partial_string;
};

void Parser::Init(Napi::Env env, Napi::Object exports) {
  auto *data = env.GetInstanceData<AddonData>();

  Function ctor = DefineClass(env, "Parser", {
    InstanceMethod("setLanguage", &Parser::SetLanguage, napi_default_method),
    InstanceMethod("parse", &Parser::Parse, napi_default_method),
    InstanceMethod("getIncludedRanges", &Parser::IncludedRanges, napi_default_method),
    InstanceMethod("getTimeoutMicros", &Parser::TimeoutMicros, napi_default_method),
    InstanceMethod("setTimeoutMicros", &Parser::SetTimeoutMicros, napi_default_method),
    InstanceMethod("getLogger", &Parser::GetLogger, napi_default_method),
    InstanceMethod("setLogger", &Parser::SetLogger, napi_default_method),
    InstanceMethod("printDotGraphs", &Parser::PrintDotGraphs, napi_default_method),
    InstanceMethod("reset", &Parser::Reset, napi_default_method),
  });

  data->parser_constructor = Napi::Persistent(ctor);
  exports["Parser"] = ctor;
  exports["LANGUAGE_VERSION"] = Number::New(env, TREE_SITTER_LANGUAGE_VERSION);

  String s = String::New(env, "");
  Napi::Value string_slice_value = s.As<Object>()["slice"];
  data->string_slice = Napi::Persistent(string_slice_value.As<Function>());
}

Parser::Parser(const Napi::CallbackInfo &info) : Napi::ObjectWrap<Parser>(info), parser_(ts_parser_new()) {}

Parser::~Parser() {
  ts_parser_print_dot_graphs(parser_, -1);
  ts_parser_set_logger(parser_, { nullptr, nullptr });
  ts_parser_delete(parser_);
}

namespace {

bool handle_included_ranges(Napi::Env env, TSParser *parser, Napi::Value arg) {
  uint32_t last_included_range_end = 0;
  if (arg.IsArray()) {
    auto js_included_ranges = arg.As<Array>();
    vector<TSRange> included_ranges;
    for (unsigned i = 0; i < js_included_ranges.Length(); i++) {
      Value range_value = js_included_ranges[i];
      if (!range_value.IsObject()) {
        return false;
      }
      auto maybe_range = RangeFromJS(range_value);
      if (!maybe_range.IsJust()) {
        return false;
      }
      auto range = maybe_range.Unwrap();
      if (range.start_byte < last_included_range_end) {
        throw RangeError::New(env, "Overlapping ranges");
      }
      last_included_range_end = range.end_byte;
      included_ranges.push_back(range);
    }
    ts_parser_set_included_ranges(parser, included_ranges.data(), included_ranges.size());
  } else {
    ts_parser_set_included_ranges(parser, nullptr, 0);
  }

  return true;
}

} // namespace

Napi::Value Parser::SetLanguage(const Napi::CallbackInfo &info) {
  const TSLanguage *language = language_methods::UnwrapLanguage(info[0]);
  if (language != nullptr) {
    ts_parser_set_language(parser_, language);
    return info.This();
  }
  return info.Env().Undefined();
}

Napi::Value Parser::Parse(const CallbackInfo &info) {
  Napi::Env env = info.Env();

  if (!info[0].IsFunction()) {
    throw TypeError::New(env, "Input must be a function");
  }

  auto callback = info[0].As<Function>();

  Object js_old_tree;
  const TSTree *old_tree = nullptr;
  if (info.Length() > 1 && !info[1].IsNull() && !info[1].IsUndefined() && info[1].IsObject()) {
    js_old_tree = info[1].As<Object>();
    const Tree *tree = Tree::UnwrapTree(js_old_tree);
    if (tree == nullptr) {
      throw TypeError::New(env, "Second argument must be a tree");
    }
    old_tree = tree->tree_;
  }

  Napi::Value buffer_size = env.Null();
  if (info.Length() > 2) {
    buffer_size = info[2];
  }

  if (!handle_included_ranges(env, parser_, info[3])) {
    return env.Undefined();
  }

  CallbackInput callback_input(callback, buffer_size);
  TSTree *tree = ts_parser_parse(parser_, old_tree, callback_input.Input());
  Napi::Value result = Tree::NewInstance(env, tree);
  return result;
}

Napi::Value Parser::IncludedRanges(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();
  uint32_t count;
  const TSRange *ranges = ts_parser_included_ranges(parser_, &count);

  Napi::Array result = Napi::Array::New(env, count);
  for (uint32_t i = 0; i < count; i++) {
    result[i] = RangeToJS(env, ranges[i]);
  }

  return result;
}

Napi::Value Parser::TimeoutMicros(const Napi::CallbackInfo &info) {
  uint64_t timeout_micros = ts_parser_timeout_micros(parser_);
  return Number::New(info.Env(), static_cast<double>(timeout_micros));
}

Napi::Value Parser::SetTimeoutMicros(const Napi::CallbackInfo &info) {
  uint64_t timeout_micros;
  if (!info[0].IsNumber()) {
    throw TypeError::New(info.Env(), "First argument must be a number");
  }
  timeout_micros = info[0].As<Number>().Uint32Value();
  ts_parser_set_timeout_micros(parser_, timeout_micros);
  return info.This();
}

Napi::Value Parser::GetLogger(const Napi::CallbackInfo &info) {
  TSLogger current_logger = ts_parser_logger(parser_);
  if ((current_logger.payload != nullptr) && current_logger.log == Logger::Log) {
    auto *logger = static_cast<Logger *>(current_logger.payload);
    return logger->func.Value();
  }
  return info.Env().Null();
}

Napi::Value Parser::SetLogger(const Napi::CallbackInfo &info) {
  TSLogger current_logger = ts_parser_logger(parser_);

  if (info[0].IsFunction()) {
    if (current_logger.payload != nullptr) {
      delete static_cast<Logger *>(current_logger.payload);
    }
    ts_parser_set_logger(parser_, Logger::Make(info[0].As<Function>()));
  } else if (info[0].IsEmpty() || info[0].IsUndefined() || info[0].IsNull() || (info[0].IsBoolean() && !info[0].As<Boolean>())) {
    if (current_logger.payload != nullptr) {
      delete static_cast<Logger *>(current_logger.payload);
    }
    ts_parser_set_logger(parser_, { nullptr, nullptr });
  } else {
    throw TypeError::New(info.Env(), "Logger callback must either be a function or a falsy value");
  }

  return info.This();
}

Napi::Value Parser::PrintDotGraphs(const Napi::CallbackInfo &info) {
  bool should_print = true;
  int32_t fd = fileno(stderr);

  if (info.Length() > 0) {
    if (!info[0].IsBoolean()) {
      throw TypeError::New(info.Env(), "First argument must be a boolean");
    }
    should_print = info[0].As<Boolean>();
  }

  if (info.Length() > 1) {
    if (!info[1].IsNumber()) {
      throw TypeError::New(info.Env(), "Second argument must be a number");
    }
    fd = info[1].As<Number>().Int32Value();
  }

  ts_parser_print_dot_graphs(parser_, should_print ? fd : -1);

  return info.This();
}

Napi::Value Parser::Reset(const Napi::CallbackInfo & info) {
  ts_parser_reset(parser_);
  return info.This();
}

} // namespace node_tree_sitter
