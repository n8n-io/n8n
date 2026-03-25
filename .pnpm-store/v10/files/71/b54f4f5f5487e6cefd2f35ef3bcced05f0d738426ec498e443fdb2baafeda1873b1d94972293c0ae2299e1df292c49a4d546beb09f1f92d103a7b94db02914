#pragma once
#include "external_copy.h"
#include <memory>
#include <vector>

namespace ivm {

class ExternalCopyString final : public ExternalCopy {
	public:
		ExternalCopyString() = default;
		explicit ExternalCopyString(v8::Local<v8::String> string);
		explicit ExternalCopyString(const char* string);
		explicit ExternalCopyString(const std::string& string);
		ExternalCopyString(const ExternalCopyString&) = delete;
		ExternalCopyString(ExternalCopyString&& that) = default;
		~ExternalCopyString() final = default;
		auto operator= (const ExternalCopyString&) -> ExternalCopyString& = delete;
		auto operator= (ExternalCopyString&& that) noexcept -> ExternalCopyString& = default;

		explicit operator bool() const { return static_cast<bool>(value); }
		auto CopyInto(bool transfer_in = false) -> v8::Local<v8::Value> final;

	private:
		std::shared_ptr<std::vector<char>> value;
		bool one_byte = false;
};

} // namespace ivm
