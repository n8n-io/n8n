#pragma once
#include "isolate/remote_handle.h"
#include "transferable.h"
#include <v8.h>
#include <memory>
#include <utility>
#include <vector>

namespace ivm {
namespace detail {

/**
 * Holds common data for ReferenceHandle and ReferenceHandleTransferable
 */
class ReferenceData {
	friend class AccessorRunner;
	public:
		enum class TypeOf { Null, Undefined, Number, String, Boolean, Object, Function };

		explicit ReferenceData(v8::Local<v8::Value> value, bool inherit = false);
		ReferenceData(
			std::shared_ptr<IsolateHolder> isolate,
			RemoteHandle<v8::Value> reference,
			RemoteHandle<v8::Context> context,
			TypeOf type_of,
			bool accessors,
			bool inherit
		);

	protected:
		std::shared_ptr<IsolateHolder> isolate;
		RemoteHandle<v8::Value> reference;
		RemoteHandle<v8::Context> context;
		TypeOf type_of;
		bool accessors;
		bool inherit;
};

} // namespace detail

/**
 * This will be a reference to any v8 Value in any isolate.
 */
class ReferenceHandle : public TransferableHandle, public detail::ReferenceData {
	friend class ApplyRunner;
	friend class CopyRunner;
	friend class AccessorRunner;
	friend class GetRunner;
	public:
		using TypeOf = detail::ReferenceData::TypeOf;

		template <class ...Args>
		explicit ReferenceHandle(Args&&... args) : ReferenceData{std::forward<Args>(args)...} {}

		static auto Definition() -> v8::Local<v8::FunctionTemplate>;
		static auto New(v8::Local<v8::Value> value, v8::MaybeLocal<v8::Object> options)
			-> std::unique_ptr<ReferenceHandle>;
		auto TransferOut() -> std::unique_ptr<Transferable> final;

		auto Deref(v8::MaybeLocal<v8::Object> maybe_options) -> v8::Local<v8::Value>;
		auto DerefInto(v8::MaybeLocal<v8::Object> maybe_options) -> v8::Local<v8::Value>;
		auto Release() -> v8::Local<v8::Value>;
		auto TypeOfGetter() -> v8::Local<v8::Value>;

		template <int async>
		auto Apply(
			v8::MaybeLocal<v8::Value> recv_handle,
			v8::Maybe<ArrayRange> maybe_arguments,
			v8::MaybeLocal<v8::Object> maybe_options
		) -> v8::Local<v8::Value>;

		template <int async>
		auto Copy() -> v8::Local<v8::Value>;

		template <int async>
		auto Get(
			v8::Local<v8::Value> key_handle,
			v8::MaybeLocal<v8::Object> maybe_options
		) -> v8::Local<v8::Value>;

		template <int async>
		auto Delete(v8::Local<v8::Value> key_handle) -> v8::Local<v8::Value>;

		template <int async>
		auto Set(
			v8::Local<v8::Value> key_handle,
			v8::Local<v8::Value> val_handle,
			v8::MaybeLocal<v8::Object> maybe_options
		) -> v8::Local<v8::Value>;

	private:
		void CheckDisposed() const;
};

/**
 * Instances of this turn into a ReferenceHandle when they are transferred in
 */
class ReferenceHandleTransferable : public Transferable, public detail::ReferenceData {
	public:
		template <class ...Args>
		explicit ReferenceHandleTransferable(Args&&... args) : ReferenceData{std::forward<Args>(args)...} {}

		auto TransferIn() -> v8::Local<v8::Value> final;
};

} // namespace ivm
