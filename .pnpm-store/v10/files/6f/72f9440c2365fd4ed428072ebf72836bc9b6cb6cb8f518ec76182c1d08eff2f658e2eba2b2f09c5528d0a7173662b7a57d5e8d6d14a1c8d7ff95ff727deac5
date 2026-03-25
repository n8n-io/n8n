#pragma once
#include "environment.h"
#include "inspector.h"
#include "runnable.h"
#include "stack_trace.h"
#include "lib/suspend.h"
#include "lib/timer.h"
#include <chrono>
#include <memory>
#include <thread>

namespace ivm {

/**
 * Grabs a stack trace of the runaway script
 */
class TimeoutRunner final : public Runnable {
	public:
		struct State {
			std::condition_variable cv;
			std::mutex mutex;
			std::string stack_trace;
			bool did_finish = false;
			bool did_release = false;
			bool did_terminate = false;
			bool did_timeout = false;
		};

		explicit TimeoutRunner(State& state) : state{state} {}
		TimeoutRunner(const TimeoutRunner&) = delete;
		auto operator=(const TimeoutRunner&) -> TimeoutRunner& = delete;

		~TimeoutRunner() final {
			std::lock_guard<std::mutex> lock{state.mutex};
			state.did_release = true;
			state.cv.notify_all();
		}

		void Run() final {
			bool will_terminate = [&]() {
				std::lock_guard<std::mutex> lock{state.mutex};
				if (state.did_finish) {
					return false;
				} else {
					state.did_terminate = true;
					return true;
				}
			}();
			if (will_terminate) {
				auto& env = IsolateEnvironment::GetCurrent();
				auto* isolate = env.GetIsolate();
				state.stack_trace = StackTraceHolder::RenderSingleStack(v8::StackTrace::CurrentStackTrace(isolate, 10));
				isolate->TerminateExecution();
				++env.terminate_depth;
			}
		}

	private:
		State& state;
};

/**
 * Run some v8 thing with a timeout. Also throws error if memory limit is hit.
 */
template <typename F>
auto RunWithTimeout(uint32_t timeout_ms, F&& fn) -> v8::Local<v8::Value> {
	IsolateEnvironment& isolate = IsolateEnvironment::GetCurrent();
	thread_suspend_handle thread_suspend{};
	bool is_default_thread = Executor::IsDefaultThread();
	bool did_terminate = false;
	TimeoutRunner::State state;
	v8::MaybeLocal<v8::Value> result;
	{
		std::unique_ptr<timer_t> timer_ptr;
		if (timeout_ms != 0) {
			timer_ptr = std::make_unique<timer_t>(timeout_ms, &isolate.timer_holder, [&](void* next) {
				auto deadline = std::chrono::steady_clock::now() + std::chrono::seconds{5};

				{
					std::lock_guard<std::mutex> lock{state.mutex};
					if (state.did_finish) {
						// Timer triggered as the function was finishing, bail early
						timer_t::chain(next);
						return;
					}
					// Set up interrupt
					state.did_timeout = true;
					auto timeout_runner = std::make_unique<TimeoutRunner>(state);
					if (is_default_thread) {
						// In this case this is a pure sync function. We should not cancel any async waits.
						auto lock = isolate.scheduler->Lock();
						lock->sync_interrupts.push(std::move(timeout_runner));
						lock->InterruptSyncIsolate();
					} else {
						{
							auto lock = isolate.scheduler->Lock();
							lock->CancelAsync();
							lock->interrupts.push(std::move(timeout_runner));
							lock->InterruptIsolate();
						}
					}
				}
				timer_t::chain(next);

				// Wait for TimeoutRunner release (either it ran, or was cancelled)
				{
					std::unique_lock<std::mutex> lock{state.mutex};
					if (isolate.error_handler) {
						if (!state.cv.wait_until(lock, deadline, [&] { return state.did_release || state.did_finish; })) {
							assert(RaiseCatastrophicError(isolate.error_handler, "Script failed to terminate"));
							thread_suspend.suspend();
							return;
						}
					} else {
						state.cv.wait(lock, [&] { return state.did_release || state.did_finish; });
					}
					if (state.did_finish) {
						return;
					}
				}

				// Wait for `fn()` to return
				while (true) {
					std::lock_guard<std::mutex> lock{state.mutex};
					if (state.did_finish) {
						return;
					} else if (isolate.error_handler && deadline < std::chrono::steady_clock::now()) {
						assert(RaiseCatastrophicError(isolate.error_handler, "Script failed to terminate"));
						thread_suspend.suspend();
						return;
					}
					// Aggressively terminate the isolate because sometimes v8 just doesn't get the hint
					isolate->TerminateExecution();
				}
			});
		}

		if (!isolate.terminated) {
			result = fn();
		}
		bool will_flush_tasks = false;
		{
			std::lock_guard<std::mutex> lock{state.mutex};
			did_terminate = state.did_terminate;
			will_flush_tasks = state.did_timeout && !state.did_release;
			state.did_finish = true;
		}
		if (will_flush_tasks) {
			// TimeoutRunner was added to interupts after v8 yielded control. In this case we flush
			// interrupt tasks manually
			if (is_default_thread) {
				isolate.InterruptEntrySync();
			} else {
				isolate.InterruptEntryAsync();
			}
		}
	}
	if (isolate.DidHitMemoryLimit()) {
		throw FatalRuntimeError("Isolate was disposed during execution due to memory limit");
	} else if (isolate.terminated) {
		throw FatalRuntimeError("Isolate was disposed during execution");
	} else if (did_terminate) {
		if (--isolate.terminate_depth == 0) {
			isolate->CancelTerminateExecution();
		}
		throw RuntimeGenericError("Script execution timed out.", std::move(state.stack_trace));
	}
	return Unmaybe(result);
}

} // namespace ivm
