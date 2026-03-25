#pragma once

// Linux
#ifdef __linux__
#include <signal.h>
namespace ivm {
class thread_suspend_handle {
	public:
		thread_suspend_handle() :
			id{pthread_self()},
			prev{std::exchange(instance(), this)} {}

		~thread_suspend_handle() {
			std::exchange(instance(), prev);
		}

		thread_suspend_handle(const thread_suspend_handle&) = delete;
		auto operator=(thread_suspend_handle&) = delete;

		void suspend() {
			// Called from another thread
			invoked = true;
			pthread_kill(id, SIGRTMIN);
		}

		struct initialize {
			initialize() {
				// Set process-wide signal handler
				struct sigaction handler;
				memset(&handler, '\0', sizeof(handler));
				handler.sa_handler = callback;
				sigemptyset(&handler.sa_mask);
				assert(sigaction(SIGRTMIN, &handler, nullptr) == 0);
			}
		};

	private:
		static void callback(int) {
			if (instance() != nullptr && instance()->invoked == true) {
				while (true) {
					using namespace std::chrono_literals;
					std::this_thread::sleep_for(100s);
				}
			}
		}

		static thread_suspend_handle*& instance() {
			static thread_local thread_suspend_handle* instance = nullptr;
			return instance;
		}

		pthread_t id;
		thread_suspend_handle* prev;
		bool invoked = false;
};
} // namespace ivm

// macOS
#elif __APPLE__
#include <mach/mach.h>
namespace ivm {
class thread_suspend_handle {
	public:
		thread_suspend_handle() : id{mach_thread_self()} {}
		~thread_suspend_handle() = default;
		thread_suspend_handle(const thread_suspend_handle&) = delete;
		auto operator=(thread_suspend_handle&) = delete;
		void suspend() const { thread_suspend(id); }
		struct initialize {};
	private:
		mach_port_t id;
};
} // namespace ivm

// Windows
#elif _WIN32
#include <processthreadsapi.h>
namespace ivm {
class thread_suspend_handle {
	public:
		thread_suspend_handle() : id{GetCurrentThread()} {}
		~thread_suspend_handle() = default;
		thread_suspend_handle(const thread_suspend_handle&) = delete;
		auto operator=(thread_suspend_handle&) = delete;
		void suspend() const { SuspendThread(id); }
		struct initialize {};
	private:
		HANDLE id;
};
} // namespace ivm

// Fallback [no-op]
#else
namespace ivm {
class thread_suspend_handle {
	public:
		thread_suspend_handle() {}
		~thread_suspend_handle() = default;
		thread_suspend_handle(const thread_suspend_handle&) = delete;
		auto operator=(thread_suspend_handle&) = delete;
		void suspend() const {}
		struct initialize {};
};
} // namespace ivm

#endif
