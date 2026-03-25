#ifndef NODE_TREE_SITTER_TREE_CURSOR_H_
#define NODE_TREE_SITTER_TREE_CURSOR_H_

#include "./addon_data.h"
#include "tree_sitter/api.h"

#include <napi.h>
#include <node_object_wrap.h>

namespace node_tree_sitter {

class TreeCursor final : public Napi::ObjectWrap<TreeCursor> {
 public:
  static void Init(Napi::Env env, Napi::Object exports);
  static Napi::Value NewInstance(Napi::Env Env, TSTreeCursor);

  explicit TreeCursor(const Napi::CallbackInfo &);
  ~TreeCursor() final;

  TSTreeCursor cursor_;

 private:
  Napi::Value GotoFirstChild(const Napi::CallbackInfo &);
  Napi::Value GotoLastChild(const Napi::CallbackInfo &);
  Napi::Value GotoParent(const Napi::CallbackInfo &);
  Napi::Value GotoNextSibling(const Napi::CallbackInfo &);
  Napi::Value GotoPreviousSibling(const Napi::CallbackInfo &);
  Napi::Value GotoDescendant(const Napi::CallbackInfo &);
  Napi::Value GotoFirstChildForIndex(const Napi::CallbackInfo &);
  Napi::Value GotoFirstChildForPosition(const Napi::CallbackInfo &);
  Napi::Value StartPosition(const Napi::CallbackInfo &);
  Napi::Value EndPosition(const Napi::CallbackInfo &);
  Napi::Value CurrentNode(const Napi::CallbackInfo &);
  Napi::Value Reset(const Napi::CallbackInfo &);
  Napi::Value ResetTo(const Napi::CallbackInfo &);

  Napi::Value NodeType(const Napi::CallbackInfo &);
  Napi::Value NodeTypeId(const Napi::CallbackInfo &);
  Napi::Value NodeStateId(const Napi::CallbackInfo &);
  Napi::Value NodeIsNamed(const Napi::CallbackInfo &);
  Napi::Value NodeIsMissing(const Napi::CallbackInfo &);
  Napi::Value CurrentFieldId(const Napi::CallbackInfo &);
  Napi::Value CurrentFieldName(const Napi::CallbackInfo &);
  Napi::Value CurrentDepth(const Napi::CallbackInfo &);
  Napi::Value CurrentDescendantIndex(const Napi::CallbackInfo &);
  Napi::Value StartIndex(const Napi::CallbackInfo &);
  Napi::Value EndIndex(const Napi::CallbackInfo &);
};

} // namespace node_tree_sitter

#endif // NODE_TREE_SITTER_TREE_CURSOR_H_
