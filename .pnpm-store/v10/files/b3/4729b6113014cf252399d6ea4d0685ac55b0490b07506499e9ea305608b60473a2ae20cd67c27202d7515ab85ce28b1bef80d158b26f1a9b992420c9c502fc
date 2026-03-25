#pragma once
#include "error.h"
#include "handle_cast.h"
#include <v8.h>
#include <cstdint>

namespace ivm {

class ArrayRange {
	public:
		ArrayRange() = default;
		ArrayRange(const ArrayRange&) = default;
		ArrayRange(v8::Local<v8::Array> array, v8::Local<v8::Context> context) :
			array{array}, context{context}, length{array->Length()} {}
		~ArrayRange() = default;
		auto operator=(const ArrayRange&) -> ArrayRange& = default;

		auto begin() const {
			return iterator{array, context, 0};
		}

		auto end() const {
			return iterator{array, context, length};
		}

		class iterator {
			public:
				using iterator_category = std::random_access_iterator_tag;
				using difference_type = int32_t;
				using pointer = void;
				using value_type = v8::Local<v8::Value>;
				using reference = value_type;

				iterator() = default;
				iterator(const iterator&) = default;
				iterator(v8::Local<v8::Array> array, v8::Local<v8::Context> context, uint32_t index) :
					array{array}, context{context}, index{index} {}
				~iterator() = default;
				auto operator=(const iterator&) -> iterator& = default;

				auto operator*() const {
					return Unmaybe(array->Get(context, index));
				}

				auto operator==(const iterator& rhs) const {
					return index == rhs.index;
				}

				auto operator<(const iterator& rhs) const {
					return index < rhs.index;
				}

				auto operator-(const iterator& rhs) const -> difference_type {
					return index - rhs.index;
				}

				auto operator+=(int val) -> iterator& {
					index += val;
					return *this;
				}

				// The following methods are boiler plate which invoke the above methods
				decltype(auto) operator[](int index) const {
					return *(*this + index);
				}

				auto operator!=(const iterator& rhs) const {
					return !(*this == rhs);
				}

				auto operator>(const iterator& rhs) const {
					return rhs < *this;
				}

				auto operator<=(const iterator& rhs) const {
					return !(*this > rhs);
				}

				auto operator>=(const iterator& rhs) const {
					return !(*this < rhs);
				}

				auto operator+(difference_type val) const -> iterator {
					iterator copy{*this};
					copy += val;
					return copy;
				}

				auto operator-(difference_type val) const -> iterator {
					return *this + -val;
				}

				auto operator++() -> iterator& {
					return *this += 1;
				}

				auto operator-=(difference_type val) -> iterator& {
					return *this += -val;
				}

				auto operator--() -> iterator& {
					return *this -= 1;
				}

				auto operator++(int) -> iterator {
					iterator copy{*this};
					*this += 1;
					return copy;
				}

				auto operator--(int) -> iterator {
					iterator copy{*this};
					*this -= 1;
					return copy;
				}

			private:
				v8::Local<v8::Array> array;
				v8::Local<v8::Context> context;
				uint32_t index = 0;
		};

	private:
		v8::Local<v8::Array> array;
		v8::Local<v8::Context> context;
		uint32_t length = 0;
};

inline auto HandleCastImpl(v8::Local<v8::Value> value, const HandleCastArguments& arguments, HandleCastTag<ArrayRange> /*tag*/) {
	if (value->IsArray()) {
		return ArrayRange{value.As<v8::Array>(), arguments.context};
	}
	ParamIncorrect::Throw("an array");
}

inline auto HandleCastImpl(v8::Local<v8::Value> value, const HandleCastArguments& arguments, HandleCastTag<v8::Maybe<ArrayRange>> /*tag*/) -> v8::Maybe<ArrayRange> {
	if (value->IsNullOrUndefined()) {
		return v8::Nothing<ArrayRange>();
	} else if (value->IsArray()) {
		return v8::Just<ArrayRange>(ArrayRange{value.As<v8::Array>(), arguments.context});
	}
	ParamIncorrect::Throw("an array");
}

} // namespace ivm
