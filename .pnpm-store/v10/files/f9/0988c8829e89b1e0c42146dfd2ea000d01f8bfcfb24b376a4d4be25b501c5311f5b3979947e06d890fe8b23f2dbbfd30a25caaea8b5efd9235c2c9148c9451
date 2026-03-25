#pragma once
#include <v8-platform.h>

namespace ivm {
// ivm::Runnable serves the same role as v8::Task but instances of Runnable live and die without v8
// so it might not actually make sense to use a v8 container for the job. An alias is used to avoid
// the adapter which would be needed in the case where a Runnable actually does need to be passed
// off to v8.
using Runnable = v8::Task;
/*
class Runnable {
	public:
		virtual ~Runnable() = default;
		virtual void Run() = 0;
};

class TaskHolder : public Runnable {
	private:
		std::unique_ptr<v8::Task> task;
	public:
		explicit TaskHolder(v8::Task* task) : task{task} {}
		explicit TaskHolder(std::unique_ptr<v8::Task> task) : task{std::move(task)} {}
		TaskHolder(TaskHolder task) noexcept : task{std::move(task.task)} {}
		void Run() final {
			task->Run();
		}
};
*/
} // namespace ivm
