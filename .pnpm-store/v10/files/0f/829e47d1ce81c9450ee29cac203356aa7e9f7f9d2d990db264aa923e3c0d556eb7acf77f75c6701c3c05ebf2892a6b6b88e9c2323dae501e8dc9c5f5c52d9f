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

package google.api;

import "google/protobuf/any.proto";
import "google/protobuf/timestamp.proto";

option go_package = "google.golang.org/genproto/googleapis/api/distribution;distribution";
option java_multiple_files = true;
option java_outer_classname = "DistributionProto";
option java_package = "com.google.api";
option objc_class_prefix = "GAPI";

// `Distribution` contains summary statistics for a population of values. It
// optionally contains a histogram representing the distribution of those values
// across a set of buckets.
//
// The summary statistics are the count, mean, sum of the squared deviation from
// the mean, the minimum, and the maximum of the set of population of values.
// The histogram is based on a sequence of buckets and gives a count of values
// that fall into each bucket. The boundaries of the buckets are given either
// explicitly or by formulas for buckets of fixed or exponentially increasing
// widths.
//
// Although it is not forbidden, it is generally a bad idea to include
// non-finite values (infinities or NaNs) in the population of values, as this
// will render the `mean` and `sum_of_squared_deviation` fields meaningless.
message Distribution {
  // The range of the population values.
  message Range {
    // The minimum of the population values.
    double min = 1;

    // The maximum of the population values.
    double max = 2;
  }

  // `BucketOptions` describes the bucket boundaries used to create a histogram
  // for the distribution. The buckets can be in a linear sequence, an
  // exponential sequence, or each bucket can be specified explicitly.
  // `BucketOptions` does not include the number of values in each bucket.
  //
  // A bucket has an inclusive lower bound and exclusive upper bound for the
  // values that are counted for that bucket. The upper bound of a bucket must
  // be strictly greater than the lower bound. The sequence of N buckets for a
  // distribution consists of an underflow bucket (number 0), zero or more
  // finite buckets (number 1 through N - 2) and an overflow bucket (number N -
  // 1). The buckets are contiguous: the lower bound of bucket i (i > 0) is the
  // same as the upper bound of bucket i - 1. The buckets span the whole range
  // of finite values: lower bound of the underflow bucket is -infinity and the
  // upper bound of the overflow bucket is +infinity. The finite buckets are
  // so-called because both bounds are finite.
  message BucketOptions {
    // Specifies a linear sequence of buckets that all have the same width
    // (except overflow and underflow). Each bucket represents a constant
    // absolute uncertainty on the specific value in the bucket.
    //
    // There are `num_finite_buckets + 2` (= N) buckets. Bucket `i` has the
    // following boundaries:
    //
    //    Upper bound (0 <= i < N-1):     offset + (width * i).
    //
    //    Lower bound (1 <= i < N):       offset + (width * (i - 1)).
    message Linear {
      // Must be greater than 0.
      int32 num_finite_buckets = 1;

      // Must be greater than 0.
      double width = 2;

      // Lower bound of the first bucket.
      double offset = 3;
    }

    // Specifies an exponential sequence of buckets that have a width that is
    // proportional to the value of the lower bound. Each bucket represents a
    // constant relative uncertainty on a specific value in the bucket.
    //
    // There are `num_finite_buckets + 2` (= N) buckets. Bucket `i` has the
    // following boundaries:
    //
    //    Upper bound (0 <= i < N-1):     scale * (growth_factor ^ i).
    //
    //    Lower bound (1 <= i < N):       scale * (growth_factor ^ (i - 1)).
    message Exponential {
      // Must be greater than 0.
      int32 num_finite_buckets = 1;

      // Must be greater than 1.
      double growth_factor = 2;

      // Must be greater than 0.
      double scale = 3;
    }

    // Specifies a set of buckets with arbitrary widths.
    //
    // There are `size(bounds) + 1` (= N) buckets. Bucket `i` has the following
    // boundaries:
    //
    //    Upper bound (0 <= i < N-1):     bounds[i]
    //    Lower bound (1 <= i < N);       bounds[i - 1]
    //
    // The `bounds` field must contain at least one element. If `bounds` has
    // only one element, then there are no finite buckets, and that single
    // element is the common boundary of the overflow and underflow buckets.
    message Explicit {
      // The values must be monotonically increasing.
      repeated double bounds = 1;
    }

    // Exactly one of these three fields must be set.
    oneof options {
      // The linear bucket.
      Linear linear_buckets = 1;

      // The exponential buckets.
      Exponential exponential_buckets = 2;

      // The explicit buckets.
      Explicit explicit_buckets = 3;
    }
  }

  // Exemplars are example points that may be used to annotate aggregated
  // distribution values. They are metadata that gives information about a
  // particular value added to a Distribution bucket, such as a trace ID that
  // was active when a value was added. They may contain further information,
  // such as a example values and timestamps, origin, etc.
  message Exemplar {
    // Value of the exemplar point. This value determines to which bucket the
    // exemplar belongs.
    double value = 1;

    // The observation (sampling) time of the above value.
    google.protobuf.Timestamp timestamp = 2;

    // Contextual information about the example value. Examples are:
    //
    //   Trace: type.googleapis.com/google.monitoring.v3.SpanContext
    //
    //   Literal string: type.googleapis.com/google.protobuf.StringValue
    //
    //   Labels dropped during aggregation:
    //     type.googleapis.com/google.monitoring.v3.DroppedLabels
    //
    // There may be only a single attachment of any given message type in a
    // single exemplar, and this is enforced by the system.
    repeated google.protobuf.Any attachments = 3;
  }

  // The number of values in the population. Must be non-negative. This value
  // must equal the sum of the values in `bucket_counts` if a histogram is
  // provided.
  int64 count = 1;

  // The arithmetic mean of the values in the population. If `count` is zero
  // then this field must be zero.
  double mean = 2;

  // The sum of squared deviations from the mean of the values in the
  // population. For values x_i this is:
  //
  //     Sum[i=1..n]((x_i - mean)^2)
  //
  // Knuth, "The Art of Computer Programming", Vol. 2, page 232, 3rd edition
  // describes Welford's method for accumulating this sum in one pass.
  //
  // If `count` is zero then this field must be zero.
  double sum_of_squared_deviation = 3;

  // If specified, contains the range of the population values. The field
  // must not be present if the `count` is zero.
  Range range = 4;

  // Defines the histogram bucket boundaries. If the distribution does not
  // contain a histogram, then omit this field.
  BucketOptions bucket_options = 6;

  // The number of values in each bucket of the histogram, as described in
  // `bucket_options`. If the distribution does not have a histogram, then omit
  // this field. If there is a histogram, then the sum of the values in
  // `bucket_counts` must equal the value in the `count` field of the
  // distribution.
  //
  // If present, `bucket_counts` should contain N values, where N is the number
  // of buckets specified in `bucket_options`. If you supply fewer than N
  // values, the remaining values are assumed to be 0.
  //
  // The order of the values in `bucket_counts` follows the bucket numbering
  // schemes described for the three bucket types. The first value must be the
  // count for the underflow bucket (number 0). The next N-2 values are the
  // counts for the finite buckets (number 1 through N-2). The N'th value in
  // `bucket_counts` is the count for the overflow bucket (number N-1).
  repeated int64 bucket_counts = 7;

  // Must be in increasing order of `value` field.
  repeated Exemplar exemplars = 10;
}
