#ifndef NODE_TREE_SITTER_LOGGER_H_
#define NODE_TREE_SITTER_LOGGER_H_

#include "tree_sitter/api.h"

#include <napi.h>

namespace node_tree_sitter {

class Logger final {
 public:
  static TSLogger Make(const Napi::Function &);
  Napi::FunctionReference func;
  static void Log(void *, TSLogType, const char *);
};

} // namespace node_tree_sitter

#endif // NODE_TREE_SITTER_LOGGER_H_
