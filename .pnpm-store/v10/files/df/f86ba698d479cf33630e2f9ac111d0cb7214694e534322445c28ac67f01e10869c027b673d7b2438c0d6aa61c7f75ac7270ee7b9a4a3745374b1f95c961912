#pragma once
#include "platform_delegate.h"
#include "runnable.h"
#include "v8_version.h"
#include "lib/lockable.h"
#include <v8-platform.h>
#include <condition_variable>
#include <mutex>
#include <memory>

namespace ivm {

class IsolateEnvironment;

class IsolateDisposeWait {
	public:
		void IsolateDidDispose();
		void Join();

	private:
		lockable_t<bool, false, true> is_disposed{false};
};

class IsolateHolder {
	friend IsolateEnvironment;

	public:
		explicit IsolateHolder(std::shared_ptr<IsolateEnvironment> isolate) :
			isolate{std::move(isolate)} {}
		IsolateHolder(const IsolateHolder&) = delete;
		~IsolateHolder() = default;
		auto operator=(const IsolateHolder&) = delete;

		static auto GetCurrent() -> std::shared_ptr<IsolateHolder>;

		auto Dispose() -> bool;
		void Release();
		auto GetIsolate() -> std::shared_ptr<IsolateEnvironment>;
		void ScheduleTask(std::unique_ptr<Runnable> task, bool run_inline, bool wake_isolate, bool handle_task = false);

	private:
		lockable_t<std::shared_ptr<IsolateEnvironment>> isolate;
};

// This needs to be separate from IsolateHolder because v8 holds references to this indefinitely and
// we don't want it keeping the isolate alive.
class IsolateTaskRunner final : public TaskRunner {
	public:
		explicit IsolateTaskRunner(const std::shared_ptr<IsolateEnvironment>& isolate) : weak_env{isolate} {}
		IsolateTaskRunner(const IsolateTaskRunner&) = delete;
		~IsolateTaskRunner() final = default;
		auto operator=(const IsolateTaskRunner&) = delete;

		// Methods for v8::TaskRunner
		void PostTaskImpl(std::unique_ptr<v8::Task> task, const v8::SourceLocation& /*location*/) final;
		void PostDelayedTaskImpl(std::unique_ptr<v8::Task> task, double delay_in_seconds, const v8::SourceLocation& /*location*/) final;
		void PostNonNestableTaskImpl(std::unique_ptr<v8::Task> task, const v8::SourceLocation& location) final {
#if V8_AT_LEAST(13, 3, 241)
			PostTask(std::move(task), location);
#else
			PostTask(std::move(task));
#endif
		}

	private:
		std::weak_ptr<IsolateEnvironment> weak_env;
};

} // namespace ivm
