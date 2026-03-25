// Copyright 2020 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

syntax = "proto3";

package google.longrunning;

import "google/api/annotations.proto";
import "google/api/client.proto";
import "google/protobuf/any.proto";
import "google/protobuf/duration.proto";
import "google/protobuf/empty.proto";
import "google/rpc/status.proto";
import "google/protobuf/descriptor.proto";

option cc_enable_arenas = true;
option csharp_namespace = "Google.LongRunning";
option go_package = "cloud.google.com/go/longrunning/autogen/longrunningpb;longrunningpb";
option java_multiple_files = true;
option java_outer_classname = "OperationsProto";
option java_package = "com.google.longrunning";
option php_namespace = "Google\\LongRunning";

extend google.protobuf.MethodOptions {
  // Additional information regarding long-running operations.
  // In particular, this specifies the types that are returned from
  // long-running operations.
  //
  // Required for methods that return `google.longrunning.Operation`; invalid
  // otherwise.
  google.longrunning.OperationInfo operation_info = 1049;
}

// Manages long-running operations with an API service.
//
// When an API method normally takes long time to complete, it can be designed
// to return [Operation][google.longrunning.Operation] to the client, and the client can use this
// interface to receive the real response asynchronously by polling the
// operation resource, or pass the operation resource to another API (such as
// Google Cloud Pub/Sub API) to receive the response.  Any API service that
// returns long-running operations should implement the `Operations` interface
// so developers can have a consistent client experience.
service Operations {
  option (google.api.default_host) = "longrunning.googleapis.com";

  // Lists operations that match the specified filter in the request. If the
  // server doesn't support this method, it returns `UNIMPLEMENTED`.
  //
  // NOTE: the `name` binding allows API services to override the binding
  // to use different resource name schemes, such as `users/*/operations`. To
  // override the binding, API services can add a binding such as
  // `"/v1/{name=users/*}/operations"` to their service configuration.
  // For backwards compatibility, the default name includes the operations
  // collection id, however overriding users must ensure the name binding
  // is the parent resource, without the operations collection id.
  rpc ListOperations(ListOperationsRequest) returns (ListOperationsResponse) {
    option (google.api.http) = {
      get: "/v1/{name=operations}"
    };
    option (google.api.method_signature) = "name,filter";
  }

  // Gets the latest state of a long-running operation.  Clients can use this
  // method to poll the operation result at intervals as recommended by the API
  // service.
  rpc GetOperation(GetOperationRequest) returns (Operation) {
    option (google.api.http) = {
      get: "/v1/{name=operations/**}"
    };
    option (google.api.method_signature) = "name";
  }

  // Deletes a long-running operation. This method indicates that the client is
  // no longer interested in the operation result. It does not cancel the
  // operation. If the server doesn't support this method, it returns
  // `google.rpc.Code.UNIMPLEMENTED`.
  rpc DeleteOperation(DeleteOperationRequest) returns (google.protobuf.Empty) {
    option (google.api.http) = {
      delete: "/v1/{name=operations/**}"
    };
    option (google.api.method_signature) = "name";
  }

  // Starts asynchronous cancellation on a long-running operation.  The server
  // makes a best effort to cancel the operation, but success is not
  // guaranteed.  If the server doesn't support this method, it returns
  // `google.rpc.Code.UNIMPLEMENTED`.  Clients can use
  // [Operations.GetOperation][google.longrunning.Operations.GetOperation] or
  // other methods to check whether the cancellation succeeded or whether the
  // operation completed despite cancellation. On successful cancellation,
  // the operation is not deleted; instead, it becomes an operation with
  // an [Operation.error][google.longrunning.Operation.error] value with a [google.rpc.Status.code][google.rpc.Status.code] of 1,
  // corresponding to `Code.CANCELLED`.
  rpc CancelOperation(CancelOperationRequest) returns (google.protobuf.Empty) {
    option (google.api.http) = {
      post: "/v1/{name=operations/**}:cancel"
      body: "*"
    };
    option (google.api.method_signature) = "name";
  }

  // Waits until the specified long-running operation is done or reaches at most
  // a specified timeout, returning the latest state.  If the operation is
  // already done, the latest state is immediately returned.  If the timeout
  // specified is greater than the default HTTP/RPC timeout, the HTTP/RPC
  // timeout is used.  If the server does not support this method, it returns
  // `google.rpc.Code.UNIMPLEMENTED`.
  // Note that this method is on a best-effort basis.  It may return the latest
  // state before the specified timeout (including immediately), meaning even an
  // immediate response is no guarantee that the operation is done.
  rpc WaitOperation(WaitOperationRequest) returns (Operation) {
  }
}

// This resource represents a long-running operation that is the result of a
// network API call.
message Operation {
  // The server-assigned name, which is only unique within the same service that
  // originally returns it. If you use the default HTTP mapping, the
  // `name` should be a resource name ending with `operations/{unique_id}`.
  string name = 1;

  // Service-specific metadata associated with the operation.  It typically
  // contains progress information and common metadata such as create time.
  // Some services might not provide such metadata.  Any method that returns a
  // long-running operation should document the metadata type, if any.
  google.protobuf.Any metadata = 2;

  // If the value is `false`, it means the operation is still in progress.
  // If `true`, the operation is completed, and either `error` or `response` is
  // available.
  bool done = 3;

  // The operation result, which can be either an `error` or a valid `response`.
  // If `done` == `false`, neither `error` nor `response` is set.
  // If `done` == `true`, exactly one of `error` or `response` is set.
  oneof result {
    // The error result of the operation in case of failure or cancellation.
    google.rpc.Status error = 4;

    // The normal response of the operation in case of success.  If the original
    // method returns no data on success, such as `Delete`, the response is
    // `google.protobuf.Empty`.  If the original method is standard
    // `Get`/`Create`/`Update`, the response should be the resource.  For other
    // methods, the response should have the type `XxxResponse`, where `Xxx`
    // is the original method name.  For example, if the original method name
    // is `TakeSnapshot()`, the inferred response type is
    // `TakeSnapshotResponse`.
    google.protobuf.Any response = 5;
  }
}

// The request message for [Operations.GetOperation][google.longrunning.Operations.GetOperation].
message GetOperationRequest {
  // The name of the operation resource.
  string name = 1;
}

// The request message for [Operations.ListOperations][google.longrunning.Operations.ListOperations].
message ListOperationsRequest {
  // The name of the operation's parent resource.
  string name = 4;

  // The standard list filter.
  string filter = 1;

  // The standard list page size.
  int32 page_size = 2;

  // The standard list page token.
  string page_token = 3;
}

// The response message for [Operations.ListOperations][google.longrunning.Operations.ListOperations].
message ListOperationsResponse {
  // A list of operations that matches the specified filter in the request.
  repeated Operation operations = 1;

  // The standard List next-page token.
  string next_page_token = 2;
}

// The request message for [Operations.CancelOperation][google.longrunning.Operations.CancelOperation].
message CancelOperationRequest {
  // The name of the operation resource to be cancelled.
  string name = 1;
}

// The request message for [Operations.DeleteOperation][google.longrunning.Operations.DeleteOperation].
message DeleteOperationRequest {
  // The name of the operation resource to be deleted.
  string name = 1;
}

// The request message for [Operations.WaitOperation][google.longrunning.Operations.WaitOperation].
message WaitOperationRequest {
  // The name of the operation resource to wait on.
  string name = 1;

  // The maximum duration to wait before timing out. If left blank, the wait
  // will be at most the time permitted by the underlying HTTP/RPC protocol.
  // If RPC context deadline is also specified, the shorter one will be used.
  google.protobuf.Duration timeout = 2;
}

// A message representing the message types used by a long-running operation.
//
// Example:
//
//   rpc LongRunningRecognize(LongRunningRecognizeRequest)
//       returns (google.longrunning.Operation) {
//     option (google.longrunning.operation_info) = {
//       response_type: "LongRunningRecognizeResponse"
//       metadata_type: "LongRunningRecognizeMetadata"
//     };
//   }
message OperationInfo {
  // Required. The message name of the primary return type for this
  // long-running operation.
  // This type will be used to deserialize the LRO's response.
  //
  // If the response is in a different package from the rpc, a fully-qualified
  // message name must be used (e.g. `google.protobuf.Struct`).
  //
  // Note: Altering this value constitutes a breaking change.
  string response_type = 1;

  // Required. The message name of the metadata type for this long-running
  // operation.
  //
  // If the response is in a different package from the rpc, a fully-qualified
  // message name must be used (e.g. `google.protobuf.Struct`).
  //
  // Note: Altering this value constitutes a breaking change.
  string metadata_type = 2;
}
