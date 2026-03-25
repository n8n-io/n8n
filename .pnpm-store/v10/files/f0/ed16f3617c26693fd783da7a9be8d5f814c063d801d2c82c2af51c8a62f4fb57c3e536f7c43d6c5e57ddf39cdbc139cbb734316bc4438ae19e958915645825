#include <chrono>
#include <future>
#include <mutex>
#include <node.h>
#include <node_version.h>
#include <optional>
#include <vector>

// Platform-specific includes for time functions
#ifdef _WIN32
#include <windows.h>
#elif defined(__APPLE__)
#include <time.h>
#elif defined(__linux__)
#include <time.h>
#endif

#ifndef NODE_MAJOR_VERSION
#error "NODE_MAJOR_VERSION is not defined"
#endif

#define SUPPORTS_ASYNC_CONTEXT_FRAME NODE_MAJOR_VERSION >= 22
#define GET_CONTINUATION_PRESERVED_EMBEDDER_DATA_V2 V8_MAJOR_VERSION >= 14

using namespace v8;
using namespace node;
using namespace std::chrono;

static const int kMaxStackFrames = 50;

struct AsyncLocalStorageLookup {
  // Async local storage instance associated with this thread
  v8::Global<v8::Value> async_local_storage;
  // Optional ordered array of keys (string | symbol) to traverse nested
  // Map/Object structures to fetch the final state object
  std::optional<std::vector<v8::Global<v8::Value>>> storage_keys;
};

// Structure to hold information for each thread/isolate
struct ThreadInfo {
  // Thread name
  std::string thread_name;
  // Last time this thread was seen in milliseconds since epoch
  milliseconds last_seen;
  // Optional async local storage associated with this thread
  std::optional<AsyncLocalStorageLookup> async_store;
  // Some JSON serialized state sent via threadPoll
  std::string poll_state;
};

static std::mutex threads_mutex;
// Map to hold all registered threads and their information
static std::unordered_map<v8::Isolate *, ThreadInfo> threads = {};

// Structure to hold stack frame information
struct JsStackFrame {
  std::string function_name;
  std::string filename;
  int lineno;
  int colno;
};

// Type alias for a vector of JsStackFrame
using JsStackFrames = std::vector<JsStackFrame>;

struct JsStackTrace {
  // The frames in the stack trace
  JsStackFrames frames;
  // JSON serialized string of the async state
  std::string async_state;
};

struct ThreadResult {
  std::string thread_name;
  JsStackTrace stack_trace;
  // JSON serialized string of the poll state
  std::string poll_state;
};

// Recursively sanitize a value to be safely JSON-stringifiable by:
// - Removing properties whose values are BigInt, Function, or Symbol
//   (dropped for objects, omitted from arrays)
// - Breaking cycles by omitting repeated objects (undefined -> dropped/omitted)
// - Preserving primitives and traversing arrays/objects
static v8::Local<v8::Value>
SanitizeForJSON(v8::Isolate *isolate, v8::Local<v8::Context> context,
                v8::Local<v8::Value> value,
                std::vector<v8::Local<v8::Object>> &ancestors) {
  // Fast-path for primitives that are always JSON-compatible
  if (value->IsNull() || value->IsBoolean() || value->IsNumber() ||
      value->IsString()) {
    return value;
  }

  // Values that JSON.stringify cannot handle directly
  if (value->IsBigInt() || value->IsSymbol() || value->IsFunction() ||
      value->IsUndefined()) {
    // Returning undefined here lets callers decide to drop (object) or null
    // (array)
    return v8::Undefined(isolate);
  }

  // Arrays
  if (value->IsArray()) {
    auto arr = value.As<v8::Array>();
    // Cycle detection
    auto arr_obj = value.As<v8::Object>();
    for (auto &a : ancestors) {
      if (a->StrictEquals(arr_obj)) {
        return v8::Undefined(isolate);
      }
    }

    auto length = arr->Length();
    auto out = v8::Array::New(isolate, 0);
    ancestors.push_back(arr_obj);

    uint32_t out_index = 0;
    for (uint32_t i = 0; i < length; ++i) {
      auto maybeEl = arr->Get(context, i);
      v8::Local<v8::Value> el;
      if (!maybeEl.ToLocal(&el)) {
        el = v8::Undefined(isolate);
      }

      auto sanitized = SanitizeForJSON(isolate, context, el, ancestors);
      if (!sanitized->IsUndefined()) {
        out->Set(context, out_index++, sanitized)
            .Check(); // omit undefined entries entirely
      }
    }
    ancestors.pop_back();
    return out;
  }

  // Objects (including Dates, RegExps, Maps as objects; we only traverse
  // enumerable own props)
  if (value->IsObject()) {
    auto obj = value.As<v8::Object>();
    // Cycle detection
    for (auto &a : ancestors) {
      if (a->StrictEquals(obj)) {
        return v8::Undefined(isolate);
      }
    }

    ancestors.push_back(obj);

    // Collect own enumerable property names (string-keyed)
    auto maybe_props = obj->GetPropertyNames(context);
    if (maybe_props.IsEmpty()) {
      ancestors.pop_back();
      return obj; // Nothing enumerable to sanitize
    }

    auto props = maybe_props.ToLocalChecked();
    auto out = v8::Object::New(isolate);
    auto len = props->Length();
    for (uint32_t i = 0; i < len; ++i) {
      auto maybeKey = props->Get(context, i);
      if (maybeKey.IsEmpty())
        continue;

      auto key = maybeKey.ToLocalChecked();
      if (!key->IsString()) {
        // Skip symbol and non-string keys to match JSON behavior
        continue;
      }

      auto maybeVal = obj->Get(context, key);
      if (maybeVal.IsEmpty())
        continue;

      auto val = maybeVal.ToLocalChecked();
      auto sanitized = SanitizeForJSON(isolate, context, val, ancestors);
      if (!sanitized->IsUndefined()) {
        out->Set(context, key, sanitized).Check();
      }
      // else: undefined -> drop property
    }

    ancestors.pop_back();
    return out;
  }

  // Fallback: return as-is (shouldn't hit here for other exotic types)
  return value;
}

std::string JSONStringify(Isolate *isolate, Local<Value> value) {
  auto context = isolate->GetCurrentContext();

  // Sanitize the value first to avoid JSON failures (e.g., BigInt, cycles)
  std::vector<v8::Local<v8::Object>> ancestors;
  auto sanitized = SanitizeForJSON(isolate, context, value, ancestors);
  if (sanitized->IsUndefined()) {
    // Nothing serializable
    return "";
  }

  auto maybe_json = v8::JSON::Stringify(context, sanitized);
  if (maybe_json.IsEmpty()) {
    return "";
  }
  v8::String::Utf8Value utf8(isolate, maybe_json.ToLocalChecked());
  return *utf8 ? *utf8 : "";
}

// Function to get stack frames from a V8 stack trace
JsStackFrames GetStackFrames(Isolate *isolate) {
  auto stack = StackTrace::CurrentStackTrace(isolate, kMaxStackFrames,
                                             StackTrace::kDetailed);

  JsStackFrames frames;
  if (!stack.IsEmpty()) {
    for (int i = 0; i < stack->GetFrameCount(); i++) {
      auto frame = stack->GetFrame(isolate, i);
      auto fn_name = frame->GetFunctionName();

      std::string function_name;
      if (frame->IsEval()) {
        function_name = "[eval]";
      } else if (fn_name.IsEmpty() || fn_name->Length() == 0) {
        function_name = "?";
      } else if (frame->IsConstructor()) {
        function_name = "[constructor]";
      } else {
        v8::String::Utf8Value utf8_fn(isolate, fn_name);
        function_name = *utf8_fn ? *utf8_fn : "?";
      }

      std::string filename;
      auto script_name = frame->GetScriptName();
      if (!script_name.IsEmpty()) {
        v8::String::Utf8Value utf8_filename(isolate, script_name);
        filename = *utf8_filename ? *utf8_filename : "<unknown>";
      } else {
        filename = "<unknown>";
      }

      int lineno = frame->GetLineNumber();
      int colno = frame->GetColumn();

      frames.push_back(JsStackFrame{function_name, filename, lineno, colno});
    }
  }

  return frames;
}

#if SUPPORTS_ASYNC_CONTEXT_FRAME
// Function to fetch the thread state from the async context store
std::string GetThreadState(Isolate *isolate,
                           const AsyncLocalStorageLookup &store) {

// Node.js stores the async local storage in the isolate's
// "ContinuationPreservedEmbedderData" map, keyed by the
// AsyncLocalStorage instance.
// https://github.com/nodejs/node/blob/c6316f9db9869864cea84e5f07585fa08e3e06d2/src/async_context_frame.cc#L37
#if GET_CONTINUATION_PRESERVED_EMBEDDER_DATA_V2
  auto data = isolate->GetContinuationPreservedEmbedderDataV2().As<Value>();
#else
  auto data = isolate->GetContinuationPreservedEmbedderData();
#endif
  auto async_local_storage_local = store.async_local_storage.Get(isolate);

  if (data.IsEmpty() || !data->IsMap() || async_local_storage_local.IsEmpty()) {
    return "";
  }

  auto map = data.As<v8::Map>();
  auto context = isolate->GetCurrentContext();
  auto maybe_root_store = map->Get(context, async_local_storage_local);

  if (maybe_root_store.IsEmpty()) {
    return "";
  }

  auto root_store = maybe_root_store.ToLocalChecked();

  if (store.storage_keys.has_value()) {
    // Walk the keys to get the desired nested value
    const auto &keys = store.storage_keys.value();
    auto current = root_store;

    for (auto &gkey : keys) {
      auto local_key = gkey.Get(isolate);
      if (!(local_key->IsString() || local_key->IsSymbol())) {
        continue;
      }

      v8::MaybeLocal<v8::Value> maybeValue;
      if (current->IsMap()) {
        auto map_val = current.As<v8::Map>();
        maybeValue = map_val->Get(context, local_key);
      } else if (current->IsObject()) {
        auto obj_val = current.As<v8::Object>();
        maybeValue = obj_val->Get(context, local_key);
      } else {
        return "";
      }

      if (maybeValue.IsEmpty()) {
        return "";
      }

      current = maybeValue.ToLocalChecked();
    }

    root_store = current;
  }

  return JSONStringify(isolate, root_store);
}
#endif

struct InterruptArgs {
  std::promise<JsStackTrace> promise;
  const std::optional<AsyncLocalStorageLookup> *store;
};

// Function to be called when an isolate's execution is interrupted
static void ExecutionInterrupted(Isolate *isolate, void *data) {
  auto args = static_cast<InterruptArgs *>(data);
  Locker locker(isolate);
  HandleScope handle_scope(isolate);

  if (isolate->IsExecutionTerminating()) {
    args->promise.set_value({{}, ""});
    delete args;
    return;
  }

  auto frames = GetStackFrames(isolate);
  std::string state = "";

#if SUPPORTS_ASYNC_CONTEXT_FRAME
  if (args->store && args->store->has_value()) {
    state = GetThreadState(isolate, args->store->value());
  }
#endif

  args->promise.set_value({frames, state});

  delete args;
}

// Function to capture the stack trace of a single isolate
JsStackTrace
CaptureStackTrace(Isolate *isolate,
                  const std::optional<AsyncLocalStorageLookup> &store) {
  if (isolate->IsExecutionTerminating()) {
    return JsStackTrace{{}, ""};
  }

  std::promise<JsStackTrace> promise;
  auto future = promise.get_future();

  // The v8 isolate must be interrupted to capture the stack trace
  isolate->RequestInterrupt(ExecutionInterrupted,
                            new InterruptArgs{std::move(promise), &store});

  return future.get();
}

// Function to capture stack traces from all registered threads
void CaptureStackTraces(const FunctionCallbackInfo<Value> &args) {
  auto capture_from_isolate = args.GetIsolate();

  std::vector<ThreadResult> results;

  {
    std::vector<std::future<ThreadResult>> futures;
    std::lock_guard<std::mutex> lock(threads_mutex);
    for (auto &thread : threads) {
      auto thread_isolate = thread.first;
      auto &thread_info = thread.second;

      if (thread_isolate == capture_from_isolate)
        continue;

      auto thread_name = thread_info.thread_name;
      auto poll_state = thread_info.poll_state;

      futures.emplace_back(std::async(
          std::launch::async,
          [thread_isolate, thread_name, poll_state](
              const std::optional<AsyncLocalStorageLookup> &async_store)
              -> ThreadResult {
            return ThreadResult{thread_name,
                                CaptureStackTrace(thread_isolate, async_store),
                                poll_state};
          },
          std::cref(thread_info.async_store)));
    }

    for (auto &fut : futures) {
      results.emplace_back(fut.get());
    }
  }

  auto current_context = capture_from_isolate->GetCurrentContext();

  Local<Object> output = Object::New(capture_from_isolate);

  for (auto &result : results) {
    auto key =
        String::NewFromUtf8(capture_from_isolate, result.thread_name.c_str(),
                            NewStringType::kNormal)
            .ToLocalChecked();

    Local<Array> jsFrames =
        Array::New(capture_from_isolate, result.stack_trace.frames.size());
    for (size_t i = 0; i < result.stack_trace.frames.size(); ++i) {
      const auto &frame = result.stack_trace.frames[i];
      Local<Object> frameObj = Object::New(capture_from_isolate);
      frameObj
          ->Set(current_context,
                String::NewFromUtf8(capture_from_isolate, "function",
                                    NewStringType::kInternalized)
                    .ToLocalChecked(),
                String::NewFromUtf8(capture_from_isolate,
                                    frame.function_name.c_str(),
                                    NewStringType::kNormal)
                    .ToLocalChecked())
          .Check();
      frameObj
          ->Set(current_context,
                String::NewFromUtf8(capture_from_isolate, "filename",
                                    NewStringType::kInternalized)
                    .ToLocalChecked(),
                String::NewFromUtf8(capture_from_isolate,
                                    frame.filename.c_str(),
                                    NewStringType::kNormal)
                    .ToLocalChecked())
          .Check();
      frameObj
          ->Set(current_context,
                String::NewFromUtf8(capture_from_isolate, "lineno",
                                    NewStringType::kInternalized)
                    .ToLocalChecked(),
                Integer::New(capture_from_isolate, frame.lineno))
          .Check();
      frameObj
          ->Set(current_context,
                String::NewFromUtf8(capture_from_isolate, "colno",
                                    NewStringType::kInternalized)
                    .ToLocalChecked(),
                Integer::New(capture_from_isolate, frame.colno))
          .Check();
      jsFrames->Set(current_context, static_cast<uint32_t>(i), frameObj)
          .Check();
    }

    // Create a thread object with a 'frames' property and optional 'state'
    Local<Object> threadObj = Object::New(capture_from_isolate);
    threadObj
        ->Set(current_context,
              String::NewFromUtf8(capture_from_isolate, "frames",
                                  NewStringType::kInternalized)
                  .ToLocalChecked(),
              jsFrames)
        .Check();

    if (!result.poll_state.empty()) {
      v8::MaybeLocal<v8::String> stateStr = v8::String::NewFromUtf8(
          capture_from_isolate, result.poll_state.c_str(),
          NewStringType::kNormal);
      if (!stateStr.IsEmpty()) {
        v8::MaybeLocal<v8::Value> maybeStateVal =
            v8::JSON::Parse(current_context, stateStr.ToLocalChecked());
        v8::Local<v8::Value> stateVal;
        if (maybeStateVal.ToLocal(&stateVal)) {
          threadObj
              ->Set(current_context,
                    String::NewFromUtf8(capture_from_isolate, "pollState",
                                        NewStringType::kInternalized)
                        .ToLocalChecked(),
                    stateVal)
              .Check();
        }
      }
    }

    if (!result.stack_trace.async_state.empty()) {
      v8::MaybeLocal<v8::String> stateStr = v8::String::NewFromUtf8(
          capture_from_isolate, result.stack_trace.async_state.c_str(),
          NewStringType::kNormal);
      if (!stateStr.IsEmpty()) {
        v8::MaybeLocal<v8::Value> maybeStateVal =
            v8::JSON::Parse(current_context, stateStr.ToLocalChecked());
        v8::Local<v8::Value> stateVal;
        if (maybeStateVal.ToLocal(&stateVal)) {
          threadObj
              ->Set(current_context,
                    String::NewFromUtf8(capture_from_isolate, "asyncState",
                                        NewStringType::kInternalized)
                        .ToLocalChecked(),
                    stateVal)
              .Check();
        }
      }
    }

    output->Set(current_context, key, threadObj).Check();
  }

  args.GetReturnValue().Set(output);
}

// Cleanup function to remove the thread from the map when the isolate is
// destroyed
void Cleanup(void *arg) {
  auto isolate = static_cast<Isolate *>(arg);
  std::lock_guard<std::mutex> lock(threads_mutex);
  threads.erase(isolate);
}

void RegisterThreadInternal(
    Isolate *isolate, const std::string &thread_name,
    std::optional<AsyncLocalStorageLookup> async_store) {

  std::lock_guard<std::mutex> lock(threads_mutex);
  auto found = threads.find(isolate);
  if (found == threads.end()) {
    threads.emplace(isolate, ThreadInfo{thread_name, milliseconds::zero(),
                                        std::move(async_store), ""});
    // Register a cleanup hook to remove this thread when the isolate is
    // destroyed
    node::AddEnvironmentCleanupHook(isolate, Cleanup, isolate);
  }
}

// Function to register a thread and update its last seen time
void RegisterThread(const FunctionCallbackInfo<Value> &args) {
  auto isolate = args.GetIsolate();
  auto context = isolate->GetCurrentContext();

  if (args.Length() == 1 && args[0]->IsString()) {
    v8::String::Utf8Value utf8(isolate, args[0]);
    std::string thread_name(*utf8 ? *utf8 : "");

    RegisterThreadInternal(isolate, thread_name, std::nullopt);
  } else if (args.Length() == 2 && args[0]->IsObject() && args[1]->IsString()) {
    v8::String::Utf8Value utf8(isolate, args[1]);
    std::string thread_name(*utf8 ? *utf8 : "");

    auto obj = args[0].As<Object>();
    auto async_local_storage_val =
        obj->Get(context, String::NewFromUtf8(isolate, "asyncLocalStorage",
                                              NewStringType::kInternalized)
                              .ToLocalChecked());

    if (async_local_storage_val.IsEmpty() ||
        !async_local_storage_val.ToLocalChecked()->IsObject()) {
      isolate->ThrowException(Exception::Error(
          String::NewFromUtf8(isolate,
                              "The first argument must be an object with an "
                              "asyncLocalStorage property",
                              NewStringType::kInternalized)
              .ToLocalChecked()));
      return;
    }

    std::optional<std::vector<v8::Global<v8::Value>>> storage_keys =
        std::nullopt;

    auto storage_key_val =
        obj->Get(context, String::NewFromUtf8(isolate, "stateLookup",
                                              NewStringType::kInternalized)
                              .ToLocalChecked());

    if (!storage_key_val.IsEmpty()) {

      auto local_val = storage_key_val.ToLocalChecked();
      if (!local_val->IsUndefined() && !local_val->IsNull()) {
        if (local_val->IsArray()) {

          auto arr = local_val.As<v8::Array>();
          std::vector<v8::Global<v8::Value>> keys_vec;
          uint32_t length = arr->Length();
          for (uint32_t i = 0; i < length; ++i) {
            auto maybeEl = arr->Get(context, i);
            if (maybeEl.IsEmpty())
              continue;
            auto el = maybeEl.ToLocalChecked();
            if (el->IsString() || el->IsSymbol()) {

              keys_vec.emplace_back(isolate, el);
            }
          }
          if (!keys_vec.empty()) {
            storage_keys = std::move(keys_vec);
          }
        }
      }
    }

    auto store = AsyncLocalStorageLookup{
        v8::Global<v8::Value>(isolate,
                              async_local_storage_val.ToLocalChecked()),
        std::move(storage_keys)};

    RegisterThreadInternal(isolate, thread_name, std::move(store));
  } else {
    isolate->ThrowException(Exception::Error(
        String::NewFromUtf8(
            isolate,
            "Incorrect arguments. Expected: \n"
            "- registerThread(threadName: string) or \n"
            "- registerThread(storage: {asyncLocalStorage: AsyncLocalStorage; "
            "stateLookup?: Array<string | symbol>}, "
            "threadName: string)",
            NewStringType::kInternalized)
            .ToLocalChecked()));
  }
}

// Cross-platform monotonic time function. Provides a monotonic clock that only
// increases and does not tick when the system is suspended.
steady_clock::time_point GetUnbiasedMonotonicTime() {
#ifdef _WIN32
  // Windows: QueryUnbiasedInterruptTimePrecise returns time in 100-nanosecond
  // units
  ULONGLONG interrupt_time;
  QueryUnbiasedInterruptTimePrecise(&interrupt_time);
  // Convert from 100-nanosecond units to nanoseconds
  uint64_t time_ns = interrupt_time * 100;
  return steady_clock::time_point(nanoseconds(time_ns));
#elif defined(__APPLE__)
  uint64_t time_ns = clock_gettime_nsec_np(CLOCK_UPTIME_RAW);
  return steady_clock::time_point(nanoseconds(time_ns));
#elif defined(__linux__)
  struct timespec ts;
  clock_gettime(CLOCK_MONOTONIC, &ts);
  return steady_clock::time_point(seconds(ts.tv_sec) + nanoseconds(ts.tv_nsec));
#else
  // Fallback for other platforms using steady_clock. Note: this will be
  // monotonic but is not guaranteed to ignore time spent while suspended.
  return steady_clock::now();
#endif
}

// Function to track a thread and set its state
void ThreadPoll(const FunctionCallbackInfo<Value> &args) {
  auto isolate = args.GetIsolate();

  bool enable_last_seen = true;
  if (args.Length() > 0 && args[0]->IsBoolean()) {
    enable_last_seen = args[0]->BooleanValue(isolate);
  }

  std::string poll_state = "";
  if (args.Length() > 1 && args[1]->IsObject()) {
    auto obj = args[1].As<Object>();
    poll_state = JSONStringify(isolate, obj);
  }

  {
    std::lock_guard<std::mutex> lock(threads_mutex);
    auto found = threads.find(isolate);
    if (found != threads.end()) {
      auto &thread_info = found->second;
      thread_info.poll_state = std::move(poll_state);

      if (enable_last_seen) {
        thread_info.last_seen = duration_cast<milliseconds>(
            GetUnbiasedMonotonicTime().time_since_epoch());
      } else {
        thread_info.last_seen = milliseconds::zero();
      }
    }
  }
}

// Function to get the last seen time of all registered threads
void GetThreadsLastSeen(const FunctionCallbackInfo<Value> &args) {
  Isolate *isolate = args.GetIsolate();

  Local<Object> result = Object::New(isolate);
  milliseconds now = duration_cast<milliseconds>(
      GetUnbiasedMonotonicTime().time_since_epoch());
  {
    std::lock_guard<std::mutex> lock(threads_mutex);
    for (const auto &[thread_isolate, info] : threads) {
      if (info.last_seen == milliseconds::zero())
        continue; // Skip threads that have not registered more than once

      int64_t ms_since = (now - info.last_seen).count();
      result
          ->Set(isolate->GetCurrentContext(),
                String::NewFromUtf8(isolate, info.thread_name.c_str(),
                                    NewStringType::kNormal)
                    .ToLocalChecked(),
                Number::New(isolate, ms_since))
          .Check();
    }
  }
  args.GetReturnValue().Set(result);
}

extern "C" NODE_MODULE_EXPORT void
NODE_MODULE_INITIALIZER(Local<Object> exports, Local<Value> module,
                        Local<Context> context) {
  auto isolate = v8::Isolate::GetCurrent();

  exports
      ->Set(context,
            String::NewFromUtf8(isolate, "captureStackTrace",
                                NewStringType::kInternalized)
                .ToLocalChecked(),
            FunctionTemplate::New(isolate, CaptureStackTraces)
                ->GetFunction(context)
                .ToLocalChecked())
      .Check();

  exports
      ->Set(context,
            String::NewFromUtf8(isolate, "registerThread",
                                NewStringType::kInternalized)
                .ToLocalChecked(),
            FunctionTemplate::New(isolate, RegisterThread)
                ->GetFunction(context)
                .ToLocalChecked())
      .Check();

  exports
      ->Set(context,
            String::NewFromUtf8(isolate, "threadPoll",
                                NewStringType::kInternalized)
                .ToLocalChecked(),
            FunctionTemplate::New(isolate, ThreadPoll)
                ->GetFunction(context)
                .ToLocalChecked())
      .Check();

  exports
      ->Set(context,
            String::NewFromUtf8(isolate, "getThreadsLastSeen",
                                NewStringType::kInternalized)
                .ToLocalChecked(),
            FunctionTemplate::New(isolate, GetThreadsLastSeen)
                ->GetFunction(context)
                .ToLocalChecked())
      .Check();
}
