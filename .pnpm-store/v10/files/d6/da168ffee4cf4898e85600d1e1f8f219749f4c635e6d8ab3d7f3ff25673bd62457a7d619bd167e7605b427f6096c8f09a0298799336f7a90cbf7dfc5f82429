#pragma once
#include <cassert>
#include <string>
#include <functional>
#include <v8.h>
#include "generic/error.h"

namespace ivm {

/**
 * Easy strings
 */
inline auto v8_string(const char* string) -> v8::Local<v8::String> {
	return Unmaybe(v8::String::NewFromOneByte(v8::Isolate::GetCurrent(), (const uint8_t*)string, v8::NewStringType::kNormal)); // NOLINT
}

inline auto v8_symbol(const char* string) -> v8::Local<v8::String> {
	return Unmaybe(v8::String::NewFromOneByte(v8::Isolate::GetCurrent(), (const uint8_t*)string, v8::NewStringType::kInternalized)); // NOLINT
}

/**
 * Shorthand dereference of Persistent to Local
 */
template <typename T>
auto Deref(const v8::Persistent<T>& handle) -> v8::Local<T> {
	return v8::Local<T>::New(v8::Isolate::GetCurrent(), handle);
}

template <typename T>
auto Deref(const v8::Global<T>& handle) -> v8::Local<T> {
	return v8::Local<T>::New(v8::Isolate::GetCurrent(), handle);
}

}

#include "remote_handle.h"

namespace ivm {

template <typename T>
auto Deref(const RemoteHandle<T>& handle) -> v8::Local<T> {
	return handle.Deref();
}

} // namespace ivm
