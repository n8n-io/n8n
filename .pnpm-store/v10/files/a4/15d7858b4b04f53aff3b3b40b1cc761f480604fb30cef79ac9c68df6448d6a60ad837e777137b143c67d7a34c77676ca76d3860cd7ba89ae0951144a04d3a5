#ifndef NODE_TREE_SITTER_LOOKAHEAD_ITERATOR_H_
#define NODE_TREE_SITTER_LOOKAHEAD_ITERATOR_H_

#include "tree_sitter/api.h"

#include <napi.h>

namespace node_tree_sitter {

class LookaheadIterator final : public Napi::ObjectWrap<LookaheadIterator> {
 public:
  static void Init(Napi::Env env, Napi::Object exports);
  static Napi::Value NewInstance(Napi::Env env, TSLookaheadIterator *);
  static LookaheadIterator *UnwrapLookaheadIterator(const Napi::Value &);

  explicit LookaheadIterator(const Napi::CallbackInfo &);
  ~LookaheadIterator() final;

 private:
  TSLookaheadIterator *iterator_;

  Napi::Value New(const Napi::CallbackInfo &);
  Napi::Value Reset(const Napi::CallbackInfo &);
  Napi::Value ResetState(const Napi::CallbackInfo &);
  Napi::Value Next(const Napi::CallbackInfo &);

  Napi::Value CurrentTypeId(const Napi::CallbackInfo &);
  Napi::Value CurrentType(const Napi::CallbackInfo &);
};

} // namespace node_tree_sitter

#endif // NODE_TREE_SITTER_LOOKAHEAD_ITERATOR_H_
