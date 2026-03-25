#pragma once
#include <v8.h>
#include "transferable.h"
#include <memory>

namespace ivm {

class ExternalCopy;

class ExternalCopyHandle final : public TransferableHandle {
	public:
		class ExternalCopyTransferable : public Transferable {
			private:
				std::shared_ptr<ExternalCopy> value;

			public:
				explicit ExternalCopyTransferable(std::shared_ptr<ExternalCopy> value);
				auto TransferIn() -> v8::Local<v8::Value> final;
		};

		std::shared_ptr<ExternalCopy> value;

		void CheckDisposed() const;

		explicit ExternalCopyHandle(std::shared_ptr<ExternalCopy> value);
		ExternalCopyHandle(const ExternalCopyHandle&) = delete;
		auto operator= (const ExternalCopyHandle&) -> ExternalCopyHandle& = delete;
		~ExternalCopyHandle() final;
		static auto Definition() -> v8::Local<v8::FunctionTemplate>;
		auto TransferOut() -> std::unique_ptr<Transferable> final;

		static auto New(v8::Local<v8::Value> value, v8::MaybeLocal<v8::Object> maybe_options) -> std::unique_ptr<ExternalCopyHandle>;
		static auto TotalExternalSizeGetter() -> v8::Local<v8::Value>;
		auto Copy(v8::MaybeLocal<v8::Object> maybe_options) -> v8::Local<v8::Value>;
		auto CopyInto(v8::MaybeLocal<v8::Object> maybe_options) -> v8::Local<v8::Value>;
		auto Release() -> v8::Local<v8::Value>;
		auto GetValue() const -> std::shared_ptr<ExternalCopy> { return value; }

	private:
		int size = 0;
};

class ExternalCopyIntoHandle : public TransferableHandle {
	private:
		class ExternalCopyIntoTransferable : public Transferable {
			private:
				std::shared_ptr<ExternalCopy> value;
				bool transfer_in;

			public:
				explicit ExternalCopyIntoTransferable(std::shared_ptr<ExternalCopy> value, bool transfer_in);
				auto TransferIn() -> v8::Local<v8::Value> final;
		};

		std::shared_ptr<ExternalCopy> value;
		bool transfer_in;

	public:
		explicit ExternalCopyIntoHandle(std::shared_ptr<ExternalCopy> value, bool transfer_in);
		static auto Definition() -> v8::Local<v8::FunctionTemplate>;
		auto TransferOut() -> std::unique_ptr<Transferable> final;
};

} // namespace ivm
