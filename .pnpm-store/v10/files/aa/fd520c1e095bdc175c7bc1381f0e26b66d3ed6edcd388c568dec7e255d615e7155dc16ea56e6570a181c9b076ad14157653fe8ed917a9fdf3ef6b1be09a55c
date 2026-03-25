#include "./node.h"
#include "./conversions.h"
#include "./tree.h"
#include "./tree_cursor.h"
#include "tree_sitter/api.h"

#include <napi.h>
#include <vector>

using std::vector;
using namespace Napi;

namespace node_tree_sitter::node_methods {

const uint32_t FIELD_COUNT_PER_NODE = 6;

namespace {

inline void setup_transfer_buffer(Napi::Env env, uint32_t node_count) {
  auto *data = env.GetInstanceData<AddonData>();

  uint32_t new_length = node_count * FIELD_COUNT_PER_NODE;
  if (new_length > data->transfer_buffer_length) {
    data->transfer_buffer_length = new_length;

    auto js_transfer_buffer = Uint32Array::New(env, data->transfer_buffer_length);
    data->transfer_buffer = js_transfer_buffer.Data();

    data->module_exports.Value()["nodeTransferArray"] = js_transfer_buffer;
  }
}

inline bool operator<=(const TSPoint &left, const TSPoint &right) {
  if (left.row < right.row) {
    return true;
  }
  if (left.row > right.row) {
    return false;
  }
  return left.column <= right.column;
}

Napi::Value MarshalNodes(const Napi::CallbackInfo &info,
                         const Tree *tree, const TSNode *nodes, uint32_t node_count) {
  return GetMarshalNodes(info, tree, nodes, node_count);
}

} // namespace

Napi::Value MarshalNode(const Napi::CallbackInfo &info, const Tree *tree, TSNode node) {
  return GetMarshalNode(info, tree, node);
}

Napi::Value GetMarshalNodes(const Napi::CallbackInfo &info,
                         const Tree *tree, const TSNode *nodes, uint32_t node_count) {
  Env env = info.Env();
  auto *data = env.GetInstanceData<AddonData>();
  auto result = Array::New(env, node_count);
  setup_transfer_buffer(env, node_count);
  uint32_t *p = data->transfer_buffer;
  for (unsigned i = 0; i < node_count; i++) {
    TSNode node = nodes[i];
    const auto &cache_entry = tree->cached_nodes_.find(node.id);
    Napi::Value value;
    if (cache_entry != tree->cached_nodes_.end() && (value = cache_entry->second->node.Value(), !value.IsEmpty())) {
      result[i] = value;
    } else {
      MarshalNodeId(node.id, p);
      p += 2;
      *(p++) = node.context[0];
      *(p++) = node.context[1];
      *(p++) = node.context[2];
      *(p++) = node.context[3];
      if (node.id != nullptr) {
        result[i] = Number::New(env, ts_node_symbol(node));
      } else {
        result[i] = env.Null();
      }
    }
  }
  return result;
}

Napi::Value GetMarshalNode(const Napi::CallbackInfo &info, const Tree *tree, TSNode node) {
  Env env = info.Env();
  auto* data = env.GetInstanceData<AddonData>();
  const auto &cache_entry = tree->cached_nodes_.find(node.id);
  Napi::Value value;
  if (cache_entry != tree->cached_nodes_.end() && (value = cache_entry->second->node.Value(), !value.IsEmpty())) {
    return value;
  } else {
    setup_transfer_buffer(env, 1);
    uint32_t *p = data->transfer_buffer;
    MarshalNodeId(node.id, p);
    p += 2;
    *(p++) = node.context[0];
    *(p++) = node.context[1];
    *(p++) = node.context[2];
    *(p++) = node.context[3];
    if (node.id != nullptr) {
      return Number::New(env, ts_node_symbol(node));
    }
  }
  return env.Null();
}

TSNode UnmarshalNode(Napi::Env env, const Tree *tree) {
  auto* data = env.GetInstanceData<AddonData>();
  TSNode result = {{0, 0, 0, 0}, nullptr, nullptr};
  result.tree = tree->tree_;
  if (result.tree == nullptr) {
    throw TypeError::New(env, "Argument must be a tree");
  }

  result.id = UnmarshalNodeId(&data->transfer_buffer[0]);
  result.context[0] = data->transfer_buffer[2];
  result.context[1] = data->transfer_buffer[3];
  result.context[2] = data->transfer_buffer[4];
  result.context[3] = data->transfer_buffer[5];
  return result;
}

struct SymbolSet {
  void add(TSSymbol symbol) { symbols += symbol; }
  [[nodiscard]] bool contains(TSSymbol symbol) const { return symbols.find(symbol) != symbols.npos; }
 private:
  std::basic_string<TSSymbol> symbols;
};

void symbol_set_from_js(SymbolSet *symbols, const Napi::Value &value, const TSLanguage *language) {
  Env env = value.Env();

  if (!value.IsArray()) {
    throw TypeError::New(env, "Argument must be a string or array of strings");
  }

  unsigned symbol_count = ts_language_symbol_count(language);

  auto js_types = value.As<Array>();
  for (unsigned i = 0, n = js_types.Length(); i < n; i++) {
    Value js_node_type_value = js_types[i];
    if (js_node_type_value.IsString()) {
      auto js_node_type = js_node_type_value.As<String>();
      std::string node_type = js_node_type.Utf8Value();

      if (node_type == "ERROR") {
        symbols->add(static_cast<TSSymbol>(-1));
      } else {
        for (TSSymbol j = 0; j < static_cast<TSSymbol>(symbol_count); j++) {
          if (node_type == ts_language_symbol_name(language, j)) {
            symbols->add(j);
          }
        }
      }

      continue;
    }

    throw TypeError::New(env, "Argument must be a string or array of strings");
  }
}

namespace {

Napi::Value MarshalNullNode(Napi::Env env) {
  auto *data = env.GetInstanceData<AddonData>();
  memset(data->transfer_buffer, 0, FIELD_COUNT_PER_NODE * sizeof(data->transfer_buffer[0]));
  return env.Undefined();
}

Napi::Value ToString(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);
  if (node.id != nullptr) {
    char *string = ts_node_string(node);
    String result = String::New(env, string);
    free(string);
    return result;
  }

  return env.Undefined();
}

Napi::Value FirstNamedChildForIndex(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);
  if (node.id != nullptr) {
    Napi::Maybe<uint32_t> byte = ByteCountFromJS(info[1]);
    if (byte.IsJust()) {
      return MarshalNode(info, tree, ts_node_first_named_child_for_byte(node, byte.Unwrap()));
    }
  }
  return MarshalNullNode(env);
}

Napi::Value FirstChildForIndex(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);

  if ((node.id != nullptr) && info.Length() > 1) {
    Napi::Maybe<uint32_t> byte = ByteCountFromJS(info[1]);
    if (byte.IsJust()) {
      return MarshalNode(info, tree, ts_node_first_child_for_byte(node, byte.Unwrap()));
    }
  }
  return MarshalNullNode(env);
}

Napi::Value NamedDescendantForIndex(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);

  if (node.id != nullptr) {
    Napi::Maybe<uint32_t> maybe_min = ByteCountFromJS(info[1]);
    Napi::Maybe<uint32_t> maybe_max = ByteCountFromJS(info[2]);
    if (maybe_min.IsJust() && maybe_max.IsJust()) {
      uint32_t min = maybe_min.Unwrap();
      uint32_t max = maybe_max.Unwrap();
      return MarshalNode(info, tree, ts_node_named_descendant_for_byte_range(node, min, max));
    }
  }
  return MarshalNullNode(env);
}

Napi::Value DescendantForIndex(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);

  if (node.id != nullptr) {
    Napi::Maybe<uint32_t> maybe_min = ByteCountFromJS(info[1]);
    Napi::Maybe<uint32_t> maybe_max = ByteCountFromJS(info[2]);
    if (maybe_min.IsJust() && maybe_max.IsJust()) {
      uint32_t min = maybe_min.Unwrap();
      uint32_t max = maybe_max.Unwrap();
      return MarshalNode(info, tree, ts_node_descendant_for_byte_range(node, min, max));
    }
  }
  return MarshalNullNode(env);
}

Napi::Value NamedDescendantForPosition(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);

  if (node.id != nullptr) {
    Napi::Maybe<TSPoint> maybe_min = PointFromJS(info[1]);
    Napi::Maybe<TSPoint> maybe_max = PointFromJS(info[2]);
    if (maybe_min.IsJust() && maybe_max.IsJust()) {
      TSPoint min = maybe_min.Unwrap();
      TSPoint max = maybe_max.Unwrap();
      return MarshalNode(info, tree, ts_node_named_descendant_for_point_range(node, min, max));
    }
  }
  return MarshalNullNode(env);
}

Napi::Value DescendantForPosition(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);

  if (node.id != nullptr) {
    Napi::Maybe<TSPoint> maybe_min = PointFromJS(info[1]);
    Napi::Maybe<TSPoint> maybe_max = PointFromJS(info[2]);
    if (maybe_min.IsJust() && maybe_max.IsJust()) {
      TSPoint min = maybe_min.Unwrap();
      TSPoint max = maybe_max.Unwrap();
      return MarshalNode(info, tree, ts_node_descendant_for_point_range(node, min, max));
    }
  }
  return MarshalNullNode(env);
}

Napi::Value Id(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);

  if (node.id != nullptr) {
    return Number::New(env, static_cast<double>(reinterpret_cast<uintptr_t>(node.id)));
  }

  return env.Undefined();
}

Napi::Value TypeId(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);

  if (node.id != nullptr) {
    return Number::New(env, ts_node_symbol(node));
  }

  return env.Undefined();
}

Napi::Value GrammarId(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);

  if (node.id != nullptr) {
    return Number::New(env, ts_node_grammar_symbol(node));
  }

  return env.Undefined();
}

Napi::Value Type(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);

  if (node.id != nullptr) {
    return String::New(env, ts_node_type(node));
  }

  return env.Undefined();
}

Napi::Value GrammarType(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);

  if (node.id != nullptr) {
    return String::New(env, ts_node_grammar_type(node));
  }

  return env.Undefined();
}

Napi::Value IsNamed(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);

  if (node.id != nullptr) {
    return Boolean::New(env, ts_node_is_named(node));
  }

  return env.Undefined();
}

Napi::Value IsExtra(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);

  if (node.id != nullptr) {
    return Boolean::New(env, ts_node_is_extra(node));
  }

  return env.Undefined();
}

Napi::Value HasChanges(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);
  if (node.id != nullptr) {
    bool result = ts_node_has_changes(node);
    return Boolean::New(env, result);
  }

  return env.Undefined();
}

Napi::Value HasError(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);
  if (node.id != nullptr) {
    bool result = ts_node_has_error(node);
    return Boolean::New(env, result);
  }

  return env.Undefined();
}

Napi::Value IsError(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);
  if (node.id != nullptr) {
    bool result = ts_node_is_error(node);
    return Boolean::New(env, result);
  }

  return env.Undefined();
}

Napi::Value ParseState(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);
  if (node.id != nullptr) {
    return Number::New(env, ts_node_parse_state(node));
  }
  return env.Undefined();
}

Napi::Value NextParseState(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);
  if (node.id != nullptr) {
    return Number::New(env, ts_node_next_parse_state(node));
  }
  return env.Undefined();
}

Napi::Value IsMissing(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);
  if (node.id != nullptr) {
    bool result = ts_node_is_missing(node);
    return Boolean::New(env, result);
  }

  return env.Undefined();
}

Napi::Value StartIndex(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);

  if (node.id != nullptr) {
    auto result = static_cast<int32_t>(ts_node_start_byte(node) / 2);
    return Number::New(env, result);
  }

  return env.Undefined();
}

Napi::Value EndIndex(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);

  if (node.id != nullptr) {
    auto result = static_cast<int32_t>(ts_node_end_byte(node) / 2);
    return Number::New(env, result);
  }

  return env.Undefined();
}

Napi::Value StartPosition(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);

  if (node.id != nullptr) {
    TransferPoint(env, ts_node_start_point(node));
  }

  return env.Undefined();
}

Napi::Value EndPosition(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);

  if (node.id != nullptr) {
    TransferPoint(env, ts_node_end_point(node));
  }

  return env.Undefined();
}

Napi::Value Child(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);

  if (node.id != nullptr) {
    if (!info[1].IsNumber()) {
      throw TypeError::New(env, "Second argument must be an integer");
    }
    uint32_t index = info[1].As<Number>().Uint32Value();
    return MarshalNode(info, tree, ts_node_child(node, index));
  }
  return MarshalNullNode(env);
}

Napi::Value ChildCount(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);

  if (node.id != nullptr) {
    return Number::New(env, ts_node_child_count(node));
  }

  return env.Undefined();
}

Napi::Value NamedChild(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);

  if (node.id != nullptr) {
    if (!info[1].IsNumber()) {
      throw TypeError::New(env, "Second argument must be an integer");
    }
    uint32_t index = info[1].As<Number>().Uint32Value();
    return MarshalNode(info, tree, ts_node_named_child(node, index));
  }
  return MarshalNullNode(env);
}

Napi::Value NamedChildCount(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);

  if (node.id != nullptr) {
    return Number::New(env, ts_node_named_child_count(node));
  }

  return env.Undefined();
}

Napi::Value ChildForFieldName(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);

  if (node.id != nullptr) {
    if (!info[1].IsString()) {
      throw TypeError::New(env, "Second argument must be a string");
    }
    std::string field_name = info[1].As<String>().Utf8Value();
    return MarshalNode(info, tree, ts_node_child_by_field_name(node, field_name.c_str(), field_name.length()));
  }

  return MarshalNullNode(env);
}

Napi::Value ChildForFieldId(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);
  if (node.id != nullptr) {
    if (!info[1].IsNumber()) {
      throw TypeError::New(env, "Second argument must be an integer");
    }
    uint32_t field_id = info[1].As<Number>().Uint32Value();
    return MarshalNode(info, tree, ts_node_child_by_field_id(node, field_id));
  }
  return MarshalNullNode(env);
}

Napi::Value FieldNameForChild(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);
  if (node.id != nullptr) {
    if (!info[1].IsNumber()) {
      throw TypeError::New(env, "Second argument must be an integer");
    }
    uint32_t child_id = info[1].As<Number>().Uint32Value();
    const char *field_name = ts_node_field_name_for_child(node, child_id);
    if (field_name != nullptr) {
      return String::New(env, field_name);
    }
  }
  return env.Undefined();
}

Napi::Value Children(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  auto* data = env.GetInstanceData<AddonData>();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);
  if (node.id == nullptr) {
    return env.Undefined();
  }

  vector<TSNode> result;
  ts_tree_cursor_reset(&data->scratch_cursor, node);
  if (ts_tree_cursor_goto_first_child(&data->scratch_cursor)) {
    do {
      TSNode child = ts_tree_cursor_current_node(&data->scratch_cursor);
      result.push_back(child);
    } while (ts_tree_cursor_goto_next_sibling(&data->scratch_cursor));
  }

  return MarshalNodes(info, tree, result.data(), result.size());
}

Napi::Value NamedChildren(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  auto* data = env.GetInstanceData<AddonData>();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);
  if (node.id == nullptr) {
    return env.Undefined();
  }

  vector<TSNode> result;
  ts_tree_cursor_reset(&data->scratch_cursor, node);
  if (ts_tree_cursor_goto_first_child(&data->scratch_cursor)) {
    do {
      TSNode child = ts_tree_cursor_current_node(&data->scratch_cursor);
      if (ts_node_is_named(child)) {
        result.push_back(child);
      }
    } while (ts_tree_cursor_goto_next_sibling(&data->scratch_cursor));
  }

  return MarshalNodes(info, tree, result.data(), result.size());
}

Napi::Value ChildrenForFieldName(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);
  if (node.id == nullptr) {
    return env.Undefined();
  }

  if (!info[1].IsString()) {
    throw TypeError::New(env, "First argument must be a string");
  }
  std::string field_name = info[1].As<String>().Utf8Value();

  TSTreeCursor cursor = ts_tree_cursor_new(node);

  const TSLanguage *language = ts_tree_language(node.tree);
  TSFieldId field_id = ts_language_field_id_for_name(language, field_name.c_str(), field_name.length());

  bool done = field_id == 0;
  if (!done) {
    ts_tree_cursor_reset(&cursor, node);
    ts_tree_cursor_goto_first_child(&cursor);
  }

  vector<TSNode> result;
  while (!done) {
    while (ts_tree_cursor_current_field_id(&cursor) != field_id) {
      if (!ts_tree_cursor_goto_next_sibling(&cursor)) {
        done = true;
        break;
      }
    }
    if (done) {
      break;
    }
    TSNode result_node = ts_tree_cursor_current_node(&cursor);
    if (!ts_tree_cursor_goto_next_sibling(&cursor)) {
      done = true;
    }
    result.push_back(result_node);
  }

  return MarshalNodes(info, tree, result.data(), result.size());
}

Napi::Value ChildrenForFieldId(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);
  if (node.id == nullptr) {
    return env.Undefined();
  }

  if (!info[1].IsNumber()) {
    throw TypeError::New(env, "First argument must be an integer");
  }
  uint32_t field_id = info[1].As<Number>().Uint32Value();


  TSTreeCursor cursor = ts_tree_cursor_new(node);

  bool done = field_id == 0;
  if (!done) {
    ts_tree_cursor_reset(&cursor, node);
    ts_tree_cursor_goto_first_child(&cursor);
  }

  vector<TSNode> result;
  while (!done) {
    while (ts_tree_cursor_current_field_id(&cursor) != field_id) {
      if (!ts_tree_cursor_goto_next_sibling(&cursor)) {
        done = true;
        break;
      }
    }
    if (done) {
      break;
    }
    TSNode result_node = ts_tree_cursor_current_node(&cursor);
    if (!ts_tree_cursor_goto_next_sibling(&cursor)) {
      done = true;
    }
    result.push_back(result_node);
  }

  return MarshalNodes(info, tree, result.data(), result.size());
}

Napi::Value FirstChild(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);
  if (node.id != nullptr) {
    return MarshalNode(info, tree, ts_node_child(node, 0));
  }
  return MarshalNullNode(env);
}

Napi::Value FirstNamedChild(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);
  if (node.id != nullptr) {
    return MarshalNode(info, tree, ts_node_named_child(node, 0));
  }
  return MarshalNullNode(env);
}

Napi::Value LastChild(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);
  if (node.id != nullptr) {
    uint32_t child_count = ts_node_child_count(node);
    if (child_count > 0) {
      return MarshalNode(info, tree, ts_node_child(node, child_count - 1));
    }
  }
  return MarshalNullNode(env);
}

Napi::Value LastNamedChild(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);
  if (node.id != nullptr) {
    uint32_t child_count = ts_node_named_child_count(node);
    if (child_count > 0) {
      return MarshalNode(info, tree, ts_node_named_child(node, child_count - 1));
    }
  }
  return MarshalNullNode(env);
}

Napi::Value Parent(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);
  if (node.id != nullptr) {
    return MarshalNode(info, tree, ts_node_parent(node));
  }
  return MarshalNullNode(env);
}

Napi::Value NextSibling(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);
  if (node.id != nullptr) {
    return MarshalNode(info, tree, ts_node_next_sibling(node));
  }
  return MarshalNullNode(env);
}

Napi::Value NextNamedSibling(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);
  if (node.id != nullptr) {
    return MarshalNode(info, tree, ts_node_next_named_sibling(node));
  }
  return MarshalNullNode(env);
}

Napi::Value PreviousSibling(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);
  if (node.id != nullptr) {
    return MarshalNode(info, tree, ts_node_prev_sibling(node));
  }
  return MarshalNullNode(env);
}

Napi::Value PreviousNamedSibling(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);
  if (node.id != nullptr) {
    return MarshalNode(info, tree, ts_node_prev_named_sibling(node));
  }
  return MarshalNullNode(env);
}

Napi::Value DescendantCount(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);
  if (node.id != nullptr) {
    return Number::New(env, ts_node_descendant_count(node));
  }
  return env.Undefined();
}

Napi::Value DescendantsOfType(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  auto* data = env.GetInstanceData<AddonData>();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);
  if (node.id == nullptr) {
    return env.Undefined();
  }

  SymbolSet symbols;
  symbol_set_from_js(&symbols, info[1], ts_tree_language(node.tree));

  TSPoint start_point = {0, 0};
  TSPoint end_point = {UINT32_MAX, UINT32_MAX};

  if (info.Length() > 2 && info[2].IsObject()) {
    auto maybe_start_point = PointFromJS(info[2]);
    if (maybe_start_point.IsNothing()) {
      return env.Undefined();
    }
    start_point = maybe_start_point.Unwrap();
  }

  if (info.Length() > 3 && info[3].IsObject()) {
    auto maybe_end_point = PointFromJS(info[3]);
    if (maybe_end_point.IsNothing()) {
      return env.Undefined();
    }
    end_point = maybe_end_point.Unwrap();
  }

  vector<TSNode> found;
  ts_tree_cursor_reset(&data->scratch_cursor, node);
  auto already_visited_children = false;
  while (true) {
    TSNode descendant = ts_tree_cursor_current_node(&data->scratch_cursor);

    if (!already_visited_children) {
      if (ts_node_end_point(descendant) <= start_point) {
        if (ts_tree_cursor_goto_next_sibling(&data->scratch_cursor)) {
          already_visited_children = false;
        } else {
          if (!ts_tree_cursor_goto_parent(&data->scratch_cursor)) {
            break;
          }
          already_visited_children = true;
        }
        continue;
      }

      if (end_point <= ts_node_start_point(descendant)) {
        break;
      }

      if (symbols.contains(ts_node_symbol(descendant))) {
        found.push_back(descendant);
      }

      if (ts_tree_cursor_goto_first_child(&data->scratch_cursor)) {
        already_visited_children = false;
      } else if (ts_tree_cursor_goto_next_sibling(&data->scratch_cursor)) {
        already_visited_children = false;
      } else {
        if (!ts_tree_cursor_goto_parent(&data->scratch_cursor)) {
          break;
        }
        already_visited_children = true;
      }
    } else {
      if (ts_tree_cursor_goto_next_sibling(&data->scratch_cursor)) {
        already_visited_children = false;
      } else {
        if (!ts_tree_cursor_goto_parent(&data->scratch_cursor)) {
          break;
        }
      }
    }
  }

  return MarshalNodes(info, tree, found.data(), found.size());
}

Napi::Value ChildNodesForFieldId(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  auto* data = env.GetInstanceData<AddonData>();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);
  if (node.id == nullptr) {
    return env.Undefined();
  }

  if (!info[1].IsNumber()) {
    throw TypeError::New(env, "Second argument must be an integer");
  }
  auto maybe_field_id = info[1].As<Number>();
  uint32_t field_id = maybe_field_id.Uint32Value();

  vector<TSNode> result;
  ts_tree_cursor_reset(&data->scratch_cursor, node);
  if (ts_tree_cursor_goto_first_child(&data->scratch_cursor)) {
    do {
      TSNode child = ts_tree_cursor_current_node(&data->scratch_cursor);
      if (ts_tree_cursor_current_field_id(&data->scratch_cursor) == field_id) {
        result.push_back(child);
      }
    } while (ts_tree_cursor_goto_next_sibling(&data->scratch_cursor));
  }

  return MarshalNodes(info, tree, result.data(), result.size());
}

Napi::Value ChildNodeForFieldId(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);

  if (node.id != nullptr) {
    if (!info[1].IsNumber()) {
      throw TypeError::New(env, "Second argument must be an integer");
    }
    auto maybe_field_id = info[1].As<Number>();
    uint32_t field_id = maybe_field_id.Uint32Value();
    return MarshalNode(info, tree, ts_node_child_by_field_id(node, field_id));
  }
  return MarshalNullNode(env);
}

Napi::Value Closest(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);
  if (node.id == nullptr) {
    return env.Undefined();
  }

  SymbolSet symbols;
  symbol_set_from_js(&symbols, info[1], ts_tree_language(node.tree));

  for (;;) {
    TSNode parent = ts_node_parent(node);
    if (parent.id == nullptr) {
      break;
    }
    if (symbols.contains(ts_node_symbol(parent))) {
      return MarshalNode(info, tree, parent);
    }
    node = parent;
  }

  return MarshalNullNode(env);
}

Napi::Value Walk(const Napi::CallbackInfo &info) {
  Env env = info.Env();
  const Tree *tree = Tree::UnwrapTree(info[0]);
  TSNode node = UnmarshalNode(env, tree);
  TSTreeCursor cursor = ts_tree_cursor_new(node);
  return TreeCursor::NewInstance(env, cursor);
}

} // namespace

void Init(Napi::Env env, Napi::Object exports) {
  auto *data = env.GetInstanceData<AddonData>();

  Object result = Object::New(env);

  struct FunctionPair {
    const char *name;
    Napi::Function::Callback callback;
  };

  FunctionPair methods[] = {
    {"id", Id},
    {"typeId", TypeId},
    {"grammarId", GrammarId},
    {"type", Type},
    {"grammarType", GrammarType},
    {"isNamed", IsNamed},
    {"isExtra", IsExtra},
    {"hasChanges", HasChanges},
    {"hasError", HasError},
    {"isError", IsError},
    {"parseState", ParseState},
    {"nextParseState", NextParseState},
    {"isMissing", IsMissing},
    {"startIndex", StartIndex},
    {"endIndex", EndIndex},
    {"startPosition", StartPosition},
    {"endPosition", EndPosition},
    {"child", Child},
    {"childCount", ChildCount},
    {"namedChild", NamedChild},
    {"namedChildCount", NamedChildCount},
    {"childForFieldName", ChildForFieldName},
    {"childForFieldId", ChildForFieldId},
    {"fieldNameForChild", FieldNameForChild},
    {"children", Children},
    {"namedChildren", NamedChildren},
    {"childrenForFieldName", ChildrenForFieldName},
    {"childrenForFieldId", ChildrenForFieldId},
    {"parent", Parent},
    {"nextSibling", NextSibling},
    {"previousSibling", PreviousSibling},
    {"nextNamedSibling", NextNamedSibling},
    {"previousNamedSibling", PreviousNamedSibling},
    {"descendantCount", DescendantCount},
    {"descendantForIndex", DescendantForIndex},
    {"namedDescendantForIndex", NamedDescendantForIndex},
    {"descendantForPosition", DescendantForPosition},
    {"namedDescendantForPosition", NamedDescendantForPosition},
    {"toString", ToString},
    {"walk", Walk},
    {"firstChild", FirstChild},
    {"lastChild", LastChild},
    {"firstNamedChild", FirstNamedChild},
    {"lastNamedChild", LastNamedChild},
    {"firstChildForIndex", FirstChildForIndex},
    {"firstNamedChildForIndex", FirstNamedChildForIndex},
    {"descendantsOfType", DescendantsOfType},
    {"closest", Closest},
    {"childNodeForFieldId", ChildNodeForFieldId},
    {"childNodesForFieldId", ChildNodesForFieldId},
  };

  for (auto & method : methods) {
    result[method.name] = Napi::Function::New(env, method.callback);
  }

  data->module_exports = Napi::Persistent(exports);
  setup_transfer_buffer(env, 1);

  exports["NodeMethods"] = result;
}

} // namespace node_tree_sitter::node_methods
