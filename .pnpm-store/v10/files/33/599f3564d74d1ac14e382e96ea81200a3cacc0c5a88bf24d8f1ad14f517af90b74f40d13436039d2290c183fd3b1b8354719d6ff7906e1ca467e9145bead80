#ifndef NODE_TREE_SITTER_PARSER_H_
#define NODE_TREE_SITTER_PARSER_H_

#include "tree_sitter/api.h"

#include <napi.h>
#include <node_object_wrap.h>

namespace node_tree_sitter {

class Parser final : public Napi::ObjectWrap<Parser> {
 public:
  static void Init(Napi::Env env, Napi::Object exports);

  explicit Parser(const Napi::CallbackInfo &info);
  ~Parser() final;

private:
  TSParser *parser_;

  Napi::Value SetLanguage(const Napi::CallbackInfo &);
  Napi::Value Parse(const Napi::CallbackInfo &);
  Napi::Value IncludedRanges(const Napi::CallbackInfo &info);
  Napi::Value SetIncludedRanges(const Napi::CallbackInfo &info);
  Napi::Value TimeoutMicros(const Napi::CallbackInfo &info);
  Napi::Value SetTimeoutMicros(const Napi::CallbackInfo &info);
  Napi::Value GetLogger(const Napi::CallbackInfo &);
  Napi::Value SetLogger(const Napi::CallbackInfo &);
  Napi::Value PrintDotGraphs(const Napi::CallbackInfo &);
  Napi::Value Reset(const Napi::CallbackInfo &info);
};

} // namespace node_tree_sitter

#endif // NODE_TREE_SITTER_PARSER_H_
