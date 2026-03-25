#pragma once
#include "environment.h"
#include "util.h"
#include <v8.h>
#include <memory>
#include <utility>

namespace ivm {
namespace detail {

template <class Type>
class ExternalHolder {
	public:
		ExternalHolder(const ExternalHolder&) = delete;
		~ExternalHolder() = default;
		auto operator=(const ExternalHolder&) = delete;

		template <class ...Args>
		static auto New(Args&&... args) {
			// Allocate heap memory for ExternalHolder (don't construct)
			ExternalHolder* that = std::allocator<ExternalHolder>{}.allocate(1);
			// Create a new v8::External referencing the unconstructed holder
			auto external = v8::External::New(v8::Isolate::GetCurrent(), &that->data);
			// Construct the holder in-place
			new(that) ExternalHolder(external, std::forward<Args>(args)...);
			// Setup weak callbacks (technically could throw)
			that->handle.SetWeak(reinterpret_cast<void*>(that), WeakCallbackV8, v8::WeakCallbackType::kParameter);
			IsolateEnvironment::GetCurrent().AddWeakCallback(&that->handle, WeakCallback, that);
			// Return local external handle
			return external;
		}

	private:
		template <class ...Args>
		explicit ExternalHolder(v8::Local<v8::External> handle, Args&&... args) :
			handle{v8::Isolate::GetCurrent(), handle}, data{std::forward<Args>(args)...} {}

		static void WeakCallback(void* param) {
			auto* that = static_cast<ExternalHolder*>(param);
			auto& isolate = IsolateEnvironment::GetCurrent();
			isolate.RemoveWeakCallback(&that->handle);
			that->handle.Reset();
			delete that;
		}

		static void WeakCallbackV8(const v8::WeakCallbackInfo<void>& info) {
			WeakCallback(info.GetParameter());
		}

		v8::Persistent<v8::Value> handle;
		Type data;
};

} // namespace detail

/**
 * Returns a v8::External with attached handle deletion
 */
template <class Type, class ...Args>
auto MakeExternal(Args&&... args) {
	return detail::ExternalHolder<Type>::New(std::forward<Args>(args)...);
}

}
