#include "./conversions.h"
#include "./addon_data.h"
#include "tree_sitter/api.h"

#include <cmath>
#include <napi.h>

using namespace Napi;

namespace node_tree_sitter {

static const unsigned BYTES_PER_CHARACTER = 2;

void InitConversions(Napi::Env env, Napi::Object exports) {
  auto *data = env.GetInstanceData<AddonData>();

  auto js_point_transfer_buffer = Uint32Array::New(env, 2);
  data->point_transfer_buffer = js_point_transfer_buffer.Data();

  exports["pointTransferArray"] = js_point_transfer_buffer;
}

void TransferPoint(Napi::Env env, const TSPoint &point) {
  auto *data = env.GetInstanceData<AddonData>();
  data->point_transfer_buffer[0] = point.row;
  data->point_transfer_buffer[1] = point.column / 2;
}

Napi::Object RangeToJS(Napi::Env env, const TSRange &range) {
  Object result = Object::New(env);
  result.Set("startPosition", PointToJS(env, range.start_point));
  result.Set("startIndex", ByteCountToJS(env, range.start_byte));
  result.Set("endPosition", PointToJS(env, range.end_point));
  result.Set("endIndex", ByteCountToJS(env, range.end_byte));
  return result;
}

Napi::Maybe<TSRange> RangeFromJS(const Napi::Value& arg) {
  Env env = arg.Env();
  if (!arg.IsObject()) {
    TypeError::New(env, "Range must be a {startPosition, endPosition, startIndex, endIndex} object").ThrowAsJavaScriptException();
    return Napi::Nothing<TSRange>();
  }

  TSRange result;

  auto js_range = arg.As<Object>();

  #define INIT(field, key, Convert) { \
    auto value = js_range.Get(key); \
    if (value.IsEmpty()) { \
      TypeError::New(env, "Range must be a {startPosition, endPosition, startIndex, endIndex} object").ThrowAsJavaScriptException(); \
      return Napi::Nothing<TSRange>(); \
    } \
    auto field = Convert(value); \
    if (field.IsJust()) { \
      result.field = field.Unwrap(); \
    } else { \
      return Napi::Nothing<TSRange>(); \
    } \
  }

  INIT(start_point, "startPosition", PointFromJS);
  INIT(end_point, "endPosition", PointFromJS);
  INIT(start_byte, "startIndex", ByteCountFromJS);
  INIT(end_byte, "endIndex", ByteCountFromJS);

  #undef INIT

  return Napi::Just(result);
}

Napi::Object PointToJS(Napi::Env env, const TSPoint &point) {
  Object result = Object::New(env);
  result["row"] = Number::New(env, point.row);
  result["column"] = ByteCountToJS(env, point.column);
  return result;
}

Napi::Maybe<TSPoint> PointFromJS(const Napi::Value& arg) {
  Env env = arg.Env();

  if (!arg.IsObject()) {
    TypeError::New(env, "Point must be a {row, column} object").ThrowAsJavaScriptException();
    return Napi::Nothing<TSPoint>();
  }
  auto js_point = arg.As<Object>();

  auto js_row = js_point.Get("row").As<Number>();
  if (!js_row.IsNumber()) {
    TypeError::New(env, "Point must be a {row, column} object").ThrowAsJavaScriptException();
    return Napi::Nothing<TSPoint>();
  }

  auto js_column = js_point.Get("column").As<Number>();
  if (!js_column.IsNumber()) {
    TypeError::New(env, "Point must be a {row, column} object").ThrowAsJavaScriptException();
    return Napi::Nothing<TSPoint>();
  }

  uint32_t row;
  if (!std::isfinite(js_row.DoubleValue())) {
    row = UINT32_MAX;
  } else if (js_row.IsNumber()) {
    row = js_row.Uint32Value();
  } else {
    TypeError::New(env, "Point.row must be a number").ThrowAsJavaScriptException();
    return Napi::Nothing<TSPoint>();
  }

  uint32_t column;
  if (!std::isfinite(js_column.DoubleValue())) {
    column = UINT32_MAX;
  } else if (js_column.IsNumber()) {
    column = js_column.Uint32Value() * BYTES_PER_CHARACTER;
  } else {
    TypeError::New(env, "Point.column must be a number").ThrowAsJavaScriptException();
    return Napi::Nothing<TSPoint>();
  }

  return Napi::Just<TSPoint>({row, column});
}

Napi::Number ByteCountToJS(Napi::Env env, uint32_t byte_count) {
  return Number::New(env, byte_count / BYTES_PER_CHARACTER);
}

Napi::Maybe<uint32_t> ByteCountFromJS(const Napi::Value &arg) {
  Napi::Env env = arg.Env();

  if (!arg.IsNumber()) {
    TypeError::New(env, "Character index must be a number").ThrowAsJavaScriptException();
    return Napi::Nothing<uint32_t>();
  }
  auto result = arg.As<Number>();

  return Napi::Just<uint32_t>(result.Uint32Value() * BYTES_PER_CHARACTER);
}

} // namespace node_tree_sitter
