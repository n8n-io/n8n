#include "callback.h"

#include <utility>
#include "external_copy/serializer.h"
#include "isolate/external.h"
#include "isolate/three_phase_task.h"

using namespace v8;

namespace ivm {

/**
 * CallbackHandle implementation
 */
static std::unique_ptr<CallbackHandle> CallbackHandle_New_Wrapper(Local<Function> fn, MaybeLocal<Object> options) {
	return CallbackHandle::New(fn, options);
}

auto CallbackHandle::Definition() -> Local<FunctionTemplate> {
	return Inherit<TransferableHandle>(MakeClass(
		"Callback", ConstructorFunction<decltype(&CallbackHandle_New_Wrapper), &CallbackHandle_New_Wrapper>{}
	));
}

auto CallbackHandle::New(Local<Function> fn, MaybeLocal<Object> options) -> std::unique_ptr<CallbackHandle> {
	auto context = Isolate::GetCurrent()->GetCurrentContext();

	// Get function parameter count
	auto maybe_length = Unmaybe(fn->Get(context, StringTable::Get().length))->Int32Value(context);
	int length;
	if (!maybe_length.To(&length)) {
		length = 0;
	}

	// Read options
	auto apply = CallbackHandle::InvokeData::Apply::Sync;
	if (ReadOption(options, StringTable::Get().async, false)) {
		apply = CallbackHandle::InvokeData::Apply::Async;
	} else if (ReadOption(options, StringTable::Get().ignored, false)) {
		apply = CallbackHandle::InvokeData::Apply::Ignored;
	}

	// Return handle instance
	return std::make_unique<CallbackHandle>(CallbackHandle::Data{
		HandleCast<std::string>(fn->GetDebugName()),
		length,
		RemoteHandle<Function>{fn},
		RemoteHandle<Context>{context},
		apply});
}

auto CallbackHandle::TransferOut() -> std::unique_ptr<Transferable> {
	return std::make_unique<CallbackTransferable>(data);
}

/**
 * Runner for invocation of functions created by `Callback`
 */
class InvokeRunner : public ThreePhaseTask {
	public:
		InvokeRunner(CallbackHandle::Data data, const FunctionCallbackInfo<Value>& info) : data{std::move(data)} {
			// Transfer arguments out
			argv = std::make_unique<SerializedVector>(info);
		}

		void Phase2() final {
			// Setup context
			auto* isolate = Isolate::GetCurrent();
			auto& env = IsolateEnvironment::GetCurrent();
			auto context = Deref(data.context);
			Context::Scope context_scope{context};
			auto fn = Deref(data.callback);
			// Copy arguments into isolate
			auto argv_inner = argv->CopyIntoAsVector();
			// Run function and transfer out
			auto maybe_value = fn->Call(context, Undefined(isolate), argv_inner.size(), argv_inner.empty() ? nullptr : &argv_inner[0]);
			if (env.DidHitMemoryLimit()) {
				throw FatalRuntimeError("Isolate was disposed during execution due to memory limit");
			} else if (env.terminated) {
				throw FatalRuntimeError("Isolate was disposed during execution");
			}
			auto value = Unmaybe(maybe_value);
			if (data.apply != CallbackHandle::Data::Apply::Ignored) {
				result = TransferOut(value, TransferOptions{TransferOptions::Type::Copy});
			}
		}

		auto Phase3() -> Local<Value> final {
			if (result) {
				return result->TransferIn();
			} else {
				return Undefined(Isolate::GetCurrent());
			}
		}

	private:
		CallbackHandle::InvokeData data;
		std::unique_ptr<SerializedVector> argv;
		std::unique_ptr<Transferable> result;
};

/**
 * CallbackHandleTransferable implementation
 */
CallbackTransferable::CallbackTransferable(CallbackHandle::Data& data) : data{data} {}

CallbackTransferable::CallbackTransferable(Local<Function> data) :
	CallbackTransferable{data, Isolate::GetCurrent()->GetCurrentContext()} {}

CallbackTransferable::CallbackTransferable(Local<Function> fn, Local<Context> context) : data{
	[&]() {
		const auto name = fn->GetDebugName();
		if (name->IsString()) {
			return std::optional{HandleCast<std::string>(name)};
		} else {
			return std::optional<std::string>{};
		}
	}(),
	HandleCast<int>(Unmaybe(fn->Get(context, StringTable::Get().length))),
	RemoteHandle<Function>{fn},
	RemoteHandle<Context>{context},
	CallbackHandle::InvokeData::Apply::Sync
} {}

auto CallbackTransferable::TransferIn() -> Local<Value> {

	// Instantiate function in isolate
	auto* isolate = Isolate::GetCurrent();
	auto context = isolate->GetCurrentContext();
	auto external = MakeExternal<CallbackHandle::Data>(data);
	auto fn = Unmaybe(Function::New(context, Invoke, external, data.length, ConstructorBehavior::kThrow));
	if (data.name) {
		fn->SetName(HandleCast<Local<String>>(*data.name));
	}
	return fn;
}

void CallbackTransferable::Invoke(const FunctionCallbackInfo<Value>& info) {
	FunctorRunners::RunCallback(info, [&]() {
		auto& data = *static_cast<CallbackHandle::Data*>(info.Data().As<External>()->Value());
		auto& isolate = *data.context.GetIsolateHolder();
		switch (data.apply) {
			case CallbackHandle::Data::Apply::Sync:
				return ThreePhaseTask::Run<0, InvokeRunner>(isolate, data, info);
			case CallbackHandle::Data::Apply::Async:
				return ThreePhaseTask::Run<1, InvokeRunner>(isolate, data, info);
			case CallbackHandle::Data::Apply::Ignored:
				return ThreePhaseTask::Run<2, InvokeRunner>(isolate, data, info);
			default:
				throw std::logic_error{"Unknown callback flag"};
		}
	});
}

} // namespace ivm
