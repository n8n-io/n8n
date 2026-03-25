#ifndef NODE_TREE_SITTER_QUERY_H_
#define NODE_TREE_SITTER_QUERY_H_

#include "./addon_data.h"
#include "tree_sitter/api.h"

#include <napi.h>
#include <node_object_wrap.h>

namespace node_tree_sitter {

class Query final : public Napi::ObjectWrap<Query> {
 public:
  static void Init(Napi::Env env, Napi::Object exports);
  static Query *UnwrapQuery(const Napi::Value &);

  explicit Query(const Napi::CallbackInfo &info);
  ~Query() final;

 private:
  TSQuery *query_;

  Napi::Value New(const Napi::CallbackInfo &);
  Napi::Value Matches(const Napi::CallbackInfo &);
  Napi::Value Captures(const Napi::CallbackInfo &);
  Napi::Value GetPredicates(const Napi::CallbackInfo &);
  Napi::Value DisableCapture(const Napi::CallbackInfo &);
  Napi::Value DisablePattern(const Napi::CallbackInfo &);
  Napi::Value IsPatternGuaranteedAtStep(const Napi::CallbackInfo &);
  Napi::Value IsPatternRooted(const Napi::CallbackInfo &);
  Napi::Value IsPatternNonLocal(const Napi::CallbackInfo &);
  Napi::Value StartIndexForPattern(const Napi::CallbackInfo &);
  Napi::Value DidExceedMatchLimit(const Napi::CallbackInfo &);
  Napi::Value MatchLimit(const Napi::CallbackInfo &);
};

} // namespace node_tree_sitter

#endif // NODE_TREE_SITTER_QUERY_H_
