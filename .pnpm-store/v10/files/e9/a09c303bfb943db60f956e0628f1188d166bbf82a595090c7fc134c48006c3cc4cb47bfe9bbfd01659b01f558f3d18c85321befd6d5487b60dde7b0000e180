#include <type_traits>

namespace detail {

template <class Base, class Type>
void destructor_wrapper(Base* value) {
	static_cast<Type*>(value)->~Type();
}

template <class Type, class Pack, class ...Rest>
struct contains_type {
	static constexpr bool value =
		std::is_same<Type, Pack>::value || contains_type<Type, Rest...>::value;
};

template <class Type, class Pack>
struct contains_type<Type, Pack> : std::is_same<Type, Pack> {};

} // namespace detail

template <class Type>
class in_place {};

template <class Base, class ...Storage>
class covariant_t {
	public:
		template <class Ctor, class ...Args>
		explicit covariant_t(in_place<Ctor> /*tag*/, Args&&... args) : dtor{&::detail::destructor_wrapper<Base, Ctor>} {
			static_assert(::detail::contains_type<Ctor, Storage...>::value, "Instantiated constructor must inherit from `Base`");
			new(&storage) Ctor(std::forward<Args>(args)...);
		}

		~covariant_t() {
			dtor(base());
		}

		covariant_t(const covariant_t&) = delete;
		auto operator=(const covariant_t&) = delete;

		auto operator*() -> auto& { return *base(); }
		auto operator*() const -> auto& { return *base(); }
		auto operator->() { return base(); }
		auto operator->() const { return base(); }

	private:
		auto base() { return static_cast<Base*>(static_cast<void*>(&storage)); }

		std::aligned_union_t<1, Storage...> storage;
		void(*dtor)(Base*);
};
