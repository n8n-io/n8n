#pragma once
#include "platform_delegate.h"
#include "runnable.h"
#include "lib/lockable.h"
#include "lib/thread_pool.h"
#include <uv.h>
#include <atomic>
#include <condition_variable>
#include <memory>
#include <mutex>
#include <queue>

namespace ivm {
class IsolateEnvironment;
class IsolateHolder;

// gcc 5's std::queue implementation has an explicit default ctor so std::exchange(..., {})
// doesn't work. This changed in C++11 and I guess they're behind.
template <class Type>
auto ExchangeDefault(Type& container) {
	return std::exchange(container, Type{});
}

/**
 * Keeps track of tasks an isolate needs to run and manages its run state (running or waiting).
 * This does all the interaction with libuv async and the thread pool.
 */
class UvScheduler;
class Scheduler {
	friend IsolateEnvironment;
	friend class LockedScheduler;
	private:
		using TaskQueue = std::queue<std::unique_ptr<Runnable>>;

	public:
		explicit Scheduler(IsolateEnvironment& env) : env{env} {}
		Scheduler(const Scheduler&) = delete;
		~Scheduler() = default;
		auto operator=(const Scheduler&) = delete;

		// Request cancellation of current async task
		void CancelAsync();
		// Called after AsyncEntry finishes
		void DoneRunning();
		// Request an interrupt in this isolate. `status` must == Running to invoke this.
		void InterruptIsolate();
		// Interrupts an isolate running in the default thread
		void InterruptSyncIsolate();
		// Returns true if a wake was scheduled, false if the isolate is already running.
		auto WakeIsolate(std::shared_ptr<IsolateEnvironment> isolate_ptr) -> bool;

		// Scheduler::AsyncWait will pause the current thread until woken up by another thread
		class AsyncWait {
			public:
				enum State { pending, finished, canceled };

				// This is templated so we can cast to the protected base class here instead of at the call
				// site
				template <class Type>
				explicit AsyncWait(Type& scheduler) :
						scheduler{scheduler} {
					auto lock = scheduler.Lock();
					assert(lock->async_wait == nullptr);
					lock->async_wait = this;
				}
				AsyncWait(const AsyncWait&) = delete;
				~AsyncWait();
				auto operator=(const AsyncWait&) = delete;

				void Cancel();
				void Done();
				auto Wait() const -> State;

				class LockedScheduler& scheduler;
				lockable_t<State, false, true> state{pending};
		};

		// Task queues
		TaskQueue tasks;
		TaskQueue handle_tasks;
		TaskQueue interrupts;
		TaskQueue sync_interrupts;

	protected:
		mutable std::mutex mutex;
		mutable std::condition_variable cv;
		std::shared_ptr<IsolateEnvironment> env_ref;
		IsolateEnvironment& env;

	private:
		virtual void IncrementUvRef() = 0;
		virtual void DecrementUvRef() = 0;
		virtual void SendWake() = 0;

		enum class Status { Waiting, Running };
		AsyncWait* async_wait = nullptr;
		Status status = Status::Waiting;
};

class LockedScheduler : protected Scheduler, public node::IsolatePlatformDelegate {
	friend Scheduler::AsyncWait;
	public:
		using Scheduler::Scheduler;

		// Locks the scheduler and return a lock with access to public interface
		auto Lock() {
			// TODO: Would be nice to find a way to roll this into the lockable abstraction
			class Lock {
				public:
					auto operator*() -> auto& { return scheduler; }
					auto operator->() { return &scheduler; }

					explicit Lock(Scheduler& scheduler, std::mutex& mutex) :
						lock{mutex},
						scheduler{scheduler} {}

				private:
					std::unique_lock<std::mutex> lock;
					Scheduler& scheduler;
			};
			return Lock{*this, mutex};
		}

		// IsolatePlatformDelegate overrides
		auto GetForegroundTaskRunner() -> std::shared_ptr<v8::TaskRunner> final;
		auto IdleTasksEnabled() -> bool final { return false; }

		// Used to ref/unref the uv handle from C++ API
		static void DecrementUvRefForIsolate(const std::shared_ptr<IsolateHolder>& holder);
		static void IncrementUvRefForIsolate(const std::shared_ptr<IsolateHolder>& holder);
};

class IsolatedScheduler final : public LockedScheduler {
	public:
		explicit IsolatedScheduler(IsolateEnvironment& env, UvScheduler& default_scheduler);

	private:
		void DecrementUvRef() override;
		void IncrementUvRef() override;
		void SendWake() override;

		thread_pool_t::affinity_t thread_affinity;
		UvScheduler& default_scheduler;
};

class UvScheduler final : public LockedScheduler {
	friend IsolatedScheduler;
	friend Scheduler;
	public:
		explicit UvScheduler(IsolateEnvironment& env);
		UvScheduler(const UvScheduler&) = delete;
		~UvScheduler();
		auto operator=(const UvScheduler&) = delete;

	private:
		void DecrementUvRef() override;
		void IncrementUvRef() override;
		void SendWake() override;

		uv_loop_t* loop = nullptr;
		uv_async_t* uv_async = nullptr;
		std::atomic<int> uv_ref_count{0};
};

} // namespace ivm
