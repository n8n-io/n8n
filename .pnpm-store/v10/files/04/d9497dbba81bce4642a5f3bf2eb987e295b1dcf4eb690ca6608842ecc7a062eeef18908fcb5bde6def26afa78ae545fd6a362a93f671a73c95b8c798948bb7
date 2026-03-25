#include "three_phase_task.h"
#include "external_copy/external_copy.h"
#include <cstring>

using namespace v8;
using std::unique_ptr;

namespace ivm {

/**
 * CalleeInfo implementation
 */
ThreePhaseTask::CalleeInfo::CalleeInfo(
	Local<Promise::Resolver> resolver,
	Local<Context> context,
	Local<StackTrace> stack_trace
) : remotes(resolver, context, stack_trace) {
	auto& env = IsolateEnvironment::GetCurrent();
	if (env.IsDefault()) {
		async = node::EmitAsyncInit(env.GetIsolate(), resolver->GetPromise(), StringTable::Get().isolatedVm);
	}
}

ThreePhaseTask::CalleeInfo::CalleeInfo(CalleeInfo&& that) noexcept :
		remotes{std::move(that.remotes)}, async{std::exchange(that.async, {0, 0})} {}

ThreePhaseTask::CalleeInfo::~CalleeInfo() {
	auto& env = IsolateEnvironment::GetCurrent();
	node::async_context tmp{0, 0};
	if (env.IsDefault() && std::memcmp(&async, &tmp, sizeof(node::async_context)) != 0) {
		node::EmitAsyncDestroy(env.GetIsolate(), async);
	}
}

/**
 * Wrapper around node's version of the same class which does nothing if this isn't the node
 * isolate.
 *
 * nb: CallbackScope sets up a v8::TryCatch so if you need to catch an exception do this *before*
 * the v8::TryCatch.
 */
struct CallbackScope {
	unique_ptr<node::CallbackScope> scope;

	CallbackScope(node::async_context async, Local<Object> resource) {
		auto& env = IsolateEnvironment::GetCurrent();
		if (env.IsDefault()) {
			scope = std::make_unique<node::CallbackScope>(env.GetIsolate(), resource, async);
		}
	}
};

/**
 * Phase2Runner implementation
 */
ThreePhaseTask::Phase2Runner::Phase2Runner(
	unique_ptr<ThreePhaseTask> self,
	CalleeInfo info
) :
	self(std::move(self)),
	info(std::move(info))	{}

ThreePhaseTask::Phase2Runner::~Phase2Runner() {
	if (!did_run) {
		// The task never got to run
		struct Phase3Orphan : public Runnable {
			unique_ptr<ThreePhaseTask> self;
			CalleeInfo info;

			Phase3Orphan(
				unique_ptr<ThreePhaseTask> self,
				CalleeInfo info
			) :
				self(std::move(self)),
				info(std::move(info)) {}

			void Run() final {
				// Revive our persistent handles
				Isolate* isolate = Isolate::GetCurrent();
				auto context_local = info.remotes.Deref<1>();
				Context::Scope context_scope(context_local);
				auto promise_local = info.remotes.Deref<0>();
				CallbackScope callback_scope(info.async, promise_local);
				// Throw from promise
				Local<Object> error = Exception::Error(StringTable::Get().isolateIsDisposed).As<Object>();
				StackTraceHolder::AttachStack(error, info.remotes.Deref<2>());
				Unmaybe(promise_local->Reject(context_local, error));
				isolate->PerformMicrotaskCheckpoint();
			}
		};
		// Schedule a throw task back in first isolate
		auto* holder = info.remotes.GetIsolateHolder();
		holder->ScheduleTask(
			std::make_unique<Phase3Orphan>(
				std::move(self),
				std::move(info)
			), false, true
		);
	}
}

void ThreePhaseTask::Phase2Runner::Run() {

	// This class will be used if Phase2() throws an error
	struct Phase3Failure : public Runnable {
		unique_ptr<ThreePhaseTask> self;
		CalleeInfo info;
		unique_ptr<ExternalCopy> error;

		Phase3Failure(
			unique_ptr<ThreePhaseTask> self,
			CalleeInfo info,
			unique_ptr<ExternalCopy> error
		) :
			self(std::move(self)),
			info(std::move(info)),
			error(std::move(error)) {}

		void Run() final {
			// Revive our persistent handles
			Isolate* isolate = Isolate::GetCurrent();
			auto context_local = info.remotes.Deref<1>();
			Context::Scope context_scope(context_local);
			auto promise_local = info.remotes.Deref<0>();
			CallbackScope callback_scope(info.async, promise_local);
			Local<Value> rejection;
			if (error) {
				rejection = error->CopyInto();
			} else {
				rejection = Exception::Error(v8_string("An exception was thrown. Sorry I don't know more."));
			}
			if (rejection->IsObject()) {
				StackTraceHolder::ChainStack(rejection.As<Object>(), info.remotes.Deref<2>());
			}
			// If Reject fails then I think that's bad..
			Unmaybe(promise_local->Reject(context_local, rejection));
				isolate->PerformMicrotaskCheckpoint();
		}
	};

	// This is called if Phase2() does not throw
	struct Phase3Success : public Runnable {
		unique_ptr<ThreePhaseTask> self;
		CalleeInfo info;

		Phase3Success(
			unique_ptr<ThreePhaseTask> self,
			CalleeInfo info
		) :
			self(std::move(self)),
			info(std::move(info)) {}

		void Run() final {
			Isolate* isolate = Isolate::GetCurrent();
			auto context_local = info.remotes.Deref<1>();
			Context::Scope context_scope(context_local);
			auto promise_local = info.remotes.Deref<0>();
			CallbackScope callback_scope(info.async, promise_local);
			FunctorRunners::RunCatchValue([&]() {
				// Final callback
				Unmaybe(promise_local->Resolve(context_local, self->Phase3()));
			}, [&](Local<Value> error) {
				// Error was thrown
				if (error->IsObject()) {
					StackTraceHolder::AttachStack(error.As<Object>(), info.remotes.Deref<2>());
				}
				Unmaybe(promise_local->Reject(context_local, error));
			});
			isolate->PerformMicrotaskCheckpoint();
		}
	};

	did_run = true;
	auto schedule_error = [&](std::unique_ptr<ExternalCopy> error) {
		// Schedule a task to enter the first isolate so we can throw the error at the promise
		auto* holder = info.remotes.GetIsolateHolder();
		holder->ScheduleTask(std::make_unique<Phase3Failure>(std::move(self), std::move(info), std::move(error)), false, true);
	};
	FunctorRunners::RunCatchExternal(IsolateEnvironment::GetCurrent().DefaultContext(), [&]() {
		// Continue the task
		self->Phase2();
		auto epilogue_error = IsolateEnvironment::GetCurrent().TaskEpilogue();
		if (epilogue_error) {
			schedule_error(std::move(epilogue_error));
		} else {
			auto* holder = info.remotes.GetIsolateHolder();
			holder->ScheduleTask(std::make_unique<Phase3Success>(std::move(self), std::move(info)), false, true);
		}
	}, schedule_error);
}

/**
 * Phase2RunnerIgnored implementation
 */
ThreePhaseTask::Phase2RunnerIgnored::Phase2RunnerIgnored(unique_ptr<ThreePhaseTask> self) : self(std::move(self)) {}

void ThreePhaseTask::Phase2RunnerIgnored::Run() {
	TryCatch try_catch{Isolate::GetCurrent()};
	try {
		self->Phase2();
		IsolateEnvironment::GetCurrent().TaskEpilogue();
	} catch (const RuntimeError& cc_error) {}
}

/**
 * RunSync implementation
 */
auto ThreePhaseTask::RunSync(IsolateHolder& second_isolate, bool allow_async) -> Local<Value> {
	// Grab a reference to second isolate
	auto second_isolate_ref = second_isolate.GetIsolate();
	if (!second_isolate_ref) {
		throw RuntimeGenericError("Isolated is disposed");
	}
	if (second_isolate_ref->GetIsolate() == Isolate::GetCurrent()) {
		if (allow_async) {
			throw RuntimeGenericError("This function may not be called from the default thread");
		}
		// Shortcut when calling a sync method belonging to the currently entered isolate. This avoids
		// the deadlock protection below
		Phase2();
		second_isolate_ref->CheckMemoryPressure();

	} else {

		bool is_recursive = Locker::IsLocked(second_isolate_ref->GetIsolate());
		if (Executor::IsDefaultThread() || is_recursive) {
			if (allow_async) {
				throw RuntimeGenericError("This function may not be called from the default thread");
			}

			// Helper function which flushes handle tasks
			auto run_handle_tasks = [](IsolateEnvironment& env) {
				auto handle_tasks = [&]() {
					return ExchangeDefault(env.scheduler->Lock()->handle_tasks);
				}();
				if (handle_tasks.empty()) {
					return;
				}
				do {
					handle_tasks.front()->Run();
					handle_tasks.pop();
				} while (!handle_tasks.empty());
			};

			// This is the simple sync runner case
			unique_ptr<ExternalCopy> error;
			{
				Executor::Lock lock(*second_isolate_ref);

				// Run handle tasks first
				run_handle_tasks(*second_isolate_ref);

				// Now run the actual work
				FunctorRunners::RunCatchExternal(second_isolate_ref->DefaultContext(), [&]() {
					// Run Phase2 and externalize errors
					Phase2();
					if (!is_recursive) {
						error = second_isolate_ref->TaskEpilogue();
					}
				}, [&](unique_ptr<ExternalCopy> error_inner) {

					// We need to stash the error in the outer unique_ptr because the executor lock is still up
					error = std::move(error_inner);
				});
			}

			// Run handle tasks for default isolate now
			auto& current_env = IsolateEnvironment::GetCurrent();
			if (current_env.IsDefault()) {
				run_handle_tasks(current_env);
			}

			if (error) {
				// Throw to outer isolate
				Isolate* isolate = Isolate::GetCurrent();
				Local<Value> error_copy = error->CopyInto();
				if (error_copy->IsObject()) {
					StackTraceHolder::ChainStack(error_copy.As<Object>(), StackTrace::CurrentStackTrace(isolate, 10));
				}
				isolate->ThrowException(error_copy);
				throw RuntimeError();
			}

		} else if (second_isolate_ref->IsDefault()) {

			// In this case we asyncronously call the default thread and suspend this thread
			struct AsyncRunner final : public Runnable {
				bool allow_async = false;
				bool did_run = false;
				ThreePhaseTask& self;
				Scheduler::AsyncWait& wait;
				lockable_t<bool, false, true>& done;
				unique_ptr<ExternalCopy>& error;

				AsyncRunner(
					ThreePhaseTask& self,
					Scheduler::AsyncWait& wait,
					lockable_t<bool, false, true>& done,
					bool allow_async,
					unique_ptr<ExternalCopy>& error
				) : allow_async{allow_async}, self{self}, wait{wait}, done{done}, error{error} {}

				AsyncRunner(const AsyncRunner&) = delete;
				auto operator=(const AsyncRunner&) -> AsyncRunner& = delete;

				~AsyncRunner() final {
					if (!did_run) {
						error = std::make_unique<ExternalCopyError>(ExternalCopyError::ErrorType::Error, "Isolate is disposed");
					}
					// nb: The lock must be held while invoking `notify_one` since the condition variable will
					// be destroyed immediately following the wake.
					auto lock = done.write();
					*lock = true;
					done.notify_one();
				}

				void Run() final {
					did_run = true;
					FunctorRunners::RunCatchExternal(IsolateEnvironment::GetCurrent().DefaultContext(), [ this ]() {
						// Now in the default thread
						const auto is_async = [&]() {
							if (allow_async) {
								return self.Phase2Async(wait);
							} else {
								self.Phase2();
								return false;
							}
						}();
						if (!is_async) {
							wait.Done();
						}
						this->error = IsolateEnvironment::GetCurrent().TaskEpilogue();
					}, [ this ](unique_ptr<ExternalCopy> error) {
						this->error = std::move(error);
						wait.Done();
					});
				}
			};

			Isolate* isolate = Isolate::GetCurrent();
			unique_ptr<ExternalCopy> error;
			{
				// Setup condition variable to sleep this thread
				IsolateEnvironment& env = IsolateEnvironment::GetCurrent();
				Scheduler::AsyncWait wait(*env.scheduler);
				lockable_t<bool, false, true> done{false};
				// Scope to unlock v8 in this thread and set up the wait
				Executor::Unlock unlocker(env);
				// Run it and sleep
				second_isolate.ScheduleTask(std::make_unique<AsyncRunner>(*this, wait, done, allow_async, error), false, true);
				// Wait for AsyncRunner to finish
				auto lock = done.read<true>();
				while (!*lock) {
					lock.wait();
				}
				// Wait for `applySyncPromise` to finish
				if (wait.Wait() == Scheduler::AsyncWait::canceled) {
					throw RuntimeGenericError("Isolate is disposed");
				}
			}

			// At this point thread synchronization is done and Phase2() has finished
			if (error) {
				Local<Value> error_copy = error->CopyInto();
				if (error_copy->IsObject()) {
					StackTraceHolder::ChainStack(error_copy.As<Object>(), StackTrace::CurrentStackTrace(isolate, 10));
				}
				isolate->ThrowException(error_copy);
				throw RuntimeError();
			}

		} else {

			// ~ very specific error message ~
			throw RuntimeGenericError(
				"Calling a synchronous isolated-vm function on a non-default isolate from within an asynchronous isolated-vm function is not allowed."
			);
		}
	}

	// Final phase
	return Phase3();
}

} // namespace ivm
