#ifndef NODE_TREE_SITTER_CONVERSIONS_H_
#define NODE_TREE_SITTER_CONVERSIONS_H_

#include "./addon_data.h"
#include "tree_sitter/api.h"

#include <napi.h>

namespace node_tree_sitter {

void InitConversions(Napi::Env env, Napi::Object exports);
Napi::Object RangeToJS(Napi::Env env, const TSRange &);
Napi::Object PointToJS(Napi::Env env, const TSPoint &);
void TransferPoint(Napi::Env env, const TSPoint &);
Napi::Number ByteCountToJS(Napi::Env env, uint32_t);
Napi::Maybe<TSPoint> PointFromJS(const Napi::Value &);
Napi::Maybe<uint32_t> ByteCountFromJS(const Napi::Value &);
Napi::Maybe<TSRange> RangeFromJS(const Napi::Value&);

} // namespace node_tree_sitter

#endif // NODE_TREE_SITTER_CONVERSIONS_H_
