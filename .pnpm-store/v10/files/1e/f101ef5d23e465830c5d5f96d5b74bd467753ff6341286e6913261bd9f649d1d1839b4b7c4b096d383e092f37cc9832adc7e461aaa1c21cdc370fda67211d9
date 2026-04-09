/**
 * Name of the cloud provider.
 *
 * @deprecated use ATTR_CLOUD_PROVIDER
 */
export declare const SEMRESATTRS_CLOUD_PROVIDER = "cloud.provider";
/**
 * The cloud account ID the resource is assigned to.
 *
 * @deprecated use ATTR_CLOUD_ACCOUNT_ID
 */
export declare const SEMRESATTRS_CLOUD_ACCOUNT_ID = "cloud.account.id";
/**
 * The geographical region the resource is running. Refer to your provider&#39;s docs to see the available regions, for example [Alibaba Cloud regions](https://www.alibabacloud.com/help/doc-detail/40654.htm), [AWS regions](https://aws.amazon.com/about-aws/global-infrastructure/regions_az/), [Azure regions](https://azure.microsoft.com/en-us/global-infrastructure/geographies/), or [Google Cloud regions](https://cloud.google.com/about/locations).
 *
 * @deprecated use ATTR_CLOUD_REGION
 */
export declare const SEMRESATTRS_CLOUD_REGION = "cloud.region";
/**
 * Cloud regions often have multiple, isolated locations known as zones to increase availability. Availability zone represents the zone where the resource is running.
 *
 * Note: Availability zones are called &#34;zones&#34; on Alibaba Cloud and Google Cloud.
 *
 * @deprecated use ATTR_CLOUD_AVAILABILITY_ZONE
 */
export declare const SEMRESATTRS_CLOUD_AVAILABILITY_ZONE = "cloud.availability_zone";
/**
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 *
 * @deprecated use ATTR_CLOUD_PLATFORM
 */
export declare const SEMRESATTRS_CLOUD_PLATFORM = "cloud.platform";
/**
 * The Amazon Resource Name (ARN) of an [ECS container instance](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ECS_instances.html).
 *
 * @deprecated use ATTR_AWS_ECS_CONTAINER_ARN
 */
export declare const SEMRESATTRS_AWS_ECS_CONTAINER_ARN = "aws.ecs.container.arn";
/**
 * The ARN of an [ECS cluster](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/clusters.html).
 *
 * @deprecated use ATTR_AWS_ECS_CLUSTER_ARN
 */
export declare const SEMRESATTRS_AWS_ECS_CLUSTER_ARN = "aws.ecs.cluster.arn";
/**
 * The [launch type](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/launch_types.html) for an ECS task.
 *
 * @deprecated use ATTR_AWS_ECS_LAUNCHTYPE
 */
export declare const SEMRESATTRS_AWS_ECS_LAUNCHTYPE = "aws.ecs.launchtype";
/**
 * The ARN of an [ECS task definition](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html).
 *
 * @deprecated use ATTR_AWS_ECS_TASK_ARN
 */
export declare const SEMRESATTRS_AWS_ECS_TASK_ARN = "aws.ecs.task.arn";
/**
 * The task definition family this task definition is a member of.
 *
 * @deprecated use ATTR_AWS_ECS_TASK_FAMILY
 */
export declare const SEMRESATTRS_AWS_ECS_TASK_FAMILY = "aws.ecs.task.family";
/**
 * The revision for this task definition.
 *
 * @deprecated use ATTR_AWS_ECS_TASK_REVISION
 */
export declare const SEMRESATTRS_AWS_ECS_TASK_REVISION = "aws.ecs.task.revision";
/**
 * The ARN of an EKS cluster.
 *
 * @deprecated use ATTR_AWS_EKS_CLUSTER_ARN
 */
export declare const SEMRESATTRS_AWS_EKS_CLUSTER_ARN = "aws.eks.cluster.arn";
/**
 * The name(s) of the AWS log group(s) an application is writing to.
 *
 * Note: Multiple log groups must be supported for cases like multi-container applications, where a single application has sidecar containers, and each write to their own log group.
 *
 * @deprecated use ATTR_AWS_LOG_GROUP_NAMES
 */
export declare const SEMRESATTRS_AWS_LOG_GROUP_NAMES = "aws.log.group.names";
/**
 * The Amazon Resource Name(s) (ARN) of the AWS log group(s).
 *
 * Note: See the [log group ARN format documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/iam-access-control-overview-cwl.html#CWL_ARN_Format).
 *
 * @deprecated use ATTR_AWS_LOG_GROUP_ARNS
 */
export declare const SEMRESATTRS_AWS_LOG_GROUP_ARNS = "aws.log.group.arns";
/**
 * The name(s) of the AWS log stream(s) an application is writing to.
 *
 * @deprecated use ATTR_AWS_LOG_STREAM_NAMES
 */
export declare const SEMRESATTRS_AWS_LOG_STREAM_NAMES = "aws.log.stream.names";
/**
 * The ARN(s) of the AWS log stream(s).
 *
 * Note: See the [log stream ARN format documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/iam-access-control-overview-cwl.html#CWL_ARN_Format). One log group can contain several log streams, so these ARNs necessarily identify both a log group and a log stream.
 *
 * @deprecated use ATTR_AWS_LOG_STREAM_ARNS
 */
export declare const SEMRESATTRS_AWS_LOG_STREAM_ARNS = "aws.log.stream.arns";
/**
 * Container name.
 *
 * @deprecated use ATTR_CONTAINER_NAME
 */
export declare const SEMRESATTRS_CONTAINER_NAME = "container.name";
/**
 * Container ID. Usually a UUID, as for example used to [identify Docker containers](https://docs.docker.com/engine/reference/run/#container-identification). The UUID might be abbreviated.
 *
 * @deprecated use ATTR_CONTAINER_ID
 */
export declare const SEMRESATTRS_CONTAINER_ID = "container.id";
/**
 * The container runtime managing this container.
 *
 * @deprecated use ATTR_CONTAINER_RUNTIME
 */
export declare const SEMRESATTRS_CONTAINER_RUNTIME = "container.runtime";
/**
 * Name of the image the container was built on.
 *
 * @deprecated use ATTR_CONTAINER_IMAGE_NAME
 */
export declare const SEMRESATTRS_CONTAINER_IMAGE_NAME = "container.image.name";
/**
 * Container image tag.
 *
 * @deprecated use ATTR_CONTAINER_IMAGE_TAG
 */
export declare const SEMRESATTRS_CONTAINER_IMAGE_TAG = "container.image.tag";
/**
 * Name of the [deployment environment](https://en.wikipedia.org/wiki/Deployment_environment) (aka deployment tier).
 *
 * @deprecated use ATTR_DEPLOYMENT_ENVIRONMENT
 */
export declare const SEMRESATTRS_DEPLOYMENT_ENVIRONMENT = "deployment.environment";
/**
 * A unique identifier representing the device.
 *
 * Note: The device identifier MUST only be defined using the values outlined below. This value is not an advertising identifier and MUST NOT be used as such. On iOS (Swift or Objective-C), this value MUST be equal to the [vendor identifier](https://developer.apple.com/documentation/uikit/uidevice/1620059-identifierforvendor). On Android (Java or Kotlin), this value MUST be equal to the Firebase Installation ID or a globally unique UUID which is persisted across sessions in your application. More information can be found [here](https://developer.android.com/training/articles/user-data-ids) on best practices and exact implementation details. Caution should be taken when storing personal data or anything which can identify a user. GDPR and data protection laws may apply, ensure you do your own due diligence.
 *
 * @deprecated use ATTR_DEVICE_ID
 */
export declare const SEMRESATTRS_DEVICE_ID = "device.id";
/**
 * The model identifier for the device.
 *
 * Note: It&#39;s recommended this value represents a machine readable version of the model identifier rather than the market or consumer-friendly name of the device.
 *
 * @deprecated use ATTR_DEVICE_MODEL_IDENTIFIER
 */
export declare const SEMRESATTRS_DEVICE_MODEL_IDENTIFIER = "device.model.identifier";
/**
 * The marketing name for the device model.
 *
 * Note: It&#39;s recommended this value represents a human readable version of the device model rather than a machine readable alternative.
 *
 * @deprecated use ATTR_DEVICE_MODEL_NAME
 */
export declare const SEMRESATTRS_DEVICE_MODEL_NAME = "device.model.name";
/**
 * The name of the single function that this runtime instance executes.
 *
 * Note: This is the name of the function as configured/deployed on the FaaS platform and is usually different from the name of the callback function (which may be stored in the [`code.namespace`/`code.function`](../../trace/semantic_conventions/span-general.md#source-code-attributes) span attributes).
 *
 * @deprecated use ATTR_FAAS_NAME
 */
export declare const SEMRESATTRS_FAAS_NAME = "faas.name";
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
export declare const SEMRESATTRS_FAAS_ID = "faas.id";
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
export declare const SEMRESATTRS_FAAS_VERSION = "faas.version";
/**
 * The execution environment ID as a string, that will be potentially reused for other invocations to the same function/function version.
 *
 * Note: * **AWS Lambda:** Use the (full) log stream name.
 *
 * @deprecated use ATTR_FAAS_INSTANCE
 */
export declare const SEMRESATTRS_FAAS_INSTANCE = "faas.instance";
/**
 * The amount of memory available to the serverless function in MiB.
 *
 * Note: It&#39;s recommended to set this attribute since e.g. too little memory can easily stop a Java AWS Lambda function from working correctly. On AWS Lambda, the environment variable `AWS_LAMBDA_FUNCTION_MEMORY_SIZE` provides this information.
 *
 * @deprecated use ATTR_FAAS_MAX_MEMORY
 */
export declare const SEMRESATTRS_FAAS_MAX_MEMORY = "faas.max_memory";
/**
 * Unique host ID. For Cloud, this must be the instance_id assigned by the cloud provider.
 *
 * @deprecated use ATTR_HOST_ID
 */
export declare const SEMRESATTRS_HOST_ID = "host.id";
/**
 * Name of the host. On Unix systems, it may contain what the hostname command returns, or the fully qualified hostname, or another name specified by the user.
 *
 * @deprecated use ATTR_HOST_NAME
 */
export declare const SEMRESATTRS_HOST_NAME = "host.name";
/**
 * Type of host. For Cloud, this must be the machine type.
 *
 * @deprecated use ATTR_HOST_TYPE
 */
export declare const SEMRESATTRS_HOST_TYPE = "host.type";
/**
 * The CPU architecture the host system is running on.
 *
 * @deprecated use ATTR_HOST_ARCH
 */
export declare const SEMRESATTRS_HOST_ARCH = "host.arch";
/**
 * Name of the VM image or OS install the host was instantiated from.
 *
 * @deprecated use ATTR_HOST_IMAGE_NAME
 */
export declare const SEMRESATTRS_HOST_IMAGE_NAME = "host.image.name";
/**
 * VM image ID. For Cloud, this value is from the provider.
 *
 * @deprecated use ATTR_HOST_IMAGE_ID
 */
export declare const SEMRESATTRS_HOST_IMAGE_ID = "host.image.id";
/**
 * The version string of the VM image as defined in [Version Attributes](README.md#version-attributes).
 *
 * @deprecated use ATTR_HOST_IMAGE_VERSION
 */
export declare const SEMRESATTRS_HOST_IMAGE_VERSION = "host.image.version";
/**
 * The name of the cluster.
 *
 * @deprecated use ATTR_K8S_CLUSTER_NAME
 */
export declare const SEMRESATTRS_K8S_CLUSTER_NAME = "k8s.cluster.name";
/**
 * The name of the Node.
 *
 * @deprecated use ATTR_K8S_NODE_NAME
 */
export declare const SEMRESATTRS_K8S_NODE_NAME = "k8s.node.name";
/**
 * The UID of the Node.
 *
 * @deprecated use ATTR_K8S_NODE_UID
 */
export declare const SEMRESATTRS_K8S_NODE_UID = "k8s.node.uid";
/**
 * The name of the namespace that the pod is running in.
 *
 * @deprecated use ATTR_K8S_NAMESPACE_NAME
 */
export declare const SEMRESATTRS_K8S_NAMESPACE_NAME = "k8s.namespace.name";
/**
 * The UID of the Pod.
 *
 * @deprecated use ATTR_K8S_POD_UID
 */
export declare const SEMRESATTRS_K8S_POD_UID = "k8s.pod.uid";
/**
 * The name of the Pod.
 *
 * @deprecated use ATTR_K8S_POD_NAME
 */
export declare const SEMRESATTRS_K8S_POD_NAME = "k8s.pod.name";
/**
 * The name of the Container in a Pod template.
 *
 * @deprecated use ATTR_K8S_CONTAINER_NAME
 */
export declare const SEMRESATTRS_K8S_CONTAINER_NAME = "k8s.container.name";
/**
 * The UID of the ReplicaSet.
 *
 * @deprecated use ATTR_K8S_REPLICASET_UID
 */
export declare const SEMRESATTRS_K8S_REPLICASET_UID = "k8s.replicaset.uid";
/**
 * The name of the ReplicaSet.
 *
 * @deprecated use ATTR_K8S_REPLICASET_NAME
 */
export declare const SEMRESATTRS_K8S_REPLICASET_NAME = "k8s.replicaset.name";
/**
 * The UID of the Deployment.
 *
 * @deprecated use ATTR_K8S_DEPLOYMENT_UID
 */
export declare const SEMRESATTRS_K8S_DEPLOYMENT_UID = "k8s.deployment.uid";
/**
 * The name of the Deployment.
 *
 * @deprecated use ATTR_K8S_DEPLOYMENT_NAME
 */
export declare const SEMRESATTRS_K8S_DEPLOYMENT_NAME = "k8s.deployment.name";
/**
 * The UID of the StatefulSet.
 *
 * @deprecated use ATTR_K8S_STATEFULSET_UID
 */
export declare const SEMRESATTRS_K8S_STATEFULSET_UID = "k8s.statefulset.uid";
/**
 * The name of the StatefulSet.
 *
 * @deprecated use ATTR_K8S_STATEFULSET_NAME
 */
export declare const SEMRESATTRS_K8S_STATEFULSET_NAME = "k8s.statefulset.name";
/**
 * The UID of the DaemonSet.
 *
 * @deprecated use ATTR_K8S_DAEMONSET_UID
 */
export declare const SEMRESATTRS_K8S_DAEMONSET_UID = "k8s.daemonset.uid";
/**
 * The name of the DaemonSet.
 *
 * @deprecated use ATTR_K8S_DAEMONSET_NAME
 */
export declare const SEMRESATTRS_K8S_DAEMONSET_NAME = "k8s.daemonset.name";
/**
 * The UID of the Job.
 *
 * @deprecated use ATTR_K8S_JOB_UID
 */
export declare const SEMRESATTRS_K8S_JOB_UID = "k8s.job.uid";
/**
 * The name of the Job.
 *
 * @deprecated use ATTR_K8S_JOB_NAME
 */
export declare const SEMRESATTRS_K8S_JOB_NAME = "k8s.job.name";
/**
 * The UID of the CronJob.
 *
 * @deprecated use ATTR_K8S_CRONJOB_UID
 */
export declare const SEMRESATTRS_K8S_CRONJOB_UID = "k8s.cronjob.uid";
/**
 * The name of the CronJob.
 *
 * @deprecated use ATTR_K8S_CRONJOB_NAME
 */
export declare const SEMRESATTRS_K8S_CRONJOB_NAME = "k8s.cronjob.name";
/**
 * The operating system type.
 *
 * @deprecated use ATTR_OS_TYPE
 */
export declare const SEMRESATTRS_OS_TYPE = "os.type";
/**
 * Human readable (not intended to be parsed) OS version information, like e.g. reported by `ver` or `lsb_release -a` commands.
 *
 * @deprecated use ATTR_OS_DESCRIPTION
 */
export declare const SEMRESATTRS_OS_DESCRIPTION = "os.description";
/**
 * Human readable operating system name.
 *
 * @deprecated use ATTR_OS_NAME
 */
export declare const SEMRESATTRS_OS_NAME = "os.name";
/**
 * The version string of the operating system as defined in [Version Attributes](../../resource/semantic_conventions/README.md#version-attributes).
 *
 * @deprecated use ATTR_OS_VERSION
 */
export declare const SEMRESATTRS_OS_VERSION = "os.version";
/**
 * Process identifier (PID).
 *
 * @deprecated use ATTR_PROCESS_PID
 */
export declare const SEMRESATTRS_PROCESS_PID = "process.pid";
/**
 * The name of the process executable. On Linux based systems, can be set to the `Name` in `proc/[pid]/status`. On Windows, can be set to the base name of `GetProcessImageFileNameW`.
 *
 * @deprecated use ATTR_PROCESS_EXECUTABLE_NAME
 */
export declare const SEMRESATTRS_PROCESS_EXECUTABLE_NAME = "process.executable.name";
/**
 * The full path to the process executable. On Linux based systems, can be set to the target of `proc/[pid]/exe`. On Windows, can be set to the result of `GetProcessImageFileNameW`.
 *
 * @deprecated use ATTR_PROCESS_EXECUTABLE_PATH
 */
export declare const SEMRESATTRS_PROCESS_EXECUTABLE_PATH = "process.executable.path";
/**
 * The command used to launch the process (i.e. the command name). On Linux based systems, can be set to the zeroth string in `proc/[pid]/cmdline`. On Windows, can be set to the first parameter extracted from `GetCommandLineW`.
 *
 * @deprecated use ATTR_PROCESS_COMMAND
 */
export declare const SEMRESATTRS_PROCESS_COMMAND = "process.command";
/**
 * The full command used to launch the process as a single string representing the full command. On Windows, can be set to the result of `GetCommandLineW`. Do not set this if you have to assemble it just for monitoring; use `process.command_args` instead.
 *
 * @deprecated use ATTR_PROCESS_COMMAND_LINE
 */
export declare const SEMRESATTRS_PROCESS_COMMAND_LINE = "process.command_line";
/**
 * All the command arguments (including the command/executable itself) as received by the process. On Linux-based systems (and some other Unixoid systems supporting procfs), can be set according to the list of null-delimited strings extracted from `proc/[pid]/cmdline`. For libc-based executables, this would be the full argv vector passed to `main`.
 *
 * @deprecated use ATTR_PROCESS_COMMAND_ARGS
 */
export declare const SEMRESATTRS_PROCESS_COMMAND_ARGS = "process.command_args";
/**
 * The username of the user that owns the process.
 *
 * @deprecated use ATTR_PROCESS_OWNER
 */
export declare const SEMRESATTRS_PROCESS_OWNER = "process.owner";
/**
 * The name of the runtime of this process. For compiled native binaries, this SHOULD be the name of the compiler.
 *
 * @deprecated use ATTR_PROCESS_RUNTIME_NAME
 */
export declare const SEMRESATTRS_PROCESS_RUNTIME_NAME = "process.runtime.name";
/**
 * The version of the runtime of this process, as returned by the runtime without modification.
 *
 * @deprecated use ATTR_PROCESS_RUNTIME_VERSION
 */
export declare const SEMRESATTRS_PROCESS_RUNTIME_VERSION = "process.runtime.version";
/**
 * An additional description about the runtime of the process, for example a specific vendor customization of the runtime environment.
 *
 * @deprecated use ATTR_PROCESS_RUNTIME_DESCRIPTION
 */
export declare const SEMRESATTRS_PROCESS_RUNTIME_DESCRIPTION = "process.runtime.description";
/**
 * Logical name of the service.
 *
 * Note: MUST be the same for all instances of horizontally scaled services. If the value was not specified, SDKs MUST fallback to `unknown_service:` concatenated with [`process.executable.name`](process.md#process), e.g. `unknown_service:bash`. If `process.executable.name` is not available, the value MUST be set to `unknown_service`.
 *
 * @deprecated use ATTR_SERVICE_NAME
 */
export declare const SEMRESATTRS_SERVICE_NAME = "service.name";
/**
 * A namespace for `service.name`.
 *
 * Note: A string value having a meaning that helps to distinguish a group of services, for example the team name that owns a group of services. `service.name` is expected to be unique within the same namespace. If `service.namespace` is not specified in the Resource then `service.name` is expected to be unique for all services that have no explicit namespace defined (so the empty/unspecified namespace is simply one more valid namespace). Zero-length namespace string is assumed equal to unspecified namespace.
 *
 * @deprecated use ATTR_SERVICE_NAMESPACE
 */
export declare const SEMRESATTRS_SERVICE_NAMESPACE = "service.namespace";
/**
 * The string ID of the service instance.
 *
 * Note: MUST be unique for each instance of the same `service.namespace,service.name` pair (in other words `service.namespace,service.name,service.instance.id` triplet MUST be globally unique). The ID helps to distinguish instances of the same service that exist at the same time (e.g. instances of a horizontally scaled service). It is preferable for the ID to be persistent and stay the same for the lifetime of the service instance, however it is acceptable that the ID is ephemeral and changes during important lifetime events for the service (e.g. service restarts). If the service has no inherent unique ID that can be used as the value of this attribute it is recommended to generate a random Version 1 or Version 4 RFC 4122 UUID (services aiming for reproducible UUIDs may also use Version 5, see RFC 4122 for more recommendations).
 *
 * @deprecated use ATTR_SERVICE_INSTANCE_ID
 */
export declare const SEMRESATTRS_SERVICE_INSTANCE_ID = "service.instance.id";
/**
 * The version string of the service API or implementation.
 *
 * @deprecated use ATTR_SERVICE_VERSION
 */
export declare const SEMRESATTRS_SERVICE_VERSION = "service.version";
/**
 * The name of the telemetry SDK as defined above.
 *
 * @deprecated use ATTR_TELEMETRY_SDK_NAME
 */
export declare const SEMRESATTRS_TELEMETRY_SDK_NAME = "telemetry.sdk.name";
/**
 * The language of the telemetry SDK.
 *
 * @deprecated use ATTR_TELEMETRY_SDK_LANGUAGE
 */
export declare const SEMRESATTRS_TELEMETRY_SDK_LANGUAGE = "telemetry.sdk.language";
/**
 * The version string of the telemetry SDK.
 *
 * @deprecated use ATTR_TELEMETRY_SDK_VERSION
 */
export declare const SEMRESATTRS_TELEMETRY_SDK_VERSION = "telemetry.sdk.version";
/**
 * The version string of the auto instrumentation agent, if used.
 *
 * @deprecated use ATTR_TELEMETRY_AUTO_VERSION
 */
export declare const SEMRESATTRS_TELEMETRY_AUTO_VERSION = "telemetry.auto.version";
/**
 * The name of the web engine.
 *
 * @deprecated use ATTR_WEBENGINE_NAME
 */
export declare const SEMRESATTRS_WEBENGINE_NAME = "webengine.name";
/**
 * The version of the web engine.
 *
 * @deprecated use ATTR_WEBENGINE_VERSION
 */
export declare const SEMRESATTRS_WEBENGINE_VERSION = "webengine.version";
/**
 * Additional description of the web engine (e.g. detailed version and edition information).
 *
 * @deprecated use ATTR_WEBENGINE_DESCRIPTION
 */
export declare const SEMRESATTRS_WEBENGINE_DESCRIPTION = "webengine.description";
/**
 * Definition of available values for SemanticResourceAttributes
 * This type is used for backward compatibility, you should use the individual exported
 * constants SemanticResourceAttributes_XXXXX rather than the exported constant map. As any single reference
 * to a constant map value will result in all strings being included into your bundle.
 * @deprecated Use the SEMRESATTRS_XXXXX constants rather than the SemanticResourceAttributes.XXXXX for bundle minification.
 */
export declare type SemanticResourceAttributes = {
    /**
     * Name of the cloud provider.
     */
    CLOUD_PROVIDER: 'cloud.provider';
    /**
     * The cloud account ID the resource is assigned to.
     */
    CLOUD_ACCOUNT_ID: 'cloud.account.id';
    /**
     * The geographical region the resource is running. Refer to your provider&#39;s docs to see the available regions, for example [Alibaba Cloud regions](https://www.alibabacloud.com/help/doc-detail/40654.htm), [AWS regions](https://aws.amazon.com/about-aws/global-infrastructure/regions_az/), [Azure regions](https://azure.microsoft.com/en-us/global-infrastructure/geographies/), or [Google Cloud regions](https://cloud.google.com/about/locations).
     */
    CLOUD_REGION: 'cloud.region';
    /**
     * Cloud regions often have multiple, isolated locations known as zones to increase availability. Availability zone represents the zone where the resource is running.
     *
     * Note: Availability zones are called &#34;zones&#34; on Alibaba Cloud and Google Cloud.
     */
    CLOUD_AVAILABILITY_ZONE: 'cloud.availability_zone';
    /**
     * The cloud platform in use.
     *
     * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
     */
    CLOUD_PLATFORM: 'cloud.platform';
    /**
     * The Amazon Resource Name (ARN) of an [ECS container instance](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ECS_instances.html).
     */
    AWS_ECS_CONTAINER_ARN: 'aws.ecs.container.arn';
    /**
     * The ARN of an [ECS cluster](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/clusters.html).
     */
    AWS_ECS_CLUSTER_ARN: 'aws.ecs.cluster.arn';
    /**
     * The [launch type](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/launch_types.html) for an ECS task.
     */
    AWS_ECS_LAUNCHTYPE: 'aws.ecs.launchtype';
    /**
     * The ARN of an [ECS task definition](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html).
     */
    AWS_ECS_TASK_ARN: 'aws.ecs.task.arn';
    /**
     * The task definition family this task definition is a member of.
     */
    AWS_ECS_TASK_FAMILY: 'aws.ecs.task.family';
    /**
     * The revision for this task definition.
     */
    AWS_ECS_TASK_REVISION: 'aws.ecs.task.revision';
    /**
     * The ARN of an EKS cluster.
     */
    AWS_EKS_CLUSTER_ARN: 'aws.eks.cluster.arn';
    /**
     * The name(s) of the AWS log group(s) an application is writing to.
     *
     * Note: Multiple log groups must be supported for cases like multi-container applications, where a single application has sidecar containers, and each write to their own log group.
     */
    AWS_LOG_GROUP_NAMES: 'aws.log.group.names';
    /**
     * The Amazon Resource Name(s) (ARN) of the AWS log group(s).
     *
     * Note: See the [log group ARN format documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/iam-access-control-overview-cwl.html#CWL_ARN_Format).
     */
    AWS_LOG_GROUP_ARNS: 'aws.log.group.arns';
    /**
     * The name(s) of the AWS log stream(s) an application is writing to.
     */
    AWS_LOG_STREAM_NAMES: 'aws.log.stream.names';
    /**
     * The ARN(s) of the AWS log stream(s).
     *
     * Note: See the [log stream ARN format documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/iam-access-control-overview-cwl.html#CWL_ARN_Format). One log group can contain several log streams, so these ARNs necessarily identify both a log group and a log stream.
     */
    AWS_LOG_STREAM_ARNS: 'aws.log.stream.arns';
    /**
     * Container name.
     */
    CONTAINER_NAME: 'container.name';
    /**
     * Container ID. Usually a UUID, as for example used to [identify Docker containers](https://docs.docker.com/engine/reference/run/#container-identification). The UUID might be abbreviated.
     */
    CONTAINER_ID: 'container.id';
    /**
     * The container runtime managing this container.
     */
    CONTAINER_RUNTIME: 'container.runtime';
    /**
     * Name of the image the container was built on.
     */
    CONTAINER_IMAGE_NAME: 'container.image.name';
    /**
     * Container image tag.
     */
    CONTAINER_IMAGE_TAG: 'container.image.tag';
    /**
     * Name of the [deployment environment](https://en.wikipedia.org/wiki/Deployment_environment) (aka deployment tier).
     */
    DEPLOYMENT_ENVIRONMENT: 'deployment.environment';
    /**
     * A unique identifier representing the device.
     *
     * Note: The device identifier MUST only be defined using the values outlined below. This value is not an advertising identifier and MUST NOT be used as such. On iOS (Swift or Objective-C), this value MUST be equal to the [vendor identifier](https://developer.apple.com/documentation/uikit/uidevice/1620059-identifierforvendor). On Android (Java or Kotlin), this value MUST be equal to the Firebase Installation ID or a globally unique UUID which is persisted across sessions in your application. More information can be found [here](https://developer.android.com/training/articles/user-data-ids) on best practices and exact implementation details. Caution should be taken when storing personal data or anything which can identify a user. GDPR and data protection laws may apply, ensure you do your own due diligence.
     */
    DEVICE_ID: 'device.id';
    /**
     * The model identifier for the device.
     *
     * Note: It&#39;s recommended this value represents a machine readable version of the model identifier rather than the market or consumer-friendly name of the device.
     */
    DEVICE_MODEL_IDENTIFIER: 'device.model.identifier';
    /**
     * The marketing name for the device model.
     *
     * Note: It&#39;s recommended this value represents a human readable version of the device model rather than a machine readable alternative.
     */
    DEVICE_MODEL_NAME: 'device.model.name';
    /**
     * The name of the single function that this runtime instance executes.
     *
     * Note: This is the name of the function as configured/deployed on the FaaS platform and is usually different from the name of the callback function (which may be stored in the [`code.namespace`/`code.function`](../../trace/semantic_conventions/span-general.md#source-code-attributes) span attributes).
     */
    FAAS_NAME: 'faas.name';
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
    */
    FAAS_ID: 'faas.id';
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
    */
    FAAS_VERSION: 'faas.version';
    /**
     * The execution environment ID as a string, that will be potentially reused for other invocations to the same function/function version.
     *
     * Note: * **AWS Lambda:** Use the (full) log stream name.
     */
    FAAS_INSTANCE: 'faas.instance';
    /**
     * The amount of memory available to the serverless function in MiB.
     *
     * Note: It&#39;s recommended to set this attribute since e.g. too little memory can easily stop a Java AWS Lambda function from working correctly. On AWS Lambda, the environment variable `AWS_LAMBDA_FUNCTION_MEMORY_SIZE` provides this information.
     */
    FAAS_MAX_MEMORY: 'faas.max_memory';
    /**
     * Unique host ID. For Cloud, this must be the instance_id assigned by the cloud provider.
     */
    HOST_ID: 'host.id';
    /**
     * Name of the host. On Unix systems, it may contain what the hostname command returns, or the fully qualified hostname, or another name specified by the user.
     */
    HOST_NAME: 'host.name';
    /**
     * Type of host. For Cloud, this must be the machine type.
     */
    HOST_TYPE: 'host.type';
    /**
     * The CPU architecture the host system is running on.
     */
    HOST_ARCH: 'host.arch';
    /**
     * Name of the VM image or OS install the host was instantiated from.
     */
    HOST_IMAGE_NAME: 'host.image.name';
    /**
     * VM image ID. For Cloud, this value is from the provider.
     */
    HOST_IMAGE_ID: 'host.image.id';
    /**
     * The version string of the VM image as defined in [Version Attributes](README.md#version-attributes).
     */
    HOST_IMAGE_VERSION: 'host.image.version';
    /**
     * The name of the cluster.
     */
    K8S_CLUSTER_NAME: 'k8s.cluster.name';
    /**
     * The name of the Node.
     */
    K8S_NODE_NAME: 'k8s.node.name';
    /**
     * The UID of the Node.
     */
    K8S_NODE_UID: 'k8s.node.uid';
    /**
     * The name of the namespace that the pod is running in.
     */
    K8S_NAMESPACE_NAME: 'k8s.namespace.name';
    /**
     * The UID of the Pod.
     */
    K8S_POD_UID: 'k8s.pod.uid';
    /**
     * The name of the Pod.
     */
    K8S_POD_NAME: 'k8s.pod.name';
    /**
     * The name of the Container in a Pod template.
     */
    K8S_CONTAINER_NAME: 'k8s.container.name';
    /**
     * The UID of the ReplicaSet.
     */
    K8S_REPLICASET_UID: 'k8s.replicaset.uid';
    /**
     * The name of the ReplicaSet.
     */
    K8S_REPLICASET_NAME: 'k8s.replicaset.name';
    /**
     * The UID of the Deployment.
     */
    K8S_DEPLOYMENT_UID: 'k8s.deployment.uid';
    /**
     * The name of the Deployment.
     */
    K8S_DEPLOYMENT_NAME: 'k8s.deployment.name';
    /**
     * The UID of the StatefulSet.
     */
    K8S_STATEFULSET_UID: 'k8s.statefulset.uid';
    /**
     * The name of the StatefulSet.
     */
    K8S_STATEFULSET_NAME: 'k8s.statefulset.name';
    /**
     * The UID of the DaemonSet.
     */
    K8S_DAEMONSET_UID: 'k8s.daemonset.uid';
    /**
     * The name of the DaemonSet.
     */
    K8S_DAEMONSET_NAME: 'k8s.daemonset.name';
    /**
     * The UID of the Job.
     */
    K8S_JOB_UID: 'k8s.job.uid';
    /**
     * The name of the Job.
     */
    K8S_JOB_NAME: 'k8s.job.name';
    /**
     * The UID of the CronJob.
     */
    K8S_CRONJOB_UID: 'k8s.cronjob.uid';
    /**
     * The name of the CronJob.
     */
    K8S_CRONJOB_NAME: 'k8s.cronjob.name';
    /**
     * The operating system type.
     */
    OS_TYPE: 'os.type';
    /**
     * Human readable (not intended to be parsed) OS version information, like e.g. reported by `ver` or `lsb_release -a` commands.
     */
    OS_DESCRIPTION: 'os.description';
    /**
     * Human readable operating system name.
     */
    OS_NAME: 'os.name';
    /**
     * The version string of the operating system as defined in [Version Attributes](../../resource/semantic_conventions/README.md#version-attributes).
     */
    OS_VERSION: 'os.version';
    /**
     * Process identifier (PID).
     */
    PROCESS_PID: 'process.pid';
    /**
     * The name of the process executable. On Linux based systems, can be set to the `Name` in `proc/[pid]/status`. On Windows, can be set to the base name of `GetProcessImageFileNameW`.
     */
    PROCESS_EXECUTABLE_NAME: 'process.executable.name';
    /**
     * The full path to the process executable. On Linux based systems, can be set to the target of `proc/[pid]/exe`. On Windows, can be set to the result of `GetProcessImageFileNameW`.
     */
    PROCESS_EXECUTABLE_PATH: 'process.executable.path';
    /**
     * The command used to launch the process (i.e. the command name). On Linux based systems, can be set to the zeroth string in `proc/[pid]/cmdline`. On Windows, can be set to the first parameter extracted from `GetCommandLineW`.
     */
    PROCESS_COMMAND: 'process.command';
    /**
     * The full command used to launch the process as a single string representing the full command. On Windows, can be set to the result of `GetCommandLineW`. Do not set this if you have to assemble it just for monitoring; use `process.command_args` instead.
     */
    PROCESS_COMMAND_LINE: 'process.command_line';
    /**
     * All the command arguments (including the command/executable itself) as received by the process. On Linux-based systems (and some other Unixoid systems supporting procfs), can be set according to the list of null-delimited strings extracted from `proc/[pid]/cmdline`. For libc-based executables, this would be the full argv vector passed to `main`.
     */
    PROCESS_COMMAND_ARGS: 'process.command_args';
    /**
     * The username of the user that owns the process.
     */
    PROCESS_OWNER: 'process.owner';
    /**
     * The name of the runtime of this process. For compiled native binaries, this SHOULD be the name of the compiler.
     */
    PROCESS_RUNTIME_NAME: 'process.runtime.name';
    /**
     * The version of the runtime of this process, as returned by the runtime without modification.
     */
    PROCESS_RUNTIME_VERSION: 'process.runtime.version';
    /**
     * An additional description about the runtime of the process, for example a specific vendor customization of the runtime environment.
     */
    PROCESS_RUNTIME_DESCRIPTION: 'process.runtime.description';
    /**
     * Logical name of the service.
     *
     * Note: MUST be the same for all instances of horizontally scaled services. If the value was not specified, SDKs MUST fallback to `unknown_service:` concatenated with [`process.executable.name`](process.md#process), e.g. `unknown_service:bash`. If `process.executable.name` is not available, the value MUST be set to `unknown_service`.
     */
    SERVICE_NAME: 'service.name';
    /**
     * A namespace for `service.name`.
     *
     * Note: A string value having a meaning that helps to distinguish a group of services, for example the team name that owns a group of services. `service.name` is expected to be unique within the same namespace. If `service.namespace` is not specified in the Resource then `service.name` is expected to be unique for all services that have no explicit namespace defined (so the empty/unspecified namespace is simply one more valid namespace). Zero-length namespace string is assumed equal to unspecified namespace.
     */
    SERVICE_NAMESPACE: 'service.namespace';
    /**
     * The string ID of the service instance.
     *
     * Note: MUST be unique for each instance of the same `service.namespace,service.name` pair (in other words `service.namespace,service.name,service.instance.id` triplet MUST be globally unique). The ID helps to distinguish instances of the same service that exist at the same time (e.g. instances of a horizontally scaled service). It is preferable for the ID to be persistent and stay the same for the lifetime of the service instance, however it is acceptable that the ID is ephemeral and changes during important lifetime events for the service (e.g. service restarts). If the service has no inherent unique ID that can be used as the value of this attribute it is recommended to generate a random Version 1 or Version 4 RFC 4122 UUID (services aiming for reproducible UUIDs may also use Version 5, see RFC 4122 for more recommendations).
     */
    SERVICE_INSTANCE_ID: 'service.instance.id';
    /**
     * The version string of the service API or implementation.
     */
    SERVICE_VERSION: 'service.version';
    /**
     * The name of the telemetry SDK as defined above.
     */
    TELEMETRY_SDK_NAME: 'telemetry.sdk.name';
    /**
     * The language of the telemetry SDK.
     */
    TELEMETRY_SDK_LANGUAGE: 'telemetry.sdk.language';
    /**
     * The version string of the telemetry SDK.
     */
    TELEMETRY_SDK_VERSION: 'telemetry.sdk.version';
    /**
     * The version string of the auto instrumentation agent, if used.
     */
    TELEMETRY_AUTO_VERSION: 'telemetry.auto.version';
    /**
     * The name of the web engine.
     */
    WEBENGINE_NAME: 'webengine.name';
    /**
     * The version of the web engine.
     */
    WEBENGINE_VERSION: 'webengine.version';
    /**
     * Additional description of the web engine (e.g. detailed version and edition information).
     */
    WEBENGINE_DESCRIPTION: 'webengine.description';
};
/**
 * Create exported Value Map for SemanticResourceAttributes values
 * @deprecated Use the SEMRESATTRS_XXXXX constants rather than the SemanticResourceAttributes.XXXXX for bundle minification
 */
export declare const SemanticResourceAttributes: SemanticResourceAttributes;
/**
 * Name of the cloud provider.
 *
 * @deprecated Use CLOUD_PROVIDER_VALUE_ALIBABA_CLOUD.
 */
export declare const CLOUDPROVIDERVALUES_ALIBABA_CLOUD = "alibaba_cloud";
/**
 * Name of the cloud provider.
 *
 * @deprecated Use CLOUD_PROVIDER_VALUE_AWS.
 */
export declare const CLOUDPROVIDERVALUES_AWS = "aws";
/**
 * Name of the cloud provider.
 *
 * @deprecated Use CLOUD_PROVIDER_VALUE_AZURE.
 */
export declare const CLOUDPROVIDERVALUES_AZURE = "azure";
/**
 * Name of the cloud provider.
 *
 * @deprecated Use CLOUD_PROVIDER_VALUE_GCP.
 */
export declare const CLOUDPROVIDERVALUES_GCP = "gcp";
/**
 * Identifies the Values for CloudProviderValues enum definition
 *
 * Name of the cloud provider.
 * @deprecated Use the CLOUDPROVIDERVALUES_XXXXX constants rather than the CloudProviderValues.XXXXX for bundle minification.
 */
export declare type CloudProviderValues = {
    /** Alibaba Cloud. */
    ALIBABA_CLOUD: 'alibaba_cloud';
    /** Amazon Web Services. */
    AWS: 'aws';
    /** Microsoft Azure. */
    AZURE: 'azure';
    /** Google Cloud Platform. */
    GCP: 'gcp';
};
/**
 * The constant map of values for CloudProviderValues.
 * @deprecated Use the CLOUDPROVIDERVALUES_XXXXX constants rather than the CloudProviderValues.XXXXX for bundle minification.
 */
export declare const CloudProviderValues: CloudProviderValues;
/**
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 *
 * @deprecated Use CLOUD_PLATFORM_VALUE_ALIBABA_CLOUD_ECS.
 */
export declare const CLOUDPLATFORMVALUES_ALIBABA_CLOUD_ECS = "alibaba_cloud_ecs";
/**
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 *
 * @deprecated Use CLOUD_PLATFORM_VALUE_ALIBABA_CLOUD_FC.
 */
export declare const CLOUDPLATFORMVALUES_ALIBABA_CLOUD_FC = "alibaba_cloud_fc";
/**
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 *
 * @deprecated Use CLOUD_PLATFORM_VALUE_AWS_EC2.
 */
export declare const CLOUDPLATFORMVALUES_AWS_EC2 = "aws_ec2";
/**
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 *
 * @deprecated Use CLOUD_PLATFORM_VALUE_AWS_ECS.
 */
export declare const CLOUDPLATFORMVALUES_AWS_ECS = "aws_ecs";
/**
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 *
 * @deprecated Use CLOUD_PLATFORM_VALUE_AWS_EKS.
 */
export declare const CLOUDPLATFORMVALUES_AWS_EKS = "aws_eks";
/**
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 *
 * @deprecated Use CLOUD_PLATFORM_VALUE_AWS_LAMBDA.
 */
export declare const CLOUDPLATFORMVALUES_AWS_LAMBDA = "aws_lambda";
/**
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 *
 * @deprecated Use CLOUD_PLATFORM_VALUE_AWS_ELASTIC_BEANSTALK.
 */
export declare const CLOUDPLATFORMVALUES_AWS_ELASTIC_BEANSTALK = "aws_elastic_beanstalk";
/**
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 *
 * @deprecated Use CLOUD_PLATFORM_VALUE_AZURE_VM.
 */
export declare const CLOUDPLATFORMVALUES_AZURE_VM = "azure_vm";
/**
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 *
 * @deprecated Use CLOUD_PLATFORM_VALUE_AZURE_CONTAINER_INSTANCES.
 */
export declare const CLOUDPLATFORMVALUES_AZURE_CONTAINER_INSTANCES = "azure_container_instances";
/**
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 *
 * @deprecated Use CLOUD_PLATFORM_VALUE_AZURE_AKS.
 */
export declare const CLOUDPLATFORMVALUES_AZURE_AKS = "azure_aks";
/**
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 *
 * @deprecated Use CLOUD_PLATFORM_VALUE_AZURE_FUNCTIONS.
 */
export declare const CLOUDPLATFORMVALUES_AZURE_FUNCTIONS = "azure_functions";
/**
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 *
 * @deprecated Use CLOUD_PLATFORM_VALUE_AZURE_APP_SERVICE.
 */
export declare const CLOUDPLATFORMVALUES_AZURE_APP_SERVICE = "azure_app_service";
/**
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 *
 * @deprecated Use CLOUD_PLATFORM_VALUE_GCP_COMPUTE_ENGINE.
 */
export declare const CLOUDPLATFORMVALUES_GCP_COMPUTE_ENGINE = "gcp_compute_engine";
/**
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 *
 * @deprecated Use CLOUD_PLATFORM_VALUE_GCP_CLOUD_RUN.
 */
export declare const CLOUDPLATFORMVALUES_GCP_CLOUD_RUN = "gcp_cloud_run";
/**
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 *
 * @deprecated Use CLOUD_PLATFORM_VALUE_GCP_KUBERNETES_ENGINE.
 */
export declare const CLOUDPLATFORMVALUES_GCP_KUBERNETES_ENGINE = "gcp_kubernetes_engine";
/**
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 *
 * @deprecated Use CLOUD_PLATFORM_VALUE_GCP_CLOUD_FUNCTIONS.
 */
export declare const CLOUDPLATFORMVALUES_GCP_CLOUD_FUNCTIONS = "gcp_cloud_functions";
/**
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 *
 * @deprecated Use CLOUD_PLATFORM_VALUE_GCP_APP_ENGINE.
 */
export declare const CLOUDPLATFORMVALUES_GCP_APP_ENGINE = "gcp_app_engine";
/**
 * Identifies the Values for CloudPlatformValues enum definition
 *
 * The cloud platform in use.
 *
 * Note: The prefix of the service SHOULD match the one specified in `cloud.provider`.
 * @deprecated Use the CLOUDPLATFORMVALUES_XXXXX constants rather than the CloudPlatformValues.XXXXX for bundle minification.
 */
export declare type CloudPlatformValues = {
    /** Alibaba Cloud Elastic Compute Service. */
    ALIBABA_CLOUD_ECS: 'alibaba_cloud_ecs';
    /** Alibaba Cloud Function Compute. */
    ALIBABA_CLOUD_FC: 'alibaba_cloud_fc';
    /** AWS Elastic Compute Cloud. */
    AWS_EC2: 'aws_ec2';
    /** AWS Elastic Container Service. */
    AWS_ECS: 'aws_ecs';
    /** AWS Elastic Kubernetes Service. */
    AWS_EKS: 'aws_eks';
    /** AWS Lambda. */
    AWS_LAMBDA: 'aws_lambda';
    /** AWS Elastic Beanstalk. */
    AWS_ELASTIC_BEANSTALK: 'aws_elastic_beanstalk';
    /** Azure Virtual Machines. */
    AZURE_VM: 'azure_vm';
    /** Azure Container Instances. */
    AZURE_CONTAINER_INSTANCES: 'azure_container_instances';
    /** Azure Kubernetes Service. */
    AZURE_AKS: 'azure_aks';
    /** Azure Functions. */
    AZURE_FUNCTIONS: 'azure_functions';
    /** Azure App Service. */
    AZURE_APP_SERVICE: 'azure_app_service';
    /** Google Cloud Compute Engine (GCE). */
    GCP_COMPUTE_ENGINE: 'gcp_compute_engine';
    /** Google Cloud Run. */
    GCP_CLOUD_RUN: 'gcp_cloud_run';
    /** Google Cloud Kubernetes Engine (GKE). */
    GCP_KUBERNETES_ENGINE: 'gcp_kubernetes_engine';
    /** Google Cloud Functions (GCF). */
    GCP_CLOUD_FUNCTIONS: 'gcp_cloud_functions';
    /** Google Cloud App Engine (GAE). */
    GCP_APP_ENGINE: 'gcp_app_engine';
};
/**
 * The constant map of values for CloudPlatformValues.
 * @deprecated Use the CLOUDPLATFORMVALUES_XXXXX constants rather than the CloudPlatformValues.XXXXX for bundle minification.
 */
export declare const CloudPlatformValues: CloudPlatformValues;
/**
 * The [launch type](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/launch_types.html) for an ECS task.
 *
 * @deprecated Use AWS_ECS_LAUNCHTYPE_VALUE_EC2.
 */
export declare const AWSECSLAUNCHTYPEVALUES_EC2 = "ec2";
/**
 * The [launch type](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/launch_types.html) for an ECS task.
 *
 * @deprecated Use AWS_ECS_LAUNCHTYPE_VALUE_FARGATE.
 */
export declare const AWSECSLAUNCHTYPEVALUES_FARGATE = "fargate";
/**
 * Identifies the Values for AwsEcsLaunchtypeValues enum definition
 *
 * The [launch type](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/launch_types.html) for an ECS task.
 * @deprecated Use the AWSECSLAUNCHTYPEVALUES_XXXXX constants rather than the AwsEcsLaunchtypeValues.XXXXX for bundle minification.
 */
export declare type AwsEcsLaunchtypeValues = {
    /** ec2. */
    EC2: 'ec2';
    /** fargate. */
    FARGATE: 'fargate';
};
/**
 * The constant map of values for AwsEcsLaunchtypeValues.
 * @deprecated Use the AWSECSLAUNCHTYPEVALUES_XXXXX constants rather than the AwsEcsLaunchtypeValues.XXXXX for bundle minification.
 */
export declare const AwsEcsLaunchtypeValues: AwsEcsLaunchtypeValues;
/**
 * The CPU architecture the host system is running on.
 *
 * @deprecated Use HOST_ARCH_VALUE_AMD64.
 */
export declare const HOSTARCHVALUES_AMD64 = "amd64";
/**
 * The CPU architecture the host system is running on.
 *
 * @deprecated Use HOST_ARCH_VALUE_ARM32.
 */
export declare const HOSTARCHVALUES_ARM32 = "arm32";
/**
 * The CPU architecture the host system is running on.
 *
 * @deprecated Use HOST_ARCH_VALUE_ARM64.
 */
export declare const HOSTARCHVALUES_ARM64 = "arm64";
/**
 * The CPU architecture the host system is running on.
 *
 * @deprecated Use HOST_ARCH_VALUE_IA64.
 */
export declare const HOSTARCHVALUES_IA64 = "ia64";
/**
 * The CPU architecture the host system is running on.
 *
 * @deprecated Use HOST_ARCH_VALUE_PPC32.
 */
export declare const HOSTARCHVALUES_PPC32 = "ppc32";
/**
 * The CPU architecture the host system is running on.
 *
 * @deprecated Use HOST_ARCH_VALUE_PPC64.
 */
export declare const HOSTARCHVALUES_PPC64 = "ppc64";
/**
 * The CPU architecture the host system is running on.
 *
 * @deprecated Use HOST_ARCH_VALUE_X86.
 */
export declare const HOSTARCHVALUES_X86 = "x86";
/**
 * Identifies the Values for HostArchValues enum definition
 *
 * The CPU architecture the host system is running on.
 * @deprecated Use the HOSTARCHVALUES_XXXXX constants rather than the HostArchValues.XXXXX for bundle minification.
 */
export declare type HostArchValues = {
    /** AMD64. */
    AMD64: 'amd64';
    /** ARM32. */
    ARM32: 'arm32';
    /** ARM64. */
    ARM64: 'arm64';
    /** Itanium. */
    IA64: 'ia64';
    /** 32-bit PowerPC. */
    PPC32: 'ppc32';
    /** 64-bit PowerPC. */
    PPC64: 'ppc64';
    /** 32-bit x86. */
    X86: 'x86';
};
/**
 * The constant map of values for HostArchValues.
 * @deprecated Use the HOSTARCHVALUES_XXXXX constants rather than the HostArchValues.XXXXX for bundle minification.
 */
export declare const HostArchValues: HostArchValues;
/**
 * The operating system type.
 *
 * @deprecated Use OS_TYPE_VALUE_WINDOWS.
 */
export declare const OSTYPEVALUES_WINDOWS = "windows";
/**
 * The operating system type.
 *
 * @deprecated Use OS_TYPE_VALUE_LINUX.
 */
export declare const OSTYPEVALUES_LINUX = "linux";
/**
 * The operating system type.
 *
 * @deprecated Use OS_TYPE_VALUE_DARWIN.
 */
export declare const OSTYPEVALUES_DARWIN = "darwin";
/**
 * The operating system type.
 *
 * @deprecated Use OS_TYPE_VALUE_FREEBSD.
 */
export declare const OSTYPEVALUES_FREEBSD = "freebsd";
/**
 * The operating system type.
 *
 * @deprecated Use OS_TYPE_VALUE_NETBSD.
 */
export declare const OSTYPEVALUES_NETBSD = "netbsd";
/**
 * The operating system type.
 *
 * @deprecated Use OS_TYPE_VALUE_OPENBSD.
 */
export declare const OSTYPEVALUES_OPENBSD = "openbsd";
/**
 * The operating system type.
 *
 * @deprecated Use OS_TYPE_VALUE_DRAGONFLYBSD.
 */
export declare const OSTYPEVALUES_DRAGONFLYBSD = "dragonflybsd";
/**
 * The operating system type.
 *
 * @deprecated Use OS_TYPE_VALUE_HPUX.
 */
export declare const OSTYPEVALUES_HPUX = "hpux";
/**
 * The operating system type.
 *
 * @deprecated Use OS_TYPE_VALUE_AIX.
 */
export declare const OSTYPEVALUES_AIX = "aix";
/**
 * The operating system type.
 *
 * @deprecated Use OS_TYPE_VALUE_SOLARIS.
 */
export declare const OSTYPEVALUES_SOLARIS = "solaris";
/**
 * The operating system type.
 *
 * @deprecated Use OS_TYPE_VALUE_Z_OS.
 */
export declare const OSTYPEVALUES_Z_OS = "z_os";
/**
 * Identifies the Values for OsTypeValues enum definition
 *
 * The operating system type.
 * @deprecated Use the OSTYPEVALUES_XXXXX constants rather than the OsTypeValues.XXXXX for bundle minification.
 */
export declare type OsTypeValues = {
    /** Microsoft Windows. */
    WINDOWS: 'windows';
    /** Linux. */
    LINUX: 'linux';
    /** Apple Darwin. */
    DARWIN: 'darwin';
    /** FreeBSD. */
    FREEBSD: 'freebsd';
    /** NetBSD. */
    NETBSD: 'netbsd';
    /** OpenBSD. */
    OPENBSD: 'openbsd';
    /** DragonFly BSD. */
    DRAGONFLYBSD: 'dragonflybsd';
    /** HP-UX (Hewlett Packard Unix). */
    HPUX: 'hpux';
    /** AIX (Advanced Interactive eXecutive). */
    AIX: 'aix';
    /** Oracle Solaris. */
    SOLARIS: 'solaris';
    /** IBM z/OS. */
    Z_OS: 'z_os';
};
/**
 * The constant map of values for OsTypeValues.
 * @deprecated Use the OSTYPEVALUES_XXXXX constants rather than the OsTypeValues.XXXXX for bundle minification.
 */
export declare const OsTypeValues: OsTypeValues;
/**
 * The language of the telemetry SDK.
 *
 * @deprecated Use TELEMETRY_SDK_LANGUAGE_VALUE_CPP.
 */
export declare const TELEMETRYSDKLANGUAGEVALUES_CPP = "cpp";
/**
 * The language of the telemetry SDK.
 *
 * @deprecated Use TELEMETRY_SDK_LANGUAGE_VALUE_DOTNET.
 */
export declare const TELEMETRYSDKLANGUAGEVALUES_DOTNET = "dotnet";
/**
 * The language of the telemetry SDK.
 *
 * @deprecated Use TELEMETRY_SDK_LANGUAGE_VALUE_ERLANG.
 */
export declare const TELEMETRYSDKLANGUAGEVALUES_ERLANG = "erlang";
/**
 * The language of the telemetry SDK.
 *
 * @deprecated Use TELEMETRY_SDK_LANGUAGE_VALUE_GO.
 */
export declare const TELEMETRYSDKLANGUAGEVALUES_GO = "go";
/**
 * The language of the telemetry SDK.
 *
 * @deprecated Use TELEMETRY_SDK_LANGUAGE_VALUE_JAVA.
 */
export declare const TELEMETRYSDKLANGUAGEVALUES_JAVA = "java";
/**
 * The language of the telemetry SDK.
 *
 * @deprecated Use TELEMETRY_SDK_LANGUAGE_VALUE_NODEJS.
 */
export declare const TELEMETRYSDKLANGUAGEVALUES_NODEJS = "nodejs";
/**
 * The language of the telemetry SDK.
 *
 * @deprecated Use TELEMETRY_SDK_LANGUAGE_VALUE_PHP.
 */
export declare const TELEMETRYSDKLANGUAGEVALUES_PHP = "php";
/**
 * The language of the telemetry SDK.
 *
 * @deprecated Use TELEMETRY_SDK_LANGUAGE_VALUE_PYTHON.
 */
export declare const TELEMETRYSDKLANGUAGEVALUES_PYTHON = "python";
/**
 * The language of the telemetry SDK.
 *
 * @deprecated Use TELEMETRY_SDK_LANGUAGE_VALUE_RUBY.
 */
export declare const TELEMETRYSDKLANGUAGEVALUES_RUBY = "ruby";
/**
 * The language of the telemetry SDK.
 *
 * @deprecated Use TELEMETRY_SDK_LANGUAGE_VALUE_WEBJS.
 */
export declare const TELEMETRYSDKLANGUAGEVALUES_WEBJS = "webjs";
/**
 * Identifies the Values for TelemetrySdkLanguageValues enum definition
 *
 * The language of the telemetry SDK.
 * @deprecated Use the TELEMETRYSDKLANGUAGEVALUES_XXXXX constants rather than the TelemetrySdkLanguageValues.XXXXX for bundle minification.
 */
export declare type TelemetrySdkLanguageValues = {
    /** cpp. */
    CPP: 'cpp';
    /** dotnet. */
    DOTNET: 'dotnet';
    /** erlang. */
    ERLANG: 'erlang';
    /** go. */
    GO: 'go';
    /** java. */
    JAVA: 'java';
    /** nodejs. */
    NODEJS: 'nodejs';
    /** php. */
    PHP: 'php';
    /** python. */
    PYTHON: 'python';
    /** ruby. */
    RUBY: 'ruby';
    /** webjs. */
    WEBJS: 'webjs';
};
/**
 * The constant map of values for TelemetrySdkLanguageValues.
 * @deprecated Use the TELEMETRYSDKLANGUAGEVALUES_XXXXX constants rather than the TelemetrySdkLanguageValues.XXXXX for bundle minification.
 */
export declare const TelemetrySdkLanguageValues: TelemetrySdkLanguageValues;
//# sourceMappingURL=SemanticResourceAttributes.d.ts.map