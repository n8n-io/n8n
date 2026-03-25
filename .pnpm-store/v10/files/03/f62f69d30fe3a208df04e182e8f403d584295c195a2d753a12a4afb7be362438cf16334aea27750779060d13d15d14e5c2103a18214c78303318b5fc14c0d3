#include "executor.h"
#include "environment.h"
#include "isolate/util.h"
#include "lib/timer.h"
#include "v8-profiler.h"
#include "v8.h"
#include <cstddef>
#include <cstdio>

namespace ivm {

/**
 * Executor implementation
 */
Executor::Executor(IsolateEnvironment& env) :
	env{env},
	default_executor{*(current_executor == nullptr ? (current_executor = this) : &current_executor->default_executor)},
	default_thread{&default_executor == this ? std::this_thread::get_id() : default_executor.default_thread} {}

Executor::~Executor() {
	if (this == &default_executor) {
		assert(current_executor == &default_executor);
		current_executor = nullptr;
	}
}

auto Executor::MayRunInlineTasks(IsolateEnvironment& env) -> bool {
	if (current_executor == &env.executor) {
		if (env.nodejs_isolate) {
			// nodejs isolates are active by default in their owned thread even if there is no Scope up.
			// This can cause problems when the GC runs and invokes weak callbacks because there is no
			// v8::HandleScope set up.
			return current_executor->depth > 0;
		} else {
			return true;
		}
	}
	return false;
}

thread_local Executor* Executor::current_executor = nullptr;
thread_local Executor::CpuTimer* Executor::cpu_timer_thread = nullptr;

/**
 * CpuTimer implementation
 */
Executor::CpuTimer::CpuTimer(Executor& executor) :
		executor{executor}, last{cpu_timer_thread}, time{Now()}
#if USE_CLOCK_THREAD_CPUTIME_ID
		, steady_time{std::chrono::steady_clock::now()}
#endif
{
	cpu_timer_thread = this;
	std::lock_guard<std::mutex> lock{executor.timer_mutex};
	assert(executor.cpu_timer == nullptr);
	executor.cpu_timer = this;
}

Executor::CpuTimer::~CpuTimer() {
	cpu_timer_thread = last;
	std::lock_guard<std::mutex> lock{executor.timer_mutex};
	executor.cpu_time += Now() - time;
	assert(executor.cpu_timer == this);
	executor.cpu_timer = nullptr;
}

auto Executor::CpuTimer::Delta(const std::lock_guard<std::mutex>& /*lock*/) const -> std::chrono::nanoseconds {
#if USE_CLOCK_THREAD_CPUTIME_ID
	return std::chrono::duration_cast<std::chrono::nanoseconds>(std::chrono::steady_clock::now() - steady_time);
#else
	return std::chrono::duration_cast<std::chrono::nanoseconds>(Now() - time);
#endif
}

void Executor::CpuTimer::Pause() {
	std::lock_guard<std::mutex> lock{executor.timer_mutex};
	executor.cpu_time += Now() - time;
	assert(executor.cpu_timer == this);
	executor.cpu_timer = nullptr;
	timer_t::pause(executor.env.timer_holder);
}

void Executor::CpuTimer::Resume() {
	std::lock_guard<std::mutex> lock{executor.timer_mutex};
	time = Now();
#if USE_CLOCK_THREAD_CPUTIME_ID
	steady_time = std::chrono::steady_clock::now();
#endif
	assert(executor.cpu_timer == nullptr);
	executor.cpu_timer = this;
	timer_t::resume(executor.env.timer_holder);
}

#if USE_CLOCK_THREAD_CPUTIME_ID
auto Executor::CpuTimer::Now() -> TimePoint {
	timespec ts{};
	assert(clock_gettime(CLOCK_THREAD_CPUTIME_ID, &ts) == 0);
	return TimePoint{std::chrono::duration_cast<std::chrono::system_clock::duration>(
		std::chrono::seconds{ts.tv_sec} + std::chrono::nanoseconds{ts.tv_nsec}
	)};
}
#else
auto Executor::CpuTimer::Now() -> TimePoint {
	return std::chrono::steady_clock::now();
}
#endif

/**
 * WallTimer implementation
 */
Executor::WallTimer::WallTimer(Executor& executor) :
		executor{executor}, cpu_timer{cpu_timer_thread} {
	// Pause current CPU timer which may not belong to this isolate
	if (cpu_timer != nullptr) {
		cpu_timer->Pause();
	}
	// Maybe start wall timer
	if (executor.wall_timer == nullptr) {
		std::lock_guard<std::mutex> lock{executor.timer_mutex};
		executor.wall_timer = this;
		time = std::chrono::steady_clock::now();
	}
}

Executor::WallTimer::~WallTimer() {
	// Resume old CPU timer
	if (cpu_timer != nullptr) {
		cpu_timer->Resume();
	}
	// Maybe update wall time
	if (executor.wall_timer == this) {
		std::lock_guard<std::mutex> lock{executor.timer_mutex};
		executor.wall_timer = nullptr;
		executor.wall_time += std::chrono::steady_clock::now() - time;
	}
}

auto Executor::WallTimer::Delta(const std::lock_guard<std::mutex>& /*lock*/) const -> std::chrono::nanoseconds {
	return std::chrono::duration_cast<std::chrono::nanoseconds>(std::chrono::steady_clock::now() - time);
}

/**
 * Scope ctor
 */
Executor::Scope::Scope(IsolateEnvironment& env) : last{current_executor} {
	current_executor = &env.executor;
	++current_executor->depth;
}

Executor::Scope::~Scope() {
	--current_executor->depth;
	current_executor = last;
}

Executor::Profiler::Profiler(IsolateEnvironment& env) {
	environment = &env;
	executor = &env.executor;
	isolate = env.isolate;
	profiler = nullptr;

	if (env.GetCpuProfileManager()->IsProfiling()) {
		profiler = v8::CpuProfiler::New(isolate, v8::kDebugNaming, v8::kEagerLogging);
		const v8::Local<v8::String> title = v8::String::NewFromUtf8(isolate, "isolated-vm").ToLocalChecked();
		profiler->StartProfiling(title, true);
	}
}

Executor::Profiler::~Profiler() {
	if (profiler == nullptr) {
		return;
	}

	auto DeleterLambda =[](v8::CpuProfile *profile){
		profile->Delete();
	};
	const v8::Local<v8::String> title = v8::String::NewFromUtf8(isolate, "isolated-vm").ToLocalChecked();
	const std::shared_ptr<v8::CpuProfile> profile{profiler->StopProfiling(title),DeleterLambda};
	environment->GetCpuProfileManager()->InjestCpuProfile(profile);
}

/**
 * Lock implementation
 */
Executor::Lock::Lock(IsolateEnvironment& env) :
	scope{env},
	wall_timer{env.executor},
	locker{env.isolate},
	cpu_timer{env.executor},
	isolate_scope{env.isolate},
	handle_scope{env.isolate},
	profiler(env) {}

/**
 * Unlock implementation
 */
Executor::Unlock::Unlock(IsolateEnvironment& env) : pause_scope{env.executor.cpu_timer}, unlocker{env.isolate} {}

} // namespace ivm
