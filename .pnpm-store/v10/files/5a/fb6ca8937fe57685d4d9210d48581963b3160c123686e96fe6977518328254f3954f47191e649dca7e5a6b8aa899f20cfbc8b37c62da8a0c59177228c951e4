// Copyright 2023 Google LLC
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

package google.monitoring.v3;

import "google/api/annotations.proto";
import "google/api/client.proto";
import "google/api/field_behavior.proto";
import "google/api/resource.proto";
import "google/monitoring/v3/notification.proto";
import "google/protobuf/empty.proto";
import "google/protobuf/field_mask.proto";
import "google/protobuf/timestamp.proto";

option csharp_namespace = "Google.Cloud.Monitoring.V3";
option go_package = "cloud.google.com/go/monitoring/apiv3/v2/monitoringpb;monitoringpb";
option java_multiple_files = true;
option java_outer_classname = "NotificationServiceProto";
option java_package = "com.google.monitoring.v3";
option php_namespace = "Google\\Cloud\\Monitoring\\V3";
option ruby_package = "Google::Cloud::Monitoring::V3";

// The Notification Channel API provides access to configuration that
// controls how messages related to incidents are sent.
service NotificationChannelService {
  option (google.api.default_host) = "monitoring.googleapis.com";
  option (google.api.oauth_scopes) =
      "https://www.googleapis.com/auth/cloud-platform,"
      "https://www.googleapis.com/auth/monitoring,"
      "https://www.googleapis.com/auth/monitoring.read";

  // Lists the descriptors for supported channel types. The use of descriptors
  // makes it possible for new channel types to be dynamically added.
  rpc ListNotificationChannelDescriptors(
      ListNotificationChannelDescriptorsRequest)
      returns (ListNotificationChannelDescriptorsResponse) {
    option (google.api.http) = {
      get: "/v3/{name=projects/*}/notificationChannelDescriptors"
    };
    option (google.api.method_signature) = "name";
  }

  // Gets a single channel descriptor. The descriptor indicates which fields
  // are expected / permitted for a notification channel of the given type.
  rpc GetNotificationChannelDescriptor(GetNotificationChannelDescriptorRequest)
      returns (NotificationChannelDescriptor) {
    option (google.api.http) = {
      get: "/v3/{name=projects/*/notificationChannelDescriptors/*}"
    };
    option (google.api.method_signature) = "name";
  }

  // Lists the notification channels that have been created for the project.
  // To list the types of notification channels that are supported, use
  // the `ListNotificationChannelDescriptors` method.
  rpc ListNotificationChannels(ListNotificationChannelsRequest)
      returns (ListNotificationChannelsResponse) {
    option (google.api.http) = {
      get: "/v3/{name=projects/*}/notificationChannels"
    };
    option (google.api.method_signature) = "name";
  }

  // Gets a single notification channel. The channel includes the relevant
  // configuration details with which the channel was created. However, the
  // response may truncate or omit passwords, API keys, or other private key
  // matter and thus the response may not be 100% identical to the information
  // that was supplied in the call to the create method.
  rpc GetNotificationChannel(GetNotificationChannelRequest)
      returns (NotificationChannel) {
    option (google.api.http) = {
      get: "/v3/{name=projects/*/notificationChannels/*}"
    };
    option (google.api.method_signature) = "name";
  }

  // Creates a new notification channel, representing a single notification
  // endpoint such as an email address, SMS number, or PagerDuty service.
  //
  // Design your application to single-thread API calls that modify the state of
  // notification channels in a single project. This includes calls to
  // CreateNotificationChannel, DeleteNotificationChannel and
  // UpdateNotificationChannel.
  rpc CreateNotificationChannel(CreateNotificationChannelRequest)
      returns (NotificationChannel) {
    option (google.api.http) = {
      post: "/v3/{name=projects/*}/notificationChannels"
      body: "notification_channel"
    };
    option (google.api.method_signature) = "name,notification_channel";
  }

  // Updates a notification channel. Fields not specified in the field mask
  // remain unchanged.
  //
  // Design your application to single-thread API calls that modify the state of
  // notification channels in a single project. This includes calls to
  // CreateNotificationChannel, DeleteNotificationChannel and
  // UpdateNotificationChannel.
  rpc UpdateNotificationChannel(UpdateNotificationChannelRequest)
      returns (NotificationChannel) {
    option (google.api.http) = {
      patch: "/v3/{notification_channel.name=projects/*/notificationChannels/*}"
      body: "notification_channel"
    };
    option (google.api.method_signature) = "update_mask,notification_channel";
  }

  // Deletes a notification channel.
  //
  // Design your application to single-thread API calls that modify the state of
  // notification channels in a single project. This includes calls to
  // CreateNotificationChannel, DeleteNotificationChannel and
  // UpdateNotificationChannel.
  rpc DeleteNotificationChannel(DeleteNotificationChannelRequest)
      returns (google.protobuf.Empty) {
    option (google.api.http) = {
      delete: "/v3/{name=projects/*/notificationChannels/*}"
    };
    option (google.api.method_signature) = "name,force";
  }

  // Causes a verification code to be delivered to the channel. The code
  // can then be supplied in `VerifyNotificationChannel` to verify the channel.
  rpc SendNotificationChannelVerificationCode(
      SendNotificationChannelVerificationCodeRequest)
      returns (google.protobuf.Empty) {
    option (google.api.http) = {
      post: "/v3/{name=projects/*/notificationChannels/*}:sendVerificationCode"
      body: "*"
    };
    option (google.api.method_signature) = "name";
  }

  // Requests a verification code for an already verified channel that can then
  // be used in a call to VerifyNotificationChannel() on a different channel
  // with an equivalent identity in the same or in a different project. This
  // makes it possible to copy a channel between projects without requiring
  // manual reverification of the channel. If the channel is not in the
  // verified state, this method will fail (in other words, this may only be
  // used if the SendNotificationChannelVerificationCode and
  // VerifyNotificationChannel paths have already been used to put the given
  // channel into the verified state).
  //
  // There is no guarantee that the verification codes returned by this method
  // will be of a similar structure or form as the ones that are delivered
  // to the channel via SendNotificationChannelVerificationCode; while
  // VerifyNotificationChannel() will recognize both the codes delivered via
  // SendNotificationChannelVerificationCode() and returned from
  // GetNotificationChannelVerificationCode(), it is typically the case that
  // the verification codes delivered via
  // SendNotificationChannelVerificationCode() will be shorter and also
  // have a shorter expiration (e.g. codes such as "G-123456") whereas
  // GetVerificationCode() will typically return a much longer, websafe base
  // 64 encoded string that has a longer expiration time.
  rpc GetNotificationChannelVerificationCode(
      GetNotificationChannelVerificationCodeRequest)
      returns (GetNotificationChannelVerificationCodeResponse) {
    option (google.api.http) = {
      post: "/v3/{name=projects/*/notificationChannels/*}:getVerificationCode"
      body: "*"
    };
    option (google.api.method_signature) = "name";
  }

  // Verifies a `NotificationChannel` by proving receipt of the code
  // delivered to the channel as a result of calling
  // `SendNotificationChannelVerificationCode`.
  rpc VerifyNotificationChannel(VerifyNotificationChannelRequest)
      returns (NotificationChannel) {
    option (google.api.http) = {
      post: "/v3/{name=projects/*/notificationChannels/*}:verify"
      body: "*"
    };
    option (google.api.method_signature) = "name,code";
  }
}

// The `ListNotificationChannelDescriptors` request.
message ListNotificationChannelDescriptorsRequest {
  // Required. The REST resource name of the parent from which to retrieve
  // the notification channel descriptors. The expected syntax is:
  //
  //     projects/[PROJECT_ID_OR_NUMBER]
  //
  // Note that this
  // [names](https://cloud.google.com/monitoring/api/v3#project_name) the parent
  // container in which to look for the descriptors; to retrieve a single
  // descriptor by name, use the
  // [GetNotificationChannelDescriptor][google.monitoring.v3.NotificationChannelService.GetNotificationChannelDescriptor]
  // operation, instead.
  string name = 4 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      child_type: "monitoring.googleapis.com/NotificationChannelDescriptor"
    }
  ];

  // The maximum number of results to return in a single response. If
  // not set to a positive number, a reasonable value will be chosen by the
  // service.
  int32 page_size = 2;

  // If non-empty, `page_token` must contain a value returned as the
  // `next_page_token` in a previous response to request the next set
  // of results.
  string page_token = 3;
}

// The `ListNotificationChannelDescriptors` response.
message ListNotificationChannelDescriptorsResponse {
  // The monitored resource descriptors supported for the specified
  // project, optionally filtered.
  repeated NotificationChannelDescriptor channel_descriptors = 1;

  // If not empty, indicates that there may be more results that match
  // the request. Use the value in the `page_token` field in a
  // subsequent request to fetch the next set of results. If empty,
  // all results have been returned.
  string next_page_token = 2;
}

// The `GetNotificationChannelDescriptor` response.
message GetNotificationChannelDescriptorRequest {
  // Required. The channel type for which to execute the request. The format is:
  //
  //     projects/[PROJECT_ID_OR_NUMBER]/notificationChannelDescriptors/[CHANNEL_TYPE]
  string name = 3 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      type: "monitoring.googleapis.com/NotificationChannelDescriptor"
    }
  ];
}

// The `CreateNotificationChannel` request.
message CreateNotificationChannelRequest {
  // Required. The
  // [project](https://cloud.google.com/monitoring/api/v3#project_name) on which
  // to execute the request. The format is:
  //
  //     projects/[PROJECT_ID_OR_NUMBER]
  //
  // This names the container into which the channel will be
  // written, this does not name the newly created channel. The resulting
  // channel's name will have a normalized version of this field as a prefix,
  // but will add `/notificationChannels/[CHANNEL_ID]` to identify the channel.
  string name = 3 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      child_type: "monitoring.googleapis.com/NotificationChannel"
    }
  ];

  // Required. The definition of the `NotificationChannel` to create.
  NotificationChannel notification_channel = 2
      [(google.api.field_behavior) = REQUIRED];
}

// The `ListNotificationChannels` request.
message ListNotificationChannelsRequest {
  // Required. The
  // [project](https://cloud.google.com/monitoring/api/v3#project_name) on which
  // to execute the request. The format is:
  //
  //     projects/[PROJECT_ID_OR_NUMBER]
  //
  // This names the container
  // in which to look for the notification channels; it does not name a
  // specific channel. To query a specific channel by REST resource name, use
  // the
  // [`GetNotificationChannel`][google.monitoring.v3.NotificationChannelService.GetNotificationChannel]
  // operation.
  string name = 5 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      child_type: "monitoring.googleapis.com/NotificationChannel"
    }
  ];

  // If provided, this field specifies the criteria that must be met by
  // notification channels to be included in the response.
  //
  // For more details, see [sorting and
  // filtering](https://cloud.google.com/monitoring/api/v3/sorting-and-filtering).
  string filter = 6;

  // A comma-separated list of fields by which to sort the result. Supports
  // the same set of fields as in `filter`. Entries can be prefixed with
  // a minus sign to sort in descending rather than ascending order.
  //
  // For more details, see [sorting and
  // filtering](https://cloud.google.com/monitoring/api/v3/sorting-and-filtering).
  string order_by = 7;

  // The maximum number of results to return in a single response. If
  // not set to a positive number, a reasonable value will be chosen by the
  // service.
  int32 page_size = 3;

  // If non-empty, `page_token` must contain a value returned as the
  // `next_page_token` in a previous response to request the next set
  // of results.
  string page_token = 4;
}

// The `ListNotificationChannels` response.
message ListNotificationChannelsResponse {
  // The notification channels defined for the specified project.
  repeated NotificationChannel notification_channels = 3;

  // If not empty, indicates that there may be more results that match
  // the request. Use the value in the `page_token` field in a
  // subsequent request to fetch the next set of results. If empty,
  // all results have been returned.
  string next_page_token = 2;

  // The total number of notification channels in all pages. This number is only
  // an estimate, and may change in subsequent pages. https://aip.dev/158
  int32 total_size = 4;
}

// The `GetNotificationChannel` request.
message GetNotificationChannelRequest {
  // Required. The channel for which to execute the request. The format is:
  //
  //     projects/[PROJECT_ID_OR_NUMBER]/notificationChannels/[CHANNEL_ID]
  string name = 3 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      type: "monitoring.googleapis.com/NotificationChannel"
    }
  ];
}

// The `UpdateNotificationChannel` request.
message UpdateNotificationChannelRequest {
  // The fields to update.
  google.protobuf.FieldMask update_mask = 2;

  // Required. A description of the changes to be applied to the specified
  // notification channel. The description must provide a definition for
  // fields to be updated; the names of these fields should also be
  // included in the `update_mask`.
  NotificationChannel notification_channel = 3
      [(google.api.field_behavior) = REQUIRED];
}

// The `DeleteNotificationChannel` request.
message DeleteNotificationChannelRequest {
  // Required. The channel for which to execute the request. The format is:
  //
  //     projects/[PROJECT_ID_OR_NUMBER]/notificationChannels/[CHANNEL_ID]
  string name = 3 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      type: "monitoring.googleapis.com/NotificationChannel"
    }
  ];

  // If true, the notification channel will be deleted regardless of its
  // use in alert policies (the policies will be updated to remove the
  // channel). If false, channels that are still referenced by an existing
  // alerting policy will fail to be deleted in a delete operation.
  bool force = 5;
}

// The `SendNotificationChannelVerificationCode` request.
message SendNotificationChannelVerificationCodeRequest {
  // Required. The notification channel to which to send a verification code.
  string name = 1 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      type: "monitoring.googleapis.com/NotificationChannel"
    }
  ];
}

// The `GetNotificationChannelVerificationCode` request.
message GetNotificationChannelVerificationCodeRequest {
  // Required. The notification channel for which a verification code is to be
  // generated and retrieved. This must name a channel that is already verified;
  // if the specified channel is not verified, the request will fail.
  string name = 1 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      type: "monitoring.googleapis.com/NotificationChannel"
    }
  ];

  // The desired expiration time. If specified, the API will guarantee that
  // the returned code will not be valid after the specified timestamp;
  // however, the API cannot guarantee that the returned code will be
  // valid for at least as long as the requested time (the API puts an upper
  // bound on the amount of time for which a code may be valid). If omitted,
  // a default expiration will be used, which may be less than the max
  // permissible expiration (so specifying an expiration may extend the
  // code's lifetime over omitting an expiration, even though the API does
  // impose an upper limit on the maximum expiration that is permitted).
  google.protobuf.Timestamp expire_time = 2;
}

// The `GetNotificationChannelVerificationCode` request.
message GetNotificationChannelVerificationCodeResponse {
  // The verification code, which may be used to verify other channels
  // that have an equivalent identity (i.e. other channels of the same
  // type with the same fingerprint such as other email channels with
  // the same email address or other sms channels with the same number).
  string code = 1;

  // The expiration time associated with the code that was returned. If
  // an expiration was provided in the request, this is the minimum of the
  // requested expiration in the request and the max permitted expiration.
  google.protobuf.Timestamp expire_time = 2;
}

// The `VerifyNotificationChannel` request.
message VerifyNotificationChannelRequest {
  // Required. The notification channel to verify.
  string name = 1 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      type: "monitoring.googleapis.com/NotificationChannel"
    }
  ];

  // Required. The verification code that was delivered to the channel as
  // a result of invoking the `SendNotificationChannelVerificationCode` API
  // method or that was retrieved from a verified channel via
  // `GetNotificationChannelVerificationCode`. For example, one might have
  // "G-123456" or "TKNZGhhd2EyN3I1MnRnMjRv" (in general, one is only
  // guaranteed that the code is valid UTF-8; one should not
  // make any assumptions regarding the structure or format of the code).
  string code = 2 [(google.api.field_behavior) = REQUIRED];
}
