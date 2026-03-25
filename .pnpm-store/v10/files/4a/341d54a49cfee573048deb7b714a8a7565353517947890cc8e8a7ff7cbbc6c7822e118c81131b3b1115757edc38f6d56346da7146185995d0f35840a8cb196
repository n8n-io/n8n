#include "thread_pool.h"
#include <functional>

namespace ivm {

void thread_pool_t::exec(affinity_t& affinity, entry_t* entry, void* param) {
	std::lock_guard<std::mutex> lock{mutex};

	// First try to use an old thread
	unsigned thread = std::numeric_limits<unsigned>::max();
	if (affinity.previous < thread_data.size() && thread_data[affinity.previous].entry == nullptr) {
		thread = affinity.previous;
	} else {
		for (auto ii = affinity.ids.begin(); ii != affinity.ids.end(); ) {
			if (*ii >= thread_data.size()) {
				ii = affinity.ids.erase(ii);
				continue;
			}
			if (thread_data[*ii].entry == nullptr) {
				affinity.previous = thread = *ii;
				break;
			}
			++ii;
		}
	}

	if (thread == std::numeric_limits<unsigned>::max()) {
		if (desired_size > thread_data.size()) {
			// Thread pool hasn't yet reached `desired_size`, so we can make a new thread
			thread = new_thread(lock);
			affinity.previous = thread;
			affinity.ids.insert(thread);
		} else {
			// Now try to re-use a non-busy thread
			size_t offset = rr++;
			for (size_t ii = 0; ii < thread_data.size(); ++ii) {
				size_t jj = (rr + ii + offset) % thread_data.size();
				if (thread_data[jj].entry == nullptr) {
					thread = jj;
					affinity.previous = thread;
					affinity.ids.insert(thread);
					break;
				}
			}

			if (thread == std::numeric_limits<unsigned>::max()) {
				// All threads are busy and pool is full, just run this in a new thread
				std::thread tmp_thread{[=]() { entry(false, param); }};
				tmp_thread.detach();
				return;
			}
		}
	}

	thread_data[thread].entry = entry;
	thread_data[thread].param = param;
	thread_data[thread].cv.notify_one();
}

void thread_pool_t::resize(size_t size) {
	std::unique_lock<std::mutex> lock{mutex};
	desired_size = size;
	if (thread_data.size() > desired_size) {
		for (size_t ii = desired_size; ii < thread_data.size(); ++ii) {
			thread_data[ii].should_exit = true;
			thread_data[ii].cv.notify_one();
		}
		lock.unlock();
		for (size_t ii = desired_size; ii < thread_data.size(); ++ii) {
			thread_data[ii].thread.join();
		}
		thread_data.resize(desired_size);
	}
}

auto thread_pool_t::new_thread(std::lock_guard<std::mutex>& /*lock*/) -> size_t {
  thread_data.emplace_back();
	auto& data = thread_data.back();
  data.thread = std::thread{[this, &data]() {
    std::unique_lock<std::mutex> lock{mutex};
    while (!data.should_exit) {
      if (data.entry == nullptr) {
        data.cv.wait(lock);
      } else {
        entry_t* entry = data.entry;
        void* param = data.param;
        lock.unlock();
        entry(true, param);
        lock.lock();
        data.entry = nullptr;
        data.param = nullptr;
      }
    }
  }};
	return thread_data.size() - 1;
}

} // namespace ivm
