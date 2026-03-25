#pragma once
#include "util.h"
#include "external_copy/error.h"
#include "generic/error.h"

namespace ivm {

/**
 * Helpers to run a function and catch the various exceptions defined above
 */
namespace FunctorRunners {

template <typename F, typename T>
inline void RunCallback(T& info, F fn) {
	// This function is used when C++ code is invoked from a JS callback. We are given an instance of
	// `FunctionCallbackInfo`, or `PropertyCallbackInfo` which is used to give the return value to v8.
	// C++ exceptions will be caught, converted to JS exceptions, and then thrown back to JS.
	try {
		v8::Local<v8::Value> result = fn();
		if (result.IsEmpty()) {
			throw std::logic_error("Callback returned empty Local<> but did not set exception");
		}
		info.GetReturnValue().Set(result);
	} catch (const detail::RuntimeErrorConstructible& cc_error) {
		v8::Local<v8::Value> error = cc_error.ConstructError();
		if (!error.IsEmpty()) {
			v8::Isolate::GetCurrent()->ThrowException(error);
		}
	} catch (const RuntimeError& err) {
	}
}

template <typename F1, typename F2>
inline void RunCatchExternal(v8::Local<v8::Context> default_context, F1 fn1, F2 fn2) {
	// This function will call `fn1()` and if that fails it will convert the caught error to an
	// `ExternalCopy` and call `fn2(err)`
	auto* isolate = v8::Isolate::GetCurrent();
	v8::TryCatch try_catch{isolate};
	try {
		try {
			fn1();
		} catch (const RuntimeTypeError& cc_error) {
			// The following errors are just various C++ strings with an error type
			fn2(std::make_unique<ExternalCopyError>(ExternalCopyError::ErrorType::TypeError, cc_error.GetMessage().c_str(), cc_error.GetStackTrace()));
		} catch (const RuntimeRangeError& cc_error) {
			fn2(std::make_unique<ExternalCopyError>(ExternalCopyError::ErrorType::RangeError, cc_error.GetMessage().c_str(), cc_error.GetStackTrace()));
		} catch (const RuntimeGenericError& cc_error) {
			fn2(std::make_unique<ExternalCopyError>(ExternalCopyError::ErrorType::Error, cc_error.GetMessage().c_str(), cc_error.GetStackTrace()));
		} catch (const detail::RuntimeErrorWithMessage& cc_error) {
			fn2(std::make_unique<ExternalCopyError>(ExternalCopyError::ErrorType::Error, cc_error.GetMessage().c_str()));
		} catch (const RuntimeError& cc_error) {
			// If this is caught it means the error needs to be copied out of v8
			assert(try_catch.HasCaught());
			v8::Context::Scope context_scope{default_context};
			fn2(ExternalCopy::CopyThrownValue(try_catch.Exception()));
		}
	} catch (...) {
		if (try_catch.HasCaught()) {
			try_catch.ReThrow();
		}
		throw;
	}
}

template <typename F1, typename F2>
inline void RunCatchValue(F1 fn1, F2 fn2) {
	// This function will call `fn1()` and if that fails it will convert the caught error to a v8
	// value and pass it to fn3().
	//
	// *Fatal errors are swallowed*
	//
	v8::TryCatch try_catch(v8::Isolate::GetCurrent());
	try {
		try {
			fn1();
		} catch (const FatalRuntimeError& cc_error) {
			return;
		} catch (const detail::RuntimeErrorConstructible& cc_error) {
			// A C++ error thrown and needs to be internalized into v8
			fn2(cc_error.ConstructError());
		} catch (const RuntimeError& cc_error) {
			// A JS error is waiting in the isolate
			assert(try_catch.HasCaught());
			v8::Local<v8::Value> error = try_catch.Exception();
			try_catch.Reset();
			fn2(error);
		}
	} catch (...) {
		if (try_catch.HasCaught()) {
			try_catch.ReThrow();
		}
		throw;
	}
}

}; // namespace FunctorRunners
}; // namespace ivm
