#include "timer.h"
#include <cassert>
#include <chrono>
#include <condition_variable>
#include <mutex>
#include <queue>
#include <thread>
#include <utility>
#include <unordered_set>

namespace ivm {

/**
 * Contains data on a timer. This is shared between the timer_t handle and the thread responsible
 * for the timer.
 */
struct timer_data_t {
	timer_data_t(
		std::chrono::steady_clock::time_point timeout,
		void** holder,
		timer_t::callback_t callback,
		const std::lock_guard<std::mutex>& /*lock*/
	) : callback{std::move(callback)}, holder{holder}, timeout{timeout} {
		if (holder != nullptr) {
			last_holder_value = std::exchange(*holder, static_cast<void*>(this));
		}
	}

	auto adjust() -> bool {
		if (paused_duration == std::chrono::steady_clock::duration{}) {
			return false;
		} else {
			timeout += paused_duration;
			paused_duration = {};
			return true;
		}
	}

	auto is_paused() const -> bool {
		return paused_at != std::chrono::steady_clock::time_point{};
	}

	void pause() {
		paused_at = std::chrono::steady_clock::now();
	}

	void resume() {
		paused_duration += std::chrono::steady_clock::now() - paused_at;
		paused_at = {};
	}

	struct cmp {
		auto operator()(const std::shared_ptr<timer_data_t>& left, const std::shared_ptr<timer_data_t>& right) const {
			return left->timeout > right->timeout;
		}
	};

	timer_t::callback_t callback;
	void** holder = nullptr;
	void* last_holder_value;
	std::chrono::steady_clock::time_point timeout;
	std::chrono::steady_clock::time_point paused_at{};
	std::chrono::steady_clock::duration paused_duration{};
	std::shared_ptr<timer_data_t> threadless_self;
	bool is_alive = true;
	bool is_running = false;
	bool is_dtor_waiting = false;
};

namespace {

/**
 * Stash these here in case statics are destroyed while the module is unloading but timers are still
 * active
 */
struct shared_state_t {
	std::unordered_set<struct timer_thread_t*> threads;
	std::condition_variable cv;
	std::mutex mutex;
};
auto global_shared_state = std::make_shared<shared_state_t>();

/**
 * Manager for a thread which handles 1 or many timers.
 */
struct timer_thread_t {
	explicit timer_thread_t(std::shared_ptr<timer_data_t> first_timer) :
			next_timeout{first_timer->timeout}, shared_state{global_shared_state} {
		queue.emplace(std::move(first_timer));
		std::thread thread{[this] { entry(); }};
		thread.detach();
	}

	void entry() {
		std::unique_lock<std::mutex> lock{shared_state->mutex, std::defer_lock};
		while (true) {
			std::this_thread::sleep_until(next_timeout);
			lock.lock();
			next_timeout = std::chrono::steady_clock::now();
			run_next(lock);
			if (queue.empty()) {
				auto ii = shared_state->threads.find(this);
				assert(ii != shared_state->threads.end());
				shared_state->threads.erase(ii);
				lock.unlock();
				delete this;
				return;
			}
			next_timeout = queue.top()->timeout;
			lock.unlock();
		}
	}

	void maybe_run_next(std::unique_lock<std::mutex>& lock) {
		if (!queue.empty() && queue.top()->timeout <= next_timeout) {
			run_next(lock);
		}
	}

	void run_next(std::unique_lock<std::mutex>& lock) {
		auto data = queue.top();
		queue.pop();
		{
			if (data->is_alive) {
				if (data->is_paused()) {
					data->threadless_self = std::move(data);
				} else if (data->adjust()) {
					start_or_join_timer(std::move(data), lock);
				} else {
					data->is_running = true;
					lock.unlock();
					data->callback(reinterpret_cast<void*>(this));
					lock.lock();
					data->is_running = false;
					if (data->is_dtor_waiting) {
						shared_state->cv.notify_all();
					}
					return;
				}
			} else {
				data.reset();
			}
		}
		maybe_run_next(lock);
	}

	// Requires lock
	template <template<class> class Lock>
	static void start_or_join_timer(std::shared_ptr<timer_data_t> data, const Lock<std::mutex>& /*lock*/) {
		// Try to find a thread to put this timer into
		for (const auto& thread : global_shared_state->threads) {
			if (thread->next_timeout < data->timeout) {
				thread->queue.push(std::move(data));
				return;
			}
		}

		// Time to spawn a new thread
		global_shared_state->threads.insert(new timer_thread_t(std::move(data)));
	}

	std::priority_queue<
		std::shared_ptr<timer_data_t>,
		std::deque<std::shared_ptr<timer_data_t>>,
		timer_data_t::cmp
	> queue;
	std::chrono::steady_clock::time_point next_timeout;
	std::shared_ptr<shared_state_t> shared_state;
};

} // anonymous namespace

/**
 * timer_t implementation
 */
timer_t::timer_t(uint32_t ms, void** holder, const callback_t& callback) {
	std::lock_guard<std::mutex> lock{global_shared_state->mutex};
	data = std::make_shared<timer_data_t>(
		std::chrono::steady_clock::now() + std::chrono::milliseconds{ms},
		holder, callback,
		lock
	);
	timer_thread_t::start_or_join_timer(data, lock);
}

timer_t::~timer_t() {
	std::unique_lock<std::mutex> lock{global_shared_state->mutex};
	if (data->is_running) {
		data->is_dtor_waiting = true;
		do {
			global_shared_state->cv.wait(lock);
		} while (data->is_running);
	}
	data->is_alive = false;
	if (data->holder != nullptr) {
		*data->holder = data->last_holder_value;
	}
}

void timer_t::chain(void* ptr) {
	auto& thread = *reinterpret_cast<timer_thread_t*>(ptr);
	std::unique_lock<std::mutex> lock{global_shared_state->mutex};
	thread.maybe_run_next(lock);
}

void timer_t::pause(void*& holder) {
	std::unique_lock<std::mutex> lock{global_shared_state->mutex};
	if (holder != nullptr) {
		auto& data = *static_cast<timer_data_t*>(holder);
		data.pause();
	}
}

void timer_t::resume(void*& holder) {
	std::unique_lock<std::mutex> lock{global_shared_state->mutex};
	if (holder != nullptr) {
		auto& data = *static_cast<timer_data_t*>(holder);
		data.resume();
		if (data.threadless_self) {
			timer_thread_t::start_or_join_timer(std::move(data.threadless_self), lock);
		}
	}
}

void timer_t::wait_detached(uint32_t ms, const callback_t& callback) {
	std::lock_guard<std::mutex> lock{global_shared_state->mutex};
	timer_thread_t::start_or_join_timer(std::make_shared<timer_data_t>(
		std::chrono::steady_clock::now() + std::chrono::milliseconds{ms},
		nullptr, callback, lock
	), lock);
}

} // namespace ivm
