#include "isolate/environment.h"
#include "./string.h"
#include <cstring>

using namespace v8;

namespace ivm {
namespace {

/**
 * Helper classes passed to v8 so we can reuse the same externally allocated memory for strings
 * between different isolates
 */
class ExternalString final : public v8::String::ExternalStringResource {
	public:
		explicit ExternalString(std::shared_ptr<std::vector<char>> value) : value{std::move(value)} {
			IsolateEnvironment::GetCurrent().AdjustExtraAllocatedMemory(this->value->size());
		}

		ExternalString(const ExternalString&) = delete;

		~ExternalString() final {
			auto* environment = Executor::GetCurrentEnvironment();
			if (environment != nullptr) {
				environment->AdjustExtraAllocatedMemory(-static_cast<int>(this->value->size()));
			}
		}

		auto operator= (const ExternalString&) = delete;

		auto data() const -> const uint16_t* final {
			return reinterpret_cast<uint16_t*>(value->data());
		}

		auto length() const -> size_t final {
			return value->size() >> 1;
		}

	private:
		std::shared_ptr<std::vector<char>> value;
};

class ExternalStringOneByte final : public v8::String::ExternalOneByteStringResource {
	public:
		explicit ExternalStringOneByte(std::shared_ptr<std::vector<char>> value) : value{std::move(value)} {
			IsolateEnvironment::GetCurrent().AdjustExtraAllocatedMemory(this->value->size());
		}

		ExternalStringOneByte(const ExternalStringOneByte&) = delete;

		~ExternalStringOneByte() final {
			auto* environment = Executor::GetCurrentEnvironment();
			if (environment != nullptr) {
				environment->AdjustExtraAllocatedMemory(-static_cast<int>(this->value->size()));
			}
		}

		auto operator= (const ExternalStringOneByte&) = delete;

		auto data() const -> const char* final {
			return value->data();
		}

		auto length() const -> size_t final {
			return value->size();
		}

	private:
		std::shared_ptr<std::vector<char>> value;
};

} // anonymous namespace

/**
 * ExternalCopyString implementation
 */
ExternalCopyString::ExternalCopyString(Local<String> string) :
		ExternalCopy{static_cast<int>((string->Length() << (string->IsOneByte() ? 0 : 1)) + sizeof(ExternalCopyString))} {
	if (string->IsOneByte()) {
		one_byte = true;
		value = std::make_shared<std::vector<char>>(string->Length());
		string->WriteOneByte(
			Isolate::GetCurrent(),
			reinterpret_cast<uint8_t*>(value->data()), 0, -1, String::WriteOptions::NO_NULL_TERMINATION
		);
	} else {
		one_byte = false;
		value = std::make_shared<std::vector<char>>(string->Length() << 1);
		string->Write(
			Isolate::GetCurrent(),
			reinterpret_cast<uint16_t*>(value->data()), 0, -1, String::WriteOptions::NO_NULL_TERMINATION
		);
	}
}

ExternalCopyString::ExternalCopyString(const char* string) :
	value{std::make_shared<std::vector<char>>(string, string + strlen(string))}, one_byte{true} {}

ExternalCopyString::ExternalCopyString(const std::string& string) :
	value{std::make_shared<std::vector<char>>(string.begin(), string.end())}, one_byte{true} {}

auto ExternalCopyString::CopyInto(bool /*transfer_in*/) -> Local<Value> {
	if (value->size() < 1024) {
		// Strings under 1kb will be internal v8 strings. I didn't experiment with this at all, but it
		// seems self-evident that there's some byte length under which it doesn't make sense to create
		// an external string so I picked 1kb.
		if (one_byte) {
			return Unmaybe(String::NewFromOneByte(Isolate::GetCurrent(),
				reinterpret_cast<uint8_t*>(value->data()), NewStringType::kNormal, value->size()));
		} else {
			return Unmaybe(String::NewFromTwoByte(Isolate::GetCurrent(),
				reinterpret_cast<uint16_t*>(value->data()), NewStringType::kNormal, value->size() >> 1));
		}
	} else {
		// External strings can save memory and/or copies
		if (one_byte) {
			return Unmaybe(String::NewExternalOneByte(Isolate::GetCurrent(), new ExternalStringOneByte(value)));
		} else {
			return Unmaybe(String::NewExternalTwoByte(Isolate::GetCurrent(), new ExternalString(value)));
		}
	}
}

} // namespace ivm
