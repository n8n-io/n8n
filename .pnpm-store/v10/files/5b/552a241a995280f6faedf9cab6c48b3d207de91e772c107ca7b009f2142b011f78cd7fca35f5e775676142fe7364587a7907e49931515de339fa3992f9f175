// Copyright 2021 Google LLC
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

package google.api.servicecontrol.v1;

import "google/api/annotations.proto";
import "google/api/client.proto";
import "google/api/servicecontrol/v1/check_error.proto";
import "google/api/servicecontrol/v1/operation.proto";
import "google/rpc/status.proto";

option cc_enable_arenas = true;
option csharp_namespace = "Google.Cloud.ServiceControl.V1";
option go_package = "cloud.google.com/go/servicecontrol/apiv1/servicecontrolpb;servicecontrolpb";
option java_multiple_files = true;
option java_outer_classname = "ServiceControllerProto";
option java_package = "com.google.api.servicecontrol.v1";
option objc_class_prefix = "GASC";
option php_namespace = "Google\\Cloud\\ServiceControl\\V1";
option ruby_package = "Google::Cloud::ServiceControl::V1";

// [Google Service Control API](/service-control/overview)
//
// Lets clients check and report operations against a [managed
// service](https://cloud.google.com/service-management/reference/rpc/google.api/servicemanagement.v1#google.api.servicemanagement.v1.ManagedService).
service ServiceController {
  option (google.api.default_host) = "servicecontrol.googleapis.com";
  option (google.api.oauth_scopes) =
      "https://www.googleapis.com/auth/cloud-platform,"
      "https://www.googleapis.com/auth/servicecontrol";

  // Checks whether an operation on a service should be allowed to proceed
  // based on the configuration of the service and related policies. It must be
  // called before the operation is executed.
  //
  // If feasible, the client should cache the check results and reuse them for
  // 60 seconds. In case of any server errors, the client should rely on the
  // cached results for much longer time to avoid outage.
  // WARNING: There is general 60s delay for the configuration and policy
  // propagation, therefore callers MUST NOT depend on the `Check` method having
  // the latest policy information.
  //
  // NOTE: the [CheckRequest][google.api.servicecontrol.v1.CheckRequest] has
  // the size limit (wire-format byte size) of 1MB.
  //
  // This method requires the `servicemanagement.services.check` permission
  // on the specified service. For more information, see
  // [Cloud IAM](https://cloud.google.com/iam).
  rpc Check(CheckRequest) returns (CheckResponse) {
    option (google.api.http) = {
      post: "/v1/services/{service_name}:check"
      body: "*"
    };
  }

  // Reports operation results to Google Service Control, such as logs and
  // metrics. It should be called after an operation is completed.
  //
  // If feasible, the client should aggregate reporting data for up to 5
  // seconds to reduce API traffic. Limiting aggregation to 5 seconds is to
  // reduce data loss during client crashes. Clients should carefully choose
  // the aggregation time window to avoid data loss risk more than 0.01%
  // for business and compliance reasons.
  //
  // NOTE: the [ReportRequest][google.api.servicecontrol.v1.ReportRequest] has
  // the size limit (wire-format byte size) of 1MB.
  //
  // This method requires the `servicemanagement.services.report` permission
  // on the specified service. For more information, see
  // [Google Cloud IAM](https://cloud.google.com/iam).
  rpc Report(ReportRequest) returns (ReportResponse) {
    option (google.api.http) = {
      post: "/v1/services/{service_name}:report"
      body: "*"
    };
  }
}

// Request message for the Check method.
message CheckRequest {
  // The service name as specified in its service configuration. For example,
  // `"pubsub.googleapis.com"`.
  //
  // See
  // [google.api.Service](https://cloud.google.com/service-management/reference/rpc/google.api#google.api.Service)
  // for the definition of a service name.
  string service_name = 1;

  // The operation to be checked.
  Operation operation = 2;

  // Specifies which version of service configuration should be used to process
  // the request.
  //
  // If unspecified or no matching version can be found, the
  // latest one will be used.
  string service_config_id = 4;
}

// Response message for the Check method.
message CheckResponse {
  // Contains additional information about the check operation.
  message CheckInfo {
    // A list of fields and label keys that are ignored by the server.
    // The client doesn't need to send them for following requests to improve
    // performance and allow better aggregation.
    repeated string unused_arguments = 1;

    // Consumer info of this check.
    ConsumerInfo consumer_info = 2;

    // The unique id of the api key in the format of "apikey:<UID>".
    // This field will be populated when the consumer passed to Service Control
    // is an API key and all the API key related validations are successful.
    string api_key_uid = 5;
  }

  // `ConsumerInfo` provides information about the consumer.
  message ConsumerInfo {
    // The type of the consumer as defined in
    // [Google Resource Manager](https://cloud.google.com/resource-manager/).
    enum ConsumerType {
      // This is never used.
      CONSUMER_TYPE_UNSPECIFIED = 0;

      // The consumer is a Google Cloud Project.
      PROJECT = 1;

      // The consumer is a Google Cloud Folder.
      FOLDER = 2;

      // The consumer is a Google Cloud Organization.
      ORGANIZATION = 3;

      // Service-specific resource container which is defined by the service
      // producer to offer their users the ability to manage service control
      // functionalities at a finer level of granularity than the PROJECT.
      SERVICE_SPECIFIC = 4;
    }

    // The Google cloud project number, e.g. 1234567890. A value of 0 indicates
    // no project number is found.
    //
    // NOTE: This field is deprecated after we support flexible consumer
    // id. New code should not depend on this field anymore.
    int64 project_number = 1;

    // The type of the consumer which should have been defined in
    // [Google Resource Manager](https://cloud.google.com/resource-manager/).
    ConsumerType type = 2;

    // The consumer identity number, can be Google cloud project number, folder
    // number or organization number e.g. 1234567890. A value of 0 indicates no
    // consumer number is found.
    int64 consumer_number = 3;
  }

  // The same operation_id value used in the
  // [CheckRequest][google.api.servicecontrol.v1.CheckRequest]. Used for logging
  // and diagnostics purposes.
  string operation_id = 1;

  // Indicate the decision of the check.
  //
  // If no check errors are present, the service should process the operation.
  // Otherwise the service should use the list of errors to determine the
  // appropriate action.
  repeated CheckError check_errors = 2;

  // The actual config id used to process the request.
  string service_config_id = 5;

  // The current service rollout id used to process the request.
  string service_rollout_id = 11;

  // Feedback data returned from the server during processing a Check request.
  CheckInfo check_info = 6;
}

// Request message for the Report method.
message ReportRequest {
  // The service name as specified in its service configuration. For example,
  // `"pubsub.googleapis.com"`.
  //
  // See
  // [google.api.Service](https://cloud.google.com/service-management/reference/rpc/google.api#google.api.Service)
  // for the definition of a service name.
  string service_name = 1;

  // Operations to be reported.
  //
  // Typically the service should report one operation per request.
  // Putting multiple operations into a single request is allowed, but should
  // be used only when multiple operations are natually available at the time
  // of the report.
  //
  // There is no limit on the number of operations in the same ReportRequest,
  // however the ReportRequest size should be no larger than 1MB. See
  // [ReportResponse.report_errors][google.api.servicecontrol.v1.ReportResponse.report_errors]
  // for partial failure behavior.
  repeated Operation operations = 2;

  // Specifies which version of service config should be used to process the
  // request.
  //
  // If unspecified or no matching version can be found, the
  // latest one will be used.
  string service_config_id = 3;
}

// Response message for the Report method.
message ReportResponse {
  // Represents the processing error of one
  // [Operation][google.api.servicecontrol.v1.Operation] in the request.
  message ReportError {
    // The
    // [Operation.operation_id][google.api.servicecontrol.v1.Operation.operation_id]
    // value from the request.
    string operation_id = 1;

    // Details of the error when processing the
    // [Operation][google.api.servicecontrol.v1.Operation].
    google.rpc.Status status = 2;
  }

  // Partial failures, one for each `Operation` in the request that failed
  // processing. There are three possible combinations of the RPC status:
  //
  // 1. The combination of a successful RPC status and an empty `report_errors`
  //    list indicates a complete success where all `Operations` in the
  //    request are processed successfully.
  // 2. The combination of a successful RPC status and a non-empty
  //    `report_errors` list indicates a partial success where some
  //    `Operations` in the request succeeded. Each
  //    `Operation` that failed processing has a corresponding item
  //    in this list.
  // 3. A failed RPC status indicates a general non-deterministic failure.
  //    When this happens, it's impossible to know which of the
  //    'Operations' in the request succeeded or failed.
  repeated ReportError report_errors = 1;

  // The actual config id used to process the request.
  string service_config_id = 2;

  // The current service rollout id used to process the request.
  string service_rollout_id = 4;
}
