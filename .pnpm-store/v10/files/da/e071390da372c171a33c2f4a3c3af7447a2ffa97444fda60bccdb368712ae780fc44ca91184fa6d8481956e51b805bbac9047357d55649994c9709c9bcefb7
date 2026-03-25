#pragma once
#include "external_copy.h"
#include "./string.h"

namespace ivm {

/**
 * Make a special case for errors so if someone throws then a similar error will come out the other
 * side.
 */
class ExternalCopyError : public ExternalCopy {
	friend class ExternalCopy;
	public:
		enum class ErrorType { Error, RangeError, ReferenceError, SyntaxError, TypeError, CustomError };

		ExternalCopyError(
			ErrorType error_type,
			ExternalCopyString name,
			ExternalCopyString message,
			ExternalCopyString stack
		);
		ExternalCopyError(ErrorType error_type, const char* message, const std::string& stack = "");

		auto CopyInto(bool transfer_in = false) -> v8::Local<v8::Value> final;

	private:
		ErrorType error_type;
		ExternalCopyString name;
		ExternalCopyString message;
		ExternalCopyString stack;
};

} // namespace ivm
