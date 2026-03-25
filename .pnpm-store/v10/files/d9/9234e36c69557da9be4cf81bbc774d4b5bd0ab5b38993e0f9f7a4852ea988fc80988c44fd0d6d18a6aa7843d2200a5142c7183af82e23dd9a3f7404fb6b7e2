#pragma once
#include <condition_variable>
#include <mutex>
#include <shared_mutex>

namespace ivm {
namespace detail {

// C++17 adds mandatory return value optimization which enables returning a scoped_lock
#if __cplusplus >= 201700 && __cpp_lib_scoped_lock
	template <class Mutex>
	using scoped_lock = std::scoped_lock<Mutex>;
#else
	template <class Mutex>
	using scoped_lock = std::unique_lock<Mutex>;
#endif

// Detect shared mutex implementation (if any)
template <bool Shared>
struct mutex_traits_t {
	using mutex_t = std::mutex;
	static constexpr bool shared = false;
};

template <>
struct mutex_traits_t<true> {
#if __cpp_lib_shared_mutex
	using mutex_t = std::shared_mutex;
	static constexpr bool shared = true;
#elif __cpp_lib_shared_timed_mutex && !__APPLE__
	using mutex_t = std::shared_timed_mutex;
	static constexpr bool shared = true;
#else
	using mutex_t = std::mutex;
	static constexpr bool shared = false;
#endif
};

// Detect lock needed for mutex + wait
template <class Traits, bool Waitable>
struct lock_traits_t;

template <class Traits>
struct lock_traits_t<Traits, false> {
	using read_t = typename std::conditional<Traits::shared,
		std::shared_lock<typename Traits::mutex_t>,
		scoped_lock<typename Traits::mutex_t>>::type;
	using write_t = scoped_lock<typename Traits::mutex_t>;
};

template <class Traits>
struct lock_traits_t<Traits, true> {
	static_assert(Traits::waitable, "Mutex is not waitable");
	using read_t = typename std::conditional<Traits::shared,
		std::shared_lock<typename Traits::mutex_t>,
		std::unique_lock<typename Traits::mutex_t>>::type;
	using write_t = std::unique_lock<typename Traits::mutex_t>;
};

// std::condition_variable is only good for std::unique_lock<std::mutex>
template <class Mutex>
struct condition_variable_t {
	using type_t = std::condition_variable_any;
};

template <>
struct condition_variable_t<std::mutex> {
	using type_t = std::condition_variable;
};

// Holds the lock and provides pointer semantics
template <class Lockable, class Lock>
class lock_holder_t {
	template <bool, class> friend struct wait_impl_t;

	public:
		explicit lock_holder_t(Lockable& lockable) : lockable{lockable}, lock{lockable.mutex} {}

		auto operator*() -> auto& { return lockable.resource; }
		auto operator*() const -> auto& { return lockable.resource; }
		auto operator->() { return &lockable.resource; }
		auto operator->() const { return &lockable.resource; }

	private:
		Lockable& lockable;
		Lock lock;
};

// `wait` implementation
template <bool Waitable, class Type>
struct wait_impl_t;

template <class Type>
struct wait_impl_t<false, Type> {
	using lock_t = Type;
};

template <class Type>
struct wait_impl_t<true, Type> {
	class lock_t : public Type {
		public:
			using Type::Type;
			void wait() {
				wait_impl(*this);
			}
	};

	private:
		template <class Lock>
		static void wait_impl(Lock& lock) {
			lock.lockable.cv.wait(lock.lock);
		}
};

// Internal `condition_variable` storage
template <bool Waitable, class Mutex>
class condition_variable_holder_t {};

template <class Mutex>
class condition_variable_holder_t<true, Mutex> {
	template <bool, class> friend struct wait_impl_t;

	public:
		void notify_one() {
			cv.notify_one();
		}

		void notify_all() {
			cv.notify_all();
		}

	private:
		mutable typename condition_variable_t<Mutex>::type_t cv;
};

// Holds resource and mutex
template <class Type, class Traits>
class lockable_impl_t : public condition_variable_holder_t<Traits::waitable, typename Traits::mutex_t> {
	template <class, class> friend class lock_holder_t;

	public:
		lockable_impl_t() = default;
		template <class... Args>
		explicit lockable_impl_t(Args&&... args) : resource{std::forward<Args>(args)...} {}
		lockable_impl_t(const lockable_impl_t&) = delete;
		~lockable_impl_t() = default;
		auto operator=(const lockable_impl_t&) = delete;

		template <bool Waitable = false>
		auto read() const {
			return typename wait_impl_t<Waitable, lock_holder_t<const lockable_impl_t, typename lock_traits_t<Traits, Waitable>::read_t>>::lock_t{*this};
		}

		template <bool Waitable = false>
		auto write() {
			return typename wait_impl_t<Waitable, lock_holder_t<lockable_impl_t, typename lock_traits_t<Traits, Waitable>::write_t>>::lock_t{*this};
		}

	private:
		Type resource{};
		mutable typename Traits::mutex_t mutex;
};

// Combine mutex traits and waitable traits
template <bool Waitable>
struct waitable_traits_t {
	static constexpr bool waitable = Waitable;
};

template <bool Shared, bool Waitable>
struct lockable_traits_t : mutex_traits_t<Shared>, waitable_traits_t<Waitable> {};

} // namespace detail

template <class Type, bool Shared = false, bool Waitable = false>
using lockable_t = detail::lockable_impl_t<Type, detail::lockable_traits_t<Shared, Waitable>>;

} // namespace ivm
