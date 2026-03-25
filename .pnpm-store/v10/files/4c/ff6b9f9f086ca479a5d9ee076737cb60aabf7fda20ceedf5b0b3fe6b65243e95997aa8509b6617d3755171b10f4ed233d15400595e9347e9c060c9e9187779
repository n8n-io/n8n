#pragma once
#ifdef _WIN32
#define ISOLATED_VM_MODULE extern "C" __declspec(dllexport)
#else
#define ISOLATED_VM_MODULE extern "C"
#endif

#include "isolate/environment.h"
#include "isolate/holder.h"
#include "isolate/remote_handle.h"
#include "isolate/runnable.h"
#include <memory>

namespace isolated_vm {
	using Runnable = ivm::Runnable;
	// ^ The only thing you need to know: `virtual void Run() = 0`

	class IsolateHolder {
		private:
			std::shared_ptr<ivm::IsolateHolder> holder;
			explicit IsolateHolder(std::shared_ptr<ivm::IsolateHolder> holder) : holder{std::move(holder)} {
				ivm::LockedScheduler::IncrementUvRefForIsolate(holder);
			}

		public:
			IsolateHolder(const IsolateHolder& that) : holder{that.holder} {
				ivm::LockedScheduler::IncrementUvRefForIsolate(holder);
			}

			IsolateHolder(IsolateHolder&& that) noexcept : holder{std::move(that.holder)} {
			}

			~IsolateHolder() {
				if (holder) {
					ivm::LockedScheduler::DecrementUvRefForIsolate(holder);
				}
			}

			auto operator=(const IsolateHolder&) -> IsolateHolder& = default;
			auto operator=(IsolateHolder&&) -> IsolateHolder& = default;

			static auto GetCurrent() -> IsolateHolder {
				return IsolateHolder{ivm::IsolateEnvironment::GetCurrentHolder()};
			}

			void ScheduleTask(std::unique_ptr<Runnable> runnable) {
				holder->ScheduleTask(std::move(runnable), false, true, false);
			}

			void Release() {
				holder.reset();
			}
	};

	template <typename T>
	class RemoteHandle {
		private:
			std::shared_ptr<ivm::RemoteHandle<T>> handle;

		public:
			explicit RemoteHandle(v8::Local<T> handle) : handle(std::make_shared<ivm::RemoteHandle<T>>(handle)) {}

			auto operator*() const {
				return handle->Deref();
			}

			void Release() {
				handle.reset();
			}
	};
} // namespace isolated_vm
