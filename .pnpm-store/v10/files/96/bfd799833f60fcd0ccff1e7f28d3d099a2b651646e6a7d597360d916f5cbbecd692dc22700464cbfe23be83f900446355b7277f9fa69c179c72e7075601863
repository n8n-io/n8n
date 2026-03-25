#pragma once
#include <memory>
#include <functional>

namespace ivm {

/**
 * isolated-vm could start timers from different threads which libuv isn't really cut out for, so
 * I'm rolling my own here. The goal of the library is to have atomic timers without spawning a new
 * thread for each timer.
 */
struct timer_data_t;
class timer_t {
	public:
		using callback_t = std::function<void(void*)>;

		// Runs a callback unless the `timer_t` destructor is called.
		timer_t(uint32_t ms, void** holder, const callback_t& callback);
		timer_t(uint32_t ms, const callback_t& callback) : timer_t{ms, nullptr, callback} {}
		timer_t(const timer_t&) = delete;
		~timer_t();
		auto operator= (const timer_t&) = delete;

		// Runs a callback in `ms` with no `timer_t` object.
		static void wait_detached(uint32_t ms, const callback_t& callback);
		// Invoked from callbacks when they are done scheduling and may need to wait
		static void chain(void* ptr);
		// Pause/unpause timer callbacks
		static void pause(void*& holder);
		static void resume(void*& holder);

	private:
		std::shared_ptr<timer_data_t> data;
};

} // namespace ivm
