#ifndef NODE_TREE_SITTER_NODE_H_
#define NODE_TREE_SITTER_NODE_H_

#include "./tree.h"
#include "tree_sitter/api.h"

#include <napi.h>

namespace node_tree_sitter::node_methods {

void Init(Napi::Env env, Napi::Object exports);
Napi::Value MarshalNode(const Napi::CallbackInfo &info, const Tree *, TSNode);
Napi::Value GetMarshalNode(const Napi::CallbackInfo &info, const Tree *tree, TSNode node);
Napi::Value GetMarshalNodes(const Napi::CallbackInfo &info, const Tree *tree, const TSNode *nodes, uint32_t node_count);
TSNode UnmarshalNode(Napi::Env env, const Tree *tree);

static inline const void *UnmarshalNodeId(const uint32_t *buffer) {
  const void *result;
  memcpy(&result, buffer, sizeof(result));
  return result;
}

static inline void MarshalNodeId(const void *id, uint32_t *buffer) {
  memset(buffer, 0, sizeof(uint64_t));
  memcpy(buffer, &id, sizeof(id));
}

} // namespace node_tree_sitter::node_methods

#endif // NODE_TREE_SITTER_NODE_H_
