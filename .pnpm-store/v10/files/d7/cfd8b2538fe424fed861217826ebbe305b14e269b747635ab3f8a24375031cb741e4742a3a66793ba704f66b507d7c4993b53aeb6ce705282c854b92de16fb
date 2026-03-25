#include "./logger.h"
#include "tree_sitter/api.h"

#include <napi.h>
#include <string>

using namespace Napi;
using std::string;

namespace node_tree_sitter {

void Logger::Log(void *payload, TSLogType type, const char *message_str) {
  auto *debugger = static_cast<Logger *>(payload);
  Env env = debugger->func.Env();

  string message(message_str);
  string param_sep = " ";
  size_t param_sep_pos = message.find(param_sep, 0);

  String type_name = String::New(env, (type == TSLogTypeParse) ? "parse" : "lex");;
  String name = String::New(env, message.substr(0, param_sep_pos));
  Object params = Object::New(env);

  while (param_sep_pos != string::npos) {
    size_t key_pos = param_sep_pos + param_sep.size();
    size_t value_sep_pos = message.find(':', key_pos);

    if (value_sep_pos == string::npos) {
      break;
    }

    size_t val_pos = value_sep_pos + 1;
    param_sep = ", ";
    param_sep_pos = message.find(param_sep, value_sep_pos);

    string key = message.substr(key_pos, (value_sep_pos - key_pos));
    string value = message.substr(val_pos, (param_sep_pos - val_pos));
    params[key] = String::New(env, value);
  }

  try {
    debugger->func({ name, params, type_name });
  } catch (const Error &error) {
    Value console = env.Global()["console"];
    if (!console.IsObject()) {
      return;
    }

    Value error_fn = console.As<Object>()["error"];
    if (!error_fn.IsFunction()) {
      return;
    }

    error_fn.As<Function>()({
      String::New(env, "Error in debug callback:"),
      error.Value()
    });
  }
}

TSLogger Logger::Make(const Napi::Function &func) {
  TSLogger result;
  auto *logger = new Logger();
  logger->func = Napi::Persistent(func);
  result.payload = static_cast<void *>(logger);
  result.log = Log;
  return result;
}

} // namespace node_tree_sitter
