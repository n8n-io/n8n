#pragma once
#include <string>
#include <v8.h>
#include "error.h"
#include "handle_cast.h"

namespace ivm {
namespace detail {

// Returns the name of the current function being called, used for error messages
inline auto CalleeName(const v8::FunctionCallbackInfo<v8::Value>& info) -> std::string {
	v8::Isolate* isolate = info.GetIsolate();
	return std::string("`")+ *v8::String::Utf8Value{isolate, Unmaybe(info.Data()->ToString(isolate->GetCurrentContext()))}+ "`";
}

inline auto CalleeName(const v8::PropertyCallbackInfo<v8::Value>& info) -> std::string {
	v8::Isolate* isolate = info.GetIsolate();
	return std::string("`")+ *v8::String::Utf8Value{isolate, Unmaybe(info.Data()->ToString(isolate->GetCurrentContext()))}+ "`";
}

inline auto CalleeName(const v8::PropertyCallbackInfo<void>& info) -> std::string {
	v8::Isolate* isolate = info.GetIsolate();
	return std::string("`")+ *v8::String::Utf8Value{isolate, Unmaybe(info.Data()->ToString(isolate->GetCurrentContext()))}+ "`";
}

// Specifies the types which may be default constructed when missing from arguments
template <class Type>
struct IsEmptyHandleAllowed : std::false_type {};

template <class Type>
struct IsEmptyHandleAllowed<Type*> : std::true_type {};

template <class Type>
struct IsEmptyHandleAllowed<v8::Maybe<Type>> : std::true_type {};

template <class Type>
struct IsEmptyHandleAllowed<v8::MaybeLocal<Type>> : std::true_type {};

// Statically counts the required arguments in a given callback function
template <size_t Index, class ...Args>
struct RequiredArguments;

template <size_t Index, class Type, class ...Rest>
struct RequiredArguments<Index, Type, Rest...> {
	constexpr static size_t value = std::max(
		IsEmptyHandleAllowed<Type>::value ? 0 : Index + 1,
		RequiredArguments<Index + 1, Rest...>::value
	);
};

template <size_t Index>
struct RequiredArguments<Index> {
    constexpr static size_t value = 0;
};

// Extracts parameters from various v8 call signatures
template <int Index>
inline auto ExtractParamImpl(const v8::FunctionCallbackInfo<v8::Value>& info) -> v8::Local<v8::Value> {
	if (Index == -2) {
		return info.Data();
	} else if (Index == -1) {
		return info.This();
	} else {
		return info[Index];
	}
}

template <int Index>
inline auto ExtractParamImpl(v8::Local<v8::Name> /*name*/, const v8::PropertyCallbackInfo<v8::Value>& info) -> v8::Local<v8::Value> {
	static_assert(Index == 0, "Getter callback should have no parameters");
	return info.This();
}

template <int Index>
inline auto ExtractParamImpl(v8::Local<v8::Name> /*name*/, v8::Local<v8::Value> value, const v8::PropertyCallbackInfo<void>& info) -> v8::Local<v8::Value> {
	static_assert(Index < 2, "Setter callback should have exactly 1 parameter");
	if (Index == 0) {
		return info.This();
	} else if (Index == 1) {
		return value;
	}
}

// Generic unpacker with empty checking
template <int Offset, class ...Args>
class ParamExtractor {
	public:
		explicit ParamExtractor(Args... args) : args{args...} {}

		template <class ...Types>
		inline void CheckLength(std::tuple<Types...>* /*tuple*/) {
			size_t length = CalculateLength(std::get<sizeof...(Args) - 1>(args));
			constexpr size_t required = RequiredArguments<0, Types...>::value;
			if (length < required) {
				// `this` counts as a parameter so adjust this count for the error message
				constexpr int adjusted = static_cast<int>(required) + std::max(Offset, -1);
				throw RuntimeTypeError{CalleeName()+ " requires at least "+ std::to_string(adjusted)+ (adjusted == 1 ? " parameter" : " parameters")};
			}
		}

		template <int Index, class Type>
		inline decltype(auto) Invoke() {
			constexpr int AdjustedIndex = Index == 0 ? Offset : (std::max(-1, Offset) + Index);
			ii = AdjustedIndex;
			v8::Local<v8::Value> value = Extract<AdjustedIndex>(seq);
			return HandleCast<Type>(value, std::get<sizeof...(Args) - 1>(args));
		}

		[[noreturn]] void Caught(const ParamIncorrect& ex) {
			if (ii == -1) {
				throw RuntimeTypeError{CalleeName()+ " requires `this` to be "+ ex.type};
			} else {
				throw RuntimeTypeError{CalleeName()+ " requires parameter "+ std::to_string(ii + 1)+ " to be "+ ex.type};
			}
		}

	private:
		auto CalleeName() {
			return detail::CalleeName(std::get<sizeof...(Args) - 1>(args));
		}

		template <int Index, size_t ...Indices>
		inline auto Extract(std::index_sequence<Indices...> /*indices*/) {
			return ExtractParamImpl<Index>(std::get<Indices>(args)...);
		}

		static inline auto CalculateLength(const v8::FunctionCallbackInfo<v8::Value>& info) -> size_t {
			return info.Length() + (Offset == 0 ? 0 : 1);
		}

		static inline auto CalculateLength(const v8::PropertyCallbackInfo<v8::Value>& /*info*/) -> size_t {
			return 1; // `this`
		}

		static inline auto CalculateLength(const v8::PropertyCallbackInfo<void>& /*info*/) -> size_t {
			return 2; // `this`, `value`
		}

		std::tuple<Args...> args;
		int ii = 0;
		static constexpr auto seq = std::make_index_sequence<sizeof...(Args)>{};
};

} // namespace detail
} // namespace ivm
