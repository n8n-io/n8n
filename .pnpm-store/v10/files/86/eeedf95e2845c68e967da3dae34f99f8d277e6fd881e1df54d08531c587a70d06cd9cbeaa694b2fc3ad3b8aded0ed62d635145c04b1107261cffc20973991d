#ifndef NODE_TREE_SITTER_TREE_H_
#define NODE_TREE_SITTER_TREE_H_

#include "./addon_data.h"
#include "tree_sitter/api.h"

#include <napi.h>
#include <node_object_wrap.h>
#include <unordered_map>

namespace node_tree_sitter {

class Tree final : public Napi::ObjectWrap<Tree> {
 public:
  static void Init(Napi::Env env, Napi::Object exports);
  static Napi::Value NewInstance(Napi::Env env, TSTree *tree);
  static const Tree *UnwrapTree(const Napi::Value &value);

  explicit Tree(const Napi::CallbackInfo &);
  ~Tree() final;

  struct NodeCacheEntry {
    Tree *tree;
    const void *key;
    Napi::ObjectReference node;
  };

  TSTree *tree_;
  std::unordered_map<const void *, NodeCacheEntry *> cached_nodes_;

 private:
  Napi::Value Edit(const Napi::CallbackInfo &info);
  Napi::Value RootNode(const Napi::CallbackInfo &info);
  Napi::Value RootNodeWithOffset(const Napi::CallbackInfo &info);
  Napi::Value PrintDotGraph(const Napi::CallbackInfo &info);
  Napi::Value GetEditedRange(const Napi::CallbackInfo &info);
  Napi::Value GetChangedRanges(const Napi::CallbackInfo &info);
  Napi::Value GetIncludedRanges(const Napi::CallbackInfo &info);
  Napi::Value CacheNode(const Napi::CallbackInfo &info);
  Napi::Value CacheNodes(const Napi::CallbackInfo &info);
};

} // namespace node_tree_sitter

#endif // NODE_TREE_SITTER_TREE_H_
