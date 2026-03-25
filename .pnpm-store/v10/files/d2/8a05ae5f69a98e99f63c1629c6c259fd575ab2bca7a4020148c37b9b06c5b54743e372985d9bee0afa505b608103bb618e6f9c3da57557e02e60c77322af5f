#pragma once
#include <v8.h>
#include <chrono>
#include <mutex>
#include <thread>
#include "holder.h"
#include "v8-profiler.h"

namespace ivm {
class InspectorAgent;
class IsolateEnvironment;
class Scheduler;

/**
 * Executor class handles v8 locking while C++ code is running. Thread syncronization is handled
 * by v8::Locker. This also enters the isolate and sets up a handle scope.
 */
class Executor { // "En taro adun"
	friend InspectorAgent;
	friend IsolateEnvironment;
	public:
		explicit Executor(IsolateEnvironment& env);
		Executor(const Executor&) = delete;
		~Executor();
		auto operator= (const Executor&) = delete;

		static auto GetCurrentEnvironment() -> IsolateEnvironment*;
		static auto GetDefaultEnvironment() -> IsolateEnvironment&;
		static auto IsDefaultThread() -> bool;
		static auto MayRunInlineTasks(IsolateEnvironment& env) -> bool;

	private:
		class CpuTimer {
			public:
				explicit CpuTimer(Executor& executor);
				CpuTimer(const CpuTimer&) = delete;
				~CpuTimer();
				auto operator= (const CpuTimer&) = delete;

				using TimePoint = std::chrono::time_point<std::chrono::steady_clock, std::chrono::nanoseconds>;
				auto Delta(const std::lock_guard<std::mutex>& /*lock*/) const -> std::chrono::nanoseconds;
				void Pause();
				void Resume();
				static auto Now() -> TimePoint;

			private:
				Executor& executor;
				CpuTimer* last;
				TimePoint time;
#if USE_CLOCK_THREAD_CPUTIME_ID
				std::chrono::time_point<std::chrono::steady_clock> steady_time;
#endif
		};

		// WallTimer is also responsible for pausing the current CpuTimer before we attempt to
		// acquire the v8::Locker, because that could block in which case CPU shouldn't be counted.
		class WallTimer {
			public:
				explicit WallTimer(Executor& executor);
				WallTimer(const WallTimer&) = delete;
				~WallTimer();
				auto operator= (const WallTimer&) = delete;

				auto Delta(const std::lock_guard<std::mutex>& /*lock*/) const -> std::chrono::nanoseconds;

			private:
				Executor& executor;
				CpuTimer* cpu_timer;
				std::chrono::time_point<std::chrono::steady_clock> time;
		};

	public:
		// Pauses CpuTimer
		class UnpauseScope;
		class PauseScope {
			friend UnpauseScope;
			public:
				explicit PauseScope(CpuTimer* timer) : timer{timer} { timer->Pause(); }
				PauseScope(const PauseScope&) = delete;
				~PauseScope() { timer->Resume(); }
				auto operator=(const PauseScope&) = delete;

			private:
				CpuTimer* timer;
		};

		// Unpauses CpuTimer
		class UnpauseScope {
			public:
				explicit UnpauseScope(PauseScope& pause) : timer{pause.timer} { timer->Resume(); }
				UnpauseScope(const UnpauseScope&) = delete;
				~UnpauseScope() { timer->Pause(); }
				auto operator=(const UnpauseScope&) = delete;

				CpuTimer* timer;
		};

		// A scope sets the current environment without locking v8
		class Scope {
			public:
				explicit Scope(IsolateEnvironment& env);
				Scope(const Scope&) = delete;
				~Scope();
				auto operator= (const Scope&) = delete;

			private:
				Executor* last;
		};

		class Profiler {
			public:
				explicit Profiler(IsolateEnvironment& env);
				Profiler(const Profiler&) = delete;
				~Profiler();
				auto operator= (const Profiler&) = delete;
			private:
				IsolateEnvironment* environment;
				Executor* executor;
				v8::CpuProfiler* profiler;
				v8::Isolate* isolate;
		};

		// Locks this environment for execution. Implies `Scope` as well.
		class Lock {
			public:
				explicit Lock(IsolateEnvironment& env);
				Lock(const Lock&) = delete;
				~Lock() = default;
				auto operator= (const Lock&) = delete;

			private:
				// These need to be separate from `Executor::current_executor` because the default isolate
				// doesn't actually get a lock.
				Scope scope;
				WallTimer wall_timer;
				v8::Locker locker;
				CpuTimer cpu_timer;
				v8::Isolate::Scope isolate_scope;
				v8::HandleScope handle_scope;
				Profiler profiler;
		};

		class Unlock {
			public:
				explicit Unlock(IsolateEnvironment& env);
				Unlock(const Unlock&) = delete;
				~Unlock() = default;
				auto operator= (const Unlock&) = delete;

			private:
				PauseScope pause_scope;
				v8::Unlocker unlocker;
		};

	private:
		IsolateEnvironment& env;
		Executor& default_executor;
		std::thread::id default_thread;
		Lock* current_lock = nullptr;
		CpuTimer* cpu_timer = nullptr;
		WallTimer* wall_timer = nullptr;
		int depth = 0;
		std::mutex timer_mutex;
		std::chrono::nanoseconds cpu_time{};
		std::chrono::nanoseconds wall_time{};

		static thread_local CpuTimer* cpu_timer_thread;
		static thread_local Executor* current_executor;
};

inline auto Executor::GetCurrentEnvironment() -> IsolateEnvironment* {
	return current_executor == nullptr ? nullptr : &current_executor->env;
}

inline auto Executor::GetDefaultEnvironment() -> IsolateEnvironment& {
	return current_executor->default_executor.env;
}

inline auto Executor::IsDefaultThread() -> bool {
	return std::this_thread::get_id() == current_executor->default_thread;
};

} // namespace ivm
