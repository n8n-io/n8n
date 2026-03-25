#include "./tree.h"
#include "./addon_data.h"
#include "./conversions.h"
#include "./node.h"

#include <napi.h>

using namespace Napi;

namespace node_tree_sitter {

/*
  tstag() {
    b2sum -l64 <(printf tree-sitter) <(printf "$1") | \
    awk '{printf "0x" toupper($1) (NR == 1 ? ", " : "\n")}'
  }
  tstag tree # => 0x8AF2E5212AD58ABF, 0x7FA28BFC1966AC2D
*/
const napi_type_tag TREE_TYPE_TAG = {
  0x8AF2E5212AD58ABF, 0x7FA28BFC1966AC2D
};

using node_methods::UnmarshalNodeId;

void Tree::Init(Napi::Env env, Napi::Object exports) {
  auto *data = env.GetInstanceData<AddonData>();

  Function ctor = DefineClass(env, "Tree", {
    InstanceMethod("edit", &Tree::Edit, napi_default_method),
    InstanceMethod("rootNode", &Tree::RootNode, napi_default_method),
    InstanceMethod("rootNodeWithOffset", &Tree::RootNodeWithOffset, napi_default_method),
    InstanceMethod("printDotGraph", &Tree::PrintDotGraph, napi_default_method),
    InstanceMethod("getChangedRanges", &Tree::GetChangedRanges, napi_default_method),
    InstanceMethod("getIncludedRanges", &Tree::GetIncludedRanges, napi_default_method),
    InstanceMethod("getEditedRange", &Tree::GetEditedRange, napi_default_method),
    InstanceMethod("_cacheNode", &Tree::CacheNode, napi_default_method),
    InstanceMethod("_cacheNodes", &Tree::CacheNodes, napi_default_method),
  });

  data->tree_constructor = Napi::Persistent(ctor);
  exports["Tree"] = ctor;
}

Tree::Tree(const Napi::CallbackInfo &info) : Napi::ObjectWrap<Tree>(info), tree_(nullptr) {
  Value().TypeTag(&TREE_TYPE_TAG);
}

Tree::~Tree() {
  ts_tree_delete(tree_);
  for (auto &entry : cached_nodes_) {
    entry.second->tree = nullptr;
  }
}

Napi::Value Tree::NewInstance(Napi::Env env, TSTree *tree) {
  auto *data = env.GetInstanceData<AddonData>();
  if (tree != nullptr) {
    Object self = data->tree_constructor.New({});
    Tree::Unwrap(self)->tree_ = tree;
    return self;
  }

  return env.Null();
}

const Tree *Tree::UnwrapTree(const Napi::Value &value) {
  if (!value.IsObject()) {
    return nullptr;
  }
  auto js_tree = value.As<Object>();
  if (!js_tree.CheckTypeTag(&TREE_TYPE_TAG)) {
    return nullptr;
  }
  return Tree::Unwrap(js_tree);
}

#define read_number_from_js(out, value, name)                                \
  if (!(value).IsNumber()) {                                                   \
    throw TypeError::New(env, name " must be an integer");                   \
    return env.Undefined();                                                  \
  }                                                                          \
  *(out) = (value).As<Number>().Uint32Value();

#define read_byte_count_from_js(out, value, name)   \
  read_number_from_js(out, value, name);            \
  (*(out)) *= 2

Napi::Value Tree::Edit(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();
  TSInputEdit edit;
  read_number_from_js(&edit.start_point.row, info[0], "startPosition.row");
  read_byte_count_from_js(&edit.start_point.column, info[1], "startPosition.column");
  read_number_from_js(&edit.old_end_point.row, info[2], "oldEndPosition.row");
  read_byte_count_from_js(&edit.old_end_point.column, info[3], "oldEndPosition.column");
  read_number_from_js(&edit.new_end_point.row, info[4], "newEndPosition.row");
  read_byte_count_from_js(&edit.new_end_point.column, info[5], "newEndPosition.column");
  read_byte_count_from_js(&edit.start_byte, info[6], "startIndex");
  read_byte_count_from_js(&edit.old_end_byte, info[7], "oldEndIndex");
  read_byte_count_from_js(&edit.new_end_byte, info[8], "newEndIndex");

  ts_tree_edit(tree_, &edit);

  for (auto &entry : cached_nodes_) {
    Object js_node = entry.second->node.Value();
    if (js_node.IsEmpty()) {
      continue;
    }
    TSNode node;
    node.id = entry.first;
    for (unsigned i = 0; i < 4; i++) {
      Napi::Value node_field = js_node[i + 2];
      if (node_field.IsNumber()) {
        node.context[i] = node_field.As<Number>().Uint32Value();
      }
    }

    ts_node_edit(&node, &edit);

    for (unsigned i = 0; i < 4; i++) {
      js_node[i + 2U] = Number::New(env, node.context[i]);
    }
  }

  return info.This();
}

Napi::Value Tree::RootNode(const Napi::CallbackInfo &info) {
  return node_methods::MarshalNode(info, this, ts_tree_root_node(tree_));
}

Napi::Value Tree::RootNodeWithOffset(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();
  uint32_t offset_bytes = 0;
  TSPoint offset_extent = {0, UINT32_MAX};

  read_byte_count_from_js(&offset_bytes, info[0], "offsetBytes");
  read_number_from_js(&offset_extent.row, info[1], "offsetExtent.row");
  read_byte_count_from_js(&offset_extent.column, info[2], "offsetExtent.column");

  return node_methods::MarshalNode(info, this, ts_tree_root_node_with_offset(tree_, offset_bytes, offset_extent));
}

Napi::Value Tree::GetChangedRanges(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();
  const Tree *other_tree = UnwrapTree(info[0]);
  if (other_tree == nullptr) {
    throw TypeError::New(env, "Argument must be a tree");
  }

  uint32_t range_count;
  TSRange *ranges = ts_tree_get_changed_ranges(tree_, other_tree->tree_, &range_count);

  Array result = Array::New(env);
  for (size_t i = 0; i < range_count; i++) {
    result[i] = RangeToJS(env, ranges[i]);
  }

  free(ranges);

  return result;
}

Napi::Value Tree::GetIncludedRanges(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();
  uint32_t range_count;
  TSRange *ranges = ts_tree_included_ranges(tree_, &range_count);

  Array result = Array::New(env);
  for (size_t i = 0; i < range_count; i++) {
    result[i] = RangeToJS(env, ranges[i]);
  }

  free(ranges);

  return result;
}

Napi::Value Tree::GetEditedRange(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();
  TSNode root = ts_tree_root_node(tree_);
  if (!ts_node_has_changes(root)) {
    return env.Undefined();
  }
  TSRange result = {
    ts_node_start_point(root),
    ts_node_end_point(root),
    ts_node_start_byte(root),
    ts_node_end_byte(root),
  };

  TSTreeCursor cursor = ts_tree_cursor_new(root);

  while (true) {
    if (!ts_tree_cursor_goto_first_child(&cursor)) {
      break;
    }
    while (true) {
      TSNode node = ts_tree_cursor_current_node(&cursor);
      if (ts_node_has_changes(node)) {
        result.start_byte = ts_node_start_byte(node);
        result.start_point = ts_node_start_point(node);
        break;
      }
      if (!ts_tree_cursor_goto_next_sibling(&cursor)) {
        break;
      }
    }
  }

  while (ts_tree_cursor_goto_parent(&cursor)) {}

  while (true) {
    if (!ts_tree_cursor_goto_first_child(&cursor)) {
      break;
    }
    while (true) {
      TSNode node = ts_tree_cursor_current_node(&cursor);
      if (ts_node_has_changes(node)) {
        result.end_byte = ts_node_end_byte(node);
        result.end_point = ts_node_end_point(node);
      }

      if (!ts_tree_cursor_goto_next_sibling(&cursor)) {
        break;
      }
    }
  }

  ts_tree_cursor_delete(&cursor);
  return RangeToJS(env, result);
}

Napi::Value Tree::PrintDotGraph(const Napi::CallbackInfo &info) {
  ts_tree_print_dot_graph(tree_, fileno(stderr));
  return info.This();
}

namespace {

void FinalizeNode(Napi::Env _env, Tree::NodeCacheEntry *cache_entry) {
  assert(!cache_entry->node.IsEmpty());
  cache_entry->node.Reset();
  if (cache_entry->tree != nullptr) {
    assert(cache_entry->tree->cached_nodes_.count(cache_entry->key));
    cache_entry->tree->cached_nodes_.erase(cache_entry->key);
  }
  delete cache_entry;
}

void CacheNodeForTree(Tree *tree, Napi::Env _env, Object js_node) {
  Value js_node_field1 = js_node[0U];
  Value js_node_field2 = js_node[1U];
  if (!js_node_field1.IsNumber() || !js_node_field2.IsNumber()) {
    return;
  }
  uint32_t key_parts[2] = {
    js_node_field1.As<Number>().Uint32Value(),
    js_node_field2.As<Number>().Uint32Value(),
  };
  const void *key = UnmarshalNodeId(key_parts);

  // A Node could have been garbage collected but the finalizer has not yet run to remove its cache entry
  if (tree->cached_nodes_.count(key)) {
    return;
  }

  auto *cache_entry = new Tree::NodeCacheEntry{tree, key, {}};
  cache_entry->node = Napi::Weak(js_node);
  js_node.AddFinalizer(&FinalizeNode, cache_entry);

  tree->cached_nodes_[key] = cache_entry;
}

} // namespace

Napi::Value Tree::CacheNode(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();

  if (!info[0].IsObject()) {
    throw TypeError::New(env, "not an object");
  }

  CacheNodeForTree(this, env, info[0].As<Object>());
  return env.Undefined();
}

Napi::Value Tree::CacheNodes(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();

  if (!info[0].IsArray()) {
    throw TypeError::New(env, "not an array");
  }
  auto js_nodes = info[0].As<Array>();
  uint32_t length = js_nodes.Length();

  for (uint32_t i = 0; i < length; ++i) {
    Napi::Value js_node = js_nodes[i];
    if (!js_node.IsObject()) {
      throw TypeError::New(env, "not an object");
    }
    CacheNodeForTree(this, env, js_node.As<Object>());
  }

  return env.Undefined();
}

} // namespace node_tree_sitter
