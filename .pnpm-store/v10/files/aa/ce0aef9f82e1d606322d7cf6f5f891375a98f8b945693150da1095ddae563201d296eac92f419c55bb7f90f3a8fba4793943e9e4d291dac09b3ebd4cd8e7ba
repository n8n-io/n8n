#include "./addon_data.h"
#include "./conversions.h"
#include "./language.h"
#include "./lookaheaditerator.h"
#include "./node.h"
#include "./parser.h"
#include "./query.h"
#include "./tree.h"
#include "./tree_cursor.h"

#include <napi.h>

using namespace Napi;

namespace node_tree_sitter {

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  auto* data = new AddonData(env);
  env.SetInstanceData(data);

  InitConversions(env, exports);
  node_methods::Init(env, exports);
  language_methods::Init(env, exports);
  LookaheadIterator::Init(env, exports);
  Parser::Init(env, exports);
  Query::Init(env, exports);
  Tree::Init(env, exports);
  TreeCursor::Init(env, exports);

  return exports;
}

NODE_API_MODULE(tree_sitter_runtime_binding, InitAll)

} // namespace node_tree_sitter
