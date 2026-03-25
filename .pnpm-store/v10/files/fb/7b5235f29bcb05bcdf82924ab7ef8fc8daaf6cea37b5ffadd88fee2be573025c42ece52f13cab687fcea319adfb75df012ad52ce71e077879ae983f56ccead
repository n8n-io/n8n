#include "./query.h"
#include "./language.h"
#include "./node.h"

#include <napi.h>
#include <string>
#include <vector>

using std::vector;
using namespace Napi;

namespace node_tree_sitter {

/*
  tstag() {
    b2sum -l64 <(printf tree-sitter) <(printf "$1") | \
    awk '{printf "0x" toupper($1) (NR == 1 ? ", " : "\n")}'
  }
  tstag query # => 0x8AF2E5212AD58ABF, 0x7B1FAB666CBD6803
*/
const napi_type_tag QUERY_TYPE_TAG = {
  0x8AF2E5212AD58ABF, 0x7B1FAB666CBD6803
};

const char *query_error_names[] = {
  "TSQueryErrorNone",
  "TSQueryErrorSyntax",
  "TSQueryErrorNodeType",
  "TSQueryErrorField",
  "TSQueryErrorCapture",
  "TSQueryErrorStructure",
};

void Query::Init(Napi::Env env, Napi::Object exports) {
  auto *data = env.GetInstanceData<AddonData>();
  data->ts_query_cursor = ts_query_cursor_new();

  Function ctor = DefineClass(env, "Query", {
    InstanceAccessor("matchLimit", &Query::MatchLimit, nullptr, napi_default_method),

    InstanceMethod("_matches", &Query::Matches, napi_default_method),
    InstanceMethod("_captures", &Query::Captures, napi_default_method),
    InstanceMethod("_getPredicates", &Query::GetPredicates, napi_default_method),
    InstanceMethod("disableCapture", &Query::DisableCapture, napi_default_method),
    InstanceMethod("disablePattern", &Query::DisablePattern, napi_default_method),
    InstanceMethod("isPatternGuaranteedAtStep", &Query::IsPatternGuaranteedAtStep, napi_default_method),
    InstanceMethod("isPatternRooted", &Query::IsPatternRooted, napi_default_method),
    InstanceMethod("isPatternNonLocal", &Query::IsPatternNonLocal, napi_default_method),
    InstanceMethod("startIndexForPattern", &Query::StartIndexForPattern, napi_default_method),
    InstanceMethod("didExceedMatchLimit", &Query::DidExceedMatchLimit, napi_default_method),
  });

  data->query_constructor = Napi::Persistent(ctor);
  exports["Query"] = ctor;
}

Query::Query(const Napi::CallbackInfo &info) : Napi::ObjectWrap<Query>(info) , query_(nullptr) {
  Napi::Env env = info.Env();

  Value().TypeTag(&QUERY_TYPE_TAG);

  const TSLanguage *language = language_methods::UnwrapLanguage(info[0]);
  const char *source;
  uint32_t source_len;
  uint32_t error_offset = 0;
  TSQueryError error_type = TSQueryErrorNone;

  if (language == nullptr) {
    throw Error::New(env, "Missing language argument");
  }

  if (info[1].IsString()) {
    auto string = info[1].As<String>();
    std::string utf8_string = string.Utf8Value();
    source = utf8_string.data();
    source_len = utf8_string.length();
    query_ = ts_query_new(language, source, source_len, &error_offset, &error_type);
  } else if (info[1].IsBuffer()) {
    auto buf = info[1].As<Buffer<char>>();
    source = buf.Data();
    source_len = buf.Length();
    query_ = ts_query_new(language, source, source_len, &error_offset, &error_type);
  }
  else {
    throw Error::New(env, "Missing source argument");
  }

  if (error_offset > 0) {
    const char *error_name = query_error_names[error_type];
    std::string message = "Query error of type ";
    message += error_name;
    message += " at position ";
    message += std::to_string(error_offset);
    throw Error::New(env, message.c_str());
  }

  info.This().As<Napi::Object>().Get("_init").As<Napi::Function>().Call(info.This(), {});
}

Query::~Query() {
  ts_query_delete(query_);
}

Query *Query::UnwrapQuery(const Napi::Value &value) {
  if (!value.IsObject()) {
    return nullptr;
  }
  auto js_query = value.As<Object>();
  if (!js_query.CheckTypeTag(&QUERY_TYPE_TAG)) {
    return nullptr;
  }
  return Query::Unwrap(js_query);
}

Napi::Value Query::GetPredicates(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();
  Query *query = Query::UnwrapQuery(info.This());
  auto *ts_query = query->query_;

  auto pattern_len = ts_query_pattern_count(ts_query);

  Array js_predicates = Array::New(env);

  for (size_t pattern_index = 0; pattern_index < pattern_len; pattern_index++) {
    uint32_t predicates_len;
    const TSQueryPredicateStep *predicates = ts_query_predicates_for_pattern(
        ts_query, pattern_index, &predicates_len);

    Array js_pattern_predicates = Array::New(env);

    if (predicates_len > 0) {
      Array js_predicate = Array::New(env);

      size_t a_index = 0;
      size_t p_index = 0;
      for (size_t i = 0; i < predicates_len; i++) {
        const TSQueryPredicateStep predicate = predicates[i];
        uint32_t len;
        switch (predicate.type) {
          case TSQueryPredicateStepTypeCapture:
            js_predicate[p_index++] = Number::New(env, TSQueryPredicateStepTypeCapture);
            js_predicate[p_index++] = String::New(env,
              ts_query_capture_name_for_id(ts_query, predicate.value_id, &len)
            );
            break;
          case TSQueryPredicateStepTypeString:
            js_predicate[p_index++] = Number::New(env, TSQueryPredicateStepTypeString);
            js_predicate[p_index++] = String::New(env,
              ts_query_string_value_for_id(ts_query, predicate.value_id, &len)
            );
            break;
          case TSQueryPredicateStepTypeDone:
            js_pattern_predicates[a_index++] = js_predicate;
            js_predicate = Array::New(env);
            p_index = 0;
            break;
        }
      }
    }

    js_predicates[pattern_index] = js_pattern_predicates;
  }

  return js_predicates;
}

Napi::Value Query::Matches(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();
  auto *data = env.GetInstanceData<AddonData>();
  Query *query = Query::UnwrapQuery(info.This());
  const Tree *tree = Tree::UnwrapTree(info[0]);

  uint32_t start_row = 0, start_column = 0, end_row = 0, end_column = 0, start_index = 0, end_index = 0,
             match_limit = UINT32_MAX, max_start_depth = UINT32_MAX;

  if (info.Length() > 1 && info[1].IsNumber()) {
    start_row = info[1].As<Number>().Uint32Value();
  }
  if (info.Length() > 2 && info[2].IsNumber()) {
    start_column = info[2].As<Number>().Uint32Value() << 1;
  }
  if (info.Length() > 3 && info[3].IsNumber()) {
    end_row = info[3].As<Number>().Uint32Value();
  }
  if (info.Length() > 4 && info[4].IsNumber()) {
    end_column = info[4].As<Number>().Uint32Value() << 1;
  }
  if (info.Length() > 5 && info[5].IsNumber()) {
    start_index = info[5].As<Number>().Uint32Value();
  }
  if (info.Length() > 6 && info[6].IsNumber()) {
    end_index = info[6].As<Number>().Uint32Value() << 1;
  }
  if (info.Length() > 7 && info[7].IsNumber()) {
    match_limit = info[7].As<Number>().Uint32Value();
  }
  if (info.Length() > 8 && info[8].IsNumber()) {
    max_start_depth = info[8].As<Number>().Uint32Value();
  }

  if (query == nullptr) {
    throw Error::New(env, "Missing argument query");
  }

  if (tree == nullptr) {
    throw Error::New(env, "Missing argument tree");
  }

  TSQuery *ts_query = query->query_;
  TSNode root_node = node_methods::UnmarshalNode(env, tree);
  TSPoint start_point = {start_row, start_column};
  TSPoint end_point = {end_row, end_column};
  ts_query_cursor_set_point_range(data->ts_query_cursor, start_point, end_point);
  ts_query_cursor_set_byte_range(data->ts_query_cursor, start_index, end_index);
  ts_query_cursor_set_match_limit(data->ts_query_cursor, match_limit);
  ts_query_cursor_set_max_start_depth(data->ts_query_cursor, max_start_depth);
  ts_query_cursor_exec(data->ts_query_cursor, ts_query, root_node);

  Array js_matches = Array::New(env);
  unsigned index = 0;
  vector<TSNode> nodes;
  TSQueryMatch match;

  while (ts_query_cursor_next_match(data->ts_query_cursor, &match)) {
    js_matches[index++] = Number::New(env, match.pattern_index);

    for (uint16_t i = 0; i < match.capture_count; i++) {
      const TSQueryCapture &capture = match.captures[i];

      uint32_t capture_name_len = 0;
      const char *capture_name = ts_query_capture_name_for_id(
          ts_query, capture.index, &capture_name_len);

      TSNode node = capture.node;
      nodes.push_back(node);

      String js_capture = String::New(env, capture_name);;
      js_matches[index++] = js_capture;
    }
  }

  auto js_nodes = node_methods::GetMarshalNodes(info, tree, nodes.data(), nodes.size());

  auto result = Array::New(env);
  result[0U] = js_matches;
  result[1] = js_nodes;
  return result;
}

Napi::Value Query::Captures(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();
  auto *data = env.GetInstanceData<AddonData>();
  Query *query = Query::UnwrapQuery(info.This());
  const Tree *tree = Tree::UnwrapTree(info[0]);

  uint32_t start_row = 0, start_column = 0, end_row = 0, end_column = 0, start_index = 0, end_index = 0,
             match_limit = UINT32_MAX, max_start_depth = UINT32_MAX;

  if (info.Length() > 1 && info[1].IsNumber()) {
    start_row = info[1].As<Number>().Uint32Value();
  }
  if (info.Length() > 2 && info[2].IsNumber()) {
    start_column = info[2].As<Number>().Uint32Value() << 1;
  }
  if (info.Length() > 3 && info[3].IsNumber()) {
    end_row = info[3].As<Number>().Uint32Value();
  }
  if (info.Length() > 4 && info[4].IsNumber()) {
    end_column = info[4].As<Number>().Uint32Value() << 1;
  }
  if (info.Length() > 5 && info[5].IsNumber()) {
    start_index = info[5].As<Number>().Uint32Value();
  }
  if (info.Length() > 6 && info[6].IsNumber()) {
    end_index = info[6].As<Number>().Uint32Value() << 1;
  }
  if (info.Length() > 7 && info[7].IsNumber()) {
    match_limit = info[7].As<Number>().Uint32Value();
  }
  if (info.Length() > 8 && info[8].IsNumber()) {
    max_start_depth = info[8].As<Number>().Uint32Value();
  }

  if (query == nullptr) {
    throw Error::New(env, "Missing argument query");
  }

  if (tree == nullptr) {
    throw Error::New(env, "Missing argument tree");
  }

  TSQuery *ts_query = query->query_;
  TSNode root_node = node_methods::UnmarshalNode(env, tree);
  TSPoint start_point = {start_row, start_column};
  TSPoint end_point = {end_row, end_column};
  ts_query_cursor_set_point_range(data->ts_query_cursor, start_point, end_point);
  ts_query_cursor_set_byte_range(data->ts_query_cursor, start_index, end_index);
  ts_query_cursor_set_match_limit(data->ts_query_cursor, match_limit);
  ts_query_cursor_set_max_start_depth(data->ts_query_cursor, max_start_depth);
  ts_query_cursor_exec(data->ts_query_cursor, ts_query, root_node);

  Array js_matches = Array::New(env);
  unsigned index = 0;
  vector<TSNode> nodes;
  TSQueryMatch match;
  uint32_t capture_index;

  while (ts_query_cursor_next_capture(
    data->ts_query_cursor,
    &match,
    &capture_index
  )) {

    js_matches[index++] = Number::New(env, match.pattern_index);
    js_matches[index++] = Number::New(env, capture_index);

    for (uint16_t i = 0; i < match.capture_count; i++) {
      const TSQueryCapture &capture = match.captures[i];

      uint32_t capture_name_len = 0;
      const char *capture_name = ts_query_capture_name_for_id(
          ts_query, capture.index, &capture_name_len);

      TSNode node = capture.node;
      nodes.push_back(node);

      String js_capture = String::New(env, capture_name);;
      js_matches[index++] = js_capture;
    }
  }

  auto js_nodes = node_methods::GetMarshalNodes(info, tree, nodes.data(), nodes.size());

  auto result = Array::New(env);
  result[0U] = js_matches;
  result[1] = js_nodes;
  return result;
}

Napi::Value Query::DisableCapture(const Napi::CallbackInfo &info) {
  std::string string = info[0].As<String>().Utf8Value();
  const char *capture_name = string.c_str();
  ts_query_disable_capture(query_, capture_name, string.length());
  return info.Env().Undefined();
}

Napi::Value Query::DisablePattern(const Napi::CallbackInfo &info) {
  uint32_t pattern_index = info[0].As<Number>().Uint32Value();
  ts_query_disable_pattern(query_, pattern_index);
  return info.Env().Undefined();
}

Napi::Value Query::IsPatternGuaranteedAtStep(const Napi::CallbackInfo &info) {
  uint32_t byte_offset = info[0].As<Number>().Uint32Value();
  return Boolean::New(info.Env(), ts_query_is_pattern_guaranteed_at_step(query_, byte_offset));
}

Napi::Value Query::IsPatternRooted(const Napi::CallbackInfo &info) {
  uint32_t pattern_index = info[0].As<Number>().Uint32Value();
  return Boolean::New(info.Env(), ts_query_is_pattern_rooted(query_, pattern_index));
}

Napi::Value Query::IsPatternNonLocal(const Napi::CallbackInfo &info) {
  uint32_t pattern_index = info[0].As<Number>().Uint32Value();
  return Boolean::New(info.Env(), ts_query_is_pattern_non_local(query_, pattern_index));
}

Napi::Value Query::StartIndexForPattern(const Napi::CallbackInfo &info) {
  uint32_t pattern_index = info[0].As<Number>().Uint32Value();
  return Number::New(info.Env(), ts_query_start_byte_for_pattern(query_, pattern_index));
}

Napi::Value Query::DidExceedMatchLimit(const Napi::CallbackInfo &info) {
  auto *data = info.Env().GetInstanceData<AddonData>();
  return Boolean::New(info.Env(), ts_query_cursor_did_exceed_match_limit(data->ts_query_cursor));
}

Napi::Value Query::MatchLimit(const Napi::CallbackInfo &info) {
  auto *data = info.Env().GetInstanceData<AddonData>();
  return Number::New(info.Env(), ts_query_cursor_match_limit(data->ts_query_cursor));
}

} // namespace node_tree_sitter
