#pragma once
#include <v8.h>
#include "error.h"
#include "extract_params.h"

namespace ivm {
namespace detail {

// Helper to extract arguments out of function
template <class Function>
struct extract_arguments;

template <class Function>
struct extract_arguments<Function*> : extract_arguments<Function> {};

template <class Return, class ...Args>
struct extract_arguments<Return(Args...)> {
	using arguments = std::tuple<Args...>;
	static constexpr auto index_sequence = std::make_index_sequence<sizeof...(Args)>{};
};

template<class Class, class Return, class ...Args>
struct extract_arguments<Return(Class::*)(Args...)> : extract_arguments<Return(Args...)> {};

// Helper to turn Return(Class:*)(...) into Return(*)(Class&, ...)
template <class Signature>
struct unbind_member_function;

template <>
struct unbind_member_function<std::nullptr_t> {
	using type = std::nullptr_t;
	template <std::nullptr_t>
	static constexpr auto invoke = nullptr;
};

template <class Return, class ...Args>
struct unbind_member_function<Return(Args...)> {};

template<class Class, class Return, class ...Args>
struct unbind_member_function<Return(Class::*)(Args...)> {
	using type = Return(*)(Class&, Args...);
	template <Return(Class::*Function)(Args...)>
	static inline auto invoke(Class& instance, Args... args) -> Return {
		return (instance.*Function)(args...);
	}
};

// Callbacks that return `void` will return this instead which lets us pass it as an argument
struct VoidReturn {};
inline auto HandleCastImpl(VoidReturn /*value*/, HandleCastArguments arguments, HandleCastTag<v8::Local<v8::Value>> /*tag*/) {
	return v8::Undefined(arguments.isolate);
}

// Returns a `VoidReturn{}` from void functions, which is later converted to `undefined`. This
// is needed because the return value from any function needs to be used as a parameter to
// another function.
template <class Function>
inline auto InvokeWithoutVoid(
	Function function,
	typename std::enable_if<std::is_same<void, decltype(function())>::value>::type* /*conditional*/ = nullptr
) {
	function();
	return VoidReturn{};
}

template <class Function>
inline decltype(auto) InvokeWithoutVoid(
	Function function,
	typename std::enable_if<!std::is_same<void, decltype(function())>::value>::type* /*conditional*/ = nullptr
) {
	return function();
}

// The return value of C++ callbacks are run through this to forward the value to v8
template <class Type>
inline void Returner(Type return_value, const v8::FunctionCallbackInfo<v8::Value>& info) {
	info.GetReturnValue().Set(HandleCast<v8::Local<v8::Value>>(return_value, info));
}

template <class Type>
inline void Returner(Type return_value, v8::Local<v8::Name> /*name*/, const v8::PropertyCallbackInfo<v8::Value>& info) {
	info.GetReturnValue().Set(HandleCast<v8::Local<v8::Value>>(return_value, info));
}

inline void Returner(
	VoidReturn /*return_value*/,
	v8::Local<v8::Name> /*name*/,
	v8::Local<v8::Value> /*value*/,
	const v8::PropertyCallbackInfo<void>& /*info*/
) {}

// This the main entry point for all parameterized v8 callbacks
template <class Signature, Signature Function, int Offset, class ...Args>
struct CallbackMaker {
	// This is responsible for unpacking the arguments from the C++ function, invoking the param
	// extracter on the v8 info descriptors, and passing the results to the C++ function
	template <size_t ...Indices>
	static inline void Spread(Args... args, std::index_sequence<Indices...> /*indices*/) {
		using FnArgs = typename extract_arguments<Signature>::arguments;
		return Returner(InvokeWithoutVoid([&]() {
			// ParamExtractor is implemented as a struct which holds the arguments because earlier
			// versions of gcc segfault on nested template packs
			ParamExtractor<Offset, Args...> extractor{args...};
			// try/catch is here instead of in ParamExtractor to avoid having to set up / tear down stack
			// guard once per parameter
			try {
				extractor.CheckLength(static_cast<FnArgs*>(nullptr));
				return Function(extractor.template Invoke<Indices, std::tuple_element_t<Indices, FnArgs>>()...);
			} catch (const ParamIncorrect& ex) {
				extractor.Caught(ex);
			}
		}), args...);
	}

	// Passed directly to v8
	static void Callback(Args... args) {
		RunBarrier([&]() {
			Spread(args..., extract_arguments<Signature>::index_sequence);
		});
	}
};

template <int Offset, class ...Args>
struct CallbackMaker<std::nullptr_t, nullptr, Offset, Args...> {
	static constexpr std::nullptr_t Callback = nullptr;
};

// Base type for all native callback pointers
template <class Type, class... Args>
struct GenericCallback {
	constexpr explicit GenericCallback(Type callback) : callback{callback} {}
	const Type callback;

	template <int Offset, class Signature, Signature Function>
	static constexpr auto ToCallback() -> Type {
		return CallbackMaker<Signature, Function, Offset, Args...>::Callback;
	}
};

// Any callbacks in the form of `void callback(const v8::FunctionCallbackInfo<v8::Value>&)`
struct FunctionCallbackImpl : GenericCallback<v8::FunctionCallback,
		const v8::FunctionCallbackInfo<v8::Value>&> {
	constexpr FunctionCallbackImpl(std::nullptr_t /*nullptr*/) : GenericCallback{nullptr}, length{0} {} // NOLINT(hicpp-explicit-conversions)
	constexpr FunctionCallbackImpl(v8::FunctionCallback callback, int length) :
		GenericCallback{callback}, length{length} {}
	const int length;
};

// Functions meant to be called without a `this` parameter
struct FreeFunctionHolder : FunctionCallbackImpl {
	using FunctionCallbackImpl::FunctionCallbackImpl;
};

// Functions where `this` is castable into a native pointer
struct MemberFunctionHolder : FunctionCallbackImpl {
	using FunctionCallbackImpl::FunctionCallbackImpl;
};

// Member getters and setters
struct MemberGetterHolder : FunctionCallbackImpl {
	using FunctionCallbackImpl::FunctionCallbackImpl;
};

struct MemberSetterHolder : FunctionCallbackImpl {
	using FunctionCallbackImpl::FunctionCallbackImpl;
};

struct MemberAccessorHolder {
	constexpr MemberAccessorHolder(MemberGetterHolder getter, MemberSetterHolder setter) : getter{getter}, setter{setter} {}
	const MemberGetterHolder getter;
	const MemberSetterHolder setter;
};

// Static getters and setters
struct StaticGetterHolder : FreeFunctionHolder {
	using FreeFunctionHolder::FreeFunctionHolder;
};

struct StaticSetterHolder : FreeFunctionHolder {
	using FreeFunctionHolder::FreeFunctionHolder;
};

struct StaticAccessorHolder {
	constexpr StaticAccessorHolder(StaticGetterHolder getter, StaticSetterHolder setter) : getter{getter}, setter{setter} {}
	const StaticGetterHolder getter;
	const StaticSetterHolder setter;
};

} // namespace detail

// Public interfaces for implementation classes are kept separate to ensure there is a common
// interface for all instances of this template. For example it's easier to accept
// `detail::FreeFunctionHolder` as parameter vs `FreeFunction<..., ...>`.
template <class Signature, Signature Function>
struct FreeFunction : detail::FreeFunctionHolder {
	using FreeFunctionHolder::FreeFunctionHolder;
	constexpr FreeFunction() : FreeFunctionHolder{
		ToCallback<0, Signature, Function>(),
		std::tuple_size<typename detail::extract_arguments<Signature>::arguments>::value
	} {}
};

template <class Signature, Signature Function>
struct MemberFunction : detail::MemberFunctionHolder {
	using MemberFunctionHolder::MemberFunctionHolder;
	constexpr MemberFunction() : MemberFunctionHolder{
		ToCallback<-1, typename Unbound::type, Unbound::template invoke<Function>>(),
		std::tuple_size<typename detail::extract_arguments<Signature>::arguments>::value
	} {}

	private:
		using Unbound = detail::unbind_member_function<Signature>;
};

template <class Signature, Signature Function>
struct FreeFunctionWithData : detail::FreeFunctionHolder {
	using FreeFunctionHolder::FreeFunctionHolder;
	constexpr FreeFunctionWithData() : FreeFunctionHolder{
		ToCallback<-2, Signature, Function>(),
		std::tuple_size<typename detail::extract_arguments<Signature>::arguments>::value
	} {}
};

template <
	class GetterSignature, GetterSignature Getter,
	class SetterSignature = std::nullptr_t, SetterSignature Setter = nullptr
>
struct MemberAccessor : detail::MemberAccessorHolder {
	constexpr MemberAccessor() : MemberAccessorHolder{
		detail::MemberGetterHolder{detail::MemberGetterHolder::ToCallback<-1, typename UnboundGetter::type, UnboundGetter::template invoke<Getter>>(), 0},
		detail::MemberSetterHolder{detail::MemberSetterHolder::ToCallback<-1, typename UnboundSetter::type, UnboundSetter::template invoke<Setter>>(), 1},
	} {}

	private:
		using UnboundGetter = detail::unbind_member_function<GetterSignature>;
		using UnboundSetter = detail::unbind_member_function<SetterSignature>;
};

// gcc seems to have trouble explicitly substituting std::nullptr_t into these templates so this one
// is partially specialized. Theoretically you could just remove this whole definition but I
// wouldn't try it.
template <class GetterSignature, GetterSignature Getter>
struct MemberAccessor<GetterSignature, Getter, std::nullptr_t, nullptr> : detail::MemberAccessorHolder {
	constexpr MemberAccessor() : MemberAccessorHolder{
		detail::MemberGetterHolder{detail::MemberGetterHolder::ToCallback<-1, typename UnboundGetter::type, UnboundGetter::template invoke<Getter>>(), 0},
		detail::MemberSetterHolder{nullptr},
	} {}

	private:
		using UnboundGetter = detail::unbind_member_function<GetterSignature>;
};

template <
	class GetterSignature, GetterSignature Getter,
	class SetterSignature = std::nullptr_t, SetterSignature Setter = nullptr
>
struct StaticAccessor : detail::StaticAccessorHolder {
	constexpr StaticAccessor() : StaticAccessorHolder{
		detail::StaticGetterHolder{detail::StaticGetterHolder::ToCallback<0, GetterSignature, Getter>(), 0},
		detail::StaticSetterHolder{detail::StaticSetterHolder::ToCallback<0, SetterSignature, Setter>(), 1}
	} {}
};

} // namespace ivm
