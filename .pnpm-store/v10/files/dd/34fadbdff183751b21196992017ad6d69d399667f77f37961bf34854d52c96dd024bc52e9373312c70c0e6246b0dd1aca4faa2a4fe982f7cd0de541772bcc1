#pragma once
#include <stdexcept>
#include <string>
#include <v8.h>
#include "isolate/v8_version.h"

namespace ivm {

/**
 * JS + C++ exceptions, use with care
 */

// `RuntimeError` can be thrown when v8 already has an exception on deck
class RuntimeError : public std::exception {};

namespace detail {

// `RuntimeErrorWithMessage` is a general error that has an error message with it
class RuntimeErrorWithMessage : public RuntimeError {
	public:
		explicit RuntimeErrorWithMessage(std::string message) : message{std::move(message)} {}

		auto GetMessage() const {
			return message;
		}

	private:
		std::string message;
};

// `RuntimeErrorConstructible` is a abstract error that can be imported back into v8
class RuntimeErrorConstructible : public RuntimeErrorWithMessage {
	using RuntimeErrorWithMessage::RuntimeErrorWithMessage;
	public:
		virtual auto ConstructError() const -> v8::Local<v8::Value> = 0;
};

// `RuntimeErrorWithConstructor` can be used to construct any of the `v8::Exception` errors
#if V8_AT_LEAST(11, 9, 154)
template <v8::Local<v8::Value> (*Error)(v8::Local<v8::String>, v8::Local<v8::Value>)>
#else
template <v8::Local<v8::Value> (*Error)(v8::Local<v8::String>)>
#endif
class RuntimeErrorWithConstructor : public RuntimeErrorConstructible {
	using RuntimeErrorConstructible::RuntimeErrorConstructible;
	public:
		RuntimeErrorWithConstructor(const std::string& message, std::string stack_trace) :
			RuntimeErrorConstructible{message}, stack_trace{std::move(stack_trace)} {}

		auto ConstructError() const -> v8::Local<v8::Value> final {
			v8::Isolate* isolate = v8::Isolate::GetCurrent();
			v8::MaybeLocal<v8::String> maybe_message = v8::String::NewFromUtf8(isolate, GetMessage().c_str(), v8::NewStringType::kNormal);
			v8::Local<v8::String> message_handle;
			if (maybe_message.ToLocal(&message_handle)) {
				v8::Local<v8::Object> error =
#if V8_AT_LEAST(11, 9, 154)
					Error(message_handle, {}).As<v8::Object>();
#else
					Error(message_handle).As<v8::Object>();
#endif
				if (!stack_trace.empty() && isolate->InContext()) {
					std::string stack_str = std::string(GetMessage()) + stack_trace;
					v8::MaybeLocal<v8::String> maybe_stack = v8::String::NewFromUtf8(isolate, stack_str.c_str(), v8::NewStringType::kNormal);
					v8::MaybeLocal<v8::String> maybe_stack_symbol = v8::String::NewFromUtf8(isolate, "stack", v8::NewStringType::kNormal);
					v8::Local<v8::String> stack;
					v8::Local<v8::String> stack_symbol;
					if (maybe_stack.ToLocal(&stack) && maybe_stack_symbol.ToLocal(&stack_symbol)) {
						error->Set(isolate->GetCurrentContext(), stack_symbol, stack).IsJust();
					}
				}
				return error;
			}
			// If the MaybeLocal is empty then I think v8 will have an exception on deck. I don't know if
			// there's any way to assert() this though.
			return {};
		}

		auto GetStackTrace() const -> std::string {
			return stack_trace;
		}

	private:
		std::string stack_trace;
};

}

// `FatalRuntimeError` is for very bad situations when the isolate is now in an unknown state
class FatalRuntimeError : public detail::RuntimeErrorWithMessage {
	using RuntimeErrorWithMessage::RuntimeErrorWithMessage;
};

// These correspond to the given JS error types
using RuntimeGenericError = detail::RuntimeErrorWithConstructor<v8::Exception::Error>;
using RuntimeTypeError = detail::RuntimeErrorWithConstructor<v8::Exception::TypeError>;
using RuntimeRangeError = detail::RuntimeErrorWithConstructor<v8::Exception::RangeError>;

/**
 * Convert a MaybeLocal<T> to Local<T> and throw an error if it's empty. Someone else should throw
 * the v8 exception.
 */
template <class Type>
auto Unmaybe(v8::Maybe<Type> handle) -> Type {
	Type just;
	if (handle.To(&just)) {
		return just;
	} else {
		throw RuntimeError();
	}
}

template <class Type>
auto Unmaybe(v8::MaybeLocal<Type> handle) -> v8::Local<Type> {
	v8::Local<Type> local;
	if (handle.ToLocal(&local)) {
		return local;
	} else {
		throw RuntimeError();
	}
}

namespace detail {

template <class Functor>
inline void RunBarrier(Functor fn) {
	// Runs a function and converts C++ errors to immediate v8 errors. Pretty much the same as
	// `RunCallback` but with no return value.
	try {
		fn();
	} catch (const FatalRuntimeError& cc_error) {
		// Execution is terminating
	} catch (const detail::RuntimeErrorConstructible& cc_error) {
		v8::Isolate::GetCurrent()->ThrowException(cc_error.ConstructError());
	} catch (const RuntimeError& cc_error) {
		// A JS error is waiting in the isolate
	}
}

} // namespace detail
} // namespace ivm
