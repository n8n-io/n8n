#pragma once
#include "holder.h"
#include <v8.h>
#include <memory>
#include <tuple>
#include <utility>

namespace ivm {
void AdjustRemotes(int delta);

namespace detail {

/**
 * This is basically a tuple that can be constructed in place in a way that v8::Persistent<> will
 * accept.
 */
template <size_t Index, class Type>
struct HandleTupleElement {
	HandleTupleElement(v8::Isolate* isolate, v8::Local<Type> local) : persistent{isolate, local} {}
	v8::Persistent<Type> persistent;
};

template <class Indices, class ...Types>
struct HandleTupleImpl;

template <size_t ...Indices, class ...Types_>
struct HandleTupleImpl<std::index_sequence<Indices...>, Types_...> : HandleTupleElement<Indices, Types_>... {
	template <class ...Args>
	explicit HandleTupleImpl(v8::Isolate* isolate, v8::Local<Types_>... locals) :
		HandleTupleElement<Indices, Types_>{isolate, locals}... {
	}

	template <size_t Index>
	auto get() -> auto& {
		return HandleTupleElement<Index, std::tuple_element_t<Index, std::tuple<Types_...>>>::persistent;
	}

	static constexpr auto Size = sizeof...(Types_);
	using Types = std::tuple<Types_...>;
};

template <class... Types>
using HandleTuple = HandleTupleImpl<std::make_index_sequence<sizeof...(Types)>, Types...>;

} // namespace detail

/**
 * This holds a number of persistent handles to some values in a single isolate. It also holds a
 * handle to the isolate. When the destructor of this class is called it will run `Reset()` on each
 * handle in the context of the isolate. If the destructor of this class is called after the isolate
 * has been disposed then Reset() will not be called (but I don't think that causes a memory leak).
 */

template <class ...Types>
class RemoteTuple {
	public:
		RemoteTuple() = default;

		template <class Disposer>
		explicit RemoteTuple(v8::Local<Types>... handles, Disposer disposer) :
			isolate{IsolateHolder::GetCurrent()},
			handles{
				new TupleType{v8::Isolate::GetCurrent(), handles...},
				RemoteHandleFree<Disposer>{IsolateHolder::GetCurrent(), std::move(disposer)}
			} {
			AdjustRemotes(sizeof...(Types));
			static_assert(!v8::NonCopyablePersistentTraits<v8::Value>::kResetInDestructor, "Do not reset in destructor");
		}

		explicit RemoteTuple(v8::Local<Types>... handles) : RemoteTuple{handles..., DefaultDisposer{}} {}

		operator bool() const { // NOLINT(hicpp-explicit-conversions)
			return static_cast<bool>(handles);
		}

		auto GetIsolateHolder() -> IsolateHolder* {
			return isolate.get();
		}

		auto GetSharedIsolateHolder() -> std::shared_ptr<IsolateHolder> {
			return isolate;
		}

		template <size_t N>
		auto Deref() const {
			using Type = std::tuple_element_t<N, std::tuple<Types...>>;
			return v8::Local<Type>::New(v8::Isolate::GetCurrent(), handles->template get<N>());
		}

	private:
		using TupleType = detail::HandleTuple<Types...>;

		struct DefaultDisposer {
			template <class Type, class ...Rest>
			void operator()(v8::Persistent<Type>& value, Rest&&... rest) const {
				value.Reset();
				(*this)(std::forward<Rest>(rest)...);
			}

			void operator()() const {}
		};

		template <class Disposer>
		class RemoteHandleFree {
			public:
				RemoteHandleFree(std::shared_ptr<IsolateHolder> isolate, Disposer disposer) :
					isolate{std::move(isolate)}, disposer{std::move(disposer)} {}

				void operator()(TupleType* handles) {
					isolate->ScheduleTask(std::make_unique<DisposalTask<Disposer>>(handles, std::move(disposer)), true, false, true);
				}

			private:
				std::shared_ptr<IsolateHolder> isolate;
				Disposer disposer;
		};

		template <class Disposer>
		class DisposalTask : public Runnable {
			public:
				explicit DisposalTask(TupleType* handles, Disposer disposer) :
					handles{handles}, disposer{std::move(disposer)} {}

			private:
				template <size_t ...Indices>
				void Apply(std::index_sequence<Indices...> /*unused*/) {
					disposer(handles->template get<Indices>()...);
				}

				void Run() final {
					Apply(std::make_index_sequence<TupleType::Size>{});
					AdjustRemotes(-static_cast<int>(TupleType::Size));
				}

				std::unique_ptr<TupleType> handles;
				Disposer disposer;
		};

		std::shared_ptr<IsolateHolder> isolate;
		std::shared_ptr<TupleType> handles;
};

/**
 * Convenient when you only need 1 handle
 */
template <class Type>
class RemoteHandle {
	public:
		RemoteHandle() = default;
		explicit RemoteHandle(v8::Local<Type> handle) : handle{handle} {}

		template <class Disposer>
		RemoteHandle(v8::Local<Type> handle, Disposer disposer) : handle{handle, std::move(disposer)} {}

		operator bool() const { return bool{handle}; } // NOLINT(hicpp-explicit-conversions)
		auto Deref() const { return handle.template Deref<0>(); }
		auto GetIsolateHolder() { return handle.GetIsolateHolder(); }
		auto GetSharedIsolateHolder() { return handle.GetSharedIsolateHolder(); }

	private:
		RemoteTuple<Type> handle;
};

} // namespace ivm
