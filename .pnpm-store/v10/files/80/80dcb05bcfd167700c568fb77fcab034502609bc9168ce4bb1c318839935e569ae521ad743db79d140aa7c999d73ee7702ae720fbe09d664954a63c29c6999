#pragma once
#include <v8.h>
#include "error.h"
#include "../v8_version.h"

namespace ivm {

// Internal handle conversion error. All these `HandleCastImpl` functions are templated and inlined and
// throwing generates verbose asm so this is implementated as a static function to clean up the
// typical case
struct ParamIncorrect : std::exception {
	explicit ParamIncorrect(const char* type) : type{type} {}
	[[noreturn]] static void Throw(const char* type) { throw ParamIncorrect{type}; }
	const char* type;
};

// Common arguments for casting functions
class HandleCastArguments {
	private:
		// Most of the time we won't need the context (and it is never needed in "strict" casting mode).
		// This little holder will only call GetCurrentContext() when needed because the optimizer can't
		// elide the call in any circumstances
		class ContextHolder {
			public:
				explicit ContextHolder(v8::Isolate* isolate) : isolate{isolate} {}
				inline operator v8::Local<v8::Context>() const { // NOLINT(hicpp-explicit-conversions)
					if (context.IsEmpty()) {
						context = isolate->GetCurrentContext();
					}
					return context;
				}

			private:
				v8::Isolate* const isolate;
				mutable v8::Local<v8::Context> context{};
		};

	public:
		HandleCastArguments() : HandleCastArguments{true, v8::Isolate::GetCurrent()} {}

		HandleCastArguments(bool strict, v8::Isolate* isolate) :
			isolate{isolate}, context{isolate}, strict{strict} {}

		HandleCastArguments(const v8::FunctionCallbackInfo<v8::Value>& info) : // NOLINT(hicpp-explicit-conversions)
			HandleCastArguments{true, info.GetIsolate()} {}

		HandleCastArguments(const v8::PropertyCallbackInfo<v8::Value>& info) : // NOLINT(hicpp-explicit-conversions)
			HandleCastArguments{true, info.GetIsolate()} {}

		HandleCastArguments(const v8::PropertyCallbackInfo<void>& info) : // NOLINT(hicpp-explicit-conversions)
			HandleCastArguments{true, info.GetIsolate()} {}

		v8::Isolate* const isolate;
		const ContextHolder context;
		const bool strict;
};

// Helper
template <class Type>
struct HandleCastTag {};

// Explicit casts: printf("%d\n", HandleCastImpl<int>(value));
template <class Type, class Value>
auto HandleCast(Value&& value, HandleCastArguments arguments = {}) -> Type {
	return HandleCastImpl(std::forward<Value>(value), arguments, HandleCastTag<Type>{});
}

// Identity cast
template <class Type>
inline auto HandleCastImpl(Type value, const HandleCastArguments& /*arguments*/, HandleCastTag<Type> /*tag*/) {
	return value;
}

// Local<Value> -> Local<...> conversions
inline auto HandleCastImpl(v8::Local<v8::Value> value, const HandleCastArguments& /*arguments*/, HandleCastTag<v8::Local<v8::Array>> /*tag*/) {
	if (value->IsArray()) {
		return value.As<v8::Array>();
	}
	ParamIncorrect::Throw("an array");
}

inline auto HandleCastImpl(v8::Local<v8::Value> value, const HandleCastArguments& arguments, HandleCastTag<v8::Local<v8::Boolean>> /*tag*/) {
	if (value->IsBoolean()) {
		return value.As<v8::Boolean>();
	} else if (!arguments.strict) {
		return value->ToBoolean(arguments.isolate);
	}
	ParamIncorrect::Throw("a boolean");
}

inline auto HandleCastImpl(v8::Local<v8::Value> value, const HandleCastArguments& /*arguments*/, HandleCastTag<v8::Local<v8::Function>> /*tag*/) {
	if (value->IsFunction()) {
		return value.As<v8::Function>();
	}
	ParamIncorrect::Throw("a function");
}

inline auto HandleCastImpl(v8::Local<v8::Value> value, const HandleCastArguments& /*arguments*/, HandleCastTag<v8::Local<v8::Int32>> /*tag*/) {
	if (value->IsInt32()) {
		return value.As<v8::Int32>();
	}
	ParamIncorrect::Throw("a 32-bit number");
}

inline auto HandleCastImpl(v8::Local<v8::Value> value, const HandleCastArguments& /*arguments*/, HandleCastTag<v8::Local<v8::Uint32>> /*tag*/) {
	if (value->IsUint32()) {
		return value.As<v8::Uint32>();
	}
	ParamIncorrect::Throw("a 32-bit number");
}

inline auto HandleCastImpl(v8::Local<v8::Value> value, const HandleCastArguments& /*arguments*/, HandleCastTag<v8::Local<v8::Number>> /*tag*/) {
	if (value->IsNumber()) {
		return value.As<v8::Number>();
	}
	ParamIncorrect::Throw("a number");
}

inline auto HandleCastImpl(v8::Local<v8::Value> value, const HandleCastArguments& /*arguments*/, HandleCastTag<v8::Local<v8::Object>> /*tag*/) {
	if (value->IsObject()) {
		return value.As<v8::Object>();
	}
	ParamIncorrect::Throw("an object");
}

inline auto HandleCastImpl(v8::Local<v8::Value> value, const HandleCastArguments& arguments, HandleCastTag<v8::Local<v8::String>> /*tag*/) {
	if (value->IsString()) {
		return value.As<v8::String>();
	} else if (!arguments.strict) {
		return Unmaybe(value->ToString(arguments.context));
	}
	ParamIncorrect::Throw("a string");
}

// Local<Value> -> MaybeLocal<...> conversions
inline auto HandleCastImpl(v8::Local<v8::Value> value, const HandleCastArguments& /*arguments*/, HandleCastTag<v8::MaybeLocal<v8::Array>> /*tag*/)
-> v8::MaybeLocal<v8::Array> {
	if (value->IsNullOrUndefined()) {
		return {};
	} else if (value->IsArray()) {
		return {value.As<v8::Array>()};
	}
	ParamIncorrect::Throw("an array");
}

inline auto HandleCastImpl(v8::Local<v8::Value> value, const HandleCastArguments& /*arguments*/, HandleCastTag<v8::MaybeLocal<v8::Function>> /*tag*/)
-> v8::MaybeLocal<v8::Function> {
	if (value->IsNullOrUndefined()) {
		return {};
	} else if (value->IsFunction()) {
		return {value.As<v8::Function>()};
	}
	ParamIncorrect::Throw("a function");
}

inline auto HandleCastImpl(v8::Local<v8::Value> value, const HandleCastArguments& /*arguments*/, HandleCastTag<v8::MaybeLocal<v8::Object>> /*tag*/)
-> v8::MaybeLocal<v8::Object> {
	if (value->IsNullOrUndefined()) {
		return {};
	} else if (value->IsObject()) {
		return {value.As<v8::Object>()};
	}
	ParamIncorrect::Throw("an object");
}

inline auto HandleCastImpl(v8::Local<v8::Value> value, const HandleCastArguments& arguments, HandleCastTag<v8::MaybeLocal<v8::String>> /*tag*/)
-> v8::MaybeLocal<v8::String> {
	if (value->IsNullOrUndefined()) {
		return {};
	} else if (value->IsString()) {
		return {value.As<v8::String>()};
	} else if (!arguments.strict) {
		return {Unmaybe(value->ToString(arguments.context))};
	}
	ParamIncorrect::Throw("a string");
}

inline auto HandleCastImpl(v8::Local<v8::Value> value, const HandleCastArguments& /*arguments*/, HandleCastTag<v8::MaybeLocal<v8::Value>> /*tag*/) {
	return v8::MaybeLocal<v8::Value>{value};
}

// Local<...> -> native C++ conversions
inline auto HandleCastImpl(v8::Local<v8::Value> value, const HandleCastArguments& arguments, HandleCastTag<bool> /*tag*/) {
	return HandleCast<bool>(HandleCast<v8::Local<v8::Boolean>>(value, arguments), arguments);
}

inline auto HandleCastImpl(v8::Local<v8::Boolean> value, const HandleCastArguments& /*arguments*/, HandleCastTag<bool> /*tag*/) {
	return value->Value();
}

inline auto HandleCastImpl(v8::Local<v8::Value> value, const HandleCastArguments& arguments, HandleCastTag<double> /*tag*/) {
	return HandleCast<double>(HandleCast<v8::Local<v8::Number>>(value, arguments), arguments);
}

inline auto HandleCastImpl(v8::Local<v8::Number> value, const HandleCastArguments& /*arguments*/, HandleCastTag<double> /*tag*/) {
	return value->Value();
}

inline auto HandleCastImpl(v8::Local<v8::Value> value, const HandleCastArguments& arguments, HandleCastTag<int32_t> /*tag*/) {
	return HandleCast<int32_t>(HandleCast<v8::Local<v8::Int32>>(value, arguments), arguments);
}

inline auto HandleCastImpl(v8::Local<v8::Int32> value, const HandleCastArguments& /*arguments*/, HandleCastTag<int32_t> /*tag*/) {
	return value->Value();
}

inline auto HandleCastImpl(v8::Local<v8::Value> value, const HandleCastArguments& arguments, HandleCastTag<uint32_t> /*tag*/) {
	return HandleCast<uint32_t>(HandleCast<v8::Local<v8::Uint32>>(value, arguments), arguments);
}

inline auto HandleCastImpl(v8::Local<v8::Uint32> value, const HandleCastArguments& /*arguments*/, HandleCastTag<uint32_t> /*tag*/) {
	return value->Value();
}

inline auto HandleCastImpl(v8::Local<v8::Value> value, const HandleCastArguments& arguments, HandleCastTag<std::string> /*tag*/) {
	return HandleCast<std::string>(HandleCast<v8::Local<v8::String>>(value, arguments), arguments);
}

inline auto HandleCastImpl(v8::Local<v8::String> value, const HandleCastArguments& arguments, HandleCastTag<std::string> /*tag*/) {
	v8::String::Utf8Value utf8_value{arguments.isolate, value};
	return std::string{*utf8_value, static_cast<size_t>(utf8_value.length())};
}

// native C++ -> Local<Value> conversions
inline auto HandleCastImpl(bool value, const HandleCastArguments& arguments, HandleCastTag<v8::Local<v8::Boolean>> /*tag*/) {
	return v8::Boolean::New(arguments.isolate, value);
}

inline auto HandleCastImpl(int32_t value, const HandleCastArguments& arguments, HandleCastTag<v8::Local<v8::Integer>> /*tag*/) {
	return v8::Integer::New(arguments.isolate, value);
}

inline auto HandleCastImpl(uint32_t value, const HandleCastArguments& arguments, HandleCastTag<v8::Local<v8::Integer>> /*tag*/) {
	return v8::Integer::NewFromUnsigned(arguments.isolate, value);
}

inline auto HandleCastImpl(int64_t value, const HandleCastArguments& arguments, HandleCastTag<v8::Local<v8::BigInt>> /*tag*/) {
	return v8::BigInt::New(arguments.isolate, value);
}

inline auto HandleCastImpl(uint64_t value, const HandleCastArguments& arguments, HandleCastTag<v8::Local<v8::BigInt>> /*tag*/) {
	return v8::BigInt::NewFromUnsigned(arguments.isolate, value);
}

inline auto HandleCastImpl(double value, const HandleCastArguments& arguments, HandleCastTag<v8::Local<v8::Number>> /*tag*/) {
	return v8::Number::New(arguments.isolate, value);
}

inline auto HandleCastImpl(const char* value, const HandleCastArguments& arguments, HandleCastTag<v8::Local<v8::String>> /*tag*/) {
	return Unmaybe(v8::String::NewFromUtf8(arguments.isolate, value, v8::NewStringType::kNormal));
}

inline auto HandleCastImpl(const std::string& value, const HandleCastArguments& arguments, HandleCastTag<v8::Local<v8::String>> /*tag*/) {
	return Unmaybe(v8::String::NewFromUtf8(arguments.isolate, value.c_str(), v8::NewStringType::kNormal, value.size()));
}

} // namespace ivm
