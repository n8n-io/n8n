/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { createConstMap } from '../internal/utils';
//----------------------------------------------------------------------------------------------------------
// DO NOT EDIT, this is an Auto-generated file from scripts/semconv/templates//templates/SemanticAttributes.ts.j2
//----------------------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------------------
// Constant values for SemanticResourceAttributes
//----------------------------------------------------------------------------------------------------------
// Temporary local constants to assign to the individual exports and the namespaced version
// Required to avoid the namespace exports using the unminifiable export names for some package types
var TMP_CLOUD_PROVIDER = 'cloud.provider';
var TMP_CLOUD_ACCOUNT_ID = 'cloud.account.id';
var TMP_CLOUD_REGION = 'cloud.region';
var TMP_CLOUD_AVAILABILITY_ZONE = 'cloud.availability_zone';
var TMP_CLOUD_PLATFORM = 'cloud.platform';
var TMP_AWS_ECS_CONTAINER_ARN = 'aws.ecs.container.arn';
var TMP_AWS_ECS_CLUSTER_ARN = 'aws.ecs.cluster.arn';
var TMP_AWS_ECS_LAUNCHTYPE = 'aws.ecs.launchtype';
var TMP_AWS_ECS_TASK_ARN = 'aws.ecs.task.arn';
var TMP_AWS_ECS_TASK_FAMILY = 'aws.ecs.task.family';
var TMP_AWS_ECS_TASK_REVISION = 'aws.ecs.task.revision';
var TMP_AWS_EKS_CLUSTER_ARN = 'aws.eks.cluster.arn';
var TMP_AWS_LOG_GROUP_NAMES = 'aws.log.group.names';
var TMP_AWS_LOG_GROUP_ARNS = 'aws.log.group.arns';
var TMP_AWS_LOG_STREAM_NAMES = 'aws.log.stream.names';
var TMP_AWS_LOG_STREAM_ARNS = 'aws.log.stream.arns';
var TMP_CONTAINER_NAME = 'container.name';
var TMP_CONTAINER_ID = 'container.id';
var TMP_CONTAINER_RUNTIME = 'container.runtime';
var TMP_CONTAINER_IMAGE_NAME = 'container.image.name';
var TMP_CONTAINER_IMAGE_TAG = 'container.image.tag';
var TMP_DEPLOYMENT_ENVIRONMENT = 'deployment.environment';
var TMP_DEVICE_ID = 'device.id';
var TMP_DEVICE_MODEL_IDENTIFIER = 'device.model.identifier';
var TMP_DEVICE_MODEL_NAME = 'device.model.name';
var TMP_FAAS_NAME = 'faas.name';
var TMP_FAAS_ID = 'faas.id';
var TMP_FAAS_VERSION = 'faas.version';
var TMP_FAAS_INSTANCE = 'faas.instance';
var TMP_FAAS_MAX_MEMORY = 'faas.max_memory';
var TMP_HOST_ID = 'host.id';
var TMP_HOST_NAME = 'host.name';
var TMP_HOST_TYPE = 'host.type';
var TMP_HOST_ARCH = 'host.arch';
var TMP_HOST_IMAGE_NAME = 'host.image.name';
var TMP_HOST_IMAGE_ID = 'host.image.id';
var TMP_HOST_IMAGE_VERSION = 'host.image.version';
var TMP_K8S_CLUSTER_NAME = 'k8s.cluster.name';
var TMP_K8S_NODE_NAME = 'k8s.node.name';
var TMP_K8S_NODE_UID = 'k8s.node.uid';
var TMP_K8S_NAMESPACE_NAME = 'k8s.namespace.name';
var TMP_K8S_POD_UID = 'k8s.pod.uid';
var TMP_K8S_POD_NAME = 'k8s.pod.name';
var TMP_K8S_CONTAINER_NAME = 'k8s.container.name';
var TMP_K8S_REPLICASET_UID = 'k8s.replicaset.uid';
var TMP_K8S_REPLICASET_NAME = 'k8s.replicaset.name';
var TMP_K8S_DEPLOYMENT_UID = 'k8s.deployment.uid';
var TMP_K8S_DEPLOYMENT_NAME = 'k8s.deployment.name';
var TMP_K8S_STATEFULSET_UID = 'k8s.statefulset.uid';
var TMP_K8S_STATEFULSET_NAME = 'k8s.statefulset.name';
var TMP_K8S_DAEMONSET_UID = 'k8s.daemonset.uid';
var TMP_K8S_DAEMONSET_NAME = 'k8s.daemonset.name';
var TMP_K8S_JOB_UID = 'k8s.job.uid';
var TMP_K8S_JOB_NAME = 'k8s.job.name';
var TMP_K8S_CRONJOB_UID = 'k8s.cronjob.uid';
var TMP_K8S_CRONJOB_NAME = 'k8s.cronjob.name';
var TMP_OS_TYPE = 'os.type';
var TMP_OS_DESCRIPTION = 'os.description';
var TMP_OS_NAME = 'os.name';
var TMP_OS_VERSION = 'os.version';
var TMP_PROCESS_PID = 'process.pid';
var TMP_PROCESS_EXECUTABLE_NAME = 'process.executable.name';
var TMP_PROCESS_EXECUTABLE_PATH = 'process.executable.path';
var TMP_PROCESS_COMMAND = 'process.command';
var TMP_PROCESS_COMMAND_LINE = 'process.command_line';
var TMP_PROCESS_COMMAND_ARGS = 'process.command_args';
var TMP_PROCESS_OWNER = 'process.owner';
var TMP_PROCESS_RUNTIME_NAME = 'process.runtime.name';
var TMP_PROCESS_RUNTIME_VERSION = 'process.runtime.version';
var TMP_PROCESS_RUNTIME_DESCRIPTION = 'process.runtime.description';
var TMP_SERVICE_NAME = 'service.name';
var TMP_SERVICE_NAMESPACE = 'service.namespace';
var TMP_SERVICE_INSTANCE_ID = 'service.instance.id';
var TMP_SERVICE_VERSION = 'service.version';
var TMP_TELEMETRY_SDK_NAME = 'telemetry.sdk.name';
var TMP_TELEMETRY_SDK_LANGUAGE = 'telemetry.sdk.language';
var TMP_TELEMETRY_SDK_VERSION = 'telemetry.sdk.version';
var TMP_TELEMETRY_AUTO_VERSION = 'telemetry.auto.version';
var TMP_WEBENGINE_NAME = 'webengine.name';
var TMP_WEBENGINE_VERSION = 'webengine.version';
var TMP_WEBENGINE_DESCRIPTION = 'webengine.description';
/**
 * Name of the cloud provider.
 *
 * @deprecated use ATTR_CLOUD_PROVIDER
 */
export var SEMRESATTRS_CLOUD_PROVIDER = TMP_CLOUD_PROVIDER;
/**
 * The cloud account ID the resource is assigned to.
 *
 * @deprecated use ATTR_CLOUD_ACCOUNT_ID
 */
export var SEMRESATTRS_CLOUD_ACCOUNT_ID = TMP_CLOUD_ACCOUNT_ID;
/**
 * The geographical region the resource is running. Refer to your provider&#39;s docs to see the available regions, for example [Alibaba Cloud regions](https://www.alibabacloud.com/help/doc-detail/40654.htm), [AWS regions](https://aws.amazon.com/about-aws/global-infrastructure/regions_az/), [Azure regions](https://azure.microsoft.com/en-us/global-infrastructure/geographies/), or [Google Cloud regions](https://cloud.google.com/about/locations).
 *
 * @deprecated use ATTR_CLOUD_REGION
 */
export var SEMRESATTRS_CLOUD_REGION = TMP_CLOUD_REGION;
/**
 * Cloud regions often have multiple, isolated locations known as zones to increase availability. Availability zone represents the zone where the resource is running.
 *
 * Note: Availability zones are called &#34;zones&#34; on Alibaba Cloud and Google Cloud.
 *
 * @deprecated use ATTR_CLOUD_AVAILABILITY_ZONE
 */
export var SEMRESATTRS_CLOUD_AVAILABILITY_ZONE = TMP_CLOUD_AVAILABILITY_ZONE;
/**
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 *
 * @deprecated use ATTR_CLOUD_PLATFORM
 */
export var SEMRESATTRS_CLOUD_PLATFORM = TMP_CLOUD_PLATFORM;
/**
 * The Amazon Resource Name (ARN) of an [ECS container instance](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ECS_instances.html).
 *
 * @deprecated use ATTR_AWS_ECS_CONTAINER_ARN
 */
export var SEMRESATTRS_AWS_ECS_CONTAINER_ARN = TMP_AWS_ECS_CONTAINER_ARN;
/**
 * The ARN of an [ECS cluster](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/clusters.html).
 *
 * @deprecated use ATTR_AWS_ECS_CLUSTER_ARN
 */
export var SEMRESATTRS_AWS_ECS_CLUSTER_ARN = TMP_AWS_ECS_CLUSTER_ARN;
/**
 * The [launch type](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/launch_types.html) for an ECS task.
 *
 * @deprecated use ATTR_AWS_ECS_LAUNCHTYPE
 */
export var SEMRESATTRS_AWS_ECS_LAUNCHTYPE = TMP_AWS_ECS_LAUNCHTYPE;
/**
 * The ARN of an [ECS task definition](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html).
 *
 * @deprecated use ATTR_AWS_ECS_TASK_ARN
 */
export var SEMRESATTRS_AWS_ECS_TASK_ARN = TMP_AWS_ECS_TASK_ARN;
/**
 * The task definition family this task definition is a member of.
 *
 * @deprecated use ATTR_AWS_ECS_TASK_FAMILY
 */
export var SEMRESATTRS_AWS_ECS_TASK_FAMILY = TMP_AWS_ECS_TASK_FAMILY;
/**
 * The revision for this task definition.
 *
 * @deprecated use ATTR_AWS_ECS_TASK_REVISION
 */
export var SEMRESATTRS_AWS_ECS_TASK_REVISION = TMP_AWS_ECS_TASK_REVISION;
/**
 * The ARN of an EKS cluster.
 *
 * @deprecated use ATTR_AWS_EKS_CLUSTER_ARN
 */
export var SEMRESATTRS_AWS_EKS_CLUSTER_ARN = TMP_AWS_EKS_CLUSTER_ARN;
/**
 * The name(s) of the AWS log group(s) an application is writing to.
 *
 * Note: Multiple log groups must be supported for cases like multi-container applications, where a single application has sidecar containers, and each write to their own log group.
 *
 * @deprecated use ATTR_AWS_LOG_GROUP_NAMES
 */
export var SEMRESATTRS_AWS_LOG_GROUP_NAMES = TMP_AWS_LOG_GROUP_NAMES;
/**
 * The Amazon Resource Name(s) (ARN) of the AWS log group(s).
 *
 * Note: See the [log group ARN format documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/iam-access-control-overview-cwl.html#CWL_ARN_Format).
 *
 * @deprecated use ATTR_AWS_LOG_GROUP_ARNS
 */
export var SEMRESATTRS_AWS_LOG_GROUP_ARNS = TMP_AWS_LOG_GROUP_ARNS;
/**
 * The name(s) of the AWS log stream(s) an application is writing to.
 *
 * @deprecated use ATTR_AWS_LOG_STREAM_NAMES
 */
export var SEMRESATTRS_AWS_LOG_STREAM_NAMES = TMP_AWS_LOG_STREAM_NAMES;
/**
 * The ARN(s) of the AWS log stream(s).
 *
 * Note: See the [log stream ARN format documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/iam-access-control-overview-cwl.html#CWL_ARN_Format). One log group can contain several log streams, so these ARNs necessarily identify both a log group and a log stream.
 *
 * @deprecated use ATTR_AWS_LOG_STREAM_ARNS
 */
export var SEMRESATTRS_AWS_LOG_STREAM_ARNS = TMP_AWS_LOG_STREAM_ARNS;
/**
 * Container name.
 *
 * @deprecated use ATTR_CONTAINER_NAME
 */
export var SEMRESATTRS_CONTAINER_NAME = TMP_CONTAINER_NAME;
/**
 * Container ID. Usually a UUID, as for example used to [identify Docker containers](https://docs.docker.com/engine/reference/run/#container-identification). The UUID might be abbreviated.
 *
 * @deprecated use ATTR_CONTAINER_ID
 */
export var SEMRESATTRS_CONTAINER_ID = TMP_CONTAINER_ID;
/**
 * The container runtime managing this container.
 *
 * @deprecated use ATTR_CONTAINER_RUNTIME
 */
export var SEMRESATTRS_CONTAINER_RUNTIME = TMP_CONTAINER_RUNTIME;
/**
 * Name of the image the container was built on.
 *
 * @deprecated use ATTR_CONTAINER_IMAGE_NAME
 */
export var SEMRESATTRS_CONTAINER_IMAGE_NAME = TMP_CONTAINER_IMAGE_NAME;
/**
 * Container image tag.
 *
 * @deprecated use ATTR_CONTAINER_IMAGE_TAG
 */
export var SEMRESATTRS_CONTAINER_IMAGE_TAG = TMP_CONTAINER_IMAGE_TAG;
/**
 * Name of the [deployment environment](https://en.wikipedia.org/wiki/Deployment_environment) (aka deployment tier).
 *
 * @deprecated use ATTR_DEPLOYMENT_ENVIRONMENT
 */
export var SEMRESATTRS_DEPLOYMENT_ENVIRONMENT = TMP_DEPLOYMENT_ENVIRONMENT;
/**
 * A unique identifier representing the device.
 *
 * Note: The device identifier MUST only be defined using the values outlined below. This value is not an advertising identifier and MUST NOT be used as such. On iOS (Swift or Objective-C), this value MUST be equal to the [vendor identifier](https://developer.apple.com/documentation/uikit/uidevice/1620059-identifierforvendor). On Android (Java or Kotlin), this value MUST be equal to the Firebase Installation ID or a globally unique UUID which is persisted across sessions in your application. More information can be found [here](https://developer.android.com/training/articles/user-data-ids) on best practices and exact implementation details. Caution should be taken when storing personal data or anything which can identify a user. GDPR and data protection laws may apply, ensure you do your own due diligence.
 *
 * @deprecated use ATTR_DEVICE_ID
 */
export var SEMRESATTRS_DEVICE_ID = TMP_DEVICE_ID;
/**
 * The model identifier for the device.
 *
 * Note: It&#39;s recommended this value represents a machine readable version of the model identifier rather than the market or consumer-friendly name of the device.
 *
 * @deprecated use ATTR_DEVICE_MODEL_IDENTIFIER
 */
export var SEMRESATTRS_DEVICE_MODEL_IDENTIFIER = TMP_DEVICE_MODEL_IDENTIFIER;
/**
 * The marketing name for the device model.
 *
 * Note: It&#39;s recommended this value represents a human readable version of the device model rather than a machine readable alternative.
 *
 * @deprecated use ATTR_DEVICE_MODEL_NAME
 */
export var SEMRESATTRS_DEVICE_MODEL_NAME = TMP_DEVICE_MODEL_NAME;
/**
 * The name of the single function that this runtime instance executes.
 *
 * Note: This is the name of the function as configured/deployed on the FaaS platform and is usually different from the name of the callback function (which may be stored in the [`code.namespace`/`code.function`](../../trace/semantic_conventions/span-general.md#source-code-attributes) span attributes).
 *
 * @deprecated use ATTR_FAAS_NAME
 */
export var SEMRESATTRS_FAAS_NAME = TMP_FAAS_NAME;
/**
* The unique ID of the single function that this runtime instance executes.
*
* Note: Depending on the cloud provider, use:

* **AWS Lambda:** The function [ARN](https://docs.aws.amazon.com/general/latest/gr/aws-arns-and-namespaces.html).
Take care not to use the &#34;invoked ARN&#34; directly but replace any
[alias suffix](https://docs.aws.amazon.com/lambda/latest/dg/configuration-aliases.html) with the resolved function version, as the same runtime instance may be invokable with multiple
different aliases.
* **GCP:** The [URI of the resource](https://cloud.google.com/iam/docs/full-resource-names)
* **Azure:** The [Fully Qualified Resource ID](https://docs.microsoft.com/en-us/rest/api/resources/resources/get-by-id).

On some providers, it may not be possible to determine the full ID at startup,
which is why this field cannot be made required. For example, on AWS the account ID
part of the ARN is not available without calling another AWS API
which may be deemed too slow for a short-running lambda function.
As an alternative, consider setting `faas.id` as a span attribute instead.
*
* @deprecated use ATTR_FAAS_ID
*/
export var SEMRESATTRS_FAAS_ID = TMP_FAAS_ID;
/**
* The immutable version of the function being executed.
*
* Note: Depending on the cloud provider and platform, use:

* **AWS Lambda:** The [function version](https://docs.aws.amazon.com/lambda/latest/dg/configuration-versions.html)
  (an integer represented as a decimal string).
* **Google Cloud Run:** The [revision](https://cloud.google.com/run/docs/managing/revisions)
  (i.e., the function name plus the revision suffix).
* **Google Cloud Functions:** The value of the
  [`K_REVISION` environment variable](https://cloud.google.com/functions/docs/env-var#runtime_environment_variables_set_automatically).
* **Azure Functions:** Not applicable. Do not set this attribute.
*
* @deprecated use ATTR_FAAS_VERSION
*/
export var SEMRESATTRS_FAAS_VERSION = TMP_FAAS_VERSION;
/**
 * The execution environment ID as a string, that will be potentially reused for other invocations to the same function/function version.
 *
 * Note: * **AWS Lambda:** Use the (full) log stream name.
 *
 * @deprecated use ATTR_FAAS_INSTANCE
 */
export var SEMRESATTRS_FAAS_INSTANCE = TMP_FAAS_INSTANCE;
/**
 * The amount of memory available to the serverless function in MiB.
 *
 * Note: It&#39;s recommended to set this attribute since e.g. too little memory can easily stop a Java AWS Lambda function from working correctly. On AWS Lambda, the environment variable `AWS_LAMBDA_FUNCTION_MEMORY_SIZE` provides this information.
 *
 * @deprecated use ATTR_FAAS_MAX_MEMORY
 */
export var SEMRESATTRS_FAAS_MAX_MEMORY = TMP_FAAS_MAX_MEMORY;
/**
 * Unique host ID. For Cloud, this must be the instance_id assigned by the cloud provider.
 *
 * @deprecated use ATTR_HOST_ID
 */
export var SEMRESATTRS_HOST_ID = TMP_HOST_ID;
/**
 * Name of the host. On Unix systems, it may contain what the hostname command returns, or the fully qualified hostname, or another name specified by the user.
 *
 * @deprecated use ATTR_HOST_NAME
 */
export var SEMRESATTRS_HOST_NAME = TMP_HOST_NAME;
/**
 * Type of host. For Cloud, this must be the machine type.
 *
 * @deprecated use ATTR_HOST_TYPE
 */
export var SEMRESATTRS_HOST_TYPE = TMP_HOST_TYPE;
/**
 * The CPU architecture the host system is running on.
 *
 * @deprecated use ATTR_HOST_ARCH
 */
export var SEMRESATTRS_HOST_ARCH = TMP_HOST_ARCH;
/**
 * Name of the VM image or OS install the host was instantiated from.
 *
 * @deprecated use ATTR_HOST_IMAGE_NAME
 */
export var SEMRESATTRS_HOST_IMAGE_NAME = TMP_HOST_IMAGE_NAME;
/**
 * VM image ID. For Cloud, this value is from the provider.
 *
 * @deprecated use ATTR_HOST_IMAGE_ID
 */
export var SEMRESATTRS_HOST_IMAGE_ID = TMP_HOST_IMAGE_ID;
/**
 * The version string of the VM image as defined in [Version Attributes](README.md#version-attributes).
 *
 * @deprecated use ATTR_HOST_IMAGE_VERSION
 */
export var SEMRESATTRS_HOST_IMAGE_VERSION = TMP_HOST_IMAGE_VERSION;
/**
 * The name of the cluster.
 *
 * @deprecated use ATTR_K8S_CLUSTER_NAME
 */
export var SEMRESATTRS_K8S_CLUSTER_NAME = TMP_K8S_CLUSTER_NAME;
/**
 * The name of the Node.
 *
 * @deprecated use ATTR_K8S_NODE_NAME
 */
export var SEMRESATTRS_K8S_NODE_NAME = TMP_K8S_NODE_NAME;
/**
 * The UID of the Node.
 *
 * @deprecated use ATTR_K8S_NODE_UID
 */
export var SEMRESATTRS_K8S_NODE_UID = TMP_K8S_NODE_UID;
/**
 * The name of the namespace that the pod is running in.
 *
 * @deprecated use ATTR_K8S_NAMESPACE_NAME
 */
export var SEMRESATTRS_K8S_NAMESPACE_NAME = TMP_K8S_NAMESPACE_NAME;
/**
 * The UID of the Pod.
 *
 * @deprecated use ATTR_K8S_POD_UID
 */
export var SEMRESATTRS_K8S_POD_UID = TMP_K8S_POD_UID;
/**
 * The name of the Pod.
 *
 * @deprecated use ATTR_K8S_POD_NAME
 */
export var SEMRESATTRS_K8S_POD_NAME = TMP_K8S_POD_NAME;
/**
 * The name of the Container in a Pod template.
 *
 * @deprecated use ATTR_K8S_CONTAINER_NAME
 */
export var SEMRESATTRS_K8S_CONTAINER_NAME = TMP_K8S_CONTAINER_NAME;
/**
 * The UID of the ReplicaSet.
 *
 * @deprecated use ATTR_K8S_REPLICASET_UID
 */
export var SEMRESATTRS_K8S_REPLICASET_UID = TMP_K8S_REPLICASET_UID;
/**
 * The name of the ReplicaSet.
 *
 * @deprecated use ATTR_K8S_REPLICASET_NAME
 */
export var SEMRESATTRS_K8S_REPLICASET_NAME = TMP_K8S_REPLICASET_NAME;
/**
 * The UID of the Deployment.
 *
 * @deprecated use ATTR_K8S_DEPLOYMENT_UID
 */
export var SEMRESATTRS_K8S_DEPLOYMENT_UID = TMP_K8S_DEPLOYMENT_UID;
/**
 * The name of the Deployment.
 *
 * @deprecated use ATTR_K8S_DEPLOYMENT_NAME
 */
export var SEMRESATTRS_K8S_DEPLOYMENT_NAME = TMP_K8S_DEPLOYMENT_NAME;
/**
 * The UID of the StatefulSet.
 *
 * @deprecated use ATTR_K8S_STATEFULSET_UID
 */
export var SEMRESATTRS_K8S_STATEFULSET_UID = TMP_K8S_STATEFULSET_UID;
/**
 * The name of the StatefulSet.
 *
 * @deprecated use ATTR_K8S_STATEFULSET_NAME
 */
export var SEMRESATTRS_K8S_STATEFULSET_NAME = TMP_K8S_STATEFULSET_NAME;
/**
 * The UID of the DaemonSet.
 *
 * @deprecated use ATTR_K8S_DAEMONSET_UID
 */
export var SEMRESATTRS_K8S_DAEMONSET_UID = TMP_K8S_DAEMONSET_UID;
/**
 * The name of the DaemonSet.
 *
 * @deprecated use ATTR_K8S_DAEMONSET_NAME
 */
export var SEMRESATTRS_K8S_DAEMONSET_NAME = TMP_K8S_DAEMONSET_NAME;
/**
 * The UID of the Job.
 *
 * @deprecated use ATTR_K8S_JOB_UID
 */
export var SEMRESATTRS_K8S_JOB_UID = TMP_K8S_JOB_UID;
/**
 * The name of the Job.
 *
 * @deprecated use ATTR_K8S_JOB_NAME
 */
export var SEMRESATTRS_K8S_JOB_NAME = TMP_K8S_JOB_NAME;
/**
 * The UID of the CronJob.
 *
 * @deprecated use ATTR_K8S_CRONJOB_UID
 */
export var SEMRESATTRS_K8S_CRONJOB_UID = TMP_K8S_CRONJOB_UID;
/**
 * The name of the CronJob.
 *
 * @deprecated use ATTR_K8S_CRONJOB_NAME
 */
export var SEMRESATTRS_K8S_CRONJOB_NAME = TMP_K8S_CRONJOB_NAME;
/**
 * The operating system type.
 *
 * @deprecated use ATTR_OS_TYPE
 */
export var SEMRESATTRS_OS_TYPE = TMP_OS_TYPE;
/**
 * Human readable (not intended to be parsed) OS version information, like e.g. reported by `ver` or `lsb_release -a` commands.
 *
 * @deprecated use ATTR_OS_DESCRIPTION
 */
export var SEMRESATTRS_OS_DESCRIPTION = TMP_OS_DESCRIPTION;
/**
 * Human readable operating system name.
 *
 * @deprecated use ATTR_OS_NAME
 */
export var SEMRESATTRS_OS_NAME = TMP_OS_NAME;
/**
 * The version string of the operating system as defined in [Version Attributes](../../resource/semantic_conventions/README.md#version-attributes).
 *
 * @deprecated use ATTR_OS_VERSION
 */
export var SEMRESATTRS_OS_VERSION = TMP_OS_VERSION;
/**
 * Process identifier (PID).
 *
 * @deprecated use ATTR_PROCESS_PID
 */
export var SEMRESATTRS_PROCESS_PID = TMP_PROCESS_PID;
/**
 * The name of the process executable. On Linux based systems, can be set to the `Name` in `proc/[pid]/status`. On Windows, can be set to the base name of `GetProcessImageFileNameW`.
 *
 * @deprecated use ATTR_PROCESS_EXECUTABLE_NAME
 */
export var SEMRESATTRS_PROCESS_EXECUTABLE_NAME = TMP_PROCESS_EXECUTABLE_NAME;
/**
 * The full path to the process executable. On Linux based systems, can be set to the target of `proc/[pid]/exe`. On Windows, can be set to the result of `GetProcessImageFileNameW`.
 *
 * @deprecated use ATTR_PROCESS_EXECUTABLE_PATH
 */
export var SEMRESATTRS_PROCESS_EXECUTABLE_PATH = TMP_PROCESS_EXECUTABLE_PATH;
/**
 * The command used to launch the process (i.e. the command name). On Linux based systems, can be set to the zeroth string in `proc/[pid]/cmdline`. On Windows, can be set to the first parameter extracted from `GetCommandLineW`.
 *
 * @deprecated use ATTR_PROCESS_COMMAND
 */
export var SEMRESATTRS_PROCESS_COMMAND = TMP_PROCESS_COMMAND;
/**
 * The full command used to launch the process as a single string representing the full command. On Windows, can be set to the result of `GetCommandLineW`. Do not set this if you have to assemble it just for monitoring; use `process.command_args` instead.
 *
 * @deprecated use ATTR_PROCESS_COMMAND_LINE
 */
export var SEMRESATTRS_PROCESS_COMMAND_LINE = TMP_PROCESS_COMMAND_LINE;
/**
 * All the command arguments (including the command/executable itself) as received by the process. On Linux-based systems (and some other Unixoid systems supporting procfs), can be set according to the list of null-delimited strings extracted from `proc/[pid]/cmdline`. For libc-based executables, this would be the full argv vector passed to `main`.
 *
 * @deprecated use ATTR_PROCESS_COMMAND_ARGS
 */
export var SEMRESATTRS_PROCESS_COMMAND_ARGS = TMP_PROCESS_COMMAND_ARGS;
/**
 * The username of the user that owns the process.
 *
 * @deprecated use ATTR_PROCESS_OWNER
 */
export var SEMRESATTRS_PROCESS_OWNER = TMP_PROCESS_OWNER;
/**
 * The name of the runtime of this process. For compiled native binaries, this SHOULD be the name of the compiler.
 *
 * @deprecated use ATTR_PROCESS_RUNTIME_NAME
 */
export var SEMRESATTRS_PROCESS_RUNTIME_NAME = TMP_PROCESS_RUNTIME_NAME;
/**
 * The version of the runtime of this process, as returned by the runtime without modification.
 *
 * @deprecated use ATTR_PROCESS_RUNTIME_VERSION
 */
export var SEMRESATTRS_PROCESS_RUNTIME_VERSION = TMP_PROCESS_RUNTIME_VERSION;
/**
 * An additional description about the runtime of the process, for example a specific vendor customization of the runtime environment.
 *
 * @deprecated use ATTR_PROCESS_RUNTIME_DESCRIPTION
 */
export var SEMRESATTRS_PROCESS_RUNTIME_DESCRIPTION = TMP_PROCESS_RUNTIME_DESCRIPTION;
/**
 * Logical name of the service.
 *
 * Note: MUST be the same for all instances of horizontally scaled services. If the value was not specified, SDKs MUST fallback to `unknown_service:` concatenated with [`process.executable.name`](process.md#process), e.g. `unknown_service:bash`. If `process.executable.name` is not available, the value MUST be set to `unknown_service`.
 *
 * @deprecated use ATTR_SERVICE_NAME
 */
export var SEMRESATTRS_SERVICE_NAME = TMP_SERVICE_NAME;
/**
 * A namespace for `service.name`.
 *
 * Note: A string value having a meaning that helps to distinguish a group of services, for example the team name that owns a group of services. `service.name` is expected to be unique within the same namespace. If `service.namespace` is not specified in the Resource then `service.name` is expected to be unique for all services that have no explicit namespace defined (so the empty/unspecified namespace is simply one more valid namespace). Zero-length namespace string is assumed equal to unspecified namespace.
 *
 * @deprecated use ATTR_SERVICE_NAMESPACE
 */
export var SEMRESATTRS_SERVICE_NAMESPACE = TMP_SERVICE_NAMESPACE;
/**
 * The string ID of the service instance.
 *
 * Note: MUST be unique for each instance of the same `service.namespace,service.name` pair (in other words `service.namespace,service.name,service.instance.id` triplet MUST be globally unique). The ID helps to distinguish instances of the same service that exist at the same time (e.g. instances of a horizontally scaled service). It is preferable for the ID to be persistent and stay the same for the lifetime of the service instance, however it is acceptable that the ID is ephemeral and changes during important lifetime events for the service (e.g. service restarts). If the service has no inherent unique ID that can be used as the value of this attribute it is recommended to generate a random Version 1 or Version 4 RFC 4122 UUID (services aiming for reproducible UUIDs may also use Version 5, see RFC 4122 for more recommendations).
 *
 * @deprecated use ATTR_SERVICE_INSTANCE_ID
 */
export var SEMRESATTRS_SERVICE_INSTANCE_ID = TMP_SERVICE_INSTANCE_ID;
/**
 * The version string of the service API or implementation.
 *
 * @deprecated use ATTR_SERVICE_VERSION
 */
export var SEMRESATTRS_SERVICE_VERSION = TMP_SERVICE_VERSION;
/**
 * The name of the telemetry SDK as defined above.
 *
 * @deprecated use ATTR_TELEMETRY_SDK_NAME
 */
export var SEMRESATTRS_TELEMETRY_SDK_NAME = TMP_TELEMETRY_SDK_NAME;
/**
 * The language of the telemetry SDK.
 *
 * @deprecated use ATTR_TELEMETRY_SDK_LANGUAGE
 */
export var SEMRESATTRS_TELEMETRY_SDK_LANGUAGE = TMP_TELEMETRY_SDK_LANGUAGE;
/**
 * The version string of the telemetry SDK.
 *
 * @deprecated use ATTR_TELEMETRY_SDK_VERSION
 */
export var SEMRESATTRS_TELEMETRY_SDK_VERSION = TMP_TELEMETRY_SDK_VERSION;
/**
 * The version string of the auto instrumentation agent, if used.
 *
 * @deprecated use ATTR_TELEMETRY_AUTO_VERSION
 */
export var SEMRESATTRS_TELEMETRY_AUTO_VERSION = TMP_TELEMETRY_AUTO_VERSION;
/**
 * The name of the web engine.
 *
 * @deprecated use ATTR_WEBENGINE_NAME
 */
export var SEMRESATTRS_WEBENGINE_NAME = TMP_WEBENGINE_NAME;
/**
 * The version of the web engine.
 *
 * @deprecated use ATTR_WEBENGINE_VERSION
 */
export var SEMRESATTRS_WEBENGINE_VERSION = TMP_WEBENGINE_VERSION;
/**
 * Additional description of the web engine (e.g. detailed version and edition information).
 *
 * @deprecated use ATTR_WEBENGINE_DESCRIPTION
 */
export var SEMRESATTRS_WEBENGINE_DESCRIPTION = TMP_WEBENGINE_DESCRIPTION;
/**
 * Create exported Value Map for SemanticResourceAttributes values
 * @deprecated Use the SEMRESATTRS_XXXXX constants rather than the SemanticResourceAttributes.XXXXX for bundle minification
 */
export var SemanticResourceAttributes = 
/*#__PURE__*/ createConstMap([
    TMP_CLOUD_PROVIDER,
    TMP_CLOUD_ACCOUNT_ID,
    TMP_CLOUD_REGION,
    TMP_CLOUD_AVAILABILITY_ZONE,
    TMP_CLOUD_PLATFORM,
    TMP_AWS_ECS_CONTAINER_ARN,
    TMP_AWS_ECS_CLUSTER_ARN,
    TMP_AWS_ECS_LAUNCHTYPE,
    TMP_AWS_ECS_TASK_ARN,
    TMP_AWS_ECS_TASK_FAMILY,
    TMP_AWS_ECS_TASK_REVISION,
    TMP_AWS_EKS_CLUSTER_ARN,
    TMP_AWS_LOG_GROUP_NAMES,
    TMP_AWS_LOG_GROUP_ARNS,
    TMP_AWS_LOG_STREAM_NAMES,
    TMP_AWS_LOG_STREAM_ARNS,
    TMP_CONTAINER_NAME,
    TMP_CONTAINER_ID,
    TMP_CONTAINER_RUNTIME,
    TMP_CONTAINER_IMAGE_NAME,
    TMP_CONTAINER_IMAGE_TAG,
    TMP_DEPLOYMENT_ENVIRONMENT,
    TMP_DEVICE_ID,
    TMP_DEVICE_MODEL_IDENTIFIER,
    TMP_DEVICE_MODEL_NAME,
    TMP_FAAS_NAME,
    TMP_FAAS_ID,
    TMP_FAAS_VERSION,
    TMP_FAAS_INSTANCE,
    TMP_FAAS_MAX_MEMORY,
    TMP_HOST_ID,
    TMP_HOST_NAME,
    TMP_HOST_TYPE,
    TMP_HOST_ARCH,
    TMP_HOST_IMAGE_NAME,
    TMP_HOST_IMAGE_ID,
    TMP_HOST_IMAGE_VERSION,
    TMP_K8S_CLUSTER_NAME,
    TMP_K8S_NODE_NAME,
    TMP_K8S_NODE_UID,
    TMP_K8S_NAMESPACE_NAME,
    TMP_K8S_POD_UID,
    TMP_K8S_POD_NAME,
    TMP_K8S_CONTAINER_NAME,
    TMP_K8S_REPLICASET_UID,
    TMP_K8S_REPLICASET_NAME,
    TMP_K8S_DEPLOYMENT_UID,
    TMP_K8S_DEPLOYMENT_NAME,
    TMP_K8S_STATEFULSET_UID,
    TMP_K8S_STATEFULSET_NAME,
    TMP_K8S_DAEMONSET_UID,
    TMP_K8S_DAEMONSET_NAME,
    TMP_K8S_JOB_UID,
    TMP_K8S_JOB_NAME,
    TMP_K8S_CRONJOB_UID,
    TMP_K8S_CRONJOB_NAME,
    TMP_OS_TYPE,
    TMP_OS_DESCRIPTION,
    TMP_OS_NAME,
    TMP_OS_VERSION,
    TMP_PROCESS_PID,
    TMP_PROCESS_EXECUTABLE_NAME,
    TMP_PROCESS_EXECUTABLE_PATH,
    TMP_PROCESS_COMMAND,
    TMP_PROCESS_COMMAND_LINE,
    TMP_PROCESS_COMMAND_ARGS,
    TMP_PROCESS_OWNER,
    TMP_PROCESS_RUNTIME_NAME,
    TMP_PROCESS_RUNTIME_VERSION,
    TMP_PROCESS_RUNTIME_DESCRIPTION,
    TMP_SERVICE_NAME,
    TMP_SERVICE_NAMESPACE,
    TMP_SERVICE_INSTANCE_ID,
    TMP_SERVICE_VERSION,
    TMP_TELEMETRY_SDK_NAME,
    TMP_TELEMETRY_SDK_LANGUAGE,
    TMP_TELEMETRY_SDK_VERSION,
    TMP_TELEMETRY_AUTO_VERSION,
    TMP_WEBENGINE_NAME,
    TMP_WEBENGINE_VERSION,
    TMP_WEBENGINE_DESCRIPTION,
]);
/* ----------------------------------------------------------------------------------------------------------
 * Constant values for CloudProviderValues enum definition
 *
 * Name of the cloud provider.
 * ---------------------------------------------------------------------------------------------------------- */
// Temporary local constants to assign to the individual exports and the namespaced version
// Required to avoid the namespace exports using the unminifiable export names for some package types
var TMP_CLOUDPROVIDERVALUES_ALIBABA_CLOUD = 'alibaba_cloud';
var TMP_CLOUDPROVIDERVALUES_AWS = 'aws';
var TMP_CLOUDPROVIDERVALUES_AZURE = 'azure';
var TMP_CLOUDPROVIDERVALUES_GCP = 'gcp';
/**
 * Name of the cloud provider.
 *
 * @deprecated Use CLOUD_PROVIDER_VALUE_ALIBABA_CLOUD.
 */
export var CLOUDPROVIDERVALUES_ALIBABA_CLOUD = TMP_CLOUDPROVIDERVALUES_ALIBABA_CLOUD;
/**
 * Name of the cloud provider.
 *
 * @deprecated Use CLOUD_PROVIDER_VALUE_AWS.
 */
export var CLOUDPROVIDERVALUES_AWS = TMP_CLOUDPROVIDERVALUES_AWS;
/**
 * Name of the cloud provider.
 *
 * @deprecated Use CLOUD_PROVIDER_VALUE_AZURE.
 */
export var CLOUDPROVIDERVALUES_AZURE = TMP_CLOUDPROVIDERVALUES_AZURE;
/**
 * Name of the cloud provider.
 *
 * @deprecated Use CLOUD_PROVIDER_VALUE_GCP.
 */
export var CLOUDPROVIDERVALUES_GCP = TMP_CLOUDPROVIDERVALUES_GCP;
/**
 * The constant map of values for CloudProviderValues.
 * @deprecated Use the CLOUDPROVIDERVALUES_XXXXX constants rather than the CloudProviderValues.XXXXX for bundle minification.
 */
export var CloudProviderValues = 
/*#__PURE__*/ createConstMap([
    TMP_CLOUDPROVIDERVALUES_ALIBABA_CLOUD,
    TMP_CLOUDPROVIDERVALUES_AWS,
    TMP_CLOUDPROVIDERVALUES_AZURE,
    TMP_CLOUDPROVIDERVALUES_GCP,
]);
/* ----------------------------------------------------------------------------------------------------------
 * Constant values for CloudPlatformValues enum definition
 *
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 * ---------------------------------------------------------------------------------------------------------- */
// Temporary local constants to assign to the individual exports and the namespaced version
// Required to avoid the namespace exports using the unminifiable export names for some package types
var TMP_CLOUDPLATFORMVALUES_ALIBABA_CLOUD_ECS = 'alibaba_cloud_ecs';
var TMP_CLOUDPLATFORMVALUES_ALIBABA_CLOUD_FC = 'alibaba_cloud_fc';
var TMP_CLOUDPLATFORMVALUES_AWS_EC2 = 'aws_ec2';
var TMP_CLOUDPLATFORMVALUES_AWS_ECS = 'aws_ecs';
var TMP_CLOUDPLATFORMVALUES_AWS_EKS = 'aws_eks';
var TMP_CLOUDPLATFORMVALUES_AWS_LAMBDA = 'aws_lambda';
var TMP_CLOUDPLATFORMVALUES_AWS_ELASTIC_BEANSTALK = 'aws_elastic_beanstalk';
var TMP_CLOUDPLATFORMVALUES_AZURE_VM = 'azure_vm';
var TMP_CLOUDPLATFORMVALUES_AZURE_CONTAINER_INSTANCES = 'azure_container_instances';
var TMP_CLOUDPLATFORMVALUES_AZURE_AKS = 'azure_aks';
var TMP_CLOUDPLATFORMVALUES_AZURE_FUNCTIONS = 'azure_functions';
var TMP_CLOUDPLATFORMVALUES_AZURE_APP_SERVICE = 'azure_app_service';
var TMP_CLOUDPLATFORMVALUES_GCP_COMPUTE_ENGINE = 'gcp_compute_engine';
var TMP_CLOUDPLATFORMVALUES_GCP_CLOUD_RUN = 'gcp_cloud_run';
var TMP_CLOUDPLATFORMVALUES_GCP_KUBERNETES_ENGINE = 'gcp_kubernetes_engine';
var TMP_CLOUDPLATFORMVALUES_GCP_CLOUD_FUNCTIONS = 'gcp_cloud_functions';
var TMP_CLOUDPLATFORMVALUES_GCP_APP_ENGINE = 'gcp_app_engine';
/**
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 *
 * @deprecated Use CLOUD_PLATFORM_VALUE_ALIBABA_CLOUD_ECS.
 */
export var CLOUDPLATFORMVALUES_ALIBABA_CLOUD_ECS = TMP_CLOUDPLATFORMVALUES_ALIBABA_CLOUD_ECS;
/**
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 *
 * @deprecated Use CLOUD_PLATFORM_VALUE_ALIBABA_CLOUD_FC.
 */
export var CLOUDPLATFORMVALUES_ALIBABA_CLOUD_FC = TMP_CLOUDPLATFORMVALUES_ALIBABA_CLOUD_FC;
/**
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 *
 * @deprecated Use CLOUD_PLATFORM_VALUE_AWS_EC2.
 */
export var CLOUDPLATFORMVALUES_AWS_EC2 = TMP_CLOUDPLATFORMVALUES_AWS_EC2;
/**
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 *
 * @deprecated Use CLOUD_PLATFORM_VALUE_AWS_ECS.
 */
export var CLOUDPLATFORMVALUES_AWS_ECS = TMP_CLOUDPLATFORMVALUES_AWS_ECS;
/**
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 *
 * @deprecated Use CLOUD_PLATFORM_VALUE_AWS_EKS.
 */
export var CLOUDPLATFORMVALUES_AWS_EKS = TMP_CLOUDPLATFORMVALUES_AWS_EKS;
/**
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 *
 * @deprecated Use CLOUD_PLATFORM_VALUE_AWS_LAMBDA.
 */
export var CLOUDPLATFORMVALUES_AWS_LAMBDA = TMP_CLOUDPLATFORMVALUES_AWS_LAMBDA;
/**
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 *
 * @deprecated Use CLOUD_PLATFORM_VALUE_AWS_ELASTIC_BEANSTALK.
 */
export var CLOUDPLATFORMVALUES_AWS_ELASTIC_BEANSTALK = TMP_CLOUDPLATFORMVALUES_AWS_ELASTIC_BEANSTALK;
/**
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 *
 * @deprecated Use CLOUD_PLATFORM_VALUE_AZURE_VM.
 */
export var CLOUDPLATFORMVALUES_AZURE_VM = TMP_CLOUDPLATFORMVALUES_AZURE_VM;
/**
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 *
 * @deprecated Use CLOUD_PLATFORM_VALUE_AZURE_CONTAINER_INSTANCES.
 */
export var CLOUDPLATFORMVALUES_AZURE_CONTAINER_INSTANCES = TMP_CLOUDPLATFORMVALUES_AZURE_CONTAINER_INSTANCES;
/**
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 *
 * @deprecated Use CLOUD_PLATFORM_VALUE_AZURE_AKS.
 */
export var CLOUDPLATFORMVALUES_AZURE_AKS = TMP_CLOUDPLATFORMVALUES_AZURE_AKS;
/**
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 *
 * @deprecated Use CLOUD_PLATFORM_VALUE_AZURE_FUNCTIONS.
 */
export var CLOUDPLATFORMVALUES_AZURE_FUNCTIONS = TMP_CLOUDPLATFORMVALUES_AZURE_FUNCTIONS;
/**
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 *
 * @deprecated Use CLOUD_PLATFORM_VALUE_AZURE_APP_SERVICE.
 */
export var CLOUDPLATFORMVALUES_AZURE_APP_SERVICE = TMP_CLOUDPLATFORMVALUES_AZURE_APP_SERVICE;
/**
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 *
 * @deprecated Use CLOUD_PLATFORM_VALUE_GCP_COMPUTE_ENGINE.
 */
export var CLOUDPLATFORMVALUES_GCP_COMPUTE_ENGINE = TMP_CLOUDPLATFORMVALUES_GCP_COMPUTE_ENGINE;
/**
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 *
 * @deprecated Use CLOUD_PLATFORM_VALUE_GCP_CLOUD_RUN.
 */
export var CLOUDPLATFORMVALUES_GCP_CLOUD_RUN = TMP_CLOUDPLATFORMVALUES_GCP_CLOUD_RUN;
/**
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 *
 * @deprecated Use CLOUD_PLATFORM_VALUE_GCP_KUBERNETES_ENGINE.
 */
export var CLOUDPLATFORMVALUES_GCP_KUBERNETES_ENGINE = TMP_CLOUDPLATFORMVALUES_GCP_KUBERNETES_ENGINE;
/**
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 *
 * @deprecated Use CLOUD_PLATFORM_VALUE_GCP_CLOUD_FUNCTIONS.
 */
export var CLOUDPLATFORMVALUES_GCP_CLOUD_FUNCTIONS = TMP_CLOUDPLATFORMVALUES_GCP_CLOUD_FUNCTIONS;
/**
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 *
 * @deprecated Use CLOUD_PLATFORM_VALUE_GCP_APP_ENGINE.
 */
export var CLOUDPLATFORMVALUES_GCP_APP_ENGINE = TMP_CLOUDPLATFORMVALUES_GCP_APP_ENGINE;
/**
 * The constant map of values for CloudPlatformValues.
 * @deprecated Use the CLOUDPLATFORMVALUES_XXXXX constants rather than the CloudPlatformValues.XXXXX for bundle minification.
 */
export var CloudPlatformValues = 
/*#__PURE__*/ createConstMap([
    TMP_CLOUDPLATFORMVALUES_ALIBABA_CLOUD_ECS,
    TMP_CLOUDPLATFORMVALUES_ALIBABA_CLOUD_FC,
    TMP_CLOUDPLATFORMVALUES_AWS_EC2,
    TMP_CLOUDPLATFORMVALUES_AWS_ECS,
    TMP_CLOUDPLATFORMVALUES_AWS_EKS,
    TMP_CLOUDPLATFORMVALUES_AWS_LAMBDA,
    TMP_CLOUDPLATFORMVALUES_AWS_ELASTIC_BEANSTALK,
    TMP_CLOUDPLATFORMVALUES_AZURE_VM,
    TMP_CLOUDPLATFORMVALUES_AZURE_CONTAINER_INSTANCES,
    TMP_CLOUDPLATFORMVALUES_AZURE_AKS,
    TMP_CLOUDPLATFORMVALUES_AZURE_FUNCTIONS,
    TMP_CLOUDPLATFORMVALUES_AZURE_APP_SERVICE,
    TMP_CLOUDPLATFORMVALUES_GCP_COMPUTE_ENGINE,
    TMP_CLOUDPLATFORMVALUES_GCP_CLOUD_RUN,
    TMP_CLOUDPLATFORMVALUES_GCP_KUBERNETES_ENGINE,
    TMP_CLOUDPLATFORMVALUES_GCP_CLOUD_FUNCTIONS,
    TMP_CLOUDPLATFORMVALUES_GCP_APP_ENGINE,
]);
/* ----------------------------------------------------------------------------------------------------------
 * Constant values for AwsEcsLaunchtypeValues enum definition
 *
 * The [launch type](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/launch_types.html) for an ECS task.
 * ---------------------------------------------------------------------------------------------------------- */
// Temporary local constants to assign to the individual exports and the namespaced version
// Required to avoid the namespace exports using the unminifiable export names for some package types
var TMP_AWSECSLAUNCHTYPEVALUES_EC2 = 'ec2';
var TMP_AWSECSLAUNCHTYPEVALUES_FARGATE = 'fargate';
/**
 * The [launch type](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/launch_types.html) for an ECS task.
 *
 * @deprecated Use AWS_ECS_LAUNCHTYPE_VALUE_EC2.
 */
export var AWSECSLAUNCHTYPEVALUES_EC2 = TMP_AWSECSLAUNCHTYPEVALUES_EC2;
/**
 * The [launch type](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/launch_types.html) for an ECS task.
 *
 * @deprecated Use AWS_ECS_LAUNCHTYPE_VALUE_FARGATE.
 */
export var AWSECSLAUNCHTYPEVALUES_FARGATE = TMP_AWSECSLAUNCHTYPEVALUES_FARGATE;
/**
 * The constant map of values for AwsEcsLaunchtypeValues.
 * @deprecated Use the AWSECSLAUNCHTYPEVALUES_XXXXX constants rather than the AwsEcsLaunchtypeValues.XXXXX for bundle minification.
 */
export var AwsEcsLaunchtypeValues = 
/*#__PURE__*/ createConstMap([
    TMP_AWSECSLAUNCHTYPEVALUES_EC2,
    TMP_AWSECSLAUNCHTYPEVALUES_FARGATE,
]);
/* ----------------------------------------------------------------------------------------------------------
 * Constant values for HostArchValues enum definition
 *
 * The CPU architecture the host system is running on.
 * ---------------------------------------------------------------------------------------------------------- */
// Temporary local constants to assign to the individual exports and the namespaced version
// Required to avoid the namespace exports using the unminifiable export names for some package types
var TMP_HOSTARCHVALUES_AMD64 = 'amd64';
var TMP_HOSTARCHVALUES_ARM32 = 'arm32';
var TMP_HOSTARCHVALUES_ARM64 = 'arm64';
var TMP_HOSTARCHVALUES_IA64 = 'ia64';
var TMP_HOSTARCHVALUES_PPC32 = 'ppc32';
var TMP_HOSTARCHVALUES_PPC64 = 'ppc64';
var TMP_HOSTARCHVALUES_X86 = 'x86';
/**
 * The CPU architecture the host system is running on.
 *
 * @deprecated Use HOST_ARCH_VALUE_AMD64.
 */
export var HOSTARCHVALUES_AMD64 = TMP_HOSTARCHVALUES_AMD64;
/**
 * The CPU architecture the host system is running on.
 *
 * @deprecated Use HOST_ARCH_VALUE_ARM32.
 */
export var HOSTARCHVALUES_ARM32 = TMP_HOSTARCHVALUES_ARM32;
/**
 * The CPU architecture the host system is running on.
 *
 * @deprecated Use HOST_ARCH_VALUE_ARM64.
 */
export var HOSTARCHVALUES_ARM64 = TMP_HOSTARCHVALUES_ARM64;
/**
 * The CPU architecture the host system is running on.
 *
 * @deprecated Use HOST_ARCH_VALUE_IA64.
 */
export var HOSTARCHVALUES_IA64 = TMP_HOSTARCHVALUES_IA64;
/**
 * The CPU architecture the host system is running on.
 *
 * @deprecated Use HOST_ARCH_VALUE_PPC32.
 */
export var HOSTARCHVALUES_PPC32 = TMP_HOSTARCHVALUES_PPC32;
/**
 * The CPU architecture the host system is running on.
 *
 * @deprecated Use HOST_ARCH_VALUE_PPC64.
 */
export var HOSTARCHVALUES_PPC64 = TMP_HOSTARCHVALUES_PPC64;
/**
 * The CPU architecture the host system is running on.
 *
 * @deprecated Use HOST_ARCH_VALUE_X86.
 */
export var HOSTARCHVALUES_X86 = TMP_HOSTARCHVALUES_X86;
/**
 * The constant map of values for HostArchValues.
 * @deprecated Use the HOSTARCHVALUES_XXXXX constants rather than the HostArchValues.XXXXX for bundle minification.
 */
export var HostArchValues = 
/*#__PURE__*/ createConstMap([
    TMP_HOSTARCHVALUES_AMD64,
    TMP_HOSTARCHVALUES_ARM32,
    TMP_HOSTARCHVALUES_ARM64,
    TMP_HOSTARCHVALUES_IA64,
    TMP_HOSTARCHVALUES_PPC32,
    TMP_HOSTARCHVALUES_PPC64,
    TMP_HOSTARCHVALUES_X86,
]);
/* ----------------------------------------------------------------------------------------------------------
 * Constant values for OsTypeValues enum definition
 *
 * The operating system type.
 * ---------------------------------------------------------------------------------------------------------- */
// Temporary local constants to assign to the individual exports and the namespaced version
// Required to avoid the namespace exports using the unminifiable export names for some package types
var TMP_OSTYPEVALUES_WINDOWS = 'windows';
var TMP_OSTYPEVALUES_LINUX = 'linux';
var TMP_OSTYPEVALUES_DARWIN = 'darwin';
var TMP_OSTYPEVALUES_FREEBSD = 'freebsd';
var TMP_OSTYPEVALUES_NETBSD = 'netbsd';
var TMP_OSTYPEVALUES_OPENBSD = 'openbsd';
var TMP_OSTYPEVALUES_DRAGONFLYBSD = 'dragonflybsd';
var TMP_OSTYPEVALUES_HPUX = 'hpux';
var TMP_OSTYPEVALUES_AIX = 'aix';
var TMP_OSTYPEVALUES_SOLARIS = 'solaris';
var TMP_OSTYPEVALUES_Z_OS = 'z_os';
/**
 * The operating system type.
 *
 * @deprecated Use OS_TYPE_VALUE_WINDOWS.
 */
export var OSTYPEVALUES_WINDOWS = TMP_OSTYPEVALUES_WINDOWS;
/**
 * The operating system type.
 *
 * @deprecated Use OS_TYPE_VALUE_LINUX.
 */
export var OSTYPEVALUES_LINUX = TMP_OSTYPEVALUES_LINUX;
/**
 * The operating system type.
 *
 * @deprecated Use OS_TYPE_VALUE_DARWIN.
 */
export var OSTYPEVALUES_DARWIN = TMP_OSTYPEVALUES_DARWIN;
/**
 * The operating system type.
 *
 * @deprecated Use OS_TYPE_VALUE_FREEBSD.
 */
export var OSTYPEVALUES_FREEBSD = TMP_OSTYPEVALUES_FREEBSD;
/**
 * The operating system type.
 *
 * @deprecated Use OS_TYPE_VALUE_NETBSD.
 */
export var OSTYPEVALUES_NETBSD = TMP_OSTYPEVALUES_NETBSD;
/**
 * The operating system type.
 *
 * @deprecated Use OS_TYPE_VALUE_OPENBSD.
 */
export var OSTYPEVALUES_OPENBSD = TMP_OSTYPEVALUES_OPENBSD;
/**
 * The operating system type.
 *
 * @deprecated Use OS_TYPE_VALUE_DRAGONFLYBSD.
 */
export var OSTYPEVALUES_DRAGONFLYBSD = TMP_OSTYPEVALUES_DRAGONFLYBSD;
/**
 * The operating system type.
 *
 * @deprecated Use OS_TYPE_VALUE_HPUX.
 */
export var OSTYPEVALUES_HPUX = TMP_OSTYPEVALUES_HPUX;
/**
 * The operating system type.
 *
 * @deprecated Use OS_TYPE_VALUE_AIX.
 */
export var OSTYPEVALUES_AIX = TMP_OSTYPEVALUES_AIX;
/**
 * The operating system type.
 *
 * @deprecated Use OS_TYPE_VALUE_SOLARIS.
 */
export var OSTYPEVALUES_SOLARIS = TMP_OSTYPEVALUES_SOLARIS;
/**
 * The operating system type.
 *
 * @deprecated Use OS_TYPE_VALUE_Z_OS.
 */
export var OSTYPEVALUES_Z_OS = TMP_OSTYPEVALUES_Z_OS;
/**
 * The constant map of values for OsTypeValues.
 * @deprecated Use the OSTYPEVALUES_XXXXX constants rather than the OsTypeValues.XXXXX for bundle minification.
 */
export var OsTypeValues = 
/*#__PURE__*/ createConstMap([
    TMP_OSTYPEVALUES_WINDOWS,
    TMP_OSTYPEVALUES_LINUX,
    TMP_OSTYPEVALUES_DARWIN,
    TMP_OSTYPEVALUES_FREEBSD,
    TMP_OSTYPEVALUES_NETBSD,
    TMP_OSTYPEVALUES_OPENBSD,
    TMP_OSTYPEVALUES_DRAGONFLYBSD,
    TMP_OSTYPEVALUES_HPUX,
    TMP_OSTYPEVALUES_AIX,
    TMP_OSTYPEVALUES_SOLARIS,
    TMP_OSTYPEVALUES_Z_OS,
]);
/* ----------------------------------------------------------------------------------------------------------
 * Constant values for TelemetrySdkLanguageValues enum definition
 *
 * The language of the telemetry SDK.
 * ---------------------------------------------------------------------------------------------------------- */
// Temporary local constants to assign to the individual exports and the namespaced version
// Required to avoid the namespace exports using the unminifiable export names for some package types
var TMP_TELEMETRYSDKLANGUAGEVALUES_CPP = 'cpp';
var TMP_TELEMETRYSDKLANGUAGEVALUES_DOTNET = 'dotnet';
var TMP_TELEMETRYSDKLANGUAGEVALUES_ERLANG = 'erlang';
var TMP_TELEMETRYSDKLANGUAGEVALUES_GO = 'go';
var TMP_TELEMETRYSDKLANGUAGEVALUES_JAVA = 'java';
var TMP_TELEMETRYSDKLANGUAGEVALUES_NODEJS = 'nodejs';
var TMP_TELEMETRYSDKLANGUAGEVALUES_PHP = 'php';
var TMP_TELEMETRYSDKLANGUAGEVALUES_PYTHON = 'python';
var TMP_TELEMETRYSDKLANGUAGEVALUES_RUBY = 'ruby';
var TMP_TELEMETRYSDKLANGUAGEVALUES_WEBJS = 'webjs';
/**
 * The language of the telemetry SDK.
 *
 * @deprecated Use TELEMETRY_SDK_LANGUAGE_VALUE_CPP.
 */
export var TELEMETRYSDKLANGUAGEVALUES_CPP = TMP_TELEMETRYSDKLANGUAGEVALUES_CPP;
/**
 * The language of the telemetry SDK.
 *
 * @deprecated Use TELEMETRY_SDK_LANGUAGE_VALUE_DOTNET.
 */
export var TELEMETRYSDKLANGUAGEVALUES_DOTNET = TMP_TELEMETRYSDKLANGUAGEVALUES_DOTNET;
/**
 * The language of the telemetry SDK.
 *
 * @deprecated Use TELEMETRY_SDK_LANGUAGE_VALUE_ERLANG.
 */
export var TELEMETRYSDKLANGUAGEVALUES_ERLANG = TMP_TELEMETRYSDKLANGUAGEVALUES_ERLANG;
/**
 * The language of the telemetry SDK.
 *
 * @deprecated Use TELEMETRY_SDK_LANGUAGE_VALUE_GO.
 */
export var TELEMETRYSDKLANGUAGEVALUES_GO = TMP_TELEMETRYSDKLANGUAGEVALUES_GO;
/**
 * The language of the telemetry SDK.
 *
 * @deprecated Use TELEMETRY_SDK_LANGUAGE_VALUE_JAVA.
 */
export var TELEMETRYSDKLANGUAGEVALUES_JAVA = TMP_TELEMETRYSDKLANGUAGEVALUES_JAVA;
/**
 * The language of the telemetry SDK.
 *
 * @deprecated Use TELEMETRY_SDK_LANGUAGE_VALUE_NODEJS.
 */
export var TELEMETRYSDKLANGUAGEVALUES_NODEJS = TMP_TELEMETRYSDKLANGUAGEVALUES_NODEJS;
/**
 * The language of the telemetry SDK.
 *
 * @deprecated Use TELEMETRY_SDK_LANGUAGE_VALUE_PHP.
 */
export var TELEMETRYSDKLANGUAGEVALUES_PHP = TMP_TELEMETRYSDKLANGUAGEVALUES_PHP;
/**
 * The language of the telemetry SDK.
 *
 * @deprecated Use TELEMETRY_SDK_LANGUAGE_VALUE_PYTHON.
 */
export var TELEMETRYSDKLANGUAGEVALUES_PYTHON = TMP_TELEMETRYSDKLANGUAGEVALUES_PYTHON;
/**
 * The language of the telemetry SDK.
 *
 * @deprecated Use TELEMETRY_SDK_LANGUAGE_VALUE_RUBY.
 */
export var TELEMETRYSDKLANGUAGEVALUES_RUBY = TMP_TELEMETRYSDKLANGUAGEVALUES_RUBY;
/**
 * The language of the telemetry SDK.
 *
 * @deprecated Use TELEMETRY_SDK_LANGUAGE_VALUE_WEBJS.
 */
export var TELEMETRYSDKLANGUAGEVALUES_WEBJS = TMP_TELEMETRYSDKLANGUAGEVALUES_WEBJS;
/**
 * The constant map of values for TelemetrySdkLanguageValues.
 * @deprecated Use the TELEMETRYSDKLANGUAGEVALUES_XXXXX constants rather than the TelemetrySdkLanguageValues.XXXXX for bundle minification.
 */
export var TelemetrySdkLanguageValues = 
/*#__PURE__*/ createConstMap([
    TMP_TELEMETRYSDKLANGUAGEVALUES_CPP,
    TMP_TELEMETRYSDKLANGUAGEVALUES_DOTNET,
    TMP_TELEMETRYSDKLANGUAGEVALUES_ERLANG,
    TMP_TELEMETRYSDKLANGUAGEVALUES_GO,
    TMP_TELEMETRYSDKLANGUAGEVALUES_JAVA,
    TMP_TELEMETRYSDKLANGUAGEVALUES_NODEJS,
    TMP_TELEMETRYSDKLANGUAGEVALUES_PHP,
    TMP_TELEMETRYSDKLANGUAGEVALUES_PYTHON,
    TMP_TELEMETRYSDKLANGUAGEVALUES_RUBY,
    TMP_TELEMETRYSDKLANGUAGEVALUES_WEBJS,
]);
//# sourceMappingURL=SemanticResourceAttributes.js.map