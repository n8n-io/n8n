#pragma once
#include <v8.h>
#include <atomic>

namespace ivm {
namespace detail {
	extern std::atomic<size_t> IsolateSpecificSize;
}

/**
 * Like thread_local data, but specific to an Isolate instead.
 */
template <class Type>
class IsolateSpecific {
	template <class>
	friend class IsolateSpecific;

	public:
		IsolateSpecific() = default;

		template <class Functor>
		auto Deref(Functor callback) -> v8::Local<Type>;

	private:
		size_t key{detail::IsolateSpecificSize++};
		union HandleConvert {
			explicit HandleConvert(v8::Local<v8::Data> data) : data{data} {}
			v8::Local<v8::Data> data;
			v8::Local<Type> value;
		};
};

} // namespace ivm

#include "environment.h"
