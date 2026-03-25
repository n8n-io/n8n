#pragma once
#include "node_wrapper.h"
#include "environment.h"
#include "holder.h"
#include "functor_runners.h"
#include "remote_handle.h"
#include "stack_trace.h"
#include "util.h"
#include <memory>

namespace ivm {

/**
 * Most operations in this library can be decomposed into three phases.
 *
 * - Phase 1 [Isolate 1]: copy data out of current isolate
 * - Phase 2 [Isolate 2]: copy data into new isolate, run work, copy data out of isolate
 * - Phase 3 [Isolate 1]: copy results from phase 2 into the original isolate
 *
 * This class handles the locking and thread synchronization for either synchronous or
 * asynchronous functions. That way the same code can be used for both versions of each function.
 *
 * These runners are invoked via: ThreePhaseTask::Run<async, T>(isolate, args...);
 *
 * Where:
 *   async = 0 -- Synchronous execution
 *   async = 1 -- Asynchronous execution, promise returned
 *   async = 2 -- Asynchronous execution, result ignored (Phase3() is never called)
 *   async = 4 -- Synchronous + asyncronous, original thread waits for async Phase2()
 */
class ThreePhaseTask {
	private:
		/**
		 * Contains references back to the original isolate which will be used after phase 2 to wake the
		 * isolate up and begin phase 3
		 */
		struct CalleeInfo {
			RemoteTuple<v8::Promise::Resolver, v8::Context, v8::StackTrace> remotes;
			node::async_context async {0, 0};
			CalleeInfo(
				v8::Local<v8::Promise::Resolver> resolver,
				v8::Local<v8::Context> context,
				v8::Local<v8::StackTrace> stack_trace
			);
			CalleeInfo(const CalleeInfo&) = delete;
			CalleeInfo(CalleeInfo&& /*that*/) noexcept;
			auto operator= (const CalleeInfo&) = delete;
			auto operator= (CalleeInfo&&) = delete;
			~CalleeInfo();
		};

		/**
		 * Class which manages running async phase 2, then phase 3
		 */
		struct Phase2Runner final : public Runnable {
			std::unique_ptr<ThreePhaseTask> self;
			CalleeInfo info;
			bool did_run = false;

			Phase2Runner(
				std::unique_ptr<ThreePhaseTask> self,
				CalleeInfo info
			);
			Phase2Runner(const Phase2Runner&) = delete;
			auto operator= (const Phase2Runner&) -> Phase2Runner& = delete;
			~Phase2Runner() final;
			void Run() final;
		};

		/**
		 * Class which manages running async phase 2 in ignored mode (ie no phase 3)
		 */
		struct Phase2RunnerIgnored : public Runnable {
			std::unique_ptr<ThreePhaseTask> self;
			explicit Phase2RunnerIgnored(std::unique_ptr<ThreePhaseTask> self);
			void Run() final;
		};

		auto RunSync(IsolateHolder& second_isolate, bool allow_async) -> v8::Local<v8::Value>;

	public:
		ThreePhaseTask() = default;
		ThreePhaseTask(const ThreePhaseTask&) = delete;
		auto operator= (const ThreePhaseTask&) -> ThreePhaseTask& = delete;
		virtual ~ThreePhaseTask() = default;

		virtual void Phase2() = 0;
		virtual auto Phase2Async(Scheduler::AsyncWait& /*wait*/) -> bool {
			Phase2();
			return false;
		}

		virtual auto Phase3() -> v8::Local<v8::Value> = 0;

		template <int async, typename T, typename ...Args>
		static auto Run(IsolateHolder& second_isolate, Args&&... args) -> v8::Local<v8::Value> {

			if (async == 1) { // Full async, promise returned
				// Build a promise for outer isolate
				v8::Isolate* isolate = v8::Isolate::GetCurrent();
				auto context_local = isolate->GetCurrentContext();
				auto promise_local = Unmaybe(v8::Promise::Resolver::New(context_local));
				auto stack_trace = v8::StackTrace::CurrentStackTrace(isolate, 10);
				FunctorRunners::RunCatchValue([&]() {
					// Schedule Phase2 async
					second_isolate.ScheduleTask(
						std::make_unique<Phase2Runner>(
							std::make_unique<T>(std::forward<Args>(args)...), // <-- Phase1 / ctor called here
							CalleeInfo{promise_local, context_local, stack_trace}
						), false, true
					);
				}, [&](v8::Local<v8::Value> error) {
					// A C++ error was caught while running ctor (phase 1)
					if (error->IsObject()) {
						StackTraceHolder::AttachStack(error.As<v8::Object>(), stack_trace);
					}
					Unmaybe(promise_local->Reject(context_local, error));
				});
				return promise_local->GetPromise();
			} else if (async == 2) { // Async, promise ignored
				// Schedule Phase2 async
				second_isolate.ScheduleTask(
					std::make_unique<Phase2RunnerIgnored>(
						std::make_unique<T>(std::forward<Args>(args)...) // <-- Phase1 / ctor called here
					), false, true
				);
				return v8::Undefined(v8::Isolate::GetCurrent());
			} else {
				// Execute synchronously
				T self(std::forward<Args>(args)...);
				return self.RunSync(second_isolate, async == 4);
			}
		}
};

} // namespace ivm
