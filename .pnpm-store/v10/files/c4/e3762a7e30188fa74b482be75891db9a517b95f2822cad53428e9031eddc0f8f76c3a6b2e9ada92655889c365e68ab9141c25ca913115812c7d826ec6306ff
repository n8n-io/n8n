/// <reference types="node" />

import * as tls from 'tls'
import * as net from 'net'

type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never }
type XOR<T, U> = T | U extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U

export class Kafka {
  constructor(config: KafkaConfig)
  producer(config?: ProducerConfig): Producer
  consumer(config: ConsumerConfig): Consumer
  admin(config?: AdminConfig): Admin
  logger(): Logger
}

export type BrokersFunction = () => string[] | Promise<string[]>

type SaslAuthenticationRequest = {
  encode: () => Buffer | Promise<Buffer>
}
type SaslAuthenticationResponse<ParseResult> = {
  decode: (rawResponse: Buffer) => Buffer | Promise<Buffer>
  parse: (data: Buffer) => ParseResult
}

export type Authenticator = {
  authenticate: () => Promise<void>
}

export type SaslAuthenticateArgs<ParseResult> = {
  request: SaslAuthenticationRequest
  response?: SaslAuthenticationResponse<ParseResult>
}

export type AuthenticationProviderArgs = {
  host: string
  port: number
  logger: Logger
  saslAuthenticate: <ParseResult>(
    args: SaslAuthenticateArgs<ParseResult>
  ) => Promise<ParseResult | void>
}

export type Mechanism = {
  mechanism: string
  authenticationProvider: (args: AuthenticationProviderArgs) => Authenticator
}

export interface KafkaConfig {
  brokers: string[] | BrokersFunction
  ssl?: tls.ConnectionOptions | boolean
  sasl?: SASLOptions | Mechanism
  clientId?: string
  connectionTimeout?: number
  authenticationTimeout?: number
  reauthenticationThreshold?: number
  requestTimeout?: number
  enforceRequestTimeout?: boolean
  retry?: RetryOptions
  socketFactory?: ISocketFactory
  logLevel?: logLevel
  logCreator?: logCreator
}

export interface ISocketFactoryArgs {
  host: string
  port: number
  ssl: tls.ConnectionOptions
  onConnect: () => void
}

export type ISocketFactory = (args: ISocketFactoryArgs) => net.Socket

export interface OauthbearerProviderResponse {
  value: string
}

type SASLMechanismOptionsMap = {
  plain: { username: string; password: string }
  'scram-sha-256': { username: string; password: string }
  'scram-sha-512': { username: string; password: string }
  aws: {
    authorizationIdentity: string
    accessKeyId: string
    secretAccessKey: string
    sessionToken?: string
  }
  oauthbearer: { oauthBearerProvider: () => Promise<OauthbearerProviderResponse> }
}

export type SASLMechanism = keyof SASLMechanismOptionsMap
type SASLMechanismOptions<T> = T extends SASLMechanism
  ? { mechanism: T } & SASLMechanismOptionsMap[T]
  : never
export type SASLOptions = SASLMechanismOptions<SASLMechanism>

export interface ProducerConfig {
  createPartitioner?: ICustomPartitioner
  retry?: RetryOptions
  metadataMaxAge?: number
  allowAutoTopicCreation?: boolean
  idempotent?: boolean
  transactionalId?: string
  transactionTimeout?: number
  maxInFlightRequests?: number
}

export interface Message {
  key?: Buffer | string | null
  value: Buffer | string | null
  partition?: number
  headers?: IHeaders
  timestamp?: string
}

export interface PartitionerArgs {
  topic: string
  partitionMetadata: PartitionMetadata[]
  message: Message
}

export type ICustomPartitioner = () => (args: PartitionerArgs) => number
export type DefaultPartitioner = ICustomPartitioner
export type LegacyPartitioner = ICustomPartitioner

export const Partitioners: {
  DefaultPartitioner: DefaultPartitioner
  LegacyPartitioner: LegacyPartitioner
  /**
   * @deprecated Use DefaultPartitioner instead
   *
   * The JavaCompatiblePartitioner was renamed DefaultPartitioner
   * and made to be the default in 2.0.0.
   */
  JavaCompatiblePartitioner: DefaultPartitioner
}

export type PartitionMetadata = {
  partitionErrorCode: number
  partitionId: number
  leader: number
  replicas: number[]
  isr: number[]
  offlineReplicas?: number[]
}

export interface IHeaders {
  [key: string]: Buffer | string | (Buffer | string)[] | undefined
}

export interface ConsumerConfig {
  groupId: string
  partitionAssigners?: PartitionAssigner[]
  metadataMaxAge?: number
  sessionTimeout?: number
  rebalanceTimeout?: number
  heartbeatInterval?: number
  maxBytesPerPartition?: number
  minBytes?: number
  maxBytes?: number
  maxWaitTimeInMs?: number
  retry?: RetryOptions & { restartOnFailure?: (err: Error) => Promise<boolean> }
  allowAutoTopicCreation?: boolean
  maxInFlightRequests?: number
  readUncommitted?: boolean
  rackId?: string
}

export type PartitionAssigner = (config: {
  cluster: Cluster
  groupId: string
  logger: Logger
}) => Assigner

export interface CoordinatorMetadata {
  errorCode: number
  coordinator: {
    nodeId: number
    host: string
    port: number
  }
}

export type Cluster = {
  getNodeIds(): number[]
  metadata(): Promise<BrokerMetadata>
  removeBroker(options: { host: string; port: number }): void
  addMultipleTargetTopics(topics: string[]): Promise<void>
  isConnected(): boolean
  connect(): Promise<void>
  disconnect(): Promise<void>
  refreshMetadata(): Promise<void>
  refreshMetadataIfNecessary(): Promise<void>
  addTargetTopic(topic: string): Promise<void>
  findBroker(node: { nodeId: string }): Promise<Broker>
  findControllerBroker(): Promise<Broker>
  findTopicPartitionMetadata(topic: string): PartitionMetadata[]
  findLeaderForPartitions(topic: string, partitions: number[]): { [leader: string]: number[] }
  findGroupCoordinator(group: { groupId: string }): Promise<Broker>
  findGroupCoordinatorMetadata(group: { groupId: string }): Promise<CoordinatorMetadata>
  defaultOffset(config: { fromBeginning: boolean }): number
  fetchTopicsOffset(
    topics: Array<
      {
        topic: string
        partitions: Array<{ partition: number }>
      } & XOR<{ fromBeginning: boolean }, { fromTimestamp: number }>
    >
  ): Promise<TopicOffsets[]>
}

export type Assignment = { [topic: string]: number[] }

export type GroupMember = { memberId: string; memberMetadata: Buffer }

export type GroupMemberAssignment = { memberId: string; memberAssignment: Buffer }

export type GroupState = { name: string; metadata: Buffer }

export type Assigner = {
  name: string
  version: number
  assign(group: { members: GroupMember[]; topics: string[] }): Promise<GroupMemberAssignment[]>
  protocol(subscription: { topics: string[] }): GroupState
}

export interface RetryOptions {
  maxRetryTime?: number
  initialRetryTime?: number
  factor?: number
  multiplier?: number
  retries?: number
  restartOnFailure?: (e: Error) => Promise<boolean>
}

export interface AdminConfig {
  retry?: RetryOptions
}

export interface ITopicConfig {
  topic: string
  numPartitions?: number
  replicationFactor?: number
  replicaAssignment?: ReplicaAssignment[]
  configEntries?: IResourceConfigEntry[]
}

export interface ITopicPartitionConfig {
  topic: string
  count: number
  assignments?: Array<Array<number>>
}

export interface ITopicMetadata {
  name: string
  partitions: PartitionMetadata[]
}

export interface ReplicaAssignment {
  partition: number
  replicas: Array<number>
}

export interface PartitionReassignment {
  topic: string
  partitionAssignment: Array<ReplicaAssignment>
}

export enum AclResourceTypes {
  UNKNOWN = 0,
  ANY = 1,
  TOPIC = 2,
  GROUP = 3,
  CLUSTER = 4,
  TRANSACTIONAL_ID = 5,
  DELEGATION_TOKEN = 6,
}

export enum ConfigResourceTypes {
  UNKNOWN = 0,
  TOPIC = 2,
  BROKER = 4,
  BROKER_LOGGER = 8,
}

export enum ConfigSource {
  UNKNOWN = 0,
  TOPIC_CONFIG = 1,
  DYNAMIC_BROKER_CONFIG = 2,
  DYNAMIC_DEFAULT_BROKER_CONFIG = 3,
  STATIC_BROKER_CONFIG = 4,
  DEFAULT_CONFIG = 5,
  DYNAMIC_BROKER_LOGGER_CONFIG = 6,
}

export enum AclPermissionTypes {
  UNKNOWN = 0,
  ANY = 1,
  DENY = 2,
  ALLOW = 3,
}

export enum AclOperationTypes {
  UNKNOWN = 0,
  ANY = 1,
  ALL = 2,
  READ = 3,
  WRITE = 4,
  CREATE = 5,
  DELETE = 6,
  ALTER = 7,
  DESCRIBE = 8,
  CLUSTER_ACTION = 9,
  DESCRIBE_CONFIGS = 10,
  ALTER_CONFIGS = 11,
  IDEMPOTENT_WRITE = 12,
}

export enum ResourcePatternTypes {
  UNKNOWN = 0,
  ANY = 1,
  MATCH = 2,
  LITERAL = 3,
  PREFIXED = 4,
}

export interface ResourceConfigQuery {
  type: ConfigResourceTypes
  name: string
  configNames?: string[]
}

export interface ConfigEntries {
  configName: string
  configValue: string
  isDefault: boolean
  configSource: ConfigSource
  isSensitive: boolean
  readOnly: boolean
  configSynonyms: ConfigSynonyms[]
}

export interface ConfigSynonyms {
  configName: string
  configValue: string
  configSource: ConfigSource
}

export interface DescribeConfigResponse {
  resources: {
    configEntries: ConfigEntries[]
    errorCode: number
    errorMessage: string
    resourceName: string
    resourceType: ConfigResourceTypes
  }[]
  throttleTime: number
}

export interface IResourceConfigEntry {
  name: string
  value: string
}

export interface IResourceConfig {
  type: ConfigResourceTypes
  name: string
  configEntries: IResourceConfigEntry[]
}

type ValueOf<T> = T[keyof T]

export type AdminEvents = {
  CONNECT: 'admin.connect'
  DISCONNECT: 'admin.disconnect'
  REQUEST: 'admin.network.request'
  REQUEST_TIMEOUT: 'admin.network.request_timeout'
  REQUEST_QUEUE_SIZE: 'admin.network.request_queue_size'
}

export interface InstrumentationEvent<T> {
  id: string
  type: string
  timestamp: number
  payload: T
}

export type RemoveInstrumentationEventListener<T> = () => void

export type ConnectEvent = InstrumentationEvent<null>
export type DisconnectEvent = InstrumentationEvent<null>
export type RequestEvent = InstrumentationEvent<{
  apiKey: number
  apiName: string
  apiVersion: number
  broker: string
  clientId: string
  correlationId: number
  createdAt: number
  duration: number
  pendingDuration: number
  sentAt: number
  size: number
}>
export type RequestTimeoutEvent = InstrumentationEvent<{
  apiKey: number
  apiName: string
  apiVersion: number
  broker: string
  clientId: string
  correlationId: number
  createdAt: number
  pendingDuration: number
  sentAt: number
}>
export type RequestQueueSizeEvent = InstrumentationEvent<{
  broker: string
  clientId: string
  queueSize: number
}>

export type SeekEntry = PartitionOffset

export type FetchOffsetsPartition = PartitionOffset & { metadata: string | null }
export interface Acl {
  principal: string
  host: string
  operation: AclOperationTypes
  permissionType: AclPermissionTypes
}

export interface AclResource {
  resourceType: AclResourceTypes
  resourceName: string
  resourcePatternType: ResourcePatternTypes
}

export type AclEntry = Acl & AclResource

export type DescribeAclResource = AclResource & {
  acls: Acl[]
}

export interface DescribeAclResponse {
  throttleTime: number
  errorCode: number
  errorMessage?: string
  resources: DescribeAclResource[]
}

export interface AclFilter {
  resourceType: AclResourceTypes
  resourceName?: string
  resourcePatternType: ResourcePatternTypes
  principal?: string
  host?: string
  operation: AclOperationTypes
  permissionType: AclPermissionTypes
}

export interface MatchingAcl {
  errorCode: number
  errorMessage?: string
  resourceType: AclResourceTypes
  resourceName: string
  resourcePatternType: ResourcePatternTypes
  principal: string
  host: string
  operation: AclOperationTypes
  permissionType: AclPermissionTypes
}

export interface DeleteAclFilterResponses {
  errorCode: number
  errorMessage?: string
  matchingAcls: MatchingAcl[]
}

export interface DeleteAclResponse {
  throttleTime: number
  filterResponses: DeleteAclFilterResponses[]
}

export interface ListPartitionReassignmentsResponse {
  topics: OngoingTopicReassignment[]
}

export interface OngoingTopicReassignment {
  topic: string
  partitions: OngoingPartitionReassignment[]
}

export interface OngoingPartitionReassignment {
  partitionIndex: number
  replicas: number[]
  addingReplicas?: number[]
  removingReplicas?: number[]
}

export type Admin = {
  connect(): Promise<void>
  disconnect(): Promise<void>
  listTopics(): Promise<string[]>
  createTopics(options: {
    validateOnly?: boolean
    waitForLeaders?: boolean
    timeout?: number
    topics: ITopicConfig[]
  }): Promise<boolean>
  deleteTopics(options: { topics: string[]; timeout?: number }): Promise<void>
  createPartitions(options: {
    validateOnly?: boolean
    timeout?: number
    topicPartitions: ITopicPartitionConfig[]
  }): Promise<boolean>
  fetchTopicMetadata(options?: { topics: string[] }): Promise<{ topics: Array<ITopicMetadata> }>
  fetchOffsets(options: {
    groupId: string
    topics?: string[]
    resolveOffsets?: boolean
  }): Promise<Array<{ topic: string; partitions: FetchOffsetsPartition[] }>>
  fetchTopicOffsets(topic: string): Promise<Array<SeekEntry & { high: string; low: string }>>
  fetchTopicOffsetsByTimestamp(topic: string, timestamp?: number): Promise<Array<SeekEntry>>
  describeCluster(): Promise<{
    brokers: Array<{ nodeId: number; host: string; port: number }>
    controller: number | null
    clusterId: string
  }>
  setOffsets(options: { groupId: string; topic: string; partitions: SeekEntry[] }): Promise<void>
  resetOffsets(options: { groupId: string; topic: string; earliest: boolean }): Promise<void>
  describeConfigs(configs: {
    resources: ResourceConfigQuery[]
    includeSynonyms: boolean
  }): Promise<DescribeConfigResponse>
  alterConfigs(configs: { validateOnly: boolean; resources: IResourceConfig[] }): Promise<any>
  listGroups(): Promise<{ groups: GroupOverview[] }>
  deleteGroups(groupIds: string[]): Promise<DeleteGroupsResult[]>
  describeGroups(groupIds: string[]): Promise<GroupDescriptions>
  describeAcls(options: AclFilter): Promise<DescribeAclResponse>
  deleteAcls(options: { filters: AclFilter[] }): Promise<DeleteAclResponse>
  createAcls(options: { acl: AclEntry[] }): Promise<boolean>
  deleteTopicRecords(options: { topic: string; partitions: SeekEntry[] }): Promise<void>
  alterPartitionReassignments(request: {
    topics: PartitionReassignment[]
    timeout?: number
  }): Promise<void>
  listPartitionReassignments(request: {
    topics?: TopicPartitions[]
    timeout?: number
  }): Promise<ListPartitionReassignmentsResponse>
  logger(): Logger
  on(
    eventName: AdminEvents['CONNECT'],
    listener: (event: ConnectEvent) => void
  ): RemoveInstrumentationEventListener<typeof eventName>
  on(
    eventName: AdminEvents['DISCONNECT'],
    listener: (event: DisconnectEvent) => void
  ): RemoveInstrumentationEventListener<typeof eventName>
  on(
    eventName: AdminEvents['REQUEST'],
    listener: (event: RequestEvent) => void
  ): RemoveInstrumentationEventListener<typeof eventName>
  on(
    eventName: AdminEvents['REQUEST_QUEUE_SIZE'],
    listener: (event: RequestQueueSizeEvent) => void
  ): RemoveInstrumentationEventListener<typeof eventName>
  on(
    eventName: AdminEvents['REQUEST_TIMEOUT'],
    listener: (event: RequestTimeoutEvent) => void
  ): RemoveInstrumentationEventListener<typeof eventName>
  on(
    eventName: ValueOf<AdminEvents>,
    listener: (event: InstrumentationEvent<any>) => void
  ): RemoveInstrumentationEventListener<typeof eventName>
  readonly events: AdminEvents
}

export const PartitionAssigners: { roundRobin: PartitionAssigner }

export interface ISerializer<T> {
  encode(value: T): Buffer
  decode(buffer: Buffer): T | null
}

export type MemberMetadata = {
  version: number
  topics: string[]
  userData: Buffer
}

export type MemberAssignment = {
  version: number
  assignment: Assignment
  userData: Buffer
}

export const AssignerProtocol: {
  MemberMetadata: ISerializer<MemberMetadata>
  MemberAssignment: ISerializer<MemberAssignment>
}

export enum logLevel {
  NOTHING = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 4,
  DEBUG = 5,
}

export interface LogEntry {
  namespace: string
  level: logLevel
  label: string
  log: LoggerEntryContent
}

export interface LoggerEntryContent {
  readonly timestamp: string
  readonly message: string
  [key: string]: any
}

export type logCreator = (logLevel: logLevel) => (entry: LogEntry) => void

export type Logger = {
  info: (message: string, extra?: object) => void
  error: (message: string, extra?: object) => void
  warn: (message: string, extra?: object) => void
  debug: (message: string, extra?: object) => void

  namespace: (namespace: string, logLevel?: logLevel) => Logger
  setLogLevel: (logLevel: logLevel) => void
}

export interface BrokerMetadata {
  brokers: Array<{ nodeId: number; host: string; port: number; rack?: string }>
  topicMetadata: Array<{
    topicErrorCode: number
    topic: string
    partitionMetadata: PartitionMetadata[]
  }>
}

export interface ApiVersions {
  [apiKey: number]: {
    minVersion: number
    maxVersion: number
  }
}

export type Broker = {
  isConnected(): boolean
  connect(): Promise<void>
  disconnect(): Promise<void>
  apiVersions(): Promise<ApiVersions>
  metadata(topics: string[]): Promise<BrokerMetadata>
  describeGroups: (options: { groupIds: string[] }) => Promise<any>
  offsetCommit(request: {
    groupId: string
    groupGenerationId: number
    memberId: string
    retentionTime?: number
    topics: TopicOffsets[]
  }): Promise<any>
  offsetFetch(request: {
    groupId: string
    topics: TopicOffsets[]
  }): Promise<{
    responses: TopicOffsets[]
  }>
  fetch(request: {
    replicaId?: number
    isolationLevel?: number
    maxWaitTime?: number
    minBytes?: number
    maxBytes?: number
    topics: Array<{
      topic: string
      partitions: Array<{ partition: number; fetchOffset: string; maxBytes: number }>
    }>
    rackId?: string
  }): Promise<any>
  produce(request: {
    topicData: Array<{
      topic: string
      partitions: Array<{ partition: number; firstSequence?: number; messages: Message[] }>
    }>
    transactionalId?: string
    producerId?: number
    producerEpoch?: number
    acks?: number
    timeout?: number
    compression?: CompressionTypes
  }): Promise<any>
  alterPartitionReassignments(request: {
    topics: PartitionReassignment[]
    timeout?: number
  }): Promise<any>
  listPartitionReassignments(request: {
    topics?: TopicPartitions[]
    timeout?: number
  }): Promise<ListPartitionReassignmentsResponse>
}

interface MessageSetEntry {
  key: Buffer | null
  value: Buffer | null
  timestamp: string
  attributes: number
  offset: string
  size: number
  headers?: never
}

interface RecordBatchEntry {
  key: Buffer | null
  value: Buffer | null
  timestamp: string
  attributes: number
  offset: string
  headers: IHeaders
  size?: never
}

export type KafkaMessage = MessageSetEntry | RecordBatchEntry

export interface ProducerRecord {
  topic: string
  messages: Message[]
  acks?: number
  timeout?: number
  compression?: CompressionTypes
}

export type RecordMetadata = {
  topicName: string
  partition: number
  errorCode: number
  offset?: string
  timestamp?: string
  baseOffset?: string
  logAppendTime?: string
  logStartOffset?: string
}

export interface TopicMessages {
  topic: string
  messages: Message[]
}

export interface ProducerBatch {
  acks?: number
  timeout?: number
  compression?: CompressionTypes
  topicMessages?: TopicMessages[]
}

export interface PartitionOffset {
  partition: number
  offset: string
}

export interface TopicOffsets {
  topic: string
  partitions: PartitionOffset[]
}

export interface Offsets {
  topics: TopicOffsets[]
}

type Sender = {
  send(record: ProducerRecord): Promise<RecordMetadata[]>
  sendBatch(batch: ProducerBatch): Promise<RecordMetadata[]>
}

export type ProducerEvents = {
  CONNECT: 'producer.connect'
  DISCONNECT: 'producer.disconnect'
  REQUEST: 'producer.network.request'
  REQUEST_TIMEOUT: 'producer.network.request_timeout'
  REQUEST_QUEUE_SIZE: 'producer.network.request_queue_size'
}

export type Producer = Sender & {
  connect(): Promise<void>
  disconnect(): Promise<void>
  isIdempotent(): boolean
  readonly events: ProducerEvents
  on(
    eventName: ProducerEvents['CONNECT'],
    listener: (event: ConnectEvent) => void
  ): RemoveInstrumentationEventListener<typeof eventName>
  on(
    eventName: ProducerEvents['DISCONNECT'],
    listener: (event: DisconnectEvent) => void
  ): RemoveInstrumentationEventListener<typeof eventName>
  on(
    eventName: ProducerEvents['REQUEST'],
    listener: (event: RequestEvent) => void
  ): RemoveInstrumentationEventListener<typeof eventName>
  on(
    eventName: ProducerEvents['REQUEST_QUEUE_SIZE'],
    listener: (event: RequestQueueSizeEvent) => void
  ): RemoveInstrumentationEventListener<typeof eventName>
  on(
    eventName: ProducerEvents['REQUEST_TIMEOUT'],
    listener: (event: RequestTimeoutEvent) => void
  ): RemoveInstrumentationEventListener<typeof eventName>
  on(
    eventName: ValueOf<ProducerEvents>,
    listener: (event: InstrumentationEvent<any>) => void
  ): RemoveInstrumentationEventListener<typeof eventName>
  transaction(): Promise<Transaction>
  logger(): Logger
}

export type Transaction = Sender & {
  sendOffsets(offsets: Offsets & { consumerGroupId: string }): Promise<void>
  commit(): Promise<void>
  abort(): Promise<void>
  isActive(): boolean
}

export type ConsumerGroup = {
  groupId: string
  generationId: number
  memberId: string
  coordinator: Broker
}

export type MemberDescription = {
  clientHost: string
  clientId: string
  memberId: string
  memberAssignment: Buffer
  memberMetadata: Buffer
}

// See https://github.com/apache/kafka/blob/2.4.0/clients/src/main/java/org/apache/kafka/common/ConsumerGroupState.java#L25
export type ConsumerGroupState =
  | 'Unknown'
  | 'PreparingRebalance'
  | 'CompletingRebalance'
  | 'Stable'
  | 'Dead'
  | 'Empty'

export type GroupDescription = {
  groupId: string
  members: MemberDescription[]
  protocol: string
  protocolType: string
  state: ConsumerGroupState
}

export type GroupDescriptions = {
  groups: GroupDescription[]
}

export type TopicPartitions = { topic: string; partitions: number[] }

export type TopicPartition = {
  topic: string
  partition: number
}
export type TopicPartitionOffset = TopicPartition & {
  offset: string
}
export type TopicPartitionOffsetAndMetadata = TopicPartitionOffset & {
  metadata?: string | null
}

export type Batch = {
  topic: string
  partition: number
  highWatermark: string
  messages: KafkaMessage[]
  isEmpty(): boolean
  firstOffset(): string | null
  lastOffset(): string
  offsetLag(): string
  offsetLagLow(): string
}

export type GroupOverview = {
  groupId: string
  protocolType: string
}

export type DeleteGroupsResult = {
  groupId: string
  errorCode?: number
  error?: KafkaJSProtocolError
}

export type ConsumerEvents = {
  HEARTBEAT: 'consumer.heartbeat'
  COMMIT_OFFSETS: 'consumer.commit_offsets'
  GROUP_JOIN: 'consumer.group_join'
  FETCH_START: 'consumer.fetch_start'
  FETCH: 'consumer.fetch'
  START_BATCH_PROCESS: 'consumer.start_batch_process'
  END_BATCH_PROCESS: 'consumer.end_batch_process'
  CONNECT: 'consumer.connect'
  DISCONNECT: 'consumer.disconnect'
  STOP: 'consumer.stop'
  CRASH: 'consumer.crash'
  REBALANCING: 'consumer.rebalancing'
  RECEIVED_UNSUBSCRIBED_TOPICS: 'consumer.received_unsubscribed_topics'
  REQUEST: 'consumer.network.request'
  REQUEST_TIMEOUT: 'consumer.network.request_timeout'
  REQUEST_QUEUE_SIZE: 'consumer.network.request_queue_size'
}
export type ConsumerHeartbeatEvent = InstrumentationEvent<{
  groupId: string
  memberId: string
  groupGenerationId: number
}>
export type ConsumerCommitOffsetsEvent = InstrumentationEvent<{
  groupId: string
  memberId: string
  groupGenerationId: number
  topics: TopicOffsets[]
}>
export interface IMemberAssignment {
  [key: string]: number[]
}
export type ConsumerGroupJoinEvent = InstrumentationEvent<{
  duration: number
  groupId: string
  isLeader: boolean
  leaderId: string
  groupProtocol: string
  memberId: string
  memberAssignment: IMemberAssignment
}>
export type ConsumerFetchStartEvent = InstrumentationEvent<{ nodeId: number }>
export type ConsumerFetchEvent = InstrumentationEvent<{
  numberOfBatches: number
  duration: number
  nodeId: number
}>
interface IBatchProcessEvent {
  topic: string
  partition: number
  highWatermark: string
  offsetLag: string
  offsetLagLow: string
  batchSize: number
  firstOffset: string
  lastOffset: string
}
export type ConsumerStartBatchProcessEvent = InstrumentationEvent<IBatchProcessEvent>
export type ConsumerEndBatchProcessEvent = InstrumentationEvent<
  IBatchProcessEvent & { duration: number }
>
export type ConsumerCrashEvent = InstrumentationEvent<{
  error: Error
  groupId: string
  restart: boolean
}>
export type ConsumerRebalancingEvent = InstrumentationEvent<{
  groupId: string
  memberId: string
}>
export type ConsumerReceivedUnsubcribedTopicsEvent = InstrumentationEvent<{
  groupId: string
  generationId: number
  memberId: string
  assignedTopics: string[]
  topicsSubscribed: string[]
  topicsNotSubscribed: string[]
}>

export interface OffsetsByTopicPartition {
  topics: TopicOffsets[]
}

export interface EachMessagePayload {
  topic: string
  partition: number
  message: KafkaMessage
  heartbeat(): Promise<void>
  pause(): () => void
}

export interface EachBatchPayload {
  batch: Batch
  resolveOffset(offset: string): void
  heartbeat(): Promise<void>
  pause(): () => void
  commitOffsetsIfNecessary(offsets?: Offsets): Promise<void>
  uncommittedOffsets(): OffsetsByTopicPartition
  isRunning(): boolean
  isStale(): boolean
}

/**
 * Type alias to keep compatibility with @types/kafkajs
 * @see https://github.com/DefinitelyTyped/DefinitelyTyped/blob/712ad9d59ccca6a3cc92f347fea0d1c7b02f5eeb/types/kafkajs/index.d.ts#L321-L325
 */
export type ConsumerEachMessagePayload = EachMessagePayload

/**
 * Type alias to keep compatibility with @types/kafkajs
 * @see https://github.com/DefinitelyTyped/DefinitelyTyped/blob/712ad9d59ccca6a3cc92f347fea0d1c7b02f5eeb/types/kafkajs/index.d.ts#L327-L336
 */
export type ConsumerEachBatchPayload = EachBatchPayload

export type EachBatchHandler = (payload: EachBatchPayload) => Promise<void>
export type EachMessageHandler = (payload: EachMessagePayload) => Promise<void>

export type ConsumerRunConfig = {
  autoCommit?: boolean
  autoCommitInterval?: number | null
  autoCommitThreshold?: number | null
  eachBatchAutoResolve?: boolean
  partitionsConsumedConcurrently?: number
  eachBatch?: EachBatchHandler
  eachMessage?: EachMessageHandler
}

/**
 * @deprecated Replaced by ConsumerSubscribeTopics
 */
export type ConsumerSubscribeTopic = { topic: string | RegExp; fromBeginning?: boolean }
export type ConsumerSubscribeTopics = { topics: (string | RegExp)[]; fromBeginning?: boolean }

export type Consumer = {
  connect(): Promise<void>
  disconnect(): Promise<void>
  subscribe(subscription: ConsumerSubscribeTopics | ConsumerSubscribeTopic): Promise<void>
  stop(): Promise<void>
  run(config?: ConsumerRunConfig): Promise<void>
  commitOffsets(topicPartitions: Array<TopicPartitionOffsetAndMetadata>): Promise<void>
  seek(topicPartitionOffset: TopicPartitionOffset): void
  describeGroup(): Promise<GroupDescription>
  pause(topics: Array<{ topic: string; partitions?: number[] }>): void
  paused(): TopicPartitions[]
  resume(topics: Array<{ topic: string; partitions?: number[] }>): void
  on(
    eventName: ConsumerEvents['HEARTBEAT'],
    listener: (event: ConsumerHeartbeatEvent) => void
  ): RemoveInstrumentationEventListener<typeof eventName>
  on(
    eventName: ConsumerEvents['COMMIT_OFFSETS'],
    listener: (event: ConsumerCommitOffsetsEvent) => void
  ): RemoveInstrumentationEventListener<typeof eventName>
  on(
    eventName: ConsumerEvents['GROUP_JOIN'],
    listener: (event: ConsumerGroupJoinEvent) => void
  ): RemoveInstrumentationEventListener<typeof eventName>
  on(
    eventName: ConsumerEvents['FETCH_START'],
    listener: (event: ConsumerFetchStartEvent) => void
  ): RemoveInstrumentationEventListener<typeof eventName>
  on(
    eventName: ConsumerEvents['FETCH'],
    listener: (event: ConsumerFetchEvent) => void
  ): RemoveInstrumentationEventListener<typeof eventName>
  on(
    eventName: ConsumerEvents['START_BATCH_PROCESS'],
    listener: (event: ConsumerStartBatchProcessEvent) => void
  ): RemoveInstrumentationEventListener<typeof eventName>
  on(
    eventName: ConsumerEvents['END_BATCH_PROCESS'],
    listener: (event: ConsumerEndBatchProcessEvent) => void
  ): RemoveInstrumentationEventListener<typeof eventName>
  on(
    eventName: ConsumerEvents['CONNECT'],
    listener: (event: ConnectEvent) => void
  ): RemoveInstrumentationEventListener<typeof eventName>
  on(
    eventName: ConsumerEvents['DISCONNECT'],
    listener: (event: DisconnectEvent) => void
  ): RemoveInstrumentationEventListener<typeof eventName>
  on(
    eventName: ConsumerEvents['STOP'],
    listener: (event: InstrumentationEvent<null>) => void
  ): RemoveInstrumentationEventListener<typeof eventName>
  on(
    eventName: ConsumerEvents['CRASH'],
    listener: (event: ConsumerCrashEvent) => void
  ): RemoveInstrumentationEventListener<typeof eventName>
  on(
    eventName: ConsumerEvents['REBALANCING'],
    listener: (event: ConsumerRebalancingEvent) => void
  ): RemoveInstrumentationEventListener<typeof eventName>
  on(
    eventName: ConsumerEvents['RECEIVED_UNSUBSCRIBED_TOPICS'],
    listener: (event: ConsumerReceivedUnsubcribedTopicsEvent) => void
  ): RemoveInstrumentationEventListener<typeof eventName>
  on(
    eventName: ConsumerEvents['REQUEST'],
    listener: (event: RequestEvent) => void
  ): RemoveInstrumentationEventListener<typeof eventName>
  on(
    eventName: ConsumerEvents['REQUEST_TIMEOUT'],
    listener: (event: RequestTimeoutEvent) => void
  ): RemoveInstrumentationEventListener<typeof eventName>
  on(
    eventName: ConsumerEvents['REQUEST_QUEUE_SIZE'],
    listener: (event: RequestQueueSizeEvent) => void
  ): RemoveInstrumentationEventListener<typeof eventName>
  on(
    eventName: ValueOf<ConsumerEvents>,
    listener: (event: InstrumentationEvent<any>) => void
  ): RemoveInstrumentationEventListener<typeof eventName>
  logger(): Logger
  readonly events: ConsumerEvents
}

export enum CompressionTypes {
  None = 0,
  GZIP = 1,
  Snappy = 2,
  LZ4 = 3,
  ZSTD = 4,
}

export var CompressionCodecs: {
  [CompressionTypes.GZIP]: () => any
  [CompressionTypes.Snappy]: () => any
  [CompressionTypes.LZ4]: () => any
  [CompressionTypes.ZSTD]: () => any
}

export class KafkaJSError extends Error {
  readonly message: Error['message']
  readonly name: string
  readonly retriable: boolean
  readonly helpUrl?: string
  readonly cause?: Error

  constructor(e: Error | string, metadata?: KafkaJSErrorMetadata)
}

export class KafkaJSNonRetriableError extends KafkaJSError {
  constructor(e: Error | string)
}

export class KafkaJSProtocolError extends KafkaJSError {
  readonly code: number
  readonly type: string
  constructor(e: Error | string)
}

export class KafkaJSAggregateError extends Error {
  readonly errors: (Error | string)[]
  constructor(message: Error | string, errors: (Error | string)[])
}

export class KafkaJSOffsetOutOfRange extends KafkaJSProtocolError {
  readonly topic: string
  readonly partition: number
  constructor(e: Error | string, metadata?: KafkaJSOffsetOutOfRangeMetadata)
}

export class KafkaJSAlterPartitionReassignmentsError extends KafkaJSProtocolError {
  readonly topic?: string
  readonly partition?: number
  constructor(e: Error | string, topic?: string, partition?: number)
}

export class KafkaJSNumberOfRetriesExceeded extends KafkaJSNonRetriableError {
  readonly stack: string
  readonly retryCount: number
  readonly retryTime: number
  constructor(e: Error | string, metadata?: KafkaJSNumberOfRetriesExceededMetadata)
}

export class KafkaJSConnectionError extends KafkaJSError {
  readonly broker: string
  constructor(e: Error | string, metadata?: KafkaJSConnectionErrorMetadata)
}

export class KafkaJSRequestTimeoutError extends KafkaJSError {
  readonly broker: string
  readonly correlationId: number
  readonly createdAt: number
  readonly sentAt: number
  readonly pendingDuration: number
  constructor(e: Error | string, metadata?: KafkaJSRequestTimeoutErrorMetadata)
}

export class KafkaJSMetadataNotLoaded extends KafkaJSError {
  constructor()
}

export class KafkaJSTopicMetadataNotLoaded extends KafkaJSMetadataNotLoaded {
  readonly topic: string
  constructor(e: Error | string, metadata?: KafkaJSTopicMetadataNotLoadedMetadata)
}

export class KafkaJSStaleTopicMetadataAssignment extends KafkaJSError {
  readonly topic: string
  readonly unknownPartitions: number
  constructor(e: Error | string, metadata?: KafkaJSStaleTopicMetadataAssignmentMetadata)
}

export class KafkaJSServerDoesNotSupportApiKey extends KafkaJSNonRetriableError {
  readonly apiKey: number
  readonly apiName: string
  constructor(e: Error | string, metadata?: KafkaJSServerDoesNotSupportApiKeyMetadata)
}

export class KafkaJSBrokerNotFound extends KafkaJSError {
  constructor()
}

export class KafkaJSPartialMessageError extends KafkaJSError {
  constructor()
}

export class KafkaJSSASLAuthenticationError extends KafkaJSError {
  constructor()
}

export class KafkaJSGroupCoordinatorNotFound extends KafkaJSError {
  constructor()
}

export class KafkaJSNotImplemented extends KafkaJSError {
  constructor()
}

export class KafkaJSTimeout extends KafkaJSError {
  constructor()
}

export class KafkaJSLockTimeout extends KafkaJSError {
  constructor()
}

export class KafkaJSUnsupportedMagicByteInMessageSet extends KafkaJSError {
  constructor()
}

export class KafkaJSDeleteGroupsError extends KafkaJSError {
  readonly groups: DeleteGroupsResult[]
  constructor(e: Error | string, groups?: KafkaJSDeleteGroupsErrorGroups[])
}

export class KafkaJSDeleteTopicRecordsError extends KafkaJSError {
  constructor(metadata: KafkaJSDeleteTopicRecordsErrorTopic)
}

export interface KafkaJSDeleteGroupsErrorGroups {
  groupId: string
  errorCode: number
  error: KafkaJSError
}

export interface KafkaJSDeleteTopicRecordsErrorTopic {
  topic: string
  partitions: KafkaJSDeleteTopicRecordsErrorPartition[]
}

export interface KafkaJSDeleteTopicRecordsErrorPartition {
  partition: number
  offset: string
  error: KafkaJSError
}

export interface KafkaJSErrorMetadata {
  retriable?: boolean
  topic?: string
  partitionId?: number
  metadata?: PartitionMetadata
}

export interface KafkaJSOffsetOutOfRangeMetadata {
  topic: string
  partition: number
}

export interface KafkaJSNumberOfRetriesExceededMetadata {
  retryCount: number
  retryTime: number
}

export interface KafkaJSConnectionErrorMetadata {
  broker?: string
  code?: string
}

export interface KafkaJSRequestTimeoutErrorMetadata {
  broker: string
  clientId: string
  correlationId: number
  createdAt: number
  sentAt: number
  pendingDuration: number
}

export interface KafkaJSTopicMetadataNotLoadedMetadata {
  topic: string
}

export interface KafkaJSStaleTopicMetadataAssignmentMetadata {
  topic: string
  unknownPartitions: PartitionMetadata[]
}

export interface KafkaJSServerDoesNotSupportApiKeyMetadata {
  apiKey: number
  apiName: string
}
