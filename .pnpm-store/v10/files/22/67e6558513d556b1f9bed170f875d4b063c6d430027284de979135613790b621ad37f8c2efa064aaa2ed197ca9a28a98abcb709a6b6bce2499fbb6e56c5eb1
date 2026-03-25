#pragma once
#include <v8.h>
#include "handle_cast.h"

namespace ivm {
namespace detail {

struct ParamRequired : std::exception {};

template <class Type, class Property, class Default>
inline auto ReadOptionImpl(v8::MaybeLocal<v8::Object> maybe_options, Property&& property, Default default_fn) {
	HandleCastArguments arguments;
	auto property_handle = HandleCast<v8::Local<v8::String>>(std::forward<Property>(property), arguments);
	try {
		v8::Local<v8::Object> options;
		if (maybe_options.ToLocal(&options)) {
			v8::Local<v8::Value> value = Unmaybe(options->Get(arguments.context, property_handle));
			if (value->IsNullOrUndefined()) {
				return default_fn();
			}
			return HandleCast<Type>(value, arguments);
		} else {
			return default_fn();
		}
	} catch (const ParamIncorrect& ex) {
		throw RuntimeTypeError{
			std::string{"`"}+ *v8::String::Utf8Value{arguments.isolate, property_handle}+ "` must be "+ ex.type
		};
	} catch (const ParamRequired&) {
		throw RuntimeTypeError(
			std::string{"`"}+ *v8::String::Utf8Value{arguments.isolate, property_handle}+ "` is required");
	}
}

} // namespace detail

template <class Type, class Options, class Property>
auto ReadOption(Options options, Property&& property) {
	return detail::ReadOptionImpl<Type>(options, std::forward<Property>(property), []() { throw detail::ParamRequired(); });
}

template <class Type, class Options, class Property>
auto ReadOption(Options options, Property&& property, Type default_value) {
	return detail::ReadOptionImpl<Type>(options, std::forward<Property>(property), [&]() { return std::move(default_value); });
}

}
