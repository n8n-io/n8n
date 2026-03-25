#include "stack_trace.h"
#include "functor_runners.h"
#include "specific.h"
#include "v8_version.h"
#include <cstring>
#include <sstream>
#include <string>

using namespace v8;

namespace ivm {

static auto StringConcat(Isolate* isolate, Local<String> left, Local<String> right) -> Local<String> {
	return String::Concat(isolate, left, right);
}

/**
 * This returns an object that's like Symbol() in JS but only C++ can see it.
 */
auto GetPrivateStackSymbol() -> Local<Private> {
	static IsolateSpecific<Private> holder;
	return holder.Deref([]() {
		return Private::New(Isolate::GetCurrent());
	});
}

/**
 * Helper which renders to string either a String (pass-through), StackTrace (render), or Array
 * (recursion pair)
 */
auto RenderErrorStack(Local<Value> data) -> Local<String> {
	Isolate* isolate = Isolate::GetCurrent();
	if (data->IsString()) {
		// Plain string. We need to remove the first line of `stack` to avoid repeating the error
		// message
		String::Utf8Value string_value{isolate, data.As<String>()};
		const char* c_str = *string_value;
		// If it starts with "    at" then the message has already been removed
		if (strncmp(c_str, "    at", 6) == 0) {
			return data.As<String>();
		}
		// Find the newline
		const char* pos = strchr(c_str, '\n');
		while (pos != nullptr) {
			if (strncmp(pos + 1, "    at", 6) == 0) {
				// Found the start of the stack
				return Unmaybe(String::NewFromOneByte(isolate, reinterpret_cast<const uint8_t*>(pos), NewStringType::kNormal));
			}
			pos = strchr(pos + 1, '\n');
		}
		// No stack, just a message
		return String::Empty(isolate);

	} else if (data->IsArray()) {
		// Array pair
		Local<Context> context = isolate->GetCurrentContext();
		Local<Array> array = data.As<Array>();
		return StringConcat(isolate,
			StringConcat(isolate,
				RenderErrorStack(Unmaybe(array->Get(context, 1))),
				Unmaybe(String::NewFromOneByte(isolate, reinterpret_cast<const uint8_t*>("\n    at (<isolated-vm boundary>)"), NewStringType::kNormal))
			),
			RenderErrorStack(Unmaybe(array->Get(context, 0)))
		);
	} else {
		// StackTraceHolder
		StackTraceHolder& that = *ClassHandle::Unwrap<StackTraceHolder>(data.As<Object>());
		Local<StackTrace> stack_trace = Deref(that.stack_trace);
		return Unmaybe(String::NewFromUtf8(isolate, StackTraceHolder::RenderSingleStack(stack_trace).c_str(), NewStringType::kNormal));
	}
}

/**
 * Accessor on error `stack`. Renders from previously saved stack trace.
 */
void ErrorStackGetter(Local<Name> /*property*/, const PropertyCallbackInfo<Value>& info) {
	FunctorRunners::RunCallback(info, [ &info ]() {
		Isolate* isolate = Isolate::GetCurrent();
		Local<Context> context = isolate->GetCurrentContext();
		Local<Object> holder = info.This();
		Local<Value> name = Unmaybe(holder->Get(context, StringTable::Get().name));
		if (!name->IsString()) {
			name = holder->GetConstructorName();
		}
		return StringConcat(isolate,
			StringConcat(isolate, name.As<String>(), StringTable::Get().colonSpace),
			StringConcat(isolate,
				Unmaybe(
					Unmaybe(info.This()->Get(context, StringTable::Get().message))->ToString(context)
				),
				RenderErrorStack(Unmaybe(holder->GetPrivate(context, GetPrivateStackSymbol())))
			)
		);
	});
}

/**
 * Utility function which sets the stack getter on an error object
 */
void AttachStackGetter(Local<Object> error, Local<Value> data) {
	Local<Context> context = Isolate::GetCurrent()->GetCurrentContext();
	Unmaybe(error->SetPrivate(context, GetPrivateStackSymbol(), data));
	Unmaybe(error->SetNativeDataProperty(
		context,
		StringTable::Get().stack,
		ErrorStackGetter, nullptr,
		Local<Value>(),
		PropertyAttribute::DontEnum
	));
}

/**
 * StackTraceHolder implementation
 */
StackTraceHolder::StackTraceHolder(Local<StackTrace> stack_handle) : stack_trace(Isolate::GetCurrent(), stack_handle) {}

auto StackTraceHolder::Definition() -> Local<FunctionTemplate> {
	return MakeClass("StackTraceHolder", nullptr);
}

void StackTraceHolder::AttachStack(Local<Object> error, Local<StackTrace> stack) {
	AttachStackGetter(error, ClassHandle::NewInstance<StackTraceHolder>(stack));
}

void StackTraceHolder::ChainStack(Local<Object> error, Local<StackTrace> stack) {
	Isolate* isolate = Isolate::GetCurrent();
	Local<Context> context = isolate->GetCurrentContext();
	Local<Value> existing_data = Unmaybe(error->GetPrivate(context, GetPrivateStackSymbol()));
	if (existing_data->IsUndefined()) {
		// This error has not passed through ivm yet. Get the existing stack trace.
		Local<StackTrace> existing_stack = Exception::GetStackTrace(error);
		if (existing_stack.IsEmpty()) {
			// In this case it's probably passed through ExternalCopy which flattens the `stack` property
			// into a plain value
			existing_data = Unmaybe(error->Get(context, StringTable::Get().stack));
			if (existing_data->IsUndefined() || !existing_data->IsString()) {
				return AttachStack(error, stack);
			}
		} else {
			existing_data = ClassHandle::NewInstance<StackTraceHolder>(existing_stack);
		}
	}
	Local<Array> pair = Array::New(isolate, 2);
	Unmaybe(pair->Set(context, 0, ClassHandle::NewInstance<StackTraceHolder>(stack)));
	Unmaybe(pair->Set(context, 1, existing_data));
	AttachStackGetter(error, pair);
}

auto StackTraceHolder::RenderSingleStack(Local<StackTrace> stack_trace) -> std::string {
	Isolate* isolate = Isolate::GetCurrent();
	std::stringstream ss;
	int size = stack_trace->GetFrameCount();
	for (int ii = 0; ii < size; ++ii) {
		Local<StackFrame> frame = stack_trace->GetFrame(isolate, ii);
		ss <<"\n    at ";
		String::Utf8Value fn_name{isolate, frame->GetFunctionName()};
		if (frame->IsWasm()) {
			String::Utf8Value script_name{isolate, frame->GetScriptName()};
			bool has_name = fn_name.length() != 0 || script_name.length() != 0;
			if (has_name) {
				if (script_name.length() == 0) {
					ss <<*fn_name;
				} else {
					ss <<*script_name;
					if (fn_name.length() != 0) {
						ss <<"." <<*fn_name;
					}
				}
				ss <<" (<WASM>";
			}
			ss <<frame->GetLineNumber() <<":" <<frame->GetColumn();
			if (has_name) {
				ss <<")";
			}
		} else {
			if (frame->IsConstructor()) {
				ss <<"new ";
				if (fn_name.length() == 0) {
					ss <<"<anonymous>";
				} else {
					ss <<*fn_name;
				}
			} else if (fn_name.length() != 0) {
				ss <<*fn_name;
			} else {
				AppendFileLocation(isolate, frame, ss);
				return ss.str();
			}
			ss <<" (";
			AppendFileLocation(isolate, frame, ss);
			ss <<")";
		}
	}
	return ss.str();
}

void StackTraceHolder::AppendFileLocation(Isolate* /*isolate*/, Local<StackFrame> frame, std::stringstream& ss) {
	String::Utf8Value script_name{Isolate::GetCurrent(), frame->GetScriptNameOrSourceURL()};
	if (script_name.length() == 0) {
		if (frame->IsEval()) {
			ss <<"[eval]";
		} else {
			ss <<"<anonymous>";
		}
	} else {
		ss <<*script_name;
	}
	int line_number = frame->GetLineNumber();
	if (line_number != -1) {
		ss <<":" <<line_number;
		int column = frame->GetColumn();
		if (column != -1) {
			ss <<":" <<column;
		}
	}
}

} // namespace ivm
