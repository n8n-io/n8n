#pragma once
#include <condition_variable>
#include <deque>
#include <limits>
#include <mutex>
#include <thread>
#include <unordered_set>

namespace ivm {

class thread_pool_t {
	public:
		using entry_t = void(bool, void*);
		class affinity_t {
			friend thread_pool_t;
			std::unordered_set<unsigned> ids;
			unsigned previous = std::numeric_limits<unsigned>::max();
		};

		explicit thread_pool_t(size_t desired_size) noexcept : desired_size{desired_size} {}
		thread_pool_t(const thread_pool_t&) = delete;
		~thread_pool_t() { resize(0); }
		auto operator= (const thread_pool_t&) = delete;

		void exec(affinity_t& affinity, entry_t* entry, void* param);
		void resize(size_t size);

	private:
		auto new_thread(std::lock_guard<std::mutex>& /*lock*/) -> size_t;

		struct thread_data_t {
			std::thread thread;
			std::condition_variable cv;
			entry_t* entry = nullptr;
			void* param = nullptr;
			bool should_exit = false;
		};

		size_t desired_size;
		size_t rr = 0;
		std::mutex mutex;
		std::deque<thread_data_t> thread_data;
};

} // namespace ivm
